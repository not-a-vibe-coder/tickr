import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Check, ExternalLink, Loader2, Search, X } from 'lucide-react'
import CandleChart from './CandleChart'
import { api } from './api'
import { useAuth } from './auth'
import { searchAssets, TokenLogo, useAssets } from './useAssets'
import { tradeIntentMessage } from '../../shared/intent'
import type { Asset, Candle, PortfolioPayload, Quote, Timeframe } from '../../shared/market'
import type { ConfigPayload } from '../../shared/api'

export const fmtNum = (n: number, dp = 2) => n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
export const fmtPx = (n: number) => fmtNum(n, n >= 1000 ? 2 : n >= 1 ? 2 : 4)
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`)
const TFS: Timeframe[] = ['1D', '5D', '1M', '6M', '1Y']
const POPULAR = ['TSLA', 'NVDA', 'AAPL', 'AMZN', 'MSFT', 'META', 'GOOGL', 'AMD', 'PLTR', 'NFLX', 'COIN', 'HOOD', 'MSTR']

function usePoll<T>(fn: (() => Promise<T>) | null, ms: number, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!fn) return setData(null)
    let alive = true
    const run = () => fn().then((d) => alive && setData(d)).catch(() => undefined)
    run()
    const id = setInterval(run, ms)
    return () => {
      alive = false
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return [data, () => setTick((t) => t + 1)] as const
}

export function usePortfolio(address: string | null, enabled: boolean) {
  return usePoll<PortfolioPayload>(address && enabled ? () => api.portfolio(address) : null, 15_000, [address, enabled])
}

export default function Trade({ cfg }: { cfg: ConfigPayload }) {
  const auth = useAssetsAuth()
  const assets = auth.assets
  const [symbol, setSymbol] = useState('TSLA')
  const [tf, setTf] = useState<Timeframe>('1D')
  const [filter, setFilter] = useState('')
  const [tab, setTab] = useState<'all' | 'held'>('all')
  const [portfolio, refreshPortfolio] = usePortfolio(auth.address, Boolean(cfg.contract))

  const asset = assets.find((a) => a.symbol === symbol) ?? { symbol, name: symbol, logo: null, address: null, chainId: null }
  const heldSymbols = useMemo(() => portfolio?.holdings.map((h) => h.symbol) ?? [], [portfolio])

  const listed = useMemo(() => {
    if (tab === 'held') return assets.filter((a) => heldSymbols.includes(a.symbol))
    if (filter.trim()) return searchAssets(assets, filter, 40)
    const pop = POPULAR.map((s) => assets.find((a) => a.symbol === s)).filter(Boolean) as Asset[]
    return [...pop, ...assets.filter((a) => !POPULAR.includes(a.symbol))].slice(0, 40)
  }, [assets, filter, tab, heldSymbols])

  const watch = useMemo(() => [...new Set([symbol, ...listed.slice(0, 30).map((a) => a.symbol)])], [symbol, listed])
  const [quotesData] = usePoll(() => api.quotes(watch), 10_000, [watch.join(',')])
  const quotes = useMemo(() => new Map((quotesData?.quotes ?? []).map((q) => [q.symbol, q])), [quotesData])
  const [candlesData] = usePoll(() => api.candles(symbol, tf), tf === '1D' ? 30_000 : 120_000, [symbol, tf])
  const q = quotes.get(symbol) ?? null
  const holding = portfolio?.holdings.find((h) => h.symbol === symbol) ?? null

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="micro mb-3 text-muted">Demo trading · live Robinhood Stock Token prices · positions on-chain</p>
          <h1 className="display text-[13vw] sm:text-6xl">Trade<span className="text-market">.</span></h1>
        </div>
        <PortfolioStrip portfolio={portfolio} signedIn={Boolean(auth.address)} live={Boolean(cfg.contract)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr_320px]">
        {/* token list */}
        <aside className="panel order-3 flex max-h-[440px] flex-col overflow-hidden rounded-3xl lg:order-1 lg:max-h-[720px]" aria-label="Stock tokens">
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value)
                  setTab('all')
                }}
                placeholder={`Search ${assets.length || ''} tokens`}
                aria-label="Search stock tokens"
                className="h-10 w-full rounded-xl border border-line bg-obsidian/70 pl-9 pr-3 text-[13px] placeholder:text-muted/60 focus:border-market/50 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex gap-1" role="tablist">
              {(['all', 'held'] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-[12px] ${tab === t ? 'bg-paper text-obsidian' : 'text-paper/60 hover:text-paper'}`}>
                  {t === 'all' ? 'All' : `Holdings${heldSymbols.length ? ` · ${heldSymbols.length}` : ''}`}
                </button>
              ))}
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-1.5">
            {listed.map((a) => {
              const qq = quotes.get(a.symbol)
              return (
                <li key={a.symbol}>
                  <button onClick={() => setSymbol(a.symbol)} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${a.symbol === symbol ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'}`}>
                    <TokenLogo asset={a} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[12.5px] font-semibold">{a.symbol}</span>
                      <span className="block truncate text-[11px] text-muted">{a.name}</span>
                    </span>
                    <span className="text-right font-mono text-[11.5px]">
                      <span className="block">{qq ? fmtPx(qq.price) : '—'}</span>
                      <span className={`block ${qq?.change == null ? 'text-muted' : qq.change >= 0 ? 'text-market' : 'text-loss'}`}>{pct(qq?.change)}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {!listed.length && <li className="p-4 text-[13px] text-muted">{tab === 'held' ? 'No open positions yet.' : 'No tokens match.'}</li>}
          </ul>
        </aside>

        {/* chart + positions */}
        <section className="order-1 flex flex-col gap-3 lg:order-2">
          <div className="panel rounded-3xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <TokenLogo asset={asset} size={36} />
              <div>
                <p className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-semibold tracking-tight">{asset.symbol}</span>
                  <span className="text-[13px] text-muted">{asset.name}</span>
                </p>
                <p className="flex items-baseline gap-2 font-mono">
                  <span className="text-xl">{q ? fmtPx(q.price) : '—'}</span>
                  <span className={`text-[13px] ${q?.change == null ? 'text-muted' : q.change >= 0 ? 'text-market' : 'text-loss'}`}>{pct(q?.change)}</span>
                  {q?.halted && <span className="micro text-amber">Halted</span>}
                </p>
              </div>
              <div className="ml-auto flex rounded-full border border-line p-1" role="tablist" aria-label="Timeframe">
                {TFS.map((t) => (
                  <button key={t} role="tab" aria-selected={tf === t} onClick={() => setTf(t)} className={`rounded-full px-3 py-1 font-mono text-[11px] ${tf === t ? 'bg-paper text-obsidian' : 'text-paper/60 hover:text-paper'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <PriceChart candles={candlesData?.candles ?? null} tf={tf} live={q?.price ?? null} symbol={symbol} />
            </div>
            {asset.address && (
              <p className="micro mt-1 flex items-center gap-2 !text-[9px] text-muted/70">
                {asset.chainId === 46630 ? 'Testnet' : 'Mainnet'} token · {asset.address.slice(0, 10)}…{asset.address.slice(-6)}
              </p>
            )}
          </div>
          <div className="hidden lg:block">
            <Positions portfolio={portfolio} onPick={setSymbol} />
          </div>
        </section>

        {/* order ticket */}
        <div className="order-2 lg:order-3">
          <OrderTicket cfg={cfg} asset={asset} quote={q} holdingQty={holding?.qty ?? 0} cash={portfolio?.cash ?? null} onFilled={refreshPortfolio} />
          <div className="mt-3 lg:hidden">
            <Positions portfolio={portfolio} onPick={setSymbol} />
          </div>
        </div>
      </div>
    </>
  )
}

function useAssetsAuth() {
  const assets = useAssets()
  const { address } = useAuth()
  return { assets, address }
}

function PriceChart({ candles, tf, live, symbol }: { candles: Candle[] | null; tf: Timeframe; live: number | null; symbol: string }) {
  if (!candles) return <div className="grid h-72 place-items-center sm:h-96"><Loader2 className="animate-spin text-muted" size={18} /></div>
  if (!candles.length) return <div className="grid h-72 place-items-center text-[13px] text-muted sm:h-96">No candles for this timeframe yet.</div>
  const intraday = tf === '1D' || tf === '5D'
  const label = (t: number) =>
    intraday
      ? new Date(t).toLocaleString(undefined, { weekday: tf === '5D' ? 'short' : undefined, hour: '2-digit', minute: '2-digit', hour12: false })
      : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const every = Math.max(1, Math.round(candles.length / (typeof window !== 'undefined' && window.innerWidth < 640 ? 4 : 6)))
  const ticks = candles.map((c, i) => ({ i, label: label(c.t) })).filter((_, i) => i % every === 0)
  return (
    <CandleChart
      candles={candles}
      labelAt={(i) => label(candles[i].t)}
      ticks={ticks}
      fmt={fmtPx}
      live={live}
      animateKey={`${symbol}-${tf}`}
      className="h-72 sm:h-96"
      ariaLabel={`${symbol} candlestick chart, ${tf}`}
    />
  )
}

function PortfolioStrip({ portfolio, signedIn, live }: { portfolio: PortfolioPayload | null; signedIn: boolean; live: boolean }) {
  if (!live) return <p className="rounded-xl border border-amber/30 px-4 py-3 text-[13px] text-amber">Trading goes live once the Tickr contract is deployed.</p>
  if (!signedIn) return <p className="text-[13px] text-muted">Sign in to get 10,000 TCKR and start trading.</p>
  const invested = portfolio?.holdings.reduce((s, h) => s + h.cost, 0) ?? 0
  const pnl = portfolio?.holdings.reduce((s, h) => s + h.pnl, 0) ?? 0
  const cell = (k: string, v: React.ReactNode) => (
    <div className="min-w-[110px]">
      <p className="micro text-muted">{k}</p>
      <p className="mt-1 font-mono text-lg">{v}</p>
    </div>
  )
  return (
    <div className="panel flex flex-wrap gap-6 rounded-2xl px-5 py-3">
      {cell('Net worth', portfolio ? `${fmtNum(portfolio.netWorth)}` : '—')}
      {cell('Cash', portfolio ? fmtNum(portfolio.cash) : '—')}
      {cell('Invested', fmtNum(invested))}
      {cell('Open P&L', <span className={pnl >= 0 ? 'text-market' : 'text-loss'}>{pnl >= 0 ? '+' : ''}{fmtNum(pnl)}</span>)}
      <span className="micro self-end text-muted">TCKR</span>
    </div>
  )
}

function Positions({ portfolio, onPick }: { portfolio: PortfolioPayload | null; onPick: (s: string) => void }) {
  const assets = useAssets()
  return (
    <div className="panel overflow-hidden rounded-3xl">
      <p className="micro border-b border-line px-5 py-3 text-muted">Open positions</p>
      {!portfolio?.holdings.length ? (
        <p className="px-5 py-6 text-[13px] text-muted">No positions. Pick a token and place a demo trade — it settles on Robinhood Chain.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="micro text-left text-muted">
              <tr>
                <th className="px-5 py-2 font-normal">Token</th>
                <th className="px-3 py-2 text-right font-normal">Shares</th>
                <th className="px-3 py-2 text-right font-normal">Avg cost</th>
                <th className="px-3 py-2 text-right font-normal">Price</th>
                <th className="px-3 py-2 text-right font-normal">Value</th>
                <th className="px-5 py-2 text-right font-normal">P&L</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((h) => (
                <tr key={h.symbol} onClick={() => onPick(h.symbol)} className="cursor-pointer border-t border-line hover:bg-white/[0.03]">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <TokenLogo asset={assets.find((a) => a.symbol === h.symbol) ?? { symbol: h.symbol, logo: null }} size={22} />
                      <span className="font-mono font-semibold">{h.symbol}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{fmtNum(h.qty, 4)}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtPx(h.cost / h.qty)}</td>
                  <td className="px-3 py-3 text-right font-mono">{h.price != null ? fmtPx(h.price) : '—'}</td>
                  <td className="px-3 py-3 text-right font-mono">{fmtNum(h.value)}</td>
                  <td className={`px-5 py-3 text-right font-mono ${h.pnl >= 0 ? 'text-market' : 'text-loss'}`}>
                    {h.pnl >= 0 ? '+' : ''}
                    {fmtNum(h.pnl)} <span className="text-[11px] opacity-80">({pct(h.pnlPct)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const randomNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

function OrderTicket({ cfg, asset, quote, holdingQty, cash, onFilled }: { cfg: ConfigPayload; asset: Asset; quote: Quote | null; holdingQty: number; cash: number | null; onFilled: () => void }) {
  const auth = useAuth()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'done' | 'error'; msg?: string; tx?: string }>({ kind: 'idle' })

  useEffect(() => {
    setAmount('')
    setState({ kind: 'idle' })
  }, [asset.symbol, side])

  const amt = Number(amount) || 0
  const px = quote ? (side === 'buy' ? quote.ask || quote.price : quote.bid || quote.price) : null
  const est = px ? (side === 'buy' ? amt / px : amt * px) : null
  const over = side === 'buy' ? cash != null && amt > cash + 0.01 : amt > holdingQty + 1e-9

  const presets = side === 'buy' ? [100, 500, 1000, 2500] : [0.25, 0.5, 0.75, 1]
  const submit = useCallback(async () => {
    if (!auth.address || !(amt > 0) || over) return
    setState({ kind: 'busy', msg: 'Signing…' })
    try {
      const unit = side === 'buy' ? 'TCKR' : 'shares'
      const nonce = randomNonce()
      const expires = Math.floor(Date.now() / 1000) + 120
      const amountStr = String(amt)
      const signature = await auth.signMessage(tradeIntentMessage({ player: auth.address, side, symbol: asset.symbol, amount: amountStr, unit, nonce, expires }))
      setState({ kind: 'busy', msg: 'Settling on Robinhood Chain…' })
      const r = await api.trade({ player: auth.address, side, symbol: asset.symbol, amount: amountStr, unit, nonce, expires, signature })
      setState({ kind: 'done', msg: `${side === 'buy' ? 'Bought' : 'Sold'} ${fmtNum(r.qty, 4)} ${r.symbol} @ ${fmtPx(r.price)}`, tx: r.txHash })
      setAmount('')
      setTimeout(onFilled, 1200)
      setTimeout(() => window.dispatchEvent(new Event('tickr:stats')), 1500)
    } catch (e) {
      setState({ kind: 'error', msg: (e as Error).message })
    }
  }, [auth, amt, over, side, asset.symbol, onFilled])

  return (
    <div className="panel rounded-3xl p-5 lg:sticky lg:top-24">
      <div className="grid grid-cols-2 rounded-full border border-line p-1" role="tablist" aria-label="Order side">
        {(['buy', 'sell'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={side === s} onClick={() => setSide(s)} className={`rounded-full py-2 text-[13px] font-semibold capitalize transition ${side === s ? (s === 'buy' ? 'bg-market text-obsidian' : 'bg-loss text-obsidian') : 'text-paper/60 hover:text-paper'}`}>
            {s}
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="micro flex justify-between text-muted">
          <span>{side === 'buy' ? 'Spend (TCKR)' : `Sell (${asset.symbol} shares)`}</span>
          <span className="normal-case tracking-normal">{side === 'buy' ? `Cash ${cash != null ? fmtNum(cash) : '—'}` : `Held ${fmtNum(holdingQty, 4)}`}</span>
        </span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="0.00"
          className="mt-2 h-14 w-full rounded-xl border border-line bg-obsidian/70 px-4 font-mono text-2xl focus:border-market/50 focus:outline-none"
        />
      </label>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(side === 'buy' ? String(cash != null ? Math.min(p, Math.floor(cash * 100) / 100) : p) : String(+(holdingQty * p).toFixed(6)))}
            className="rounded-lg border border-line py-1.5 font-mono text-[11px] text-paper/75 hover:border-paper/30"
          >
            {side === 'buy' ? p.toLocaleString() : `${p * 100}%`}
          </button>
        ))}
      </div>
      {side === 'buy' && cash != null && (
        <button onClick={() => setAmount(String(Math.floor(cash * 100) / 100))} className="mt-1.5 w-full rounded-lg border border-line py-1.5 font-mono text-[11px] text-paper/75 hover:border-paper/30">Max</button>
      )}

      <dl className="mt-5 space-y-2 text-[13px]">
        <div className="flex justify-between"><dt className="text-muted">{side === 'buy' ? 'Ask' : 'Bid'}</dt><dd className="font-mono">{px ? fmtPx(px) : '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{side === 'buy' ? 'Est. shares' : 'Est. proceeds'}</dt><dd className="font-mono">{est != null && amt ? (side === 'buy' ? fmtNum(est, 4) : `${fmtNum(est)} TCKR`) : '—'}</dd></div>
      </dl>

      {auth.address ? (
        <button
          disabled={!cfg.contract || !(amt > 0) || over || state.kind === 'busy' || !quote || quote.halted}
          onClick={() => void submit()}
          className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-obsidian transition disabled:cursor-not-allowed disabled:opacity-40 ${side === 'buy' ? 'bg-market hover:bg-paper' : 'bg-loss hover:bg-paper'}`}
        >
          {state.kind === 'busy' ? <><Loader2 size={15} className="animate-spin" /> {state.msg}</> : over ? (side === 'buy' ? 'Not enough TCKR' : 'Not enough shares') : <>{side === 'buy' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />} {side === 'buy' ? 'Buy' : 'Sell'} {asset.symbol}</>}
        </button>
      ) : (
        <button onClick={auth.login} className="mt-5 h-12 w-full rounded-full bg-market text-[14px] font-semibold text-obsidian">{auth.kind === 'privy' ? 'Sign in to trade' : 'Play as guest to trade'}</button>
      )}

      <AnimatePresence>
        {(state.kind === 'done' || state.kind === 'error') && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] ${state.kind === 'done' ? 'border-market/30 bg-market/[0.06]' : 'border-loss/30 text-loss'}`} role="status">
            {state.kind === 'done' ? <Check size={14} className="mt-0.5 shrink-0 text-market" /> : <X size={14} className="mt-0.5 shrink-0" />}
            <span className="flex-1">
              {state.msg}
              {state.tx && cfg.explorer && (
                <a href={`${cfg.explorer}/tx/${state.tx}`} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-market hover:underline">tx <ExternalLink size={11} /></a>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-4 text-[11px] leading-relaxed text-muted">Demo trading with $TCKR points at live Robinhood Stock Token prices (buys fill at ask, sells at bid). Points have no monetary value.</p>
    </div>
  )
}
