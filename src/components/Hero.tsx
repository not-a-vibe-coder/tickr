import { useMemo, useRef } from 'react'
import { ArrowDownRight, ArrowRight } from 'lucide-react'
import MysteryChart from './MysteryChart'
import SplitHeadline from './SplitHeadline'
import { useGsap } from '../hooks/useGsap'
import { useCountdown } from '../hooks/useCountdown'
import { STORY_SERIES } from '../data/demo'
import { scale } from '../lib/chart'
import { gsap } from '../lib/gsap'

const W = 1000
const H = 400

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const line = useRef<SVGPathElement>(null)
  const area = useRef<SVGPathElement>(null)
  const reveal = useRef<SVGRectElement>(null)
  const { label } = useCountdown()

  const pts = useMemo(() => scale(STORY_SERIES, W, H), [])
  const at = (i: number) => ({ left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%` })
  const end = pts[pts.length - 1]
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  useGsap(root, ({ reduced, q }) => {
    if (reduced) return
    gsap.set(reveal.current, { attr: { width: 0 } })
    gsap.set(area.current, { opacity: 0 })
    gsap.set(q('.hero-label, .hero-dot, .hero-fade'), { opacity: 0, y: 12 })
    gsap.set(q('.word-inner'), { yPercent: 115 })
    gsap.set(q('.hero-grid'), { opacity: 0 })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to(q('.hero-grid'), { opacity: 1, duration: 1.6, ease: 'power1.out' })
      .to(reveal.current, { attr: { width: W + 20 }, duration: 3.4, ease: 'power2.inOut' }, 0.3)
      .to(area.current, { opacity: 1, duration: 1.6 }, 2.2)
      .to(q('.hero-label'), { opacity: 1, y: 0, duration: 0.7, stagger: 0.35 }, 1.1)
      .to(q('.hero-dot'), { opacity: 1, y: 0, duration: 0.5 }, 3.5)
      .to(q('.word-inner'), { yPercent: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out' }, 1.6)
      .to(q('.hero-fade'), { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 2.4)

    // Scroll: the chart drifts up and the scene darkens as Scene 02 approaches
    gsap.to(q('.hero-chart'), {
      yPercent: -18,
      scale: 1.08,
      ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
    })
    gsap.to(q('.hero-copy'), {
      yPercent: -30,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: root.current, start: '30% top', end: 'bottom top', scrub: true },
    })
  })

  return (
    <section ref={root} id="top" className="relative isolate h-[100svh] min-h-[720px] overflow-hidden" aria-labelledby="hero-title">
      {/* atmosphere */}
      <div className="hero-grid grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_55%_45%,black,transparent)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_70%_40%,rgba(184,243,107,0.08),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-obsidian via-obsidian/80 to-transparent" />

      {/* the mystery chart */}
      <div className="hero-chart absolute left-0 right-[7%] top-[10%] h-[24%] md:top-[15%] md:h-[46%] md:right-[9%]">
        <MysteryChart points={STORY_SERIES} width={W} height={H} lineRef={line} areaRef={area} revealRef={reveal} strokeWidth={2.2} className="h-full w-full overflow-visible" />

        <span className="hero-dot absolute -translate-x-1/2 -translate-y-1/2" style={{ left: '100%', top: `${(end.y / H) * 100}%` }}>
          <span className="absolute inset-0 -m-3 rounded-full bg-market/25 blur-md" />
          <span className="relative block h-2.5 w-2.5 rounded-full bg-market shadow-[0_0_20px_#B8F36B]" />
        </span>

        {[
          { i: 22, text: 'O 104.12', sub: 'OPEN' },
          { i: 80, text: '−18.6%', sub: 'DRAWDOWN', loss: true },
          { i: 118, text: 'VOL 61.3M', sub: 'BREAKOUT' },
        ].map((l) => (
          <span key={l.i} className="hero-label absolute hidden -translate-x-1/2 sm:block" style={at(l.i)}>
            <span className="absolute left-1/2 top-0 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-white/30 to-transparent" />
            <span className={`absolute left-1/2 top-11 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] ${l.loss ? 'text-loss' : 'text-paper/80'}`}>
              {l.text}
              <span className="micro ml-2 text-muted">{l.sub}</span>
            </span>
          </span>
        ))}
      </div>

      {/* case file — the identity is classified */}
      <aside className="hero-fade panel absolute left-5 top-24 hidden w-[260px] rounded-2xl p-4 md:left-10 md:block" aria-label="Today's case file">
        <div className="micro mb-3 flex items-center justify-between text-muted">
          <span>Case file · #001</span>
          <span className="text-loss">Unsolved</span>
        </div>
        <dl className="space-y-2.5 font-mono text-[12px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">COMPANY</dt>
            <dd className="h-3.5 w-28 rounded-sm bg-paper/85" aria-label="hidden" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">TICKER</dt>
            <dd className="h-3.5 w-14 rounded-sm bg-paper/85" aria-label="hidden" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">ISSUED</dt>
            <dd className="text-paper/80">{today}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <span className="micro text-muted">Next chart</span>
          <span className="font-mono text-[13px] tabular-nums text-market">{label}</span>
        </div>
      </aside>

      {/* copy */}
      <div className="hero-copy absolute inset-x-0 bottom-0 mx-auto flex max-w-[1440px] flex-col gap-8 px-5 pb-10 md:px-10 md:pb-14 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="hero-fade micro mb-5 flex items-center gap-3 text-muted">
            <span className="h-px w-8 bg-market" /> Every chart has a story · Season 0 launches 20 Dec
          </p>
          <SplitHeadline
            as="h1"
            id="hero-title"
            wordClassName="text-gradient"
            className="text-[15vw] sm:text-[13vw] lg:text-[9.6vw] 2xl:text-[148px]"
            lines={['The market', <>has a secret<span className="text-market">.</span></>]}
          />
        </div>

        <div className="max-w-sm lg:pb-3">
          <p className="hero-fade text-[17px] leading-relaxed text-paper/75">
            Every day, one mystery chart. Six chances to uncover the company behind it.
          </p>
          <div className="hero-fade mt-7 flex flex-wrap items-center gap-3">
            <a href="/play" className="group inline-flex items-center gap-3 rounded-full bg-market py-3.5 pl-6 pr-3 text-[13px] font-semibold tracking-wide text-obsidian transition hover:bg-paper">
              ENTER THE GAME
              <span className="grid h-7 w-7 place-items-center rounded-full bg-obsidian text-market transition group-hover:translate-x-0.5">
                <ArrowRight size={14} />
              </span>
            </a>
            <a href="#how" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3.5 text-[13px] font-medium tracking-wide text-paper/85 transition hover:border-paper/40 hover:text-paper">
              HOW IT WORKS <ArrowDownRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
