import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import MysteryChart from './MysteryChart'
import SplitHeadline from './SplitHeadline'
import { SeasonBadge } from './Navigation'
import { useGsap } from '../hooks/useGsap'
import { gsap } from '../lib/gsap'
import { STORY_SERIES } from '../data/demo'

/** SCENE 07 — the final call. The chart draws itself one last time. */
export default function FinalCTA() {
  const root = useRef<HTMLElement>(null)
  const reveal = useRef<SVGRectElement>(null)

  useGsap(root, ({ reduced, q }) => {
    if (reduced) return
    gsap.fromTo(reveal.current, { attr: { width: 0 } }, { attr: { width: 1020 }, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'center 50%', scrub: 0.6 } })
    gsap.from(q('.fc-head .word-inner'), { yPercent: 115, stagger: 0.06, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: q('.fc-head')[0], start: 'top 80%' } })
    gsap.from(q('.fc-fade'), { opacity: 0, y: 18, stagger: 0.12, duration: 0.8, scrollTrigger: { trigger: q('.fc-head')[0], start: 'top 75%' } })
  })

  return (
    <section ref={root} className="relative isolate flex min-h-[100svh] items-center overflow-hidden py-28" aria-labelledby="fc-title">
      <div className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />
      <div className="absolute inset-x-0 top-[22%] -z-10 h-[46%] opacity-70">
        <MysteryChart points={STORY_SERIES} revealRef={reveal} className="h-full w-full" strokeWidth={2.2} />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_45%_45%_at_50%_50%,rgba(8,10,9,0.92),transparent_80%)]" />

      <div className="mx-auto max-w-[1100px] px-5 text-center md:px-10">
        <SeasonBadge className="fc-fade" />
        <SplitHeadline id="fc-title" className="fc-head mt-8 text-[12vw] sm:text-[10vw] lg:text-[7.4vw] 2xl:text-[116px]" wordClassName="text-gradient" lines={['Think you know', <>the market<span className="text-market">?</span></>]} />
        <p className="fc-fade mx-auto mt-7 max-w-md text-[18px] leading-relaxed text-paper/70">One chart. Six guesses. A new mystery every day.</p>
        <div className="fc-fade mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="/play" className="group inline-flex items-center gap-3 rounded-full bg-market py-4 pl-7 pr-3.5 text-[13px] font-semibold tracking-wide text-obsidian transition hover:bg-paper">
            PLAY SEASON 0
            <span className="grid h-8 w-8 place-items-center rounded-full bg-obsidian text-market transition group-hover:translate-x-0.5"><ArrowRight size={15} /></span>
          </a>
          <a href="#how" className="rounded-full border border-line px-6 py-4 text-[13px] font-medium tracking-wide text-paper/85 transition hover:border-paper/40 hover:text-paper">
            EXPLORE THE GAME
          </a>
        </div>
        <p className="fc-fade mx-auto mt-10 max-w-lg text-[12px] leading-relaxed text-muted">
          Season 0 runs on Robinhood Chain testnet. Rewards are test tokens with no monetary value. Mainnet rewards are planned, not guaranteed.
        </p>
      </div>
    </section>
  )
}
