import { useRef } from 'react'
import MysteryChart from './MysteryChart'
import SplitHeadline from './SplitHeadline'
import ResultBadge from './ResultBadge'
import { useGsap } from '../hooks/useGsap'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { DEMO_PUZZLE, MONTHS, STORY_GUESSES, STORY_SERIES, STORY_VOLUME } from '../data/demo'

/** SCENE 02 — six guesses. A scroll-scrubbed investigation on desktop; plays once on mobile. */
export default function GuessSequence() {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const volume = useRef<SVGGElement>(null)

  useGsap(root, ({ reduced, q }) => {
    const build = () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.5 } })
      tl.from(q('.gs-head .word-inner'), { yPercent: 115, stagger: 0.06, duration: 0.8, ease: 'expo.out' })
        .from(q('.gs-fade'), { opacity: 0, y: 16, stagger: 0.08 }, '<0.2')
        .from(q('.gs-board'), { opacity: 0, y: 40, rotateX: 8, duration: 0.9 }, '<')
        .from(volume.current, { opacity: 0, duration: 0.01 }, '<')

      STORY_GUESSES.forEach((g, i) => {
        const slot = `.gs-slot-${i}`
        tl.addLabel(`g${i}`, '+=0.35')
          .to(q(`${slot} .gs-empty`), { opacity: 0, duration: 0.2 }, `g${i}`)
          .from(q(`${slot} .gs-char`), { opacity: 0, y: 10, stagger: 0.05, duration: 0.25 }, `g${i}`)
          .from(q(`${slot} .gs-name`), { opacity: 0, x: -8 }, `g${i}+=0.2`)
          .to(q(slot), { borderColor: g.result === 'hit' ? 'rgba(184,243,107,0.6)' : g.result === 'warm' ? 'rgba(232,195,106,0.35)' : 'rgba(226,113,106,0.35)' }, `g${i}+=0.35`)
          .from(q(`${slot} .gs-badge`), { opacity: 0, scale: 0.6, ease: 'back.out(2)' }, `g${i}+=0.4`)
          .to(q('.gs-counter-col'), { yPercent: -(100 / 7) * (i + 1) }, `g${i}+=0.3`)
          .to(q('.gs-dot')[i], { backgroundColor: g.result === 'hit' ? '#B8F36B' : g.result === 'warm' ? '#E8C36A' : '#E2716A', scale: 1 }, `g${i}+=0.4`)

        if (g.result !== 'hit') {
          tl.from(q(`.gs-clue-${i}`), { opacity: 0, y: 14, filter: 'blur(6px)' }, `g${i}+=0.55`)
          // the chart gains another contextual layer
          if (i === 0) tl.to(volume.current, { opacity: 1, duration: 0.5 }, `g${i}+=0.6`)
          if (i === 1) tl.from(q('.gs-yaxis span'), { opacity: 0, x: 6, stagger: 0.05 }, `g${i}+=0.6`)
          if (i === 2) tl.from(q('.gs-xaxis span'), { opacity: 0, y: 6, stagger: 0.03 }, `g${i}+=0.6`)
        } else {
          tl.to(q('.gs-redact'), { scaleX: 0, transformOrigin: 'right center', duration: 0.7, ease: 'expo.inOut' }, `g${i}+=0.5`)
            .from(q('.gs-solved'), { opacity: 0, scale: 1.4, rotate: -14, duration: 0.5, ease: 'back.out(1.6)' }, `g${i}+=0.9`)
            .to(q('.gs-board'), { boxShadow: '0 0 0 1px rgba(184,243,107,0.35), 0 40px 120px -40px rgba(184,243,107,0.35)' }, `g${i}+=0.9`)
        }
      })
      tl.to({}, { duration: 0.6 }) // hold the solved state before unpinning
      return tl
    }

    gsap.set(volume.current, { opacity: 0 })
    if (reduced) {
      build().progress(1)
      return
    }

    const mm = gsap.matchMedia()
    mm.add('(min-width: 1024px)', () => {
      ScrollTrigger.create({
        animation: build(),
        trigger: pin.current,
        start: 'top top',
        end: '+=2600',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
      })
    })
    mm.add('(max-width: 1023px)', () => {
      const tl = build().pause()
      ScrollTrigger.create({ trigger: q('.gs-board')[0], start: 'top 75%', once: true, onEnter: () => void tl.timeScale(1.4).play() })
    })
  })

  const guessesUsed = STORY_GUESSES.length

  return (
    <section ref={root} id="how" className="relative" aria-labelledby="gs-title">
      <div ref={pin} className="relative flex min-h-[100svh] items-center overflow-hidden py-24 lg:h-[100svh] lg:py-0">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_75%_50%,rgba(184,243,107,0.05),transparent_70%)]" />

        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-14 px-5 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* narrative */}
          <div>
            <p className="gs-fade micro mb-6 flex items-center gap-3 text-muted">
              <span className="text-market">02</span> <span className="h-px w-8 bg-line" /> How to play
            </p>
            <SplitHeadline className="gs-head text-[13vw] sm:text-[10vw] lg:text-[6.6vw] 2xl:text-[104px]" id="gs-title" lines={['You get', <>six shots<span className="text-market">.</span></>]} />
            <p className="gs-fade mt-7 max-w-md text-[17px] leading-relaxed text-paper/70">
              Every wrong guess brings you one step closer to the answer. Each miss unlocks evidence: the sector, the size, the year.
            </p>

            <div className="gs-fade mt-10 flex items-end gap-6">
              <div aria-hidden="true">
                <span className="micro text-muted">Attempt</span>
                <div className="mt-1 flex font-display text-6xl font-semibold leading-none tracking-tighter">
                  <span className="relative h-[1em] overflow-hidden">
                    <span className="gs-counter-col flex flex-col">
                      {Array.from({ length: 7 }, (_, i) => (
                        <span key={i} className="h-[1em]">{i}</span>
                      ))}
                    </span>
                  </span>
                  <span className="text-muted/50">/6</span>
                </div>
              </div>
              <div className="flex gap-1.5 pb-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className="gs-dot h-2.5 w-6 rounded-full bg-white/10" />
                ))}
              </div>
            </div>

            <ul className="gs-fade mt-8 flex flex-wrap gap-2" aria-label="Guess result legend">
              <li><ResultBadge result="miss" /></li>
              <li><ResultBadge result="warm" /></li>
              <li><ResultBadge result="hit" /></li>
            </ul>
          </div>

          {/* the investigation board */}
          <div className="[perspective:1400px]">
            <div className="gs-board panel relative rounded-3xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="micro text-muted">Puzzle #00{DEMO_PUZZLE.number}</span>
                  <span className="relative font-display text-lg font-semibold tracking-tight">
                    Advanced Micro Devices
                    <span className="gs-redact absolute inset-0 -mx-1 rounded-sm bg-paper" aria-hidden="true" />
                  </span>
                </div>
                <span className="micro hidden text-muted/70 sm:block">Illustrative chart</span>
              </div>

              {/* chart with layers */}
              <div className="relative mt-5 h-44 rounded-2xl border border-line bg-obsidian/60 sm:h-56">
                <div className="absolute inset-3 right-12 bottom-7">
                  <MysteryChart points={STORY_SERIES} volume={STORY_VOLUME} showVolume volumeRef={volume} grid className="h-full w-full" strokeWidth={1.8} />
                </div>
                <div className="gs-yaxis absolute bottom-7 right-2 top-3 flex flex-col justify-between text-right font-mono text-[9.5px] text-muted">
                  {['$160', '$140', '$120', '$100', '$80'].map((v) => <span key={v}>{v}</span>)}
                </div>
                <div className="gs-xaxis absolute bottom-2 left-3 right-12 flex justify-between font-mono text-[9px] text-muted">
                  {MONTHS.filter((_, i) => i % 2 === 0).map((m) => <span key={m}>{m} 21</span>)}
                </div>
                <span className="gs-solved micro absolute left-6 top-5 rotate-[-8deg] bg-obsidian/70 rounded border-2 border-market px-3 py-1.5 !text-[11px] font-bold text-market">
                  Case closed
                </span>
              </div>

              {/* clues */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {DEMO_PUZZLE.clues.slice(0, 3).map((c, i) => (
                  <div key={c.label} className={`gs-clue-${i} rounded-xl border border-dashed border-line bg-white/[0.02] px-3 py-2.5`}>
                    <span className="micro block !text-[9px] text-muted">Clue {i + 1} · {c.label}</span>
                    <span className="mt-1 block truncate font-display text-[15px] font-medium">{c.value}</span>
                  </div>
                ))}
              </div>

              {/* six slots */}
              <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Example guesses">
                {Array.from({ length: 6 }, (_, i) => {
                  const g = STORY_GUESSES[i]
                  return (
                    <li key={i} className={`gs-slot-${i} relative flex h-14 items-center gap-3 rounded-xl border border-line bg-obsidian/40 px-3.5`}>
                      <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
                      {g ? (
                        <>
                          <span className="gs-empty absolute inset-y-0 left-10 right-3 flex items-center font-mono text-[12px] text-muted/50">Awaiting guess…</span>
                          <span className="shrink-0 whitespace-nowrap font-display text-lg font-semibold tracking-tight">
                            {g.ticker.split('').map((c, ci) => (
                              <span key={ci} className="gs-char inline-block">{c}</span>
                            ))}
                          </span>
                          <span className="gs-name truncate text-[12px] text-muted">{g.name}</span>
                          <ResultBadge result={g.result} className="gs-badge ml-auto shrink-0" />
                        </>
                      ) : (
                        <span className="font-mono text-[12px] text-muted/40">{i < guessesUsed ? '' : 'Unused'}</span>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
