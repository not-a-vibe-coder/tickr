import { useRef } from 'react'
import MysteryChart from './MysteryChart'
import SplitHeadline from './SplitHeadline'
import Scorecard, { ShareButton, scorecardText } from './Scorecard'
import { useGsap } from '../hooks/useGsap'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { STORY_GUESSES, STORY_SERIES } from '../data/demo'

const RESULTS = STORY_GUESSES.map((g) => g.result)
const SHARE = scorecardText(1, RESULTS, true, 7)

/** SCENE 04 — the reveal. */
export default function CompanyReveal() {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)

  useGsap(root, ({ reduced, q }) => {
    const build = () =>
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(q('.rv-frame'), { scale: 1.55, duration: 1.4, ease: 'power2.inOut' })
        .from(q('.rv-frame-chrome'), { opacity: 0, duration: 0.6 }, '-=0.5')
        .to(q('.rv-redact'), { scaleX: 0, transformOrigin: 'right center', duration: 0.9, ease: 'expo.inOut', stagger: 0.12 })
        .from(q('.rv-name .word-inner'), { yPercent: 110, stagger: 0.05, duration: 0.7, ease: 'expo.out' }, '<0.3')
        .from(q('.rv-flash'), { opacity: 0, duration: 0.25 }, '<')
        .to(q('.rv-flash'), { opacity: 0, duration: 0.8 })
        .from(q('.rv-head .word-inner'), { yPercent: 115, stagger: 0.06, duration: 0.8, ease: 'expo.out' }, '<')
        .from(q('.rv-fade'), { opacity: 0, y: 14, stagger: 0.1, duration: 0.6 }, '<0.2')
        .from(q('.rv-phone'), { y: 160, rotate: 6, opacity: 0, duration: 1.1 }, '<')
        .to({}, { duration: 0.5 })

    if (reduced) {
      gsap.set(q('.rv-redact'), { autoAlpha: 0 })
      return
    }
    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px)', () => {
      ScrollTrigger.create({ animation: build(), trigger: pin.current, start: 'top top', end: '+=1800', pin: true, scrub: 0.8, anticipatePin: 1 })
    })
    mm.add('(max-width: 1023px)', () => {
      const tl = build().pause()
      ScrollTrigger.create({ trigger: pin.current, start: 'top 70%', once: true, onEnter: () => void tl.play() })
    })
  })

  return (
    <section ref={root} className="relative" aria-labelledby="rv-title">
      <div ref={pin} className="relative flex min-h-[100svh] items-center overflow-hidden py-24 lg:h-[100svh] lg:py-0">
        <div className="rv-flash pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_50%_at_40%_50%,rgba(184,243,107,0.22),transparent_70%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_40%_40%_at_40%_50%,rgba(184,243,107,0.06),transparent_70%)]" />

        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 px-5 md:px-10 lg:grid-cols-[1.3fr_0.7fr] lg:gap-16">
          <div>
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="rv-fade micro mb-5 flex items-center gap-3 text-muted">
                  <span className="text-market">04</span> <span className="h-px w-8 bg-line" /> The reveal
                </p>
                <SplitHeadline className="rv-head text-[13vw] sm:text-[9vw] lg:text-[5vw] 2xl:text-[80px]" id="rv-title" lines={["That's the", <>moment<span className="text-market">.</span></>]} />
              </div>
              <p className="rv-fade max-w-[240px] text-[16px] leading-relaxed text-paper/70 lg:pb-2">Find the company. Complete the puzzle. Share the result.</p>
            </div>

            {/* the zooming case frame */}
            <div className="rv-frame relative overflow-hidden rounded-3xl border border-market/25 bg-charcoal/80 p-5 shadow-[0_40px_120px_-40px_rgba(184,243,107,0.25)] sm:p-8">
              <div className="rv-frame-chrome micro flex items-center justify-between text-muted">
                <span>Puzzle #001 · Solved in 4/6</span>
                <span className="text-market">● Case closed</span>
              </div>
              <div className="relative mt-5 h-24 sm:h-32">
                <MysteryChart points={STORY_SERIES} className="h-full w-full" strokeWidth={2} />
              </div>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div className="relative">
                  <SplitHeadline as="p" className="rv-name text-[9vw] text-paper sm:text-[6vw] lg:text-[3.8vw] 2xl:text-[58px]" lines={['Advanced Micro', 'Devices']} />
                  <span className="rv-redact redacted absolute inset-0 rounded" aria-hidden="true"><span>Classified</span></span>
                </div>
                <div className="relative">
                  <span className="font-mono text-3xl font-semibold text-market sm:text-4xl">AMD</span>
                  <span className="rv-redact redacted absolute -inset-1 rounded" aria-hidden="true" />
                </div>
              </div>
              <p className="micro mt-5 !text-[9px] text-muted/70">Illustrative puzzle data · not real market prices</p>
            </div>
          </div>

          <div className="flex justify-center">
            {/* phone mockup — completion screen */}
            <div className="rv-phone relative w-[270px] rounded-[44px] border border-white/10 bg-gradient-to-b from-[#232a25] to-[#121613] p-2.5 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.9)]">
              <div className="overflow-hidden rounded-[36px] bg-obsidian px-4 pb-5 pt-3">
                <div className="mx-auto mb-4 h-5 w-20 rounded-full bg-black" aria-hidden="true" />
                <div className="micro mb-4 flex justify-between !text-[9px] text-muted">
                  <span>TICKR</span>
                  <span className="text-market">Solved</span>
                </div>
                <Scorecard puzzle={1} results={RESULTS} solved streak={7} />
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px]">
                  <div className="rounded-xl border border-line p-2.5"><span className="block text-muted">Played</span><span className="text-base text-paper">24</span></div>
                  <div className="rounded-xl border border-line p-2.5"><span className="block text-muted">Win rate</span><span className="text-base text-paper">88%</span></div>
                </div>
                <ShareButton text={SHARE} className="mt-3 w-full" />
                <p className="micro mt-3 text-center !text-[9px] text-muted">Example player stats</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
