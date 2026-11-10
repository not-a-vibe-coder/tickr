import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Coins, ExternalLink, Flame, Link2, Trophy } from 'lucide-react'
import type { ConfigPayload, PlayerPayload } from '../../shared/api'
import type { PortfolioPayload } from '../../shared/market'
import { shortAddr, useAuth } from './auth'
import { CopyButton } from './Game'
import { fmtNum, fmtPx } from './Trade'
import { TradeTape, type TradeRow } from './Activity'
import { TokenLogo, useAssets } from './useAssets'

type ProfilePayload = { stats: PlayerPayload; portfolio: PortfolioPayload; trades: TradeRow[]; rank: number | null; players: number }

/** Read-only public portfolio: anyone with the link can see a player's holdings, P&L and trades. */
export default function PublicProfile({ cfg }: { cfg: ConfigPayload }) {
  const { address = '' } = useParams()
  const auth = useAuth()
  const assets = useAssets()
  const [data, setData] = useState<ProfilePayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const me = auth.address?.toLowerCase() === address.toLowerCase()

  useEffect(() => {
    let alive = true
    const run = () =>
      fetch(`/api/profile?address=${address}`)
        .then(async (r) => {
          const j = await r.json()
          if (!r.ok) throw new Error(j.error ?? 'Not found')
          if (alive) setData(j)
        })
        .catch((e) => alive && setErr(e.message))
    run()
    const id = setInterval(run, 20_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [address])

  if (err) return <p className="panel rounded-3xl p-8 text-loss">{err}</p>
  if (!data) return <p className="panel rounded-3xl p-8 text-muted">Loading portfolio…</p>

  const { stats, portfolio, trades } = data
  const invested = portfolio.holdings.reduce((s, h) => s + h.cost, 0)
  const pnl = portfolio.holdings.reduce((s, h) => s + h.pnl, 0)
  const growth = ((portfolio.netWorth - 10_000) / 10_000) * 100
  const cell = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <div className="panel rounded-3xl p-5">
      <p className="micro text-muted">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-muted">{sub}</p>}
    </div>
  )

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="micro mb-3 flex items-center gap-2 text-muted">
            Public portfolio {me && <span className="text-market">· You</span>}
          </p>
          <h1 className="display font-mono text-[9vw] sm:text-5xl">{shortAddr(address)}</h1>
          {data.rank && (
            <p className="mt-3 flex items-center gap-2 text-[14px] text-paper/75">
              <Trophy size={15} className="text-market" /> Rank <b>#{data.rank}</b> of {data.players} by net worth
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={`${location.origin}/u/${address}`} label="Copy profile link" icon={<Link2 size={14} />} />
          {cfg.explorer && (
            <a href={`${cfg.explorer}/address/${address}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-[13px] hover:border-paper/40">
              Explorer <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cell('Net worth', <span className="flex items-center gap-2 text-market"><Coins size={22} />{fmtNum(portfolio.netWorth, 0)}</span>, <span className={growth >= 0 ? 'text-market' : 'text-loss'}>{growth >= 0 ? '+' : ''}{growth.toFixed(2)}% vs 10K start</span>)}
        {cell('Open P&L', <span className={pnl >= 0 ? 'text-market' : 'text-loss'}>{pnl >= 0 ? '+' : ''}{fmtNum(pnl, Math.abs(pnl) < 100 ? 2 : 0)}</span>, `${fmtNum(invested, 0)} TCKR invested`)}
        {cell('Streak', <span className="flex items-center gap-2 text-amber"><Flame size={22} />{stats.streak}</span>, `Best ${stats.bestStreak} · ${stats.solves} solves`)}
        {cell('Trades', trades.length >= 25 ? '25+' : trades.length, `Cash ${fmtNum(portfolio.cash, 0)}`)}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel overflow-hidden rounded-3xl" aria-labelledby="h">
          <p id="h" className="micro border-b border-line px-5 py-3 text-muted">Holdings</p>
          {!portfolio.holdings.length ? (
            <p className="px-5 py-6 text-[13px] text-muted">No open positions.</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...portfolio.holdings].sort((a, b) => b.value - a.value).map((h) => {
                const weight = (h.value / Math.max(1, portfolio.netWorth)) * 100
                return (
                  <li key={h.symbol} className="px-5 py-3">
                    <div className="flex items-center gap-3 text-[13.5px]">
                      <TokenLogo asset={assets.find((a) => a.symbol === h.symbol) ?? { symbol: h.symbol, logo: null }} size={26} />
                      <Link to="/trade" className="font-mono font-semibold hover:text-market">{h.symbol}</Link>
                      <span className="font-mono text-[12px] text-muted">{fmtNum(h.qty, 4)} @ {h.price != null ? fmtPx(h.price) : '—'}</span>
                      <span className="ml-auto font-mono">{fmtNum(h.value, 0)}</span>
                      <span className={`w-20 text-right font-mono text-[12px] ${h.pnl >= 0 ? 'text-market' : 'text-loss'}`}>{h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full rounded-full bg-market/70" style={{ width: `${Math.min(100, weight)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="panel overflow-hidden rounded-3xl" aria-labelledby="t">
          <p id="t" className="micro border-b border-line px-5 py-3 text-muted">Recent trades · on-chain</p>
          <div className="max-h-[420px] overflow-y-auto">
            <TradeTape trades={trades} empty="No trades yet." />
          </div>
        </section>
      </div>
    </>
  )
}
