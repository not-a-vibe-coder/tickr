import { useRef } from 'react'
import { AtSign, Building2, Globe2, Repeat, Sparkles, Swords, Trophy } from 'lucide-react'
import Globe from './Globe'
import SplitHeadline from './SplitHeadline'
import { useGsap } from '../hooks/useGsap'
import { gsap } from '../lib/gsap'

const FEATURES = [
  { icon: AtSign, title: 'Email-only sign-in', body: 'No wallet setup or seed phrase.' },
  { icon: Building2, title: 'No broker required', body: 'No brokerage or bank account needed.' },
  { icon: Sparkles, title: 'No crypto experience', body: 'If you can read a chart, you can play.' },
  { icon: Globe2, title: 'One global puzzle', body: 'Same chart, everywhere, at 00:00 UTC.' },
  { icon: Repeat, title: 'Unlimited practice', body: 'Past cases on demand, no streak at stake.' },
  { icon: Swords, title: 'Friend duels', body: 'Same chart, head to head.' },
  { icon: Trophy, title: 'Worldwide leaderboards', body: 'Longest streaks. Fewest guesses.' },
]

/** SCENE 06 — built for everyone. */
export default function GlobalCommunity() {
  const root = useRef<HTMLElement>(null)

  useGsap(root, ({ reduced, q }) => {
    if (reduced) return
    // a single point of light opens up into a world of players
    gsap.fromTo(
      q('.gc-globe'),
      { scale: 0.15, opacity: 0, filter: 'blur(12px)' },
      { scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'power2.out', scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'center 55%', scrub: 0.8 } },
    )
    gsap.from(q('.gc-head .word-inner'), { yPercent: 115, stagger: 0.06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: q('.gc-head')[0], start: 'top 80%' } })
    gsap.from(q('.gc-item'), { opacity: 0, x: -24, stagger: 0.08, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: q('.gc-list')[0], start: 'top 80%' } })
  })

  return (
    <section ref={root} className="relative overflow-hidden py-28 lg:py-40" aria-labelledby="gc-title">
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10">
          <p className="micro mb-5 flex items-center gap-3 text-muted">
            <span className="text-market">06</span> <span className="h-px w-8 bg-line" /> Built for everyone
          </p>
          <SplitHeadline className="gc-head text-[12.5vw] sm:text-[9.5vw] lg:text-[5.8vw] 2xl:text-[92px]" id="gc-title" lines={['The market is', <>for everyone<span className="text-market">.</span></>]} />
          <ol className="gc-list mt-12 border-t border-line">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="gc-item group flex items-center gap-5 border-b border-line py-4">
                <span className="w-6 font-mono text-[11px] text-muted">0{i + 1}</span>
                <Icon size={18} className="shrink-0 text-market transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="flex-1 font-display text-[19px] font-medium tracking-tight">{title}</span>
                <span className="hidden text-right text-[13px] text-muted sm:block">{body}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="relative -mx-5 aspect-square md:mx-0">
          <Globe className="gc-globe absolute inset-0 h-full w-full" />
          <span className="micro absolute bottom-[12%] left-1/2 -translate-x-1/2 whitespace-nowrap text-muted">Players everywhere · one chart</span>
        </div>
      </div>
    </section>
  )
}
