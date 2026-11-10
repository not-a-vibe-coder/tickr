import { createPublicClient, createWalletClient, formatUnits, http, parseUnits, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { env } from './env.js'
import { EIP712_VERSION, QUOTE_TYPES, SOLVE_TYPES, TICKR_ABI, localChain, robinhoodTestnet } from '../shared/chain.js'

export const chain = env.network === 'local' ? localChain : robinhoodTestnet
export const rpcUrl = env.rpcUrl ?? chain.rpcUrls.default.http[0]

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
const account = env.signerKey ? privateKeyToAccount(env.signerKey) : null
const wallet = account ? createWalletClient({ account, chain, transport: http(rpcUrl) }) : null

export const onchainReady = () => Boolean(env.contract)
const domain = () => ({ name: 'Tickr', version: EIP712_VERSION, chainId: chain.id, verifyingContract: env.contract! })
const read = <T>(functionName: string, args: unknown[] = []) =>
  publicClient.readContract({ address: env.contract!, abi: TICKR_ABI, functionName, args } as never) as Promise<T>

/**
 * Relayer writes are serialised per instance (one nonce at a time) and retried once on a nonce clash,
 * which can happen when several serverless instances send at the same moment.
 */
let queue: Promise<unknown> = Promise.resolve()
function send(functionName: string, args: unknown[]): Promise<Hex> {
  if (!wallet || !env.contract) return Promise.reject(new Error('Relayer not configured'))
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        const nonce = await publicClient.getTransactionCount({ address: account!.address, blockTag: 'pending' })
        return await wallet.writeContract({ address: env.contract!, abi: TICKR_ABI, functionName, args, nonce } as never)
      } catch (e) {
        const msg = String((e as Error).message)
        if (attempt < 2 && /nonce|replacement|already known/i.test(msg)) continue
        throw e
      }
    }
  }
  const p = queue.then(run, run)
  queue = p.catch(() => undefined)
  return p
}

// ───────────────────────────── daily ─────────────────────────────

export async function signSolve(player: Address, day: number, guesses: number) {
  if (!account || !env.contract) throw new Error('Signer or contract not configured')
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60)
  const signature = await account.signTypedData({ domain: domain(), types: SOLVE_TYPES, primaryType: 'Solve', message: { player, day, guesses, deadline } })
  return { signature, deadline }
}
export const relaySolve = (player: Address, day: number, guesses: number, deadline: bigint, signature: Hex) =>
  send('recordSolve', [player, day, guesses, deadline, signature])
export const solvedIn = (player: Address, day: number) => (env.contract ? read<number>('solvedIn', [player, day]) : Promise.resolve(0))
export const commitmentOf = (day: number) => (env.contract ? read<Hex>('commitments', [day]) : Promise.resolve(null))
export const commitDays = (days: number[], hashes: Hex[]) => send('commitPuzzles', [days, hashes])

// ───────────────────────────── trading ─────────────────────────────

export const toWad = (n: number, dp = 8) => parseUnits(n.toFixed(dp), 18)
export const fromWad = (n: bigint) => Number(formatUnits(n, 18))

export async function portfolioOf(player: Address) {
  const [cash, symbols, qty, cost] = await read<[bigint, string[], bigint[], bigint[]]>('getPortfolio', [player])
  const joined = await read<boolean>('joined', [player])
  return { cash: fromWad(cash), cashWad: cash, joined, holdings: symbols.map((s, i) => ({ symbol: s, qty: fromWad(qty[i]), qtyWad: qty[i], cost: fromWad(cost[i]) })) }
}

export async function executeTrade(q: { player: Address; symbol: string; isBuy: boolean; qty: bigint; price: bigint; nonce: bigint }) {
  if (!account || !env.contract) throw new Error('Signer or contract not configured')
  const quote = { ...q, deadline: BigInt(Math.floor(Date.now() / 1000) + 120) }
  const signature = await account.signTypedData({ domain: domain(), types: QUOTE_TYPES, primaryType: 'Quote', message: quote })
  const txHash = await send('trade', [quote, signature])
  return { txHash, quote }
}

export const nonceUsed = (player: Address, nonce: bigint) => read<boolean>('usedNonce', [player, nonce])

// ───────────────────────────── stats ─────────────────────────────

export async function playerStats(player: Address, today: number) {
  const [p, live, solvedToday, points, joined] = await Promise.all([
    read<[number, number, number, number, number]>('players', [player]),
    read<number>('liveStreak', [player, today]),
    read<number>('solvedIn', [player, today]),
    read<bigint>('points', [player]),
    read<boolean>('joined', [player]),
  ])
  const [lastDay, , bestStreak, solves, totalGuesses] = p
  const milestones = await Promise.all([3, 7, 14, 30].map(async (s) => ({ streak: s, bonus: fromWad(await read<bigint>('milestoneBonus', [s])), earned: bestStreak >= s })))
  return {
    address: player,
    streak: live,
    bestStreak,
    solves,
    avgGuesses: solves ? +(totalGuesses / solves).toFixed(2) : null,
    lastDay,
    solvedToday,
    points: joined ? fromWad(points) : fromWad(await read<bigint>('starterPoints')),
    joined,
    milestones,
  }
}

export async function allPlayers(today: number) {
  const n = await read<bigint>('playerCount')
  const rows: { address: Address; streak: number; bestStreak: number; solves: number; avgGuesses: number; cash: number }[] = []
  for (let off = 0n; off < n; off += 200n) {
    const [addrs, stats, cash] = await read<[Address[], { lastDay: number; streak: number; bestStreak: number; solves: number; totalGuesses: number }[], bigint[]]>('getPlayers', [off, 200n])
    addrs.forEach((a, i) => {
      const s = stats[i]
      const live = s.solves > 0 && (s.lastDay === today || s.lastDay + 1 === today) ? s.streak : 0
      rows.push({ address: a, streak: live, bestStreak: s.bestStreak, solves: s.solves, avgGuesses: s.solves ? +(s.totalGuesses / s.solves).toFixed(2) : 0, cash: fromWad(cash[i]) })
    })
  }
  return rows
}
