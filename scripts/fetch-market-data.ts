/**
 * Builds server/generated/market.json with real daily history for every puzzle in the pool.
 * Runs automatically before `npm run build` (so Vercel fetches fresh data on each deploy).
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { POOL } from '../server/pool.ts'
import { fetchSeries, type Series } from '../server/sources.ts'

const out = new URL('../server/generated/market.json', import.meta.url)
const prev: Record<string, Series> = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {}
const data: Record<string, Series> = {}
let ok = 0

await Promise.all(
  POOL.map(async ({ ticker, year }) => {
    const k = `${ticker}-${year}`
    const s = (await fetchSeries(ticker, year)) ?? prev[k]
    if (s) {
      data[k] = s
      ok++
    } else console.warn(`  ! no data for ${k}`)
  }),
)

mkdirSync(new URL('../server/generated/', import.meta.url), { recursive: true })
writeFileSync(out, JSON.stringify(data))
console.log(`market data: ${ok}/${POOL.length} puzzles ready`)
