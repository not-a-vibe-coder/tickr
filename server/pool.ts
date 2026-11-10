import { createHmac } from 'node:crypto'
import { encodeAbiParameters, keccak256, type Hex } from 'viem'
import { env } from './env.js'

/** The puzzle pool: a company and the calendar year its chart is taken from. */
export const POOL: { ticker: string; year: number }[] = [
  { ticker: 'AAPL', year: 2008 }, { ticker: 'AAPL', year: 2012 }, { ticker: 'AAPL', year: 2020 },
  { ticker: 'MSFT', year: 2000 }, { ticker: 'MSFT', year: 2023 },
  { ticker: 'AMZN', year: 2001 }, { ticker: 'AMZN', year: 2020 }, { ticker: 'AMZN', year: 2022 },
  { ticker: 'GOOGL', year: 2008 }, { ticker: 'GOOGL', year: 2022 },
  { ticker: 'META', year: 2012 }, { ticker: 'META', year: 2018 }, { ticker: 'META', year: 2022 },
  { ticker: 'NVDA', year: 2016 }, { ticker: 'NVDA', year: 2018 }, { ticker: 'NVDA', year: 2023 },
  { ticker: 'AMD', year: 2016 }, { ticker: 'AMD', year: 2021 },
  { ticker: 'INTC', year: 2000 }, { ticker: 'INTC', year: 2024 },
  { ticker: 'TSLA', year: 2013 }, { ticker: 'TSLA', year: 2020 }, { ticker: 'TSLA', year: 2022 },
  { ticker: 'NFLX', year: 2011 }, { ticker: 'NFLX', year: 2022 },
  { ticker: 'PLTR', year: 2021 }, { ticker: 'PLTR', year: 2024 },
  { ticker: 'KO', year: 2008 }, { ticker: 'JPM', year: 2008 }, { ticker: 'DIS', year: 2020 },
  { ticker: 'NKE', year: 2023 }, { ticker: 'PFE', year: 2021 }, { ticker: 'SBUX', year: 2008 },
  { ticker: 'MCD', year: 2003 }, { ticker: 'WMT', year: 2008 }, { ticker: 'COST', year: 2020 },
  { ticker: 'V', year: 2020 }, { ticker: 'PYPL', year: 2021 }, { ticker: 'CCL', year: 2020 },
  { ticker: 'DAL', year: 2020 }, { ticker: 'IBM', year: 2013 }, { ticker: 'HOOD', year: 2021 },
  { ticker: 'HOOD', year: 2024 }, { ticker: 'SHOP', year: 2020 }, { ticker: 'SHOP', year: 2022 },
  { ticker: 'SPOT', year: 2018 }, { ticker: 'ABNB', year: 2021 }, { ticker: 'ZM', year: 2020 },
  { ticker: 'MRNA', year: 2020 },
]

const DAY_MS = 86_400_000
export const epochDay = (ms = Date.now()) => Math.floor(ms / DAY_MS)
export const launchDay = () => epochDay(Date.parse(`${env.launchDate}T00:00:00Z`))
/** TICKR_DAY_OFFSET shifts "today" — for local testing of streaks only. */
export const today = () => epochDay() + Number(process.env.TICKR_DAY_OFFSET ?? 0)
export const puzzleNumber = (day: number) => day - launchDay() + 1

const hmac = (msg: string) => createHmac('sha256', env.secret).update(msg).digest()

/** Secret, deterministic shuffle of the pool (Fisher–Yates driven by HMAC). */
let order: number[] | null = null
function poolOrder() {
  if (order) return order
  order = POOL.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = hmac(`order:${i}`).readUInt32BE(0) % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/** Pool index of the daily puzzle for an epoch day. `available` lets us skip entries with no data. */
export function dailyIndex(day: number, available: (idx: number) => boolean = () => true) {
  const list = poolOrder().filter(available)
  if (!list.length) throw new Error('No puzzle data available')
  const k = (((day - launchDay()) % list.length) + list.length) % list.length
  return list[k]
}

/** Salt and commitment published on-chain before the day starts. */
export function saltFor(day: number): Hex {
  return `0x${hmac(`salt:${day}`).toString('hex')}`
}
export function commitmentFor(day: number, ticker: string): Hex {
  return keccak256(encodeAbiParameters([{ type: 'uint32' }, { type: 'string' }, { type: 'bytes32' }], [day, ticker, saltFor(day)]))
}
