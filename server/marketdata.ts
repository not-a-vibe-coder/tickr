/**
 * Live market data for every Robinhood Stock Token.
 *  - Token universe + logos + contract addresses: Robinhood Stock Token API  GET /rhj/assets
 *  - Live bid/ask:                                Robinhood Stock Token API  GET /rhj/prices/{symbol}
 *  - Candles + previous close:                    Yahoo Finance chart API (underlying equity)
 * Set TICKR_MOCK_MARKET=1 to use a deterministic simulated market (offline dev / tests).
 */
import type { Asset, Candle, Quote, Timeframe } from '../shared/market.js'
import { UNIVERSE } from '../shared/universe.js'

const RH = 'https://api.robinhood.com/rhj'
const TESTNET = 46630
const MAINNET = 4663
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; TickrBot/1.0)', accept: 'application/json' }
const mock = () => process.env.TICKR_MOCK_MARKET === '1'

const cache = new Map<string, { at: number; v: unknown }>()
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return hit.v as T
  const v = await fn()
  cache.set(key, { at: Date.now(), v })
  return v
}

// ───────────────────────────── assets ─────────────────────────────

type RhAsset = {
  tokenSymbol: string
  tokenName: string
  logoUrl?: string
  status?: string
  deployments?: { contractAddress: string; chainId: number }[]
}

export async function getAssets(): Promise<Asset[]> {
  if (mock()) return mockAssets()
  return cached('assets', 60 * 60_000, async () => {
    try {
      const r = await fetch(`${RH}/assets`, { headers: UA })
      if (!r.ok) throw new Error(`assets ${r.status}`)
      const j = (await r.json()) as { assets: RhAsset[] }
      const list = j.assets
        .filter((a) => !a.status || a.status === 'ASSET_STATUS_ACTIVE')
        .map((a) => {
          const dep = a.deployments?.find((d) => d.chainId === TESTNET) ?? a.deployments?.find((d) => d.chainId === MAINNET) ?? a.deployments?.[0]
          return {
            symbol: a.tokenSymbol,
            name: a.tokenName.replace(/\s*•\s*Robinhood Token\s*$/i, '').trim(),
            logo: a.logoUrl ?? null,
            address: dep?.contractAddress ?? null,
            chainId: dep?.chainId ?? null,
          }
        })
      return list.length ? list.sort((a, b) => a.symbol.localeCompare(b.symbol)) : mockAssets(false)
    } catch (e) {
      console.error('assets fallback', e)
      return mockAssets(false)
    }
  })
}

function mockAssets(_all = true): Asset[] {
  return UNIVERSE.map(([symbol, name]) => ({ symbol, name, logo: null, address: null, chainId: null })).sort((a, b) => a.symbol.localeCompare(b.symbol))
}

export async function hasAsset(symbol: string) {
  return (await getAssets()).some((a) => a.symbol === symbol)
}

// ───────────────────────────── quotes ─────────────────────────────

type RhQuote = { tokenSymbol: string; bid: string; ask: string; isTradingHalt?: boolean; generatedAt?: string }

export async function getQuote(symbol: string): Promise<Quote | null> {
  if (mock()) return mockQuote(symbol)
  return cached(`q:${symbol}`, 8_000, async () => {
    try {
      const r = await fetch(`${RH}/prices/${encodeURIComponent(symbol)}`, { headers: UA })
      if (!r.ok) return null
      const j = (await r.json()) as { quotes?: RhQuote[] }
      const q = j.quotes?.find((x) => x.tokenSymbol === symbol) ?? j.quotes?.[0]
      if (!q) return null
      const bid = Number(q.bid)
      const ask = Number(q.ask)
      const price = bid > 0 && ask > 0 ? (bid + ask) / 2 : bid || ask
      if (!(price > 0)) return null
      const prev = await prevClose(symbol)
      return { symbol, price, bid, ask, change: prev ? ((price - prev) / prev) * 100 : null, halted: Boolean(q.isTradingHalt), at: q.generatedAt ?? new Date().toISOString() }
    } catch {
      return null
    }
  })
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const out = await Promise.all(symbols.slice(0, 60).map((s) => getQuote(s)))
  return out.filter((q): q is Quote => Boolean(q))
}

// ───────────────────────────── candles (Yahoo) ─────────────────────────────

const yahooSymbol = (s: string) => s.replace('.', '-')
const TF: Record<Timeframe, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '5D': { range: '5d', interval: '15m' },
  '1M': { range: '1mo', interval: '1h' },
  '6M': { range: '6mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
}

type YahooChart = {
  chart?: {
    result?: {
      meta?: { chartPreviousClose?: number; previousClose?: number }
      timestamp?: number[]
      indicators: { quote: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }[] }
    }[]
  }
}

async function yahoo(symbol: string, range: string, interval: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol(symbol)}?range=${range}&interval=${interval}&includePrePost=false`
  const r = await fetch(url, { headers: UA })
  if (!r.ok) return null
  return ((await r.json()) as YahooChart).chart?.result?.[0] ?? null
}

export async function getCandles(symbol: string, tf: Timeframe): Promise<Candle[]> {
  if (mock()) return mockCandles(symbol, tf)
  return cached(`c:${symbol}:${tf}`, tf === '1D' ? 30_000 : 5 * 60_000, async () => {
    try {
      const { range, interval } = TF[tf]
      const res = await yahoo(symbol, range, interval)
      if (!res?.timestamp) return []
      const q = res.indicators.quote[0]
      const out: Candle[] = []
      res.timestamp.forEach((t, i) => {
        const [o, h, l, c] = [q.open[i], q.high[i], q.low[i], q.close[i]]
        if (o == null || h == null || l == null || c == null) return
        out.push({ t: t * 1000, o, h, l, c, v: q.volume[i] ?? 0 })
      })
      return out
    } catch {
      return []
    }
  })
}

async function prevClose(symbol: string): Promise<number | null> {
  return cached(`pc:${symbol}`, 10 * 60_000, async () => {
    try {
      const res = await yahoo(symbol, '1d', '1d')
      return res?.meta?.chartPreviousClose ?? res?.meta?.previousClose ?? null
    } catch {
      return null
    }
  })
}

// ───────────────────────────── mock market ─────────────────────────────

function hash(s: string) {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (h >>> 0) / 4294967296
}
/** Smooth deterministic price path: a function of (symbol, time). */
function mockPrice(symbol: string, tMs: number) {
  const base = 20 + hash(symbol) * 480
  const x = tMs / 3_600_000 // hours
  const k = hash(symbol + 'k') * 6
  const wave = Math.sin(x / 7 + k) * 0.06 + Math.sin(x / 1.3 + k * 2) * 0.015 + Math.sin(x * 3.1 + k) * 0.004
  const drift = Math.sin(x / 200 + k) * 0.25
  return +(base * (1 + wave + drift)).toFixed(2)
}
function mockQuote(symbol: string): Quote {
  const now = Date.now()
  const price = mockPrice(symbol, now)
  const prev = mockPrice(symbol, now - 24 * 3_600_000)
  return { symbol, price, bid: +(price * 0.9995).toFixed(2), ask: +(price * 1.0005).toFixed(2), change: ((price - prev) / prev) * 100, halted: false, at: new Date(now).toISOString() }
}
function mockCandles(symbol: string, tf: Timeframe): Candle[] {
  const step = { '1D': 5, '5D': 15, '1M': 60, '6M': 1440, '1Y': 1440 }[tf] * 60_000
  const n = { '1D': 78, '5D': 130, '1M': 160, '6M': 126, '1Y': 252 }[tf]
  const end = Math.floor(Date.now() / step) * step
  return Array.from({ length: n }, (_, i) => {
    const t = end - (n - 1 - i) * step
    const o = mockPrice(symbol, t)
    const c = mockPrice(symbol, t + step)
    const wig = Math.abs(o - c) * 0.6 + o * 0.002 * hash(symbol + i)
    return { t, o, c, h: +(Math.max(o, c) + wig).toFixed(2), l: +(Math.min(o, c) - wig).toFixed(2), v: Math.round(1e5 + hash(symbol + t) * 9e5) }
  })
}
