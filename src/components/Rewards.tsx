import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Clock } from 'lucide-react'
import SplitHeadline from './SplitHeadline'
import { useGsap } from '../hooks/useGsap'
import { gsap } from '../lib/gsap'

const MILESTONES = [
  { day: 1, label: 'First solve', token: null },
  { day: 3, label: 'Warm streak', token: 'tTSLA' },
  { day: 7, label: 'One week', token: 'tAMZN' },
  { day: 14, label: 'Fortnight', token: 'tPLTR' },
  { day: 30, label: 'Market mind', token: 'tAMD' },
]

function Coin({ ticker, size = 112, delay = 0 }: { ticker: string; size?: number; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="relative [perspective:600px]"
      style={{ width: size, height: size }}
      whileHover={reduce ? undefined : { rotateY: 25, rotateX: -10, scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <div className="coin-float absolute inset-0" style={{ animationDelay: `${delay}s` }}>
        <div className="absolute inset-0 rounded-full bg-market/25 blur-2xl" />
        <div className="relative grid h-full w-full place-items-center rounded-full border border-market/40 bg-[radial-gradient(circle_at_32%_28%,#2b3a2c,#111512_62%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.12),inset_0_-8px_20px_rgba(0,0,0,0.6),0_20px_40px_-12px_rgba(0,0,0,0.9)]">
          <div className="absolute inset-[7px] rounded-full border border-dashed border-market/25" />
          <div className="text-center">
            <span className="block font-display text-[15px] font-semibold tracking-tight text-paper">{ticker}</span>
            <span className="micro mt-0.5 block !text-[7.5px] text-market">Test token</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.10)_45%,transparent_55%)]" />
        </div>
      </div>
    </motion.div>
  )
}

/** SCENE 05 — streaks have their rewards. */
export default function Rewards() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useGsap(root, ({ reduced, q }) => {
    if (reduced) return
    gsap.from(q('.rw-head .word-inner'), {
      yPercent: 115,
      stagger: 0.06,
      duration: 1,
      ease: 'expo.out',
      scrollTrigger: { trigger: q('.rw-head')[0], start: 'top 80%' },
    })
    gsap.from(q('.rw-fade'), { opacity: 0, y: 16, stagger: 0.1, duration: 0.8, scrollTrigger: { trigger: q('.rw-head')[0], start: 'top 75%' } })
    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px)', () => {
      // the streak line grows as you scroll; milestones light up as it reaches them
      const tl = gsap.timeline({ scrollTrigger: { trigger: track.current, start: 'top 75%', end: 'bottom 40%', scrub: 0.6 } })
      tl.fromTo(q('.rw-fill'), { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: MILESTONES.length })
      MILESTONES.forEach((_, i) => {
        tl.from(q(`.rw-m-${i} .rw-node`), { scale: 0.4, backgroundColor: 'rgba(255,255,255,0.08)', duration: 0.3 }, i * (MILESTONES.length / (MILESTONES.length - 1)) * 0.98)
          .from(q(`.rw-m-${i} .rw-coin`), { opacity: 0, y: 40, scale: 0.7, duration: 0.6, ease: 'back.out(1.6)' }, '<')
      })
    })
    mm.add('(max-width: 767px)', () => {
      gsap.from(q('.rw-coin'), { opacity: 0, y: 30, scale: 0.8, stagger: 0.12, duration: 0.7, ease: 'back.out(1.6)', scrollTrigger: { trigger: track.current, start: 'top 80%' } })
    })
    gsap.from(q('.rw-card'), { opacity: 0, y: 40, stagger: 0.15, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: q('.rw-card')[0], start: 'top 85%' } })
  })

  return (
    <section ref={root} id="rewards" className="relative scroll-mt-16 overflow-hidden py-28 lg:py-40" aria-labelledby="rw-title">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_45%,rgba(184,243,107,0.07),transparent_70%)]" />
      <div className="particles absolute inset-0 -z-10" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 1.3}s` }} />
        ))}
      </div>

      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="rw-fade micro mb-5 flex items-center gap-3 text-muted">
              <span className="text-market">05</span> <span className="h-px w-8 bg-line" /> Streaks have their rewards
            </p>
            <SplitHeadline className="rw-head text-[13vw] sm:text-[10vw] lg:text-[7vw] 2xl:text-[112px]" id="rw-title" lines={['Come back', <>tomorrow<span className="text-market">.</span></>]} />
          </div>
          <p className="rw-fade max-w-sm text-[17px] leading-relaxed text-paper/70 lg:pb-3">
            Build your streak. Earn rewards. Keep your market instincts sharp.
          </p>
        </div>

        {/* the streak line */}
        <div ref={track} className="relative mt-20 lg:mt-28">
          <div className="absolute left-0 right-0 top-[148px] hidden h-px bg-white/10 md:block" aria-hidden="true">
            <div className="rw-fill h-full origin-left bg-gradient-to-r from-market-2 to-market shadow-[0_0_14px_#B8F36B]" />
          </div>
          <ol className="grid grid-cols-2 gap-y-12 md:grid-cols-5">
            {MILESTONES.map((m, i) => (
              <li key={m.day} className={`rw-m-${i} flex flex-col items-center text-center`}>
                <div className="flex h-[124px] items-end justify-center">
                  {m.token ? (
                    <div className="rw-coin">
                      <Coin ticker={m.token} size={i === 4 ? 120 : 96 + i * 4} delay={i * 0.6} />
                    </div>
                  ) : (
                    <span className="rw-coin micro rounded-full border border-line px-3 py-1.5 text-muted">Streak starts</span>
                  )}
                </div>
                <span className="rw-node relative z-10 mt-5 block h-3 w-3 rounded-full bg-market shadow-[0_0_0_5px_rgba(184,243,107,0.15)]" />
                <span className="mt-4 font-display text-3xl font-semibold tracking-tight">Day {m.day}</span>
                <span className="micro mt-1 text-muted">{m.label}</span>
              </li>
            ))}
          </ol>
          <p className="micro mt-12 text-center !text-[9.5px] text-muted/70">
            <span className="normal-case">tTSLA · tAMZN · tPLTR · tAMD</span> are testnet stock tokens shown as examples. Milestones and amounts may change.
          </p>
        </div>

        {/* season 0 vs mainnet */}
        <div id="season" className="mt-24 grid scroll-mt-24 gap-4 lg:grid-cols-2">
          <article className="rw-card panel relative overflow-hidden rounded-3xl p-7 sm:p-9">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-market/10 blur-3xl" />
            <div className="flex items-center justify-between">
              <span className="micro inline-flex items-center gap-2 text-market"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-market" /> Preview live · launches 20 Dec</span>
              <span className="micro text-muted">Robinhood Chain testnet</span>
            </div>
            <h3 className="mt-6 font-display text-4xl font-semibold uppercase tracking-tight">Season 0</h3>
            <ul className="mt-6 space-y-3 text-[15px] text-paper/80">
              {[
                'Rewards are testnet stock tokens — they have no monetary value',
                'Daily puzzle, streaks, practice mode, duels and leaderboard',
                'Sign in with email. No broker, no seed phrase',
                'Preview season runs until launch on 20 December; preview streaks reset at launch',
                'A practice network: balances may be reset',
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check size={16} className="mt-0.5 shrink-0 text-market" />{t}</li>
              ))}
            </ul>
          </article>
          <article className="rw-card relative overflow-hidden rounded-3xl border border-dashed border-white/15 p-7 sm:p-9">
            <div className="flex items-center justify-between">
              <span className="micro inline-flex items-center gap-2 text-amber"><Clock size={12} /> Planned</span>
              <span className="micro text-muted">Robinhood Chain mainnet</span>
            </div>
            <h3 className="mt-6 font-display text-4xl font-semibold uppercase tracking-tight text-paper/85">Mainnet</h3>
            <ul className="mt-6 space-y-3 text-[15px] text-paper/60">
              {[
                'Streak rewards funded by sponsored prize pools',
                'Rewards in stock tokens where available and permitted',
                'Eligibility, amounts and timing to be announced',
                'Nothing is guaranteed — Tickr is a game, not an investment',
              ].map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-2 h-1 w-3 shrink-0 bg-white/25" />{t}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}
