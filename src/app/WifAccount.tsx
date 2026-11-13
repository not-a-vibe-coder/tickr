import { useEffect, useState } from 'react'
import { ExternalLink, Flame, KeyRound, Trophy, Wallet } from 'lucide-react'
import type { WifHistory } from '../../shared/api'
import { api } from './api'
import { fmtWif } from './WifPanel'

const dayLabel = (day: number) =>
  new Date(day * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

/**
 * A player's $WIF account with Tickr, read from the chain: what they earned from solves,
 * what they spent on clues, and what their wallet holds now. Rewards land directly in the wallet,
 * so there is no balance held by Tickr and nothing to withdraw.
 */
export default function WifAccount({ address }: { address: string }) {
  const [h, setH] = useState<WifHistory | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let live = true
    const load = () =>
      api
        .wifHistory(address)
        .then((r) => live && (setH(r), setErr(false)))
        .catch(() => live && setErr(true))
    load()
    window.addEventListener('tickr:stats', load)
    return () => {
      live = false
      window.removeEventListener('tickr:stats', load)
    }
  }, [address])

  if (h && !h.enabled) return null

  const stat = (icon: React.ReactNode, label: string, value: string, sub: string) => (
    <div className="panel rounded-3xl p-5">
      <p className="micro flex items-center gap-1.5 text-muted">
        {icon} {label}
      </p>
      <p className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">{value}</p>
      <p className="mt-1 text-[12px] text-muted">{sub}</p>
    </div>
  )

  return (
    <section className="mt-10" aria-label="Your $WIF">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl uppercase">Your $WIF</h2>
          <p className="mt-1 max-w-xl text-[13px] text-muted">
            Rewards are sent straight to your wallet on Robinhood Chain, so there's nothing to withdraw. You can send or swap your $WIF from your wallet any time.
          </p>
        </div>
        {h?.enabled && (
          <a
            href={`${h.explorer}/address/${address}?tab=tokens`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[12.5px] hover:border-paper/40"
          >
            View wallet on explorer <ExternalLink size={12} />
          </a>
        )}
      </div>

      {err && !h && <p className="text-[13px] text-muted">Couldn't load your $WIF right now. Try again in a moment.</p>}
      {!h && !err && <p className="text-[13px] text-muted">Reading your $WIF from Robinhood Chain…</p>}

      {h?.enabled && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stat(<Trophy size={13} />, 'Earned', fmtWif(h.earned), `From ${h.wins} daily ${h.wins === 1 ? 'solve' : 'solves'}`)}
            {stat(<KeyRound size={13} />, 'Spent on clues', fmtWif(h.spent), `${h.cluesBought} ${h.cluesBought === 1 ? 'clue' : 'clues'} · ${fmtWif(h.burned)} burned`)}
            {stat(<Wallet size={13} />, 'In your wallet', fmtWif(h.wallet), 'All the $WIF this wallet holds now')}
          </div>

          <div className="panel mt-3 rounded-3xl p-5">
            <p className="micro text-muted">History</p>
            {h.events.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-muted">No $WIF activity yet. Solve today's daily case to earn your first reward.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {h.events.map((ev) => (
                  <li key={ev.txHash + ev.kind} className="flex items-center justify-between gap-3 py-3 text-[13.5px]">
                    <span className="flex min-w-0 items-center gap-2">
                      {ev.kind === 'reward' ? <Trophy size={14} className="shrink-0 text-market" /> : <Flame size={14} className="shrink-0 text-amber" />}
                      <span className="truncate">
                        {ev.kind === 'reward'
                          ? `Solved in ${ev.guesses} ${ev.guesses === 1 ? 'guess' : 'guesses'}`
                          : `Bought clue ${ev.clueNumber} (${fmtWif(ev.burned)} burned)`}
                        <span className="text-muted"> · {dayLabel(ev.day)}</span>
                      </span>
                    </span>
                    <a
                      href={`${h.explorer}/tx/${ev.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex shrink-0 items-center gap-1 font-semibold hover:underline ${ev.kind === 'reward' ? 'text-market' : ''}`}
                    >
                      {ev.kind === 'reward' ? '+' : '−'}
                      {fmtWif(ev.amount)} $WIF <ExternalLink size={11} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
