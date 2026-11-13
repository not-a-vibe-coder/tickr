import { Link } from 'react-router-dom'
import { Check, Coins, ExternalLink, Flame, Lock } from 'lucide-react'
import type { ConfigPayload, PlayerPayload } from '../../shared/api'
import { useAuth } from './auth'
import { CopyButton } from './Game'
import { fmtNum, fmtPx, usePortfolio } from './Trade'
import WifAccount from './WifAccount'

export default function Profile({ cfg, player }: { cfg: ConfigPayload; player: PlayerPayload | null }) {
  const auth = useAuth()
  const [portfolio] = usePortfolio(auth.address, Boolean(cfg.contract))
  if (!auth.address)
    return (
      <div className="panel mx-auto max-w-lg rounded-[28px] p-10 text-center">
        <h1 className="font-display text-3xl uppercase">Your case file</h1>
        <p className="mt-3 text-paper/65">Sign in to get 10,000 $TCKR, track your streak and trade.</p>
        <button onClick={auth.login} className="mt-6 rounded-full bg-market px-6 py-3 text-[13px] font-semibold text-obsidian">Connect wallet</button>
      </div>
    )

  const stat = (label: string, value: React.ReactNode, sub?: string) => (
    <div className="panel rounded-3xl p-5">
      <p className="micro text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-muted">{sub}</p>}
    </div>
  )

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="micro mb-3 text-muted">{auth.label ?? 'Player'}</p>
          <h1 className="display text-[13vw] sm:text-6xl">Case file<span className="text-market">.</span></h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/u/${auth.address}`} className="inline-flex items-center gap-2 rounded-full bg-market px-5 py-3 text-[13px] font-semibold text-obsidian hover:bg-paper">Public portfolio</Link>
          <CopyButton text={`${location.origin}/u/${auth.address}`} label="Share portfolio" />
          {cfg.explorer && (
            <a href={`${cfg.explorer}/address/${auth.address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-[13px] hover:border-paper/40">
              Explorer <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {!cfg.contract && <p className="mb-6 rounded-xl border border-amber/30 p-4 text-[14px] text-amber">On-chain stats appear once the Tickr contract is deployed.</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat('Net worth', <span className="flex items-center gap-2 text-market"><Coins size={24} />{portfolio ? fmtNum(portfolio.netWorth, 0) : '—'}</span>, 'TCKR · cash + positions')}
        {stat('Cash', portfolio ? fmtNum(portfolio.cash, 0) : player ? fmtNum(player.points, 0) : '—', 'TCKR available')}
        {stat('Current streak', <span className="flex items-center gap-2 text-amber"><Flame size={24} />{player?.streak ?? 0}</span>, `Best ${player?.bestStreak ?? 0}`)}
        {stat('Daily solves', player?.solves ?? 0, player?.avgGuesses ? `Avg ${player.avgGuesses} guesses` : undefined)}
      </div>

      <WifAccount address={auth.address} />

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        <section className="panel rounded-3xl p-6" aria-labelledby="ms">
          <h2 id="ms" className="micro text-muted">How you earn $TCKR</h2>
          <ul className="mt-4 space-y-1.5 text-[13.5px] text-paper/80">
            <li>• Starter balance: <b>10,000</b></li>
            <li>• Daily solve: <b>600</b> in 1 guess → <b>100</b> in 6</li>
            <li>• Streak bonus: <b>+20</b> per streak day (max 600)</li>
            <li>• Grow it by trading well</li>
          </ul>
          <ol className="mt-5 space-y-2">
            {(player?.milestones ?? [3, 7, 14, 30].map((s) => ({ streak: s, bonus: 0, earned: false }))).map((m) => (
              <li key={m.streak} className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${m.earned ? 'border-market/40 bg-market/[0.05]' : 'border-line'}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-full ${m.earned ? 'bg-market text-obsidian' : 'bg-paper/[0.05] text-muted'}`}>{m.earned ? <Check size={15} /> : <Lock size={13} />}</span>
                <span className="font-display text-lg">Day {m.streak} streak</span>
                <span className="ml-auto font-mono text-[13px] text-market">{m.bonus ? `+${fmtNum(m.bonus, 0)}` : '—'} TCKR</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="panel rounded-3xl p-6" aria-labelledby="pf">
          <div className="flex items-center justify-between">
            <h2 id="pf" className="micro text-muted">Portfolio</h2>
            <Link to="/trade" className="text-[13px] text-market hover:underline">Open terminal →</Link>
          </div>
          {!portfolio?.holdings.length ? (
            <p className="mt-6 text-[14px] text-muted">No positions yet. Your 10,000 TCKR is waiting in the trade terminal.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {portfolio.holdings.map((h) => (
                <li key={h.symbol} className="flex items-center justify-between gap-3 py-3 text-[14px]">
                  <span className="font-mono font-semibold">{h.symbol}</span>
                  <span className="font-mono text-muted">{fmtNum(h.qty, 4)} @ {h.price != null ? fmtPx(h.price) : '—'}</span>
                  <span className={`ml-auto font-mono ${h.pnl >= 0 ? 'text-market' : 'text-loss'}`}>{h.pnl >= 0 ? '+' : ''}{fmtNum(h.pnl)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/play" className="mt-6 inline-block rounded-full bg-market px-5 py-2.5 text-[13px] font-semibold text-obsidian">Play today's case</Link>
        </section>
      </div>
    </>
  )
}
