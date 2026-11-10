import { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { ConfigPayload, LeaderboardRow } from '../../shared/api'
import { api } from './api'
import { shortAddr, useAuth } from './auth'
import { fmtNum } from './Trade'

export default function Leaderboard({ cfg }: { cfg: ConfigPayload }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [by, setBy] = useState<'networth' | 'streak'>('networth')
  const { address } = useAuth()
  useEffect(() => {
    api.leaderboard().then((r) => setRows(r.rows)).catch((e) => setErr(e.message))
  }, [])
  const sorted = useMemo(
    () => (rows ? [...rows].sort((a, b) => (by === 'networth' ? b.netWorth - a.netWorth : b.streak - a.streak || b.bestStreak - a.bestStreak || a.avgGuesses - b.avgGuesses)) : null),
    [rows, by],
  )

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="micro mb-3 text-muted">{cfg.season === 'preview' ? 'Preview season · resets at the 20 Dec launch' : 'Season 0'} · read live from Robinhood Chain</p>
          <h1 className="display text-[13vw] sm:text-6xl">Leaderboard<span className="text-market">.</span></h1>
        </div>
        <div className="flex rounded-full border border-line p-1" role="tablist" aria-label="Rank by">
          {([['networth', 'Net worth'], ['streak', 'Streak']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={by === k} onClick={() => setBy(k)} className={`rounded-full px-4 py-1.5 text-[13px] ${by === k ? 'bg-paper text-obsidian' : 'text-paper/60 hover:text-paper'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="panel overflow-hidden rounded-[28px]">
        <div className="micro grid grid-cols-[2.5rem_1fr_7rem_4rem] gap-2 border-b border-line px-5 py-3 text-muted sm:grid-cols-[3rem_1fr_9rem_8rem_5rem_5rem]">
          <span>#</span><span>Player</span><span className="text-right">Net worth</span>
          <span className="hidden text-right sm:block">Cash</span><span className="text-right">Streak</span><span className="hidden text-right sm:block">Best</span>
        </div>
        {err && <p className="p-6 text-loss">{err}</p>}
        {!sorted && !err && <p className="p-6 text-muted">Loading…</p>}
        {sorted?.length === 0 && (
          <div className="grid place-items-center px-6 py-16 text-center">
            <Trophy className="text-market" />
            <p className="mt-4 text-paper/70">{cfg.contract ? 'No players yet. Solve the daily or place a trade to get on the board.' : 'The on-chain leaderboard goes live once the contract is deployed.'}</p>
          </div>
        )}
        <ol>
          {sorted?.map((r, i) => {
            const me = address?.toLowerCase() === r.address.toLowerCase()
            return (
              <li key={r.address} className={`grid grid-cols-[2.5rem_1fr_7rem_4rem] items-center gap-2 border-b border-line px-5 py-3.5 text-[14px] last:border-0 sm:grid-cols-[3rem_1fr_9rem_8rem_5rem_5rem] ${me ? 'bg-market/[0.06]' : ''}`}>
                <span className={`font-mono text-[12px] ${i < 3 ? 'text-market' : 'text-muted'}`}>{String(i + 1).padStart(2, '0')}</span>
                <a href={cfg.explorer ? `${cfg.explorer}/address/${r.address}` : undefined} target="_blank" rel="noreferrer" className="truncate font-mono text-[13px] hover:text-market">
                  {shortAddr(r.address)} {me && <span className="micro ml-2 text-market">You</span>}
                </a>
                <span className="text-right font-mono">{fmtNum(r.netWorth)} <span className="text-[10px] text-muted">TCKR</span></span>
                <span className="hidden text-right font-mono text-muted sm:block">{fmtNum(r.cash)}</span>
                <span className="text-right font-mono text-amber">🔥{r.streak}</span>
                <span className="hidden text-right font-mono sm:block">{r.bestStreak}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}
