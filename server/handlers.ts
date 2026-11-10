import { isAddress, getAddress, type Address } from 'viem'
import { COMPANIES, MAX_GUESSES, clueFor, companyByTicker, evaluateGuess } from '../shared/companies.js'
import type { ClaimResponse, ConfigPayload, GuessResponse, PuzzlePayload } from '../shared/api.js'
import { env } from './env.js'
import { POOL, commitmentFor, dailyIndex, launchDay, puzzleNumber, saltFor, today } from './pool.js'
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

/** Replays a session's guesses against the answer. */
function replay(s: Session) {
  const idx = idxFor(s)
  const { ticker, year } = POOL[idx]
  const answer = companyByTicker(ticker)!
  const guesses = s.guesses.map((t) => {
    const c = companyByTicker(t)!
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
    puzzleNumber: puzzleNumber(t),
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
    ...toPayloadSeries(series),
  }
  return json({ session: encodeSession(session), puzzle: payload, practiceKey: mode === 'practice' ? idx : undefined })
}

export async function guess(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { session?: string; guess?: string }
  const s = body.session ? decodeSession(body.session) : null
  if (!s) return fail(400, 'Invalid session')
  if (s.mode === 'daily' && s.ref !== today()) return fail(409, 'A new daily chart has dropped. Reload to play it.')

  const c = body.guess ? companyByTicker(body.guess) : undefined
  if (!c) return fail(400, 'Unknown company')
  const before = replay(s)
  if (before.status !== 'playing') return fail(409, 'This puzzle is already finished')
  if (s.guesses.includes(c.ticker)) return fail(400, 'Already guessed')

  const next: Session = { ...s, guesses: [...s.guesses, c.ticker] }
  const r = replay(next)
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
  const r = replay(s)
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

export async function leaderboard(): Promise<Response> {
  if (!chainApi.onchainReady()) return json({ rows: [] })
  return json({ rows: await chainApi.leaderboard(today()) }, 200, { 'cache-control': 's-maxage=30, stale-while-revalidate=60' })
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
