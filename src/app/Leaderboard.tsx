import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { ConfigPayload, LeaderboardRow } from '../../shared/api'
import { api } from './api'
import { shortAddr, useAuth } from './auth'

export default function Leaderboard({ cfg }: { cfg: ConfigPayload }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const { address } = useAuth()
  useEffect(() => {
    api.leaderboard().then((r) => setRows(r.rows)).catch((e) => setErr(e.message))
  }, [])

  return (
    <>
      <div className="mb-8">
        <p className="micro mb-3 text-muted">{cfg.season === 'preview' ? 'Preview season · resets at the 20 Dec launch' : 'Season 0'} · read live from Robinhood Chain</p>
        <h1 className="display text-[13vw] sm:text-6xl">Leaderboard<span className="text-market">.</span></h1>
      </div>
      <div className="panel overflow-hidden rounded-[28px]">
        <div className="micro grid grid-cols-[3rem_1fr_5rem_5rem] gap-2 border-b border-line px-5 py-3 text-muted sm:grid-cols-[3rem_1fr_6rem_6rem_6rem_6rem]">
          <span>#</span><span>Player</span><span className="text-right">Streak</span><span className="text-right">Best</span>
          <span className="hidden text-right sm:block">Solves</span><span className="hidden text-right sm:block">Avg</span>
        </div>
        {err && <p className="p-6 text-loss">{err}</p>}
        {!rows && !err && <p className="p-6 text-muted">Loading…</p>}
        {rows?.length === 0 && (
          <div className="grid place-items-center px-6 py-16 text-center">
            <Trophy className="text-market" />
            <p className="mt-4 text-paper/70">{cfg.contract ? 'No solves yet. Be the first name on the board.' : 'The on-chain leaderboard goes live once the contract is deployed.'}</p>
          </div>
        )}
        <ol>
          {rows?.map((r, i) => {
            const me = address?.toLowerCase() === r.address.toLowerCase()
            return (
              <li key={r.address} className={`grid grid-cols-[3rem_1fr_5rem_5rem] items-center gap-2 border-b border-line px-5 py-3.5 text-[14px] last:border-0 sm:grid-cols-[3rem_1fr_6rem_6rem_6rem_6rem] ${me ? 'bg-market/[0.06]' : ''}`}>
                <span className={`font-mono text-[12px] ${i < 3 ? 'text-market' : 'text-muted'}`}>{String(i + 1).padStart(2, '0')}</span>
                <a href={`${cfg.explorer}/address/${r.address}`} target="_blank" rel="noreferrer" className="truncate font-mono text-[13px] hover:text-market">
                  {shortAddr(r.address)} {me && <span className="micro ml-2 text-market">You</span>}
                </a>
                <span className="text-right font-mono text-amber">🔥{r.streak}</span>
                <span className="text-right font-mono">{r.bestStreak}</span>
                <span className="hidden text-right font-mono sm:block">{r.solves}</span>
                <span className="hidden text-right font-mono text-muted sm:block">{r.avgGuesses.toFixed(1)}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}
