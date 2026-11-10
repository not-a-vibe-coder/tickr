import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import MysteryChart from '../components/MysteryChart'
import { gsap, prefersReducedMotion } from '../lib/gsap'
import { scale } from '../lib/chart'
import type { PuzzlePayload } from '../../shared/api'

const W = 1000
const H = 420

/** The live mystery chart: real (rebased) prices, month axis, volume, and a % change inspector. */
export default function GameChart({ puzzle, showVolume, tone }: { puzzle: PuzzlePayload; showVolume: boolean; tone: 'play' | 'won' | 'lost' }) {
  const reveal = useRef<SVGRectElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const pts = useMemo(() => scale(puzzle.points, W, H * 0.8), [puzzle.points])
  const n = puzzle.points.length

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !reveal.current) return
    const t = gsap.fromTo(reveal.current, { attr: { width: 0 } }, { attr: { width: W + 20 }, duration: 1.8, ease: 'power2.inOut' })
    return () => void t.kill()
  }, [puzzle.points])

  const at = (i: number) => ({ x: (pts[i].x / W) * 100, y: (pts[i].y / H) * 100 })
  const pct = (i: number) => puzzle.points[i] - 100
  const monthOf = (i: number) => [...puzzle.monthTicks].reverse().find((m) => m.i <= i)?.label ?? ''
  const total = pct(n - 1)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (n - 1)))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step = e.shiftKey ? 15 : 3
    setHover((h) => Math.min(n - 1, Math.max(0, (h ?? Math.floor(n / 2)) + (e.key === 'ArrowRight' ? step : -step))))
  }
  const color = tone === 'lost' ? 'var(--color-loss)' : 'var(--color-market)'

  return (
    <div className="relative rounded-2xl border border-line bg-obsidian/60">
      <div className="micro flex items-center justify-between px-4 pt-3 !text-[9.5px] text-muted">
        <span>Indexed to 100 at first close</span>
        <span className={total >= 0 ? 'text-market' : 'text-loss'}>
          {total >= 0 ? '+' : ''}
          {total.toFixed(1)}% over the period
        </span>
      </div>
      <div
        className="relative mx-3 mb-7 mt-2 h-56 cursor-crosshair outline-none sm:h-72"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        tabIndex={0}
        role="img"
        aria-label={`Mystery price chart, ${total >= 0 ? 'up' : 'down'} ${Math.abs(total).toFixed(1)} percent over the period. Arrow keys inspect points.`}
      >
        <MysteryChart key={puzzle.points.length + puzzle.points[5]} points={puzzle.points} volume={puzzle.volume} showVolume={showVolume} grid width={W} height={H} revealRef={reveal} color={color} strokeWidth={2} className="h-full w-full" />
        {hover !== null && (
          <div className="pointer-events-none absolute inset-y-0" style={{ left: `${at(hover).x}%` }}>
            <span className="absolute inset-y-0 w-px bg-paper/25" />
            <span className="absolute -left-[5px] block h-2.5 w-2.5 rounded-full bg-paper" style={{ top: `calc(${at(hover).y}% - 5px)` }} />
            <div className={`absolute top-0 whitespace-nowrap rounded-lg border border-line bg-obsidian/90 px-2.5 py-1.5 font-mono text-[11px] backdrop-blur ${at(hover).x > 70 ? 'right-3' : 'left-3'}`}>
              <span className="text-muted">{monthOf(hover)} · day {hover + 1}</span>{' '}
              <span className={pct(hover) >= 0 ? 'text-market' : 'text-loss'}>
                {pct(hover) >= 0 ? '+' : ''}
                {pct(hover).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute -bottom-6 left-0 right-0 font-mono text-[9px] text-muted">
          {puzzle.monthTicks.map((m) => (
            <span key={m.i} className="absolute -translate-x-1/2" style={{ left: `${(m.i / (n - 1)) * 100}%` }}>
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
