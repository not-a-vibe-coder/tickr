import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Flame, KeyRound, Loader2 } from 'lucide-react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import type { GuessResponse, WifInfo } from '../../shared/api'
import { WIF_ERC20_ABI, WIF_POT_ABI, WIF_TOKEN, robinhoodMainnet } from '../../shared/wif'
import { api } from './api'
import { useAuth } from './auth'

const fmtWif = (s: string | number) => {
  const n = Number(s)
  if (!Number.isFinite(n)) return String(s)
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function useWifInfo() {
  const { address } = useAuth()
  const [info, setInfo] = useState<WifInfo | null>(null)
  const refresh = useCallback(() => {
    api.wif(address).then(setInfo).catch(() => setInfo(null))
  }, [address])
  useEffect(() => {
    refresh()
    window.addEventListener('tickr:stats', refresh)
    return () => window.removeEventListener('tickr:stats', refresh)
  }, [refresh])
  return { info, refresh }
}

/**
 * The daily $WIF pot (Robinhood Chain mainnet): what a solve pays, and "unlock the next clue" for $WIF.
 * Clue payments refill the pot (minus a burn), so spending on hard days funds tomorrow's rewards.
 */
export default function WifPanel({ session, canBuy, onClues }: { session: string; canBuy: boolean; onClues: (clues: GuessResponse['clues']) => void }) {
  const { info, refresh } = useWifInfo()
  const auth = useAuth()
  const { chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient({ chainId: robinhoodMainnet.id })
  const [step, setStep] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tx, setTx] = useState<string | null>(null)

  if (!info || !info.enabled) return null
  const price = BigInt(info.cluePriceWei)
  const bought = info.me?.cluesBought ?? 0

  const buy = async () => {
    if (!auth.address || !client) return auth.login()
    setErr(null)
    setTx(null)
    try {
      const player = auth.address as `0x${string}`
      const pot = info.pot as `0x${string}`
      if (chainId !== robinhoodMainnet.id) {
        setStep('Switching to Robinhood Chain…')
        await switchChainAsync({ chainId: robinhoodMainnet.id })
      }
      setStep('Checking your $WIF…')
      const [bal, allowance] = await Promise.all([
        client.readContract({ address: WIF_TOKEN, abi: WIF_ERC20_ABI, functionName: 'balanceOf', args: [player] }),
        client.readContract({ address: WIF_TOKEN, abi: WIF_ERC20_ABI, functionName: 'allowance', args: [player, pot] }),
      ])
      if (bal < price) throw new Error(`You need ${fmtWif(info.cluePrice)} $WIF on Robinhood Chain to unlock a clue.`)
      if (allowance < price) {
        setStep('Approve $WIF in your wallet…')
        const h = await writeContractAsync({ chainId: robinhoodMainnet.id, address: WIF_TOKEN, abi: WIF_ERC20_ABI, functionName: 'approve', args: [pot, price * 5n] })
        setStep('Waiting for the approval…')
        await client.waitForTransactionReceipt({ hash: h })
      }
      setStep('Confirm the clue in your wallet…')
      const h = await writeContractAsync({ chainId: robinhoodMainnet.id, address: pot, abi: WIF_POT_ABI, functionName: 'buyClue', args: [info.day] })
      setStep('Unlocking…')
      await client.waitForTransactionReceipt({ hash: h })
      setTx(h)
      const r = await api.wifClues(session)
      onClues(r.clues)
      refresh()
    } catch (e) {
      const m = (e as Error).message ?? 'Something went wrong'
      setErr(/reject|denied|cancel/i.test(m) ? 'Cancelled in your wallet.' : m.split('\n')[0])
    } finally {
      setStep(null)
    }
  }

  return (
    <section className="mt-4 rounded-2xl border-2 border-line-ink bg-band/60 p-4" aria-label="$WIF daily pot">
      <div className="flex items-baseline justify-between gap-3">
        <p className="micro text-ink">Daily $WIF pot</p>
        <a href={`${info.explorer}/address/${info.pot}`} target="_blank" rel="noreferrer" className="micro inline-flex items-center gap-1 text-ink/60 hover:text-ink">
          Mainnet <ExternalLink size={11} />
        </a>
      </div>
      <p className="mt-2 font-display text-[30px] leading-none">{fmtWif(info.leftToday)} <span className="text-[18px]">$WIF left today</span></p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink/75">
        Solve it to win up to <b>{fmtWif(info.maxReward)} $WIF</b> (fewer guesses, bigger share). Paid to your wallet automatically.
      </p>

      {canBuy && (
        <div className="mt-3 border-t-2 border-dashed border-line pt-3">
          <button
            type="button"
            onClick={() => void buy()}
            disabled={Boolean(step) || bought >= 5}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-[3px] border-line-ink bg-surface px-4 py-2.5 font-pill text-[13px] uppercase shadow-[0_4px_0_-1px_var(--color-parchment),0_4px_0_2px_var(--color-line-ink)] transition hover:translate-y-0.5 disabled:opacity-60"
          >
            {step ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            {step ?? (bought >= 5 ? 'All clues unlocked' : `Unlock next clue · ${fmtWif(info.cluePrice)} $WIF`)}
          </button>
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink/60">
            <Flame size={12} /> {info.burnBps / 100}% is burned, the rest refills the pot for tomorrow's solvers.
          </p>
        </div>
      )}
      {err && <p className="mt-2 text-[12px] text-loss">{err}</p>}
      {tx && (
        <a href={`${info.explorer}/tx/${tx}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-market hover:underline">
          Clue unlocked on-chain <ExternalLink size={11} />
        </a>
      )}
    </section>
  )
}

export { fmtWif }
