/** Historical daily price sources. Used at build time (scripts/fetch-market-data.ts) and as a runtime fallback. */

export type Series = { d: string[]; c: number[]; v: number[] }

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; TickrBot/1.0)' }

export async function fromYahoo(ticker: string, year: number): Promise<Series | null> {
  const p1 = Date.UTC(year, 0, 1) / 1000
  const p2 = Date.UTC(year + 1, 0, 1) / 1000
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${p1}&period2=${p2}&interval=1d&events=split`
  const r = await fetch(url, { headers: UA })
  if (!r.ok) return null
  const j = (await r.json()) as {
    chart?: { result?: { timestamp?: number[]; indicators: { quote: { close: (number | null)[]; volume: (number | null)[] }[]; adjclose?: { adjclose: (number | null)[] }[] } }[] }
  }
  const res = j.chart?.result?.[0]
  if (!res?.timestamp) return null
  const close = res.indicators.adjclose?.[0]?.adjclose ?? res.indicators.quote[0].close
  const vol = res.indicators.quote[0].volume
  const out: Series = { d: [], c: [], v: [] }
  res.timestamp.forEach((t, i) => {
    if (close[i] == null) return
    out.d.push(new Date(t * 1000).toISOString().slice(0, 10))
    out.c.push(+close[i]!.toFixed(4))
    out.v.push(vol[i] ?? 0)
  })
  return out.c.length ? out : null
}

function parseCsv(text: string, year: number): Series | null {
  const lines = text.trim().split(/\r?\n/)
  const head = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const di = head.indexOf('date')
  const ci = head.indexOf('adj close') >= 0 ? head.indexOf('adj close') : head.indexOf('close')
  const vi = head.indexOf('volume')
  if (di < 0 || ci < 0) return null
  const out: Series = { d: [], c: [], v: [] }
  for (const l of lines.slice(1)) {
    const f = l.split(',')
    const d = f[di]?.trim()
    if (!d?.startsWith(String(year))) continue
    const c = Number(f[ci])
    if (!Number.isFinite(c) || c <= 0) continue
    out.d.push(d)
    out.c.push(+c.toFixed(4))
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
