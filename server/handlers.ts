import { isAddress, getAddress, type Address } from 'viem'
import { COMPANIES, MAX_GUESSES, clueFor, companyByTicker, evaluateGuess } from '../shared/companies.js'
import { SECTOR_OF } from '../shared/universe.js'
import type { Timeframe } from '../shared/market.js'
import { getAssets, getCandles, getQuote, getQuotes } from './marketdata.js'
import { verifyMessage, type Hex } from 'viem'
import type { ClaimResponse, ConfigPayload, GuessResponse, PuzzlePayload } from '../shared/api.js'
import { env } from './env.js'
import { POOL, commitmentFor, dailyIndex, launchDay, previewDay, puzzleLabel, puzzleNumber, saltFor, seasonOf, today } from './pool.js'
import { availability, seriesFor, toPayloadSeries } from './market.js'
import { decodeSession, encodeSession, type Session } from './session.js'
import * as chainApi from './chain.js'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, (_, v) => (typeof v === 'bigint' ? v.toString() : v)), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  })
const fail = (status: number, error: string) => json({ error }, status)

const toAddress = (a: unknown): Address | null => (typeof a === 'string' && isAddress(a, { strict: false }) ? getAddress(a) : null)

function idxFor(s: Session) {
  return s.mode === 'daily' ? dailyIndex(s.ref, availability()) : s.ref
}

/** Name + sector for any guessable symbol (every Robinhood Stock Token, plus the puzzle pool). */
async function guessables() {
  const assets = await getAssets()
  const map = new Map<string, { ticker: string; name: string; sector: (typeof SECTOR_OF)[string] | null }>()
  for (const a of assets) map.set(a.symbol, { ticker: a.symbol, name: a.name, sector: companyByTicker(a.symbol)?.sector ?? SECTOR_OF[a.symbol] ?? null })
  for (const c of COMPANIES) if (!map.has(c.ticker)) map.set(c.ticker, { ticker: c.ticker, name: c.name, sector: c.sector })
  return map
}

/** Replays a session's guesses against the answer. */
async function replay(s: Session) {
  const idx = idxFor(s)
  const { ticker, year } = POOL[idx]
  const answer = companyByTicker(ticker)!
  const known = await guessables()
  const guesses = s.guesses.map((t) => {
    const c = known.get(t) ?? { ticker: t, name: t, sector: null }
    return { ticker: c.ticker, name: c.name, result: evaluateGuess(c, answer) }
  })
  const won = guesses.some((g) => g.result === 'hit')
  const status: GuessResponse['status'] = won ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing'
  const wrong = guesses.filter((g) => g.result !== 'hit').length
  const clues = Array.from({ length: status === 'playing' ? Math.min(5, wrong) : 5 }, (_, i) => clueFor(answer, year, i))
  return { guesses, status, clues, answer: status === 'playing' ? undefined : { ticker: answer.ticker, name: answer.name, year } }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function config(): Promise<Response> {
  const t = today()
  const body: ConfigPayload = {
    chainId: chainApi.chain.id,
    chainName: chainApi.chain.name,
    rpcUrl: chainApi.rpcUrl,
    explorer: chainApi.chain.blockExplorers?.default.url ?? '',
    contract: env.contract,
    today: t,
    launchDay: launchDay(),
    previewDay: previewDay(),
    season: seasonOf(t),
    launchAt: launchDay() * 86_400_000,
    puzzleNumber: puzzleNumber(t),
    puzzleLabel: puzzleLabel(t),
    nextPuzzleAt: (t + 1) * 86_400_000,
    relayer: env.relay && Boolean(env.signerKey),
  }
  return json(body)
}

export async function puzzle(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') === 'practice' ? 'practice' : 'daily'
  const player = toAddress(url.searchParams.get('player'))
  const day = today()
  const avail = availability()

  let idx: number
  if (mode === 'daily') idx = dailyIndex(day, avail)
  else {
    const dailyIdx = dailyIndex(day, avail)
    const candidates = POOL.map((_, i) => i).filter((i) => i !== dailyIdx && avail(i))
    const skip = new Set((url.searchParams.get('exclude') ?? '').split(',').filter(Boolean))
    const fresh = candidates.filter((i) => !skip.has(String(i)))
    const list = fresh.length ? fresh : candidates
    idx = list[Math.floor(Math.random() * list.length)]
  }

  const series = await seriesFor(idx)
  if (!series) return fail(503, 'Market data for this puzzle is unavailable right now. Try again shortly.')

  const session: Session = { v: 1, mode, ref: mode === 'daily' ? day : idx, player: player ?? undefined, guesses: [], iat: Date.now() }
  const payload: PuzzlePayload = {
    mode,
    day: mode === 'daily' ? day : null,
    number: mode === 'daily' ? puzzleNumber(day) : null,
    label: mode === 'daily' ? puzzleLabel(day) : null,
    ...toPayloadSeries(series),
  }
  return json({ session: encodeSession(session), puzzle: payload, practiceKey: mode === 'practice' ? idx : undefined })
}

export async function guess(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { session?: string; guess?: string }
  const s = body.session ? decodeSession(body.session) : null
  if (!s) return fail(400, 'Invalid session')
  if (s.mode === 'daily' && s.ref !== today()) return fail(409, 'A new daily chart has dropped. Reload to play it.')

  const symbol = body.guess?.toUpperCase()
  const c = symbol ? (await guessables()).get(symbol) : undefined
  if (!c) return fail(400, 'Unknown company')
  const before = await replay(s)
  if (before.status !== 'playing') return fail(409, 'This puzzle is already finished')
  if (s.guesses.includes(c.ticker)) return fail(400, 'Already guessed')

  const next: Session = { ...s, guesses: [...s.guesses, c.ticker] }
  const r = await replay(next)
  const res: GuessResponse = {
    session: encodeSession(next),
    guess: r.guesses[r.guesses.length - 1],
    guesses: r.guesses,
    clues: r.clues,
    status: r.status,
    answer: r.answer,
  }
  return json(res)
}

export async function claim(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { session?: string }
  const s = body.session ? decodeSession(body.session) : null
  if (!s) return fail(400, 'Invalid session')
  if (s.mode !== 'daily') return fail(400, 'Only the daily puzzle counts toward streaks')
  if (s.ref !== today()) return fail(409, 'This daily puzzle has expired')
  const player = toAddress(s.player)
  if (!player) return fail(400, 'Sign in before playing the daily to save your streak')
  const r = await replay(s)
  if (r.status !== 'won') return fail(400, 'Puzzle not solved')
  if (!chainApi.onchainReady()) return fail(503, 'On-chain recording is not configured on this server')

  const guesses = r.guesses.length
  const existing = await chainApi.solvedIn(player, s.ref)
  if (existing) return json({ alreadyRecorded: true, day: s.ref, guesses: existing, deadline: '0' } satisfies ClaimResponse)

  const { signature, deadline } = await chainApi.signSolve(player, s.ref, guesses)
  if (env.relay) {
    try {
      const txHash = await chainApi.relaySolve(player, s.ref, guesses, deadline, signature)
      return json({ txHash, day: s.ref, guesses, deadline: deadline.toString() } satisfies ClaimResponse)
    } catch (e) {
      console.error('relay failed', e)
      // fall through: return the signature so the player can submit it themselves
    }
  }
  return json({ signature, day: s.ref, guesses, deadline: deadline.toString() } satisfies ClaimResponse)
}

export async function player(req: Request): Promise<Response> {
  const a = toAddress(new URL(req.url).searchParams.get('address'))
  if (!a) return fail(400, 'Bad address')
  if (!chainApi.onchainReady()) return fail(503, 'Contract not configured')
  return json(await chainApi.playerStats(a, today()))
}

let boardCache: { at: number; rows: unknown[] } | null = null
export async function leaderboard(): Promise<Response> {
  if (!chainApi.onchainReady()) return json({ rows: [] })
  if (!boardCache || Date.now() - boardCache.at > 20_000) {
    const players = await chainApi.allPlayers(today())
    const ports = await Promise.all(players.map((p) => chainApi.portfolioOf(p.address)))
    const symbols = [...new Set(ports.flatMap((p) => p.holdings.map((h) => h.symbol)))]
    const prices = new Map((await getQuotes(symbols)).map((q) => [q.symbol, q.price]))
    const rows = players.map((p, i) => {
      const port = ports[i]
      const held = port.holdings.reduce((sum, h) => sum + h.qty * (prices.get(h.symbol) ?? h.cost / Math.max(h.qty, 1e-12)), 0)
      return { ...p, cash: port.cash, positions: port.holdings.length, netWorth: +(port.cash + held).toFixed(2) }
    })
    boardCache = { at: Date.now(), rows: rows.sort((a, b) => b.netWorth - a.netWorth).slice(0, 100) }
  }
  return json({ rows: boardCache.rows }, 200, { 'cache-control': 's-maxage=20, stale-while-revalidate=40' })
}

// ───────────────────────────── market ─────────────────────────────

export async function marketAssets(): Promise<Response> {
  return json({ assets: await getAssets() }, 200, { 'cache-control': 's-maxage=3600, stale-while-revalidate=86400' })
}

export async function marketQuotes(req: Request): Promise<Response> {
  const symbols = (new URL(req.url).searchParams.get('symbols') ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  return json({ quotes: await getQuotes(symbols) }, 200, { 'cache-control': 's-maxage=5, stale-while-revalidate=10' })
}

export async function marketCandles(req: Request): Promise<Response> {
  const u = new URL(req.url).searchParams
  const symbol = (u.get('symbol') ?? '').toUpperCase()
  const tf = (['1D', '5D', '1M', '6M', '1Y'].includes(u.get('tf') ?? '') ? u.get('tf') : '1D') as Timeframe
  if (!symbol) return fail(400, 'symbol required')
  return json({ candles: await getCandles(symbol, tf) }, 200, { 'cache-control': `s-maxage=${tf === '1D' ? 30 : 300}` })
}

// ───────────────────────────── demo trading ─────────────────────────────

export async function portfolio(req: Request): Promise<Response> {
  const a = toAddress(new URL(req.url).searchParams.get('address'))
  if (!a) return fail(400, 'Bad address')
  if (!chainApi.onchainReady()) return fail(503, 'Contract not configured')
  const p = await chainApi.portfolioOf(a)
  const prices = new Map((await getQuotes(p.holdings.map((h) => h.symbol))).map((q) => [q.symbol, q.price]))
  const holdings = p.holdings.map((h) => {
    const price = prices.get(h.symbol) ?? null
    const value = price != null ? h.qty * price : h.cost
    return { symbol: h.symbol, qty: h.qty, cost: h.cost, price, value, pnl: value - h.cost, pnlPct: h.cost ? ((value - h.cost) / h.cost) * 100 : 0 }
  })
  return json({ address: a, cash: p.cash, joined: p.joined, holdings, netWorth: p.cash + holdings.reduce((s, h) => s + h.value, 0) })
}

/** The message a player signs (no gas) to authorise one trade. */
export const tradeIntentMessage = (i: { player: string; side: string; symbol: string; amount: string; unit: string; nonce: string; expires: number }) =>
  `Tickr demo trade\nplayer: ${i.player.toLowerCase()}\nside: ${i.side}\nsymbol: ${i.symbol}\namount: ${i.amount} ${i.unit}\nnonce: ${i.nonce}\nexpires: ${i.expires}`

export async function trade(req: Request): Promise<Response> {
  if (!chainApi.onchainReady()) return fail(503, 'Trading is not live on this server yet')
  const b = (await req.json().catch(() => ({}))) as {
    player?: string; side?: 'buy' | 'sell'; symbol?: string; amount?: string; unit?: 'TCKR' | 'shares'; nonce?: string; expires?: number; signature?: Hex
  }
  const player = toAddress(b.player)
  const symbol = b.symbol?.toUpperCase()
  const amount = Number(b.amount)
  if (!player || !symbol || !b.side || !b.unit || !b.nonce || !b.expires || !b.signature) return fail(400, 'Incomplete trade request')
  if (!(amount > 0)) return fail(400, 'Amount must be positive')
  if (b.expires * 1000 < Date.now() || b.expires * 1000 > Date.now() + 5 * 60_000) return fail(400, 'Trade request expired — try again')
  if (!/^[0-9a-f]{1,64}$/i.test(b.nonce)) return fail(400, 'Bad nonce')

  const message = tradeIntentMessage({ player, side: b.side, symbol, amount: b.amount!, unit: b.unit, nonce: b.nonce, expires: b.expires })
  const valid = await verifyMessage({ address: player, message, signature: b.signature }).catch(() => false)
  if (!valid) return fail(401, 'Signature does not match this player')

  const nonce = BigInt(`0x${b.nonce}`)
  if (await chainApi.nonceUsed(player, nonce)) return fail(409, 'This trade was already submitted')
  if (!(await getAssets()).some((a) => a.symbol === symbol)) return fail(400, 'Unknown Stock Token')
  const q = await getQuote(symbol)
  if (!q) return fail(503, `No live price for ${symbol} right now`)
  if (q.halted) return fail(409, `${symbol} is halted`)

  const isBuy = b.side === 'buy'
  const fill = isBuy ? q.ask || q.price : q.bid || q.price
  const priceWad = chainApi.toWad(fill, 6)
  const port = await chainApi.portfolioOf(player)
  const WAD = 10n ** 18n
  let qtyWad: bigint
  if (isBuy) {
    // spend at most what was asked and at most the on-chain cash; round quantity down
    const want = b.unit === 'TCKR' ? chainApi.toWad(amount) : (chainApi.toWad(amount) * priceWad) / WAD
    const spend = want > port.cashWad ? port.cashWad : want
    if (want > port.cashWad + WAD / 100n) return fail(400, `Not enough TCKR — you have ${port.cash.toFixed(2)}`)
    qtyWad = (spend * WAD) / priceWad
  } else {
    const held = port.holdings.find((h) => h.symbol === symbol)
    if (!held) return fail(400, `You don't hold ${symbol}`)
    const want = b.unit === 'TCKR' ? (chainApi.toWad(amount) * WAD) / priceWad : chainApi.toWad(amount)
    qtyWad = want >= (held.qtyWad * 999_999n) / 1_000_000n ? held.qtyWad : want // "sell all" without dust
  }
  if (qtyWad === 0n) return fail(400, 'Amount too small')
  const { txHash } = await chainApi.executeTrade({ player, symbol, isBuy, qty: qtyWad, price: priceWad, nonce })
  return json({ txHash, symbol, side: b.side, qty: chainApi.fromWad(qtyWad), price: fill, value: chainApi.fromWad(qtyWad) * fill })
}

/** Commits answer hashes for the next 7 days (idempotent). Run daily by Vercel Cron. */
export async function cronCommit(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) return fail(401, 'Unauthorized')
  const result = await commitUpcoming(7)
  return json(result)
}

export async function commitUpcoming(daysAhead: number) {
  const t = today()
  const avail = availability()
  const days: number[] = []
  const hashes: `0x${string}`[] = []
  for (let d = t; d <= t + daysAhead; d++) {
    const existing = await chainApi.commitmentOf(d)
    if (existing && existing !== `0x${'0'.repeat(64)}`) continue
    days.push(d)
    hashes.push(commitmentFor(d, POOL[dailyIndex(d, avail)].ticker))
  }
  if (!days.length) return { committed: [] as number[] }
  const tx = await chainApi.commitDays(days, hashes)
  return { committed: days, tx }
}

/** Reveal data for a finished day — anyone can verify it on-chain via revealPuzzle(). */
export async function reveal(req: Request): Promise<Response> {
  const day = Number(new URL(req.url).searchParams.get('day'))
  if (!Number.isInteger(day) || day >= today()) return fail(400, 'Only past days can be revealed')
  const { ticker, year } = POOL[dailyIndex(day, availability())]
  return json({ day, answer: ticker, year, salt: saltFor(day), commitment: commitmentFor(day, ticker) }, 200, { 'cache-control': 's-maxage=86400' })
}

export const companies = () => json(COMPANIES.map(({ ticker, name, sector }) => ({ ticker, name, sector })), 200, { 'cache-control': 's-maxage=3600' })

/** Wraps a handler so unexpected errors become JSON 500s instead of crashing the function. */
export async function run(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message.split('\n')[0] : 'Server error'
    return fail(500, msg)
  }
}
