/**
 * The $WIF loop on Robinhood Chain mainnet (TickrWifPot).
 * The game itself stays on testnet; only the $WIF rewards and clue purchases touch mainnet.
 */
import { createPublicClient, createWalletClient, formatUnits, http, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { REWARD_TYPES, WIF_ERC20_ABI, WIF_POT_ABI, WIF_TOKEN, robinhoodMainnet } from '../shared/wif.js'

const e = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined)
const KEY = e('WIF_SIGNER_KEY') as Hex | undefined
const POT = (e('WIF_CONTRACT') || null) as Address | null
const RPC = e('WIF_RPC_URL') || robinhoodMainnet.rpcUrls.default.http[0]

const account = KEY ? privateKeyToAccount(KEY) : null
export const wifClient = createPublicClient({ chain: robinhoodMainnet, transport: http(RPC) })
const wallet = account ? createWalletClient({ account, chain: robinhoodMainnet, transport: http(RPC) }) : null

export const wifReady = () => Boolean(POT && account)
export const wifPotAddress = () => POT

const read = <T>(functionName: string, args: unknown[] = []) =>
  wifClient.readContract({ address: POT!, abi: WIF_POT_ABI, functionName, args } as never) as Promise<T>

const fmt = (v: bigint) => formatUnits(v, 18)

let queue: Promise<unknown> = Promise.resolve()
function send(functionName: string, args: unknown[]): Promise<Hex> {
  if (!wallet || !POT) return Promise.reject(new Error('$WIF pot not configured'))
  const run = async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        const nonce = await wifClient.getTransactionCount({ address: account!.address, blockTag: 'pending' })
        return await wallet.writeContract({ address: POT, abi: WIF_POT_ABI, functionName, args, nonce } as never)
      } catch (err) {
        if (attempt < 2 && /nonce|replacement|already known/i.test(String((err as Error).message))) continue
        throw err
      }
    }
  }
  const p = queue.then(run, run)
  queue = p.catch(() => undefined)
  return p
}

/** Pot state for the UI. Amounts are decimal strings in $WIF. */
export async function potInfo(day: number) {
  if (!wifReady()) return null
  const [pot, rewardUnit, dailyCap, cluePrice, burnBps, paidToday, totalPaid, totalBurned] = await Promise.all([
    read<bigint>('pot'),
    read<bigint>('rewardUnit'),
    read<bigint>('dailyCap'),
    read<bigint>('cluePrice'),
    read<number>('burnBps'),
    read<bigint>('paidOn', [day]),
    read<bigint>('totalPaid'),
    read<bigint>('totalBurned'),
  ])
  const leftToday = dailyCap > paidToday ? dailyCap - paidToday : 0n
  return {
    chainId: robinhoodMainnet.id,
    pot: POT!,
    token: WIF_TOKEN,
    explorer: robinhoodMainnet.blockExplorers.default.url,
    balance: fmt(pot),
    rewardUnit: fmt(rewardUnit),
    maxReward: fmt(rewardUnit * 6n),
    dailyCap: fmt(dailyCap),
    leftToday: fmt(leftToday < pot ? leftToday : pot),
    cluePrice: fmt(cluePrice),
    cluePriceWei: cluePrice.toString(),
    burnBps,
    totalPaid: fmt(totalPaid),
    totalBurned: fmt(totalBurned),
  }
}

export async function playerWif(player: Address, day: number) {
  if (!wifReady()) return null
  const [claimed, clues, balance] = await Promise.all([
    read<boolean>('claimed', [player, day]),
    read<number>('cluesBought', [player, day]),
    wifClient.readContract({ address: WIF_TOKEN, abi: WIF_ERC20_ABI, functionName: 'balanceOf', args: [player] }),
  ])
  return { claimed, cluesBought: Number(clues), wif: fmt(balance) }
}

/** Extra clues the player paid for today (0 if the pot isn't configured or mainnet is unreachable). */
export async function cluesBought(player: Address | null | undefined, day: number) {
  if (!player || !wifReady()) return 0
  try {
    return Number(await read<number>('cluesBought', [player, day]))
  } catch (err) {
    console.error('cluesBought read failed', err)
    return 0
  }
}

/** Signs and relays a daily-solve reward. The contract decides the amount from `guesses` and its caps. */
export async function payReward(player: Address, day: number, guesses: number) {
  if (!wifReady()) return null
  if (await read<boolean>('claimed', [player, day])) return { alreadyClaimed: true as const }
  const amount = await read<bigint>('quote', [day, guesses])
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60)
  const signature = await account!.signTypedData({
    domain: { name: 'TickrWifPot', version: '1', chainId: robinhoodMainnet.id, verifyingContract: POT! },
    types: REWARD_TYPES,
    primaryType: 'Reward',
    message: { player, day, guesses, deadline },
  })
  const txHash = await send('claimReward', [player, day, guesses, deadline, signature])
  return { txHash, amount: fmt(amount) }
}
