import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import MysteryChart from './MysteryChart'
import SplitHeadline from './SplitHeadline'
import { useGsap } from '../hooks/useGsap'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { DEMO_PUZZLE, MONTHS, STORY_SERIES, STORY_VOLUME } from '../data/demo'
import { scale } from '../lib/chart'

const W = 1000
const H = 500
const PRICE_H = H * 0.8 // MysteryChart reserves the bottom 20% for volume

const EVIDENCE = [
  { idx: 24, clue: DEMO_PUZZLE.clues[0], file: 'EVD-001-A', rot: -2.5 },
  { idx: 78, clue: DEMO_PUZZLE.clues[1], file: 'EVD-001-B', rot: 1.8 },
  { idx: 124, clue: DEMO_PUZZLE.clues[2], file: 'EVD-001-C', rot: -1.2 },
]

/** Illustrative price for tooltip display only. */
function priceAt(i: number) {
  const min = Math.min(...STORY_SERIES)
  const max = Math.max(...STORY_SERIES)
  return 80 + ((STORY_SERIES[i] - min) / (max - min)) * 80
}
function dateAt(i: number) {
  const d = new Date(Date.UTC(2021, 0, 1) + Math.round((i / (STORY_SERIES.length - 1)) * 364) * 864e5)
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')} 2021`
}

/** SCENE 03 — the clues are in the chart. */
export default function ClueReveal() {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const reveal = useRef<SVGRectElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const pts = useMemo(() => scale(STORY_SERIES, W, PRICE_H), [])
  const pos = (i: number) => ({ x: (pts[i].x / W) * 100, y: (pts[i].y / H) * 100 })

  useGsap(root, ({ reduced, q }) => {
    const build = () => {
      const tl = gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(q('.cr-head .word-inner'), { yPercent: 115, stagger: 0.06, duration: 0.8, ease: 'expo.out' })
        .from(q('.cr-fade'), { opacity: 0, y: 14, stagger: 0.1, duration: 0.6 }, '<0.2')
        .fromTo(reveal.current, { attr: { width: 0 } }, { attr: { width: W + 20 }, duration: 2.2, ease: 'power2.inOut' }, '<')
        .from(q('.cr-axis span'), { opacity: 0, stagger: 0.03, duration: 0.3 }, '<0.6')
      EVIDENCE.forEach((_, i) => {
        tl.from(q(`.cr-pin-${i}`), { scale: 0, opacity: 0, duration: 0.4, ease: 'back.out(3)' }, i ? '+=0.3' : '-=0.4')
          .from(q(`.cr-lead-${i}`), { scaleY: 0, duration: 0.4 }, '<0.1')
          .from(q(`.cr-card-${i}`), { opacity: 0, y: 30, filter: 'blur(8px)', duration: 0.7 }, '<0.15')
      })
      return tl.to({}, { duration: 0.5 })
    }

    if (reduced) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px)', () => {
      ScrollTrigger.create({ animation: build(), trigger: pin.current, start: 'top top', end: '+=2000', pin: true, scrub: 0.8, anticipatePin: 1 })
    })
    mm.add('(max-width: 1023px)', () => {
      const tl = build().pause()
      ScrollTrigger.create({ trigger: pin.current, start: 'top 70%', once: true, onEnter: () => void tl.play() })
    })
  })

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    setHover(Math.round(f * (STORY_SERIES.length - 1)))
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step = e.shiftKey ? 10 : 2
    setHover((h) => Math.min(STORY_SERIES.length - 1, Math.max(0, (h ?? 70) + (e.key === 'ArrowRight' ? step : -step))))
  }

  return (
    <section ref={root} className="relative" aria-labelledby="cr-title">
      <div ref={pin} className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden py-24 lg:h-[100svh] lg:py-0">
        <div className="grid-bg absolute inset-0 -z-10 opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />

        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="cr-fade micro mb-5 flex items-center gap-3 text-muted">
                <span className="text-market">03</span> <span className="h-px w-8 bg-line" /> Read between the lines
              </p>
              <SplitHeadline className="cr-head text-[11vw] sm:text-[8.5vw] lg:text-[5.6vw] 2xl:text-[88px]" id="cr-title" lines={['The clues are', <>in the chart<span className="text-market">.</span></>]} />
            </div>
            <p className="cr-fade max-w-sm text-[16px] leading-relaxed text-paper/65 lg:pb-2">
              Trends, crashes, breakouts. Every company leaves fingerprints. Hover the chart and read the evidence.
            </p>
          </div>

          {/* the evidence board */}
          <div className="relative mt-10 lg:mt-12">
            <div
              className="relative h-[46vh] min-h-[300px] cursor-crosshair rounded-3xl border border-line bg-charcoal/60 outline-none lg:h-[52vh]"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              onKeyDown={onKey}
              onBlur={() => setHover(null)}
              tabIndex={0}
              role="img"
              aria-label="Illustrative mystery chart for 2021. Use left and right arrow keys to inspect points."
            >
              <div className="absolute inset-x-4 bottom-9 top-6 sm:inset-x-8 sm:right-16">
                <MysteryChart points={STORY_SERIES} volume={STORY_VOLUME} showVolume grid width={W} height={H} revealRef={reveal} strokeWidth={2.2} className="h-full w-full" />

                {/* evidence pins */}
                {EVIDENCE.map((e, i) => {
                  const p = pos(e.idx)
                  const below = p.y < 42
                  return (
                    <div key={i} className="pointer-events-none absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                      <span className={`cr-pin-${i} absolute -left-[6px] -top-[6px] block h-3 w-3 rounded-full border-2 border-obsidian bg-amber shadow-[0_0_0_4px_rgba(232,195,106,0.18)]`} />
                      <span className={`cr-lead-${i} absolute left-0 hidden w-px bg-amber/50 lg:block ${below ? 'top-2 h-14 origin-top' : 'bottom-2 h-14 origin-bottom'}`} />
                      <article
                        className={`cr-card-${i} panel absolute hidden w-[230px] -translate-x-1/2 rounded-xl p-4 lg:block ${below ? 'top-16' : 'bottom-16'}`}
                        style={{ rotate: `${e.rot}deg` }}
                      >
                        <span className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-2 bg-paper/10 backdrop-blur-sm" aria-hidden="true" />
                        <div className="micro flex justify-between !text-[9px] text-muted">
                          <span className="text-amber">Exhibit {e.clue.exhibit}</span>
                          <span>{e.file}</span>
                        </div>
                        <p className="micro mt-3 text-muted">{e.clue.label}</p>
                        <p className="mt-1 font-display text-[28px] font-semibold leading-none tracking-tight">{e.clue.value}</p>
                      </article>
                    </div>
                  )
                })}

                {/* hover crosshair */}
                {hover !== null && (
                  <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos(hover).x}%` }}>
                    <span className="absolute inset-y-0 w-px bg-paper/25" />
                    <span className="absolute -left-[5px] block h-2.5 w-2.5 rounded-full bg-paper shadow-[0_0_14px_#F3F4ED]" style={{ top: `calc(${pos(hover).y}% - 5px)` }} />
                    <div
                      className={`absolute top-0 whitespace-nowrap rounded-lg border border-line bg-obsidian/90 px-3 py-2 font-mono text-[11px] backdrop-blur ${pos(hover).x > 70 ? 'right-3' : 'left-3'}`}
                    >
                      <div className="text-muted">{dateAt(hover)}</div>
                      <div className="mt-0.5 text-paper">
                        ${priceAt(hover).toFixed(2)}{' '}
                        <span className={hover > 0 && STORY_SERIES[hover] >= STORY_SERIES[hover - 1] ? 'text-market' : 'text-loss'}>
                          {hover > 0 && STORY_SERIES[hover] >= STORY_SERIES[hover - 1] ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="cr-axis absolute bottom-3 left-4 right-4 flex justify-between font-mono text-[9.5px] text-muted sm:left-8 sm:right-16">
                {MONTHS.map((m, i) => <span key={m} className={i % 2 ? 'hidden sm:inline' : ''}>{m}</span>)}
              </div>
              <div className="cr-axis absolute bottom-9 right-4 top-6 hidden flex-col justify-between text-right font-mono text-[9.5px] text-muted sm:flex">
                {['$160', '$140', '$120', '$100', '$80'].map((v) => <span key={v}>{v}</span>)}
              </div>
              <span className="micro absolute left-4 top-3 !text-[9px] text-muted/70 sm:left-8">Illustrative chart · not real market data</span>
            </div>

            {/* evidence on mobile/tablet: stacked */}
            <div className="mt-4 grid grid-cols-3 gap-2 lg:hidden">
              {EVIDENCE.map((e, i) => (
                <article key={i} className={`cr-card-${i} panel rounded-xl p-3`}>
                  <span className="micro block !text-[8.5px] text-amber">Exhibit {e.clue.exhibit}</span>
                  <span className="micro mt-2 block !text-[8.5px] text-muted">{e.clue.label}</span>
                  <span className="mt-1 block font-display text-[17px] font-semibold leading-tight tracking-tight">{e.clue.value}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
