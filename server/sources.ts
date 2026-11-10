/** Historical daily price sources. Used at build time (scripts/fetch-market-data.ts) and as a runtime fallback. */

/** Daily OHLCV, split/dividend adjusted where the source allows. o/h/l are optional for older cached files. */
export type Series = { d: string[]; o?: number[]; h?: number[]; l?: number[]; c: number[]; v: number[] }

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; TickrBot/1.0)' }

export async function fromYahoo(ticker: string, year: number): Promise<Series | null> {
  const p1 = Date.UTC(year, 0, 1) / 1000
  const p2 = Date.UTC(year + 1, 0, 1) / 1000
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${p1}&period2=${p2}&interval=1d&events=split`
  const r = await fetch(url, { headers: UA })
  if (!r.ok) return null
  const j = (await r.json()) as {
    chart?: { result?: { timestamp?: number[]; indicators: { quote: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }[]; adjclose?: { adjclose: (number | null)[] }[] } }[] }
  }
  const res = j.chart?.result?.[0]
  if (!res?.timestamp) return null
  const q = res.indicators.quote[0]
  const adj = res.indicators.adjclose?.[0]?.adjclose
  const out: Series = { d: [], o: [], h: [], l: [], c: [], v: [] }
  res.timestamp.forEach((t, i) => {
    const [o, h, l, c] = [q.open[i], q.high[i], q.low[i], q.close[i]]
    if (o == null || h == null || l == null || c == null || c <= 0) return
    const k = adj?.[i] != null ? adj[i]! / c : 1 // apply the same adjustment to o/h/l
    out.d.push(new Date(t * 1000).toISOString().slice(0, 10))
    out.o!.push(+(o * k).toFixed(4))
    out.h!.push(+(h * k).toFixed(4))
    out.l!.push(+(l * k).toFixed(4))
    out.c.push(+(c * k).toFixed(4))
    out.v.push(q.volume[i] ?? 0)
  })
  return out.c.length ? out : null
}

function parseCsv(text: string, year: number): Series | null {
  const lines = text.trim().split(/\r?\n/)
  const head = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const di = head.indexOf('date')
  const raw = head.indexOf('close')
  const adjI = head.indexOf('adj close')
  const [oi, hi, li] = [head.indexOf('open'), head.indexOf('high'), head.indexOf('low')]
  const vi = head.indexOf('volume')
  if (di < 0 || raw < 0) return null
  const out: Series = { d: [], o: [], h: [], l: [], c: [], v: [] }
  for (const line of lines.slice(1)) {
    const f = line.split(',')
    const d = f[di]?.trim()
    if (!d?.startsWith(String(year))) continue
    const c = Number(f[raw])
    if (!Number.isFinite(c) || c <= 0) continue
    const k = adjI >= 0 && Number(f[adjI]) > 0 ? Number(f[adjI]) / c : 1
    const px = (i: number) => (i >= 0 && Number(f[i]) > 0 ? +(Number(f[i]) * k).toFixed(4) : +(c * k).toFixed(4))
    out.d.push(d)
    out.o!.push(px(oi))
    out.h!.push(px(hi))
    out.l!.push(px(li))
    out.c.push(+(c * k).toFixed(4))
    out.v.push(Number(f[vi]) || 0)
  }
  return out.c.length ? out : null
}

export async function fromStooq(ticker: string, year: number): Promise<Series | null> {
  const s = `${ticker.toLowerCase()}.us`
  const r = await fetch(`https://stooq.com/q/d/l/?s=${s}&i=d&d1=${year}0101&d2=${year}1231`, { headers: UA })
  if (!r.ok) return null
  return parseCsv(await r.text(), year)
}

/** Public GitHub CSV mirrors (partial coverage). Last resort; also lets offline dev environments work. */
const MIRRORS = [
  (t: string) => `https://raw.githubusercontent.com/MehranTaghian/DQN-Trading/master/Data/${t}/${t}.csv`,
  (t: string) => `https://raw.githubusercontent.com/hackingthemarkets/candlestick-screener/master/datasets/daily/${t === 'META' ? 'FB' : t}.csv`,
]
export async function fromMirrors(ticker: string, year: number): Promise<Series | null> {
  for (const m of MIRRORS) {
    try {
      const r = await fetch(m(ticker))
      if (!r.ok) continue
      const s = parseCsv(await r.text(), year)
      if (s && s.c.length >= 80) return s
    } catch {
      /* next */
    }
  }
  return null
}

export async function fetchSeries(ticker: string, year: number): Promise<Series | null> {
  for (const src of [fromYahoo, fromStooq, fromMirrors]) {
    try {
      const s = await src(ticker, year)
      if (s && s.c.length >= 80) return s
    } catch {
      /* try next source */
    }
  }
  return null
}
