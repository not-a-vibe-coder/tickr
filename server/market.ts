import { existsSync, readFileSync } from 'node:fs'
import { fetchSeries, type Series } from './sources.js'
import { POOL } from './pool.js'

/** Price data for pool entries: prebuilt file first, then live fetch (cached per instance). */
const FILE = new URL('./generated/market.json', import.meta.url)
let prebuilt: Record<string, Series> | null = null
const live = new Map<string, Series | null>()

function loadPrebuilt() {
  if (prebuilt) return prebuilt
  try {
    prebuilt = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, Series>) : {}
  } catch {
    prebuilt = {}
  }
  return prebuilt
}

export const keyOf = (idx: number) => `${POOL[idx].ticker}-${POOL[idx].year}`

/** Synchronous availability check against the prebuilt dataset. */
export function hasPrebuilt(idx: number) {
  return Boolean(loadPrebuilt()[keyOf(idx)])
}

export async function seriesFor(idx: number): Promise<Series | null> {
  const k = keyOf(idx)
  const pre = loadPrebuilt()[k]
  if (pre) return pre
  if (!live.has(k)) live.set(k, await fetchSeries(POOL[idx].ticker, POOL[idx].year))
  return live.get(k) ?? null
}

/** If nothing was prebuilt (e.g. local dev without a build), every entry is a candidate. */
export function availability() {
  const any = Object.keys(loadPrebuilt()).length > 0
  return (idx: number) => (any ? hasPrebuilt(idx) : true)
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** Strip identifying absolutes: rebase to 100 and scale volume to 0..1. */
export function toPayloadSeries(s: Series) {
  const base = s.c[0]
  const vmax = Math.max(1, ...s.v)
  const monthTicks: { i: number; label: string }[] = []
  let last = -1
  s.d.forEach((d, i) => {
    const m = Number(d.slice(5, 7)) - 1
    if (m !== last) {
      monthTicks.push({ i, label: MONTHS[m] })
      last = m
    }
  })
  return {
    points: s.c.map((c) => +((c / base) * 100).toFixed(2)),
    volume: s.v.map((v) => +(v / vmax).toFixed(3)),
    monthTicks,
  }
}
