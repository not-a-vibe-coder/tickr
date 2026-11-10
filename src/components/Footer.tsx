import { Github } from './icons'
import { Wordmark } from './Logo'

const COLS = [
  { title: 'Game', links: [['How to play', '#how'], ['Play the demo', '#play'], ['Duels', '#play'], ['Leaderboard', '#leaderboard']] },
  { title: 'Season 0', links: [['Rewards', '#rewards'], ['Testnet vs mainnet', '#season'], ['Back to top', '#top']] },
]

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-muted">Every chart has a story. A daily stock-market mystery built on Robinhood Chain.</p>
          </div>
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="micro text-muted">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}><a href={href} className="text-[14px] text-paper/75 transition hover:text-market">{label}</a></li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <p className="micro text-muted">Follow</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="https://x.com/jackdotsol_" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[14px] text-paper/75 transition hover:text-market">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3l7.3-8.4L1 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" /></svg>
                  X
                </a>
              </li>
              <li>
                <a href="https://github.com/not-a-vibe-coder/tickr" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[14px] text-paper/75 transition hover:text-market">
                  <Github className="h-3.5 w-3.5" /> GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 overflow-hidden" aria-hidden="true">
          <p className="display select-none whitespace-nowrap text-[22vw] leading-[0.8] text-white/[0.035]">Tickr</p>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-6 text-[11.5px] leading-relaxed text-muted md:flex-row md:justify-between">
          <p className="max-w-2xl">
            Tickr is an independent project and is not affiliated with, endorsed by or sponsored by Robinhood Markets, Inc. Season 0 runs on Robinhood Chain testnet; test tokens have no monetary value. Charts on this page are illustrative. Nothing here is investment advice.
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} Tickr · Season 0</p>
        </div>
      </div>
    </footer>
  )
}
