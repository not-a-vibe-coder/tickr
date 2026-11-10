/**
 * DEMO DATA ONLY.
 * Chart series below are generated, illustrative shapes — NOT real market prices.
 * Company facts used as clues (sector, HQ, founding year) are general public facts.
 */

export type Company = {
  name: string
  ticker: string
  sector: string
  cap: 'Mega Cap' | 'Large Cap' | 'Mid Cap'
}

export const COMPANIES: Company[] = [
  { name: 'Advanced Micro Devices', ticker: 'AMD', sector: 'Technology', cap: 'Large Cap' },
  { name: 'Airbnb', ticker: 'ABNB', sector: 'Consumer', cap: 'Large Cap' },
  { name: 'Alphabet', ticker: 'GOOGL', sector: 'Communication', cap: 'Mega Cap' },
  { name: 'Amazon', ticker: 'AMZN', sector: 'Consumer', cap: 'Mega Cap' },
  { name: 'Apple', ticker: 'AAPL', sector: 'Technology', cap: 'Mega Cap' },
  { name: 'Coca-Cola', ticker: 'KO', sector: 'Consumer Staples', cap: 'Large Cap' },
  { name: 'Coinbase', ticker: 'COIN', sector: 'Financials', cap: 'Large Cap' },
  { name: 'Disney', ticker: 'DIS', sector: 'Communication', cap: 'Large Cap' },
  { name: 'ExxonMobil', ticker: 'XOM', sector: 'Energy', cap: 'Mega Cap' },
  { name: 'Intel', ticker: 'INTC', sector: 'Technology', cap: 'Large Cap' },
  { name: 'JPMorgan Chase', ticker: 'JPM', sector: 'Financials', cap: 'Mega Cap' },
  { name: 'Meta Platforms', ticker: 'META', sector: 'Communication', cap: 'Mega Cap' },
  { name: 'Microsoft', ticker: 'MSFT', sector: 'Technology', cap: 'Mega Cap' },
  { name: 'Netflix', ticker: 'NFLX', sector: 'Communication', cap: 'Large Cap' },
  { name: 'Nike', ticker: 'NKE', sector: 'Consumer', cap: 'Large Cap' },
  { name: 'NVIDIA', ticker: 'NVDA', sector: 'Technology', cap: 'Mega Cap' },
  { name: 'Palantir', ticker: 'PLTR', sector: 'Technology', cap: 'Large Cap' },
  { name: 'Pfizer', ticker: 'PFE', sector: 'Healthcare', cap: 'Large Cap' },
  { name: 'Robinhood Markets', ticker: 'HOOD', sector: 'Financials', cap: 'Mid Cap' },
  { name: 'Shopify', ticker: 'SHOP', sector: 'Technology', cap: 'Large Cap' },
  { name: 'Spotify', ticker: 'SPOT', sector: 'Communication', cap: 'Large Cap' },
  { name: 'Tesla', ticker: 'TSLA', sector: 'Consumer', cap: 'Mega Cap' },
]

export type Clue = { label: string; value: string; exhibit: string }

export const DEMO_PUZZLE = {
  number: 1,
  answer: 'AMD',
  /** Clues unlock one per incorrect guess (5 wrong guesses unlock all 5). */
  clues: [
    { exhibit: 'A', label: 'Industry', value: 'Technology' },
    { exhibit: 'B', label: 'Market Cap', value: 'Large Cap' },
    { exhibit: 'C', label: 'Year', value: '2021' },
    { exhibit: 'D', label: 'Sub-industry', value: 'Semiconductors' },
    { exhibit: 'E', label: 'Headquarters', value: 'Santa Clara, CA · Founded 1969' },
  ] satisfies Clue[],
}

/** Scripted sequence used by the storytelling scenes. */
export const STORY_GUESSES = [
  { ticker: 'TSLA', name: 'Tesla', result: 'miss' as const },
  { ticker: 'MSFT', name: 'Microsoft', result: 'warm' as const },
  { ticker: 'INTC', name: 'Intel', result: 'warm' as const },
  { ticker: 'AMD', name: 'Advanced Micro Devices', result: 'hit' as const },
]

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** Deterministic pseudo-random generator so charts look identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Illustrative random-walk series with a shaped trend. Not market data. */
export function illustrativeSeries(seed: number, n: number, shape: (t: number) => number, vol = 1) {
  const rand = mulberry32(seed)
  const out: number[] = []
  let noise = 0
  for (let i = 0; i < n; i++) {
    noise = noise * 0.86 + (rand() - 0.5) * 2.4 * vol
    out.push(100 + shape(i / (n - 1)) * 60 + noise * 3)
  }
  return out
}

export function illustrativeVolume(seed: number, n: number) {
  const rand = mulberry32(seed)
  return Array.from({ length: n }, (_, i) => 0.25 + rand() * 0.55 + (i % 17 === 0 ? 0.3 : 0))
}

/** Shape used for the hero / story chart: slow build, sharp drawdown, breakout. */
export const storyShape = (t: number) =>
  Math.sin(t * 2.4) * 0.35 + t * 1.15 - Math.exp(-Math.pow((t - 0.58) * 9, 2)) * 0.55

export const STORY_SERIES = illustrativeSeries(7, 140, storyShape)
export const STORY_VOLUME = illustrativeVolume(11, 140)
