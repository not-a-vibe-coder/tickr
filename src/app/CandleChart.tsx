import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { gsap, prefersReducedMotion } from '../lib/gsap'

export type CandleDatum = { o: number; h: number; l: number; c: number; v?: number }

type Props = {
  candles: CandleDatum[]
  /** Label shown in the tooltip for candle i. */
  labelAt: (i: number) => string
  /** x-axis ticks: candle index + text. */
  ticks: { i: number; label: string }[]
  /** Format a y value (price or indexed level). */
  fmt: (v: number) => string
  showVolume?: boolean
  /** Dashed horizontal line (e.g. live price). */
  live?: number | null
  className?: string
  /** Re-run the draw-in animation whenever this changes. */
  animateKey?: string | number
  ariaLabel: string
}

const UP = '#B8F36B'
const DOWN = '#E2716A'

/** Responsive SVG candlestick chart with volume, y-axis, crosshair and OHLC readout. */
export default function CandleChart({ candles, labelAt, ticks, fmt, showVolume = true, live, className = '', animateKey, ariaLabel }: Props) {
  const clip = useRef<SVGRectElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const n = candles.length
  const SLOT = 10
  const W = Math.max(1, n) * SLOT
  const H = 1000
  const priceH = showVolume ? H * 0.8 : H

  const { lo, hi, vmax } = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    let vmax = 1
    for (const c of candles) {
      lo = Math.min(lo, c.l)
      hi = Math.max(hi, c.h)
      vmax = Math.max(vmax, c.v ?? 0)
    }
    if (live != null) {
      lo = Math.min(lo, live)
      hi = Math.max(hi, live)
    }
    const pad = (hi - lo || hi * 0.01 || 1) * 0.08
    return { lo: lo - pad, hi: hi + pad, vmax }
  }, [candles, live])

  const y = (v: number) => ((hi - v) / (hi - lo)) * priceH
  const yTicks = useMemo(() => Array.from({ length: 5 }, (_, i) => hi - ((hi - lo) * (i + 0.5)) / 5), [hi, lo])

  useLayoutEffect(() => {
    if (!clip.current) return
    if (prefersReducedMotion()) {
      clip.current.setAttribute('width', String(W + SLOT))
      return
    }
    const t = gsap.fromTo(clip.current, { attr: { width: 0 } }, { attr: { width: W + SLOT }, duration: 1.4, ease: 'power2.inOut' })
    return () => void t.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateKey])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const f = Math.min(0.9999, Math.max(0, (e.clientX - r.left) / r.width))
    setHover(Math.floor(f * n))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    setHover((h) => Math.min(n - 1, Math.max(0, (h ?? n - 1) + (e.key === 'ArrowRight' ? step : -step))))
  }

  const hc = hover != null ? candles[hover] : null
  const last = candles[n - 1]

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* OHLC readout */}
      <div className="flex h-6 items-center gap-3 px-1 font-mono text-[10.5px] text-muted">
        {(() => {
          const c = hc ?? last
          if (!c) return null
          const up = c.c >= c.o
          return (
            <>
              <span className="text-paper/70">{hover != null ? labelAt(hover) : 'Latest'}</span>
              <span>O <b className="font-normal text-paper/90">{fmt(c.o)}</b></span>
              <span>H <b className="font-normal text-paper/90">{fmt(c.h)}</b></span>
              <span>L <b className="font-normal text-paper/90">{fmt(c.l)}</b></span>
              <span>C <b className={`font-normal ${up ? 'text-market' : 'text-loss'}`}>{fmt(c.c)}</b></span>
            </>
          )
        })()}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div
          className="relative min-h-0 flex-1 cursor-crosshair outline-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          tabIndex={0}
          role="img"
          aria-label={ariaLabel}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <clipPath id={`clip-${animateKey}`}>
                <rect ref={clip} x={-SLOT} y={0} width={W + SLOT} height={H} />
              </clipPath>
            </defs>
            {yTicks.map((v) => (
              <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
            ))}
            <g clipPath={`url(#clip-${animateKey})`}>
              {candles.map((c, i) => {
                const up = c.c >= c.o
                const col = up ? UP : DOWN
                const x = i * SLOT + SLOT / 2
                const top = y(Math.max(c.o, c.c))
                const bh = Math.max(1.5, Math.abs(y(c.o) - y(c.c)))
                return (
                  <g key={i} opacity={hover != null && hover !== i ? 0.75 : 1}>
                    {showVolume && c.v != null && (
                      <rect x={i * SLOT + SLOT * 0.2} y={H - (c.v / vmax) * H * 0.16} width={SLOT * 0.6} height={(c.v / vmax) * H * 0.16} fill={col} opacity={0.22} />
                    )}
                    <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    <rect x={i * SLOT + SLOT * 0.18} y={top} width={SLOT * 0.64} height={bh} fill={up ? col : col} fillOpacity={up ? 0.9 : 0.85} />
                  </g>
                )
              })}
            </g>
            {live != null && <line x1={0} x2={W} y1={y(live)} y2={y(live)} stroke={UP} strokeDasharray="4 4" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.7} />}
            {hover != null && <line x1={hover * SLOT + SLOT / 2} x2={hover * SLOT + SLOT / 2} y1={0} y2={H} stroke="rgba(243,244,237,0.3)" vectorEffect="non-scaling-stroke" />}
          </svg>

          {/* x ticks */}
          <div className="pointer-events-none absolute -bottom-5 left-0 right-0 h-4 font-mono text-[9px] text-muted">
            {ticks.map((t, k) => (
              <span key={k} className="absolute whitespace-nowrap" style={{ left: `${((t.i + 0.5) / Math.max(1, n)) * 100}%`, transform: 'translateX(-50%)' }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* y axis */}
        <div className="pointer-events-none relative w-14 shrink-0 font-mono text-[9.5px] text-muted">
          {yTicks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${(y(v) / H) * 100}%` }}>
              {fmt(v)}
            </span>
          ))}
          {live != null && (
            <span className="absolute right-0 -translate-y-1/2 rounded bg-market px-1 py-0.5 text-[9.5px] font-semibold text-obsidian" style={{ top: `${(y(live) / H) * 100}%` }}>
              {fmt(live)}
            </span>
          )}
        </div>
      </div>
      <div className="h-5" />
    </div>
  )
}
