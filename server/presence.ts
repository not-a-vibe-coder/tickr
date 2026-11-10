/**
 * Live presence: who is online, and who is watching which chart.
 * Clients send a heartbeat every ~20s; a session counts as present for 45s after its last beat.
 * Uses Upstash Redis over REST when configured (works across serverless instances), otherwise an
 * in-memory map (fine for local dev; on Vercel it only sees one instance at a time).
 */
const WINDOW_MS = 45_000
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
export const presenceBackend = url && token ? 'redis' : 'memory'

const key = (channel: string) => `tickr:presence:${channel}`
export const cleanChannel = (c: string) => c.replace(/[^a-zA-Z0-9:._-]/g, '').slice(0, 40)

async function redis(commands: (string | number)[][]): Promise<{ result: unknown }[]> {
  const r = await fetch(`${url}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(commands) })
  if (!r.ok) throw new Error(`presence store ${r.status}`)
  return r.json() as Promise<{ result: unknown }[]>
}

const mem = new Map<string, Map<string, number>>()
function memCount(channel: string, now: number) {
  const m = mem.get(channel)
  if (!m) return 0
  for (const [sid, t] of m) if (now - t > WINDOW_MS) m.delete(sid)
  return m.size
}

/** Record a heartbeat on each channel and return fresh counts for them. */
export async function beat(sid: string, channels: string[]): Promise<Record<string, number>> {
  const now = Date.now()
  if (presenceBackend === 'redis') {
    const cmds: (string | number)[][] = []
    for (const c of channels) cmds.push(['ZADD', key(c), now, sid], ['ZREMRANGEBYSCORE', key(c), 0, now - WINDOW_MS], ['ZCARD', key(c)], ['PEXPIRE', key(c), WINDOW_MS * 3])
    const res = await redis(cmds)
    return Object.fromEntries(channels.map((c, i) => [c, Number(res[i * 4 + 2]?.result ?? 0)]))
  }
  return Object.fromEntries(
    channels.map((c) => {
      if (!mem.has(c)) mem.set(c, new Map())
      mem.get(c)!.set(sid, now)
      return [c, memCount(c, now)]
    }),
  )
}

/** Counts without registering (e.g. watchers for every token in a list). */
export async function counts(channels: string[]): Promise<Record<string, number>> {
  const now = Date.now()
  if (!channels.length) return {}
  if (presenceBackend === 'redis') {
    const res = await redis(channels.map((c) => ['ZCOUNT', key(c), now - WINDOW_MS, '+inf']))
    return Object.fromEntries(channels.map((c, i) => [c, Number(res[i]?.result ?? 0)]))
  }
  return Object.fromEntries(channels.map((c) => [c, memCount(c, now)]))
}
