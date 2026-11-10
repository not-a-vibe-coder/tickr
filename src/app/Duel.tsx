import { Link, useSearchParams } from 'react-router-dom'
import { Swords } from 'lucide-react'
import type { GuessResult } from '../../shared/companies'
import type { ConfigPayload } from '../../shared/api'

const MAP: Record<string, GuessResult> = { m: 'miss', w: 'warm', h: 'hit' }

export function parseDuel(p: URLSearchParams, today: number) {
  const d = Number(p.get('d'))
  const r = (p.get('r') ?? '').split('').map((c) => MAP[c]).filter(Boolean)
  if (d !== today || !r.length) return undefined
  return { by: p.get('by') ?? 'A friend', results: r }
}

export default function Duel({ cfg }: { cfg: ConfigPayload }) {
  const [p] = useSearchParams()
  const d = Number(p.get('d'))
  const by = p.get('by') ?? 'A friend'
  const r = (p.get('r') ?? '').split('').map((c) => MAP[c]).filter(Boolean)
  const live = d === cfg.today
  const label = d < cfg.launchDay ? `Preview #${d - cfg.previewDay + 1}` : `#${String(d - cfg.launchDay + 1).padStart(3, '0')}`

  return (
    <div className="panel mx-auto max-w-xl rounded-[28px] p-8 text-center sm:p-12">
      <Swords className="mx-auto text-market" size={30} />
      <p className="micro mt-6 text-muted">Duel · Case {label}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-[0.95] tracking-tight">{by} challenges you</h1>
      <p className="mt-5 text-2xl tracking-[0.2em]">{r.map((x) => ({ miss: '🟥', warm: '🟨', hit: '🟩' })[x]).join('')}</p>
      <p className="mt-2 text-paper/65">Solved in {r.length}/6. Same chart, no hints from them.</p>
      {live ? (
        <Link to={`/play?${p.toString()}`} className="mt-8 inline-block rounded-full bg-market px-6 py-3 text-[13px] font-semibold text-obsidian transition hover:bg-paper">Accept the duel</Link>
      ) : (
        <>
          <p className="mt-6 text-[14px] text-muted">This duel was for an earlier daily chart.</p>
          <Link to="/play" className="mt-4 inline-block rounded-full bg-market px-6 py-3 text-[13px] font-semibold text-obsidian">Play today's case</Link>
        </>
      )}
    </div>
  )
}
