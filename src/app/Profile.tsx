import { Link } from 'react-router-dom'
import { Check, ExternalLink, Flame, Lock } from 'lucide-react'
import type { ConfigPayload, PlayerPayload } from '../../shared/api'
import { useAuth } from './auth'
import { CopyButton } from './Game'

export default function Profile({ cfg, player }: { cfg: ConfigPayload; player: PlayerPayload | null }) {
  const auth = useAuth()
  if (!auth.address)
    return (
      <div className="panel mx-auto max-w-lg rounded-[28px] p-10 text-center">
        <h1 className="font-display text-3xl font-semibold uppercase">Your case file</h1>
        <p className="mt-3 text-paper/65">Sign in to track your streak and rewards.</p>
        <button onClick={auth.login} className="mt-6 rounded-full bg-market px-6 py-3 text-[13px] font-semibold text-obsidian">{auth.kind === 'privy' ? 'Sign in with email' : 'Create guest wallet'}</button>
      </div>
    )

  const stat = (label: string, value: React.ReactNode) => (
    <div className="panel rounded-3xl p-5">
      <p className="micro text-muted">{label}</p>
      <p className="mt-3 font-display text-4xl font-semibold tracking-tight">{value}</p>
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
          <CopyButton text={auth.address} label="Copy address" />
          {cfg.explorer && (
            <a href={`${cfg.explorer}/address/${auth.address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-[13px] hover:border-paper/40">
              Explorer <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {!cfg.contract && <p className="mb-6 rounded-xl border border-amber/30 p-4 text-[14px] text-amber">On-chain stats appear once the Tickr contract is deployed.</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat('Current streak', <span className="flex items-center gap-2 text-amber"><Flame size={28} />{player?.streak ?? 0}</span>)}
        {stat('Best streak', player?.bestStreak ?? 0)}
        {stat('Solves', player?.solves ?? 0)}
        {stat('Avg guesses', player?.avgGuesses ?? '—')}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel rounded-3xl p-6" aria-labelledby="ms">
          <h2 id="ms" className="micro text-muted">Streak milestones</h2>
          <ol className="mt-5 space-y-2">
            {(player?.rewards.length ? player.rewards : []).map((r) => (
              <li key={r.streak} className={`flex items-center gap-4 rounded-2xl border px-4 py-3.5 ${r.earned ? 'border-market/40 bg-market/[0.05]' : 'border-line'}`}>
                <span className={`grid h-9 w-9 place-items-center rounded-full ${r.earned ? 'bg-market text-obsidian' : 'bg-white/[0.05] text-muted'}`}>{r.earned ? <Check size={16} /> : <Lock size={14} />}</span>
                <span className="font-display text-xl font-semibold">Day {r.streak}</span>
                <span className="ml-auto font-mono text-[13px] text-paper/80">{r.amount} {r.symbol}</span>
              </li>
            ))}
            {!player?.rewards.length && <p className="text-[14px] text-muted">No milestone rewards configured yet.</p>}
          </ol>
          <p className="mt-4 text-[12px] text-muted">Rewards are testnet stock tokens with no monetary value, paid automatically by the contract when your streak reaches a milestone.</p>
        </section>
        <section className="panel rounded-3xl p-6" aria-labelledby="bal">
          <h2 id="bal" className="micro text-muted">Test token balances</h2>
          <ul className="mt-5 divide-y divide-line">
            {player?.balances.map((b) => (
              <li key={b.token} className="flex items-center justify-between py-3">
                <a href={`${cfg.explorer}/token/${b.token}`} target="_blank" rel="noreferrer" className="font-display text-lg font-semibold hover:text-market">t{b.symbol}</a>
                <span className="font-mono text-[14px]">{Number(b.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </li>
            ))}
          </ul>
          {!player?.balances.length && <p className="text-[14px] text-muted">Nothing yet.</p>}
          <Link to="/play" className="mt-6 inline-block rounded-full bg-market px-5 py-2.5 text-[13px] font-semibold text-obsidian">Play today's case</Link>
        </section>
      </div>
    </>
  )
}
