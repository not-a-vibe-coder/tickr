import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Wordmark } from './Logo'
import { useCountdown } from '../hooks/useCountdown'

const LINKS = [
  { href: '#how', label: 'How to Play' },
  { href: '#rewards', label: 'Rewards' },
  { href: '#season', label: 'Season 0' },
  { href: '#leaderboard', label: 'Leaderboard' },
]

export function SeasonBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`micro inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-muted ${className}`}>
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-market" />
      Season 0 · Testnet
    </span>
  )
}

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { label } = useCountdown()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-500 ${
        scrolled ? 'border-b border-line bg-obsidian/70 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10" aria-label="Primary">
        <a href="#top" aria-label="Tickr home" className="shrink-0">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="group relative text-[13px] text-paper/70 transition-colors hover:text-paper">
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-market transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <SeasonBadge className="hidden md:inline-flex" />
          <span className="micro hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-paper/80 sm:inline-flex" aria-label={`Next puzzle in ${label}`}>
            <span className="text-muted">Next chart</span>
            <span className="tabular-nums text-market">{label}</span>
          </span>
          <a
            href="/play"
            className="hidden rounded-full bg-paper px-4 py-2 text-[13px] font-medium text-obsidian transition hover:bg-market sm:inline-block"
          >
            Play
          </a>
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-line lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="border-t border-line bg-obsidian/95 px-5 pb-8 pt-4 backdrop-blur-xl lg:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map((l, i) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-baseline justify-between border-b border-line py-4 font-display text-2xl tracking-tight"
                  >
                    {l.label}
                    <span className="micro text-muted">0{i + 1}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between">
              <SeasonBadge />
              <a href="/play" onClick={() => setOpen(false)} className="rounded-full bg-market px-5 py-2.5 text-sm font-medium text-obsidian">
                Play now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
