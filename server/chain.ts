import { createPublicClient, createWalletClient, formatUnits, http, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { env } from './env.js'
import { ERC20_ABI, SOLVE_TYPES, TICKR_ABI, localChain, robinhoodTestnet } from '../shared/chain.js'

export const chain = env.network === 'local' ? localChain : robinhoodTestnet
export const rpcUrl = env.rpcUrl ?? chain.rpcUrls.default.http[0]

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
const account = env.signerKey ? privateKeyToAccount(env.signerKey) : null
const wallet = account ? createWalletClient({ account, chain, transport: http(rpcUrl) }) : null

export const onchainReady = () => Boolean(env.contract)

export async function signSolve(player: Address, day: number, guesses: number) {
  if (!account || !env.contract) throw new Error('Signer or contract not configured')
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60)
  const signature = await account.signTypedData({
    domain: { name: 'Tickr', version: '1', chainId: chain.id, verifyingContract: env.contract },
    types: SOLVE_TYPES,
    primaryType: 'Solve',
    message: { player, day, guesses, deadline },
  })
  return { signature, deadline }
}

export async function relaySolve(player: Address, day: number, guesses: number, deadline: bigint, signature: Hex) {
  if (!wallet || !env.contract) throw new Error('Relayer not configured')
  return wallet.writeContract({ address: env.contract, abi: TICKR_ABI, functionName: 'recordSolve', args: [player, day, guesses, deadline, signature] })
}

export async function solvedIn(player: Address, day: number) {
  if (!env.contract) return 0
  return publicClient.readContract({ address: env.contract, abi: TICKR_ABI, functionName: 'solvedIn', args: [player, day] })
}

export async function commitmentOf(day: number) {
  if (!env.contract) return null
  return publicClient.readContract({ address: env.contract, abi: TICKR_ABI, functionName: 'commitments', args: [day] })
}

export async function commitDays(days: number[], hashes: Hex[]) {
  if (!wallet || !env.contract) throw new Error('Signer or contract not configured')
  return wallet.writeContract({ address: env.contract, abi: TICKR_ABI, functionName: 'commitPuzzles', args: [days, hashes] })
}

const tokenMeta = new Map<string, { symbol: string; decimals: number }>()
async function meta(token: Address) {
  if (!tokenMeta.has(token)) {
    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => 'TOKEN'),
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }).catch(() => 18),
    ])
    tokenMeta.set(token, { symbol, decimals: Number(decimals) })
  }
  return tokenMeta.get(token)!
}

export async function playerStats(player: Address, today: number) {
  const c = env.contract!
  const [p, live, solvedToday, [streaks, rewards]] = await Promise.all([
    publicClient.readContract({ address: c, abi: TICKR_ABI, functionName: 'players', args: [player] }),
    publicClient.readContract({ address: c, abi: TICKR_ABI, functionName: 'liveStreak', args: [player, today] }),
    publicClient.readContract({ address: c, abi: TICKR_ABI, functionName: 'solvedIn', args: [player, today] }),
    publicClient.readContract({ address: c, abi: TICKR_ABI, functionName: 'getMilestones' }),
  ])
  const [lastDay, , bestStreak, solves, totalGuesses] = p
  const tokens = [...new Set(rewards.map((r) => r.token))]
  const balances = await Promise.all(
    tokens.map(async (t) => {
      const m = await meta(t)
      const b = await publicClient.readContract({ address: t, abi: ERC20_ABI, functionName: 'balanceOf', args: [player] })
      return { token: t, symbol: m.symbol, balance: formatUnits(b, m.decimals) }
    }),
  )
  const rewardRows = await Promise.all(
    streaks.map(async (s, i) => {
      const m = await meta(rewards[i].token)
      return { streak: s, token: rewards[i].token, symbol: m.symbol, amount: formatUnits(rewards[i].amount, m.decimals), earned: bestStreak >= s }
    }),
  )
  return {
    address: player,
    streak: live,
    bestStreak,
    solves,
    avgGuesses: solves ? +(totalGuesses / solves).toFixed(2) : null,
    lastDay,
    solvedToday,
    rewards: rewardRows.sort((a, b) => a.streak - b.streak),
    balances,
  }
}

export async function leaderboard(today: number) {
  const c = env.contract!
  const n = await publicClient.readContract({ address: c, abi: TICKR_ABI, functionName: 'playerCount' })
  const rows: { address: string; streak: number; bestStreak: number; solves: number; avgGuesses: number }[] = []
  for (let off = 0n; off < n; off += 200n) {
    const [addrs, stats] = await publicClient.readContract({ address: c, abi: TICKR_ABI, functionName: 'getPlayers', args: [off, 200n] })
    addrs.forEach((a, i) => {
      const s = stats[i]
      const live = s.lastDay === today || s.lastDay + 1 === today ? s.streak : 0
      rows.push({ address: a, streak: live, bestStreak: s.bestStreak, solves: s.solves, avgGuesses: +(s.totalGuesses / Math.max(1, s.solves)).toFixed(2) })
    })
  }
  return rows.sort((a, b) => b.streak - a.streak || b.bestStreak - a.bestStreak || a.avgGuesses - b.avgGuesses).slice(0, 50)
}
