import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { shortAddr } from './auth'
import { fmtNum, fmtPx } from './Trade'

export type TradeRow = { player: string; symbol: string; side: 'buy' | 'sell'; qty: number; price: number; value: number; time: number }

export const timeAgo = (t: number) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

/** Live on-chain trade tape. */
export function TradeTape({ trades, showSymbol = true, onPick, empty = 'No trades yet.' }: { trades: TradeRow[]; showSymbol?: boolean; onPick?: (s: string) => void; empty?: string }) {
  if (!trades.length) return <p className="px-4 py-5 text-[13px] text-muted">{empty}</p>
  return (
    <ul className="divide-y divide-line">
      <AnimatePresence initial={false}>
        {trades.map((t) => (
          <motion.li key={`${t.player}-${t.time}-${t.symbol}-${t.qty}`} layout initial={{ opacity: 0, backgroundColor: 'rgba(14,117,55,0.12)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 0.8 }} className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px]">
            <span className={`w-9 shrink-0 font-mono text-[10.5px] font-semibold uppercase ${t.side === 'buy' ? 'text-market' : 'text-loss'}`}>{t.side}</span>
            {showSymbol && (
              <button onClick={() => onPick?.(t.symbol)} className="w-12 shrink-0 text-left font-mono font-semibold hover:text-market">{t.symbol}</button>
            )}
            <span className="min-w-0 flex-1 truncate font-mono text-muted">
              {fmtNum(t.value, 0)} <span className="text-[10px]">TCKR</span> @ {fmtPx(t.price)}
            </span>
            <Link to={`/u/${t.player}`} className="shrink-0 font-mono text-[11px] text-paper/70 hover:text-market">{shortAddr(t.player)}</Link>
            <span className="w-7 shrink-0 text-right font-mono text-[10.5px] text-muted">{timeAgo(t.time)}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

export function useActivity(ms = 6000) {
  const [trades, setTrades] = useState<TradeRow[]>([])
  useEffect(() => {
    let alive = true
    const run = () => fetch('/api/activity').then((r) => r.json()).then((j) => alive && setTrades(j.trades ?? [])).catch(() => undefined)
    run()
    const id = setInterval(run, ms)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [ms])
  return trades
}
