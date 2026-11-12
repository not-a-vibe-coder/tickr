/**
 * Every /api route in one place. Vercel's Hobby plan allows 12 serverless functions per deployment,
 * so production deploys a single function (api/router.ts) and vercel.json rewrites /api/* to it.
 * The Vite dev server calls this same router.
 */
import * as h from './handlers.js'

type Handler = (req: Request) => Promise<Response> | Response
type Route = Partial<Record<'GET' | 'POST', Handler>>

const routes: Record<string, Route> = {
  activity: { GET: () => h.activity() },
  claim: { POST: (r) => h.claim(r) },
  config: { GET: () => h.config() },
  'cron/commit': { GET: (r) => h.cronCommit(r) },
  guess: { POST: (r) => h.guess(r) },
  leaderboard: { GET: () => h.leaderboard() },
  'market/assets': { GET: () => h.marketAssets() },
  'market/candles': { GET: (r) => h.marketCandles(r) },
  'market/quotes': { GET: (r) => h.marketQuotes(r) },
  player: { GET: (r) => h.player(r) },
  portfolio: { GET: (r) => h.portfolio(r) },
  presence: { GET: (r) => h.presence(r), POST: (r) => h.presence(r) },
  profile: { GET: (r) => h.profile(r) },
  puzzle: { GET: (r) => h.puzzle(r) },
  reveal: { GET: (r) => h.reveal(r) },
  stats: { GET: () => h.stats() },
  token: { GET: (r) => h.tokenStats(r) },
  trade: { POST: (r) => h.trade(r) },
  wif: { GET: (r) => h.wifInfo(r) },
  'wif/clues': { POST: (r) => h.wifClues(r) },
}

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } })

/** Route name from the rewrite's `__route` param, or from the path (`/api/market/quotes` → `market/quotes`). */
function routeName(url: URL) {
  const raw = url.searchParams.get('__route') ?? url.pathname.replace(/^\/api\/?/, '')
  return raw.replace(/^\/+|\/+$/g, '')
}

export function route(req: Request): Promise<Response> | Response {
  const name = routeName(new URL(req.url))
  const r = routes[name]
  if (!r) return json(404, `No API route /api/${name}`)
  const fn = r[req.method as 'GET' | 'POST']
  if (!fn) return json(405, 'Method not allowed')
  return h.run(() => fn(req))
}
