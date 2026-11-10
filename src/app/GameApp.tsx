import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { Coins, Flame, LogOut, User } from 'lucide-react'
import { Wordmark } from '../components/Logo'
import { SeasonBadge } from '../components/Navigation'
import Game from './Game'
import Leaderboard from './Leaderboard'
import Profile from './Profile'
import Duel, { parseDuel } from './Duel'
import Trade, { fmtNum } from './Trade'
import PublicProfile from './PublicProfile'
import { OnlinePill, PresenceProvider } from './presence'
import { AuthProvider, shortAddr, useAuth } from './auth'
import { useConfig, useCountdownTo } from './useConfig'
import { api } from './api'
import type { ConfigPayload, PlayerPayload } from '../../shared/api'

export default function GameApp() {
  return (
    <AuthProvider>
      <PresenceProvider>
        <Shell />
      </PresenceProvider>
    </AuthProvider>
  )
}

export function usePlayer(cfg: ConfigPayload | null) {
  const { address } = useAuth()
  const [p, setP] = useState<PlayerPayload | null>(null)
  const refresh = useCallback(() => {
    if (!address || !cfg?.contract) return setP(null)
    api.player(address).then(setP).catch(() => setP(null))
  }, [address, cfg?.contract])
  useEffect(() => {
    refresh()
    window.addEventListener('tickr:stats', refresh)
    return () => window.removeEventListener('tickr:stats', refresh)
  }, [refresh])
  return p
}

function Shell() {
  const { cfg, error } = useConfig()
  const auth = useAuth()
  const player = usePlayer(cfg)
  const countdown = useCountdownTo(cfg?.nextPuzzleAt)
  const loc = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  const tab = (to: string, label: string) => (
    <NavLink to={to} end={to === '/play'} className={({ isActive }) => `rounded-full px-3.5 py-1.5 text-[13px] transition ${isActive ? 'bg-paper text-obsidian' : 'text-paper/65 hover:text-paper'}`}>
      {label}
    </NavLink>
  )

  return (
    <div className="grain min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-obsidian/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" aria-label="Tickr home"><Wordmark /></Link>
          <nav className="hidden items-center gap-1 rounded-full border border-line bg-white/[0.02] p-1 md:flex" aria-label="Game">
            {tab('/play', 'Daily')}
            {tab('/play/practice', 'Practice')}
            {tab('/trade', 'Trade')}
            {tab('/leaderboard', 'Leaderboard')}
          </nav>
          <div className="flex items-center gap-2">
            <OnlinePill className="hidden sm:inline-flex" />
            <span className="micro hidden rounded-full border border-line px-3 py-1.5 text-muted xl:inline">Next <span className="tabular-nums text-market">{countdown}</span></span>
            {player && (
              <Link to="/me" className="flex items-center gap-3 rounded-full border border-line px-3 py-1.5 font-mono text-[12px]" title="Streak and $TCKR points">
                <span className="flex items-center gap-1 text-amber"><Flame size={13} /> {player.streak}</span>
                <span className="hidden items-center gap-1 text-market sm:flex"><Coins size={13} /> {fmtNum(player.points, 0)}</span>
              </Link>
            )}
            {auth.address ? (
              <div className="flex items-center gap-1">
                <Link to="/me" className="flex items-center gap-2 rounded-full border border-line py-1.5 pl-2 pr-3 text-[12px] hover:border-paper/30">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-market/15 text-market"><User size={13} /></span>
                  <span className="hidden font-mono sm:inline">{shortAddr(auth.address)}</span>
                </Link>
                <button onClick={auth.logout} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-paper" aria-label="Sign out" title="Sign out"><LogOut size={15} /></button>
              </div>
            ) : (
              <button onClick={auth.login} disabled={!auth.ready} className="rounded-full bg-market px-4 py-2 text-[13px] font-semibold text-obsidian transition hover:bg-paper disabled:opacity-50">
                {auth.kind === 'privy' ? 'Sign in' : 'Play as guest'}
              </button>
            )}
          </div>
        </div>
        <nav className="flex justify-center gap-1 border-t border-line px-2 py-2 md:hidden" aria-label="Game (mobile)">
          {tab('/play', 'Daily')}
          {tab('/play/practice', 'Practice')}
          {tab('/trade', 'Trade')}
          {tab('/leaderboard', 'Board')}
          {tab('/me', 'Me')}
        </nav>
      </header>

      {cfg?.season === 'preview' && <PreviewBanner launchAt={cfg.launchAt} />}
      <main className="mx-auto max-w-[1280px] px-4 pb-20 pt-8 md:px-8 md:pt-12">
        {error && <p className="mb-6 rounded-xl border border-loss/30 p-4 text-loss">Can't reach the game server: {error}</p>}
        {cfg && (
          <Routes>
            <Route path="/play" element={<PlayPage cfg={cfg} mode="daily" streak={player?.streak ?? 0} />} />
            <Route path="/play/practice" element={<PlayPage cfg={cfg} mode="practice" />} />
            <Route path="/trade" element={<Trade cfg={cfg} />} />
            <Route path="/leaderboard" element={<Leaderboard cfg={cfg} />} />
            <Route path="/me" element={<Profile cfg={cfg} player={player} />} />
            <Route path="/u/:address" element={<PublicProfile cfg={cfg} />} />
            <Route path="/duel" element={<Duel cfg={cfg} />} />
            <Route path="*" element={<Navigate to="/play" replace />} />
          </Routes>
        )}
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-[11.5px] text-muted md:px-8">
        <SeasonBadge className="mb-3" />
        <p className="mx-auto max-w-2xl">Runs on Robinhood Chain testnet. $TCKR are in-game points with no monetary value. Daily charts are real historical prices; trading uses live Robinhood Stock Token prices. Demo only — not investment advice. Not affiliated with Robinhood Markets, Inc.</p>
      </footer>
    </div>
  )
}

function PreviewBanner({ launchAt }: { launchAt: number }) {
  const days = Math.max(1, Math.ceil((launchAt - Date.now()) / 86_400_000))
  return (
    <div className="border-b border-market/15 bg-market/[0.05] px-4 py-2.5 text-center text-[12.5px] text-paper/80">
      <span className="micro mr-2 text-market">Preview season</span>
      Season 0 launches <b>20 December</b> — {days} day{days === 1 ? '' : 's'} to go. Preview streaks and leaderboard reset at launch.
    </div>
  )
}

function PlayPage({ cfg, mode, streak }: { cfg: ConfigPayload; mode: 'daily' | 'practice'; streak?: number }) {
  const [params] = useSearchParams()
  const duel = mode === 'daily' ? parseDuel(params, cfg.today) : undefined
  return (
    <>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="micro mb-3 text-muted">{mode === 'daily' ? `${cfg.puzzleLabel} · same chart for everyone` : 'Unlimited · no streak at stake'}</p>
          <h1 className="display text-[13vw] sm:text-6xl">{mode === 'daily' ? <>Today's case<span className="text-market">.</span></> : <>Practice<span className="text-market">.</span></>}</h1>
        </div>
        <p className="max-w-sm text-[14px] text-paper/60">
          Name the company behind the chart. 🟨 means right sector, wrong company. Each miss unlocks a clue.
        </p>
      </div>
      <Game key={mode} mode={mode} cfg={cfg} duel={duel} streak={streak} />
    </>
  )
}
