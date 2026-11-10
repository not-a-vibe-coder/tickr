import type { ClaimResponse, ConfigPayload, GuessResponse, LeaderboardRow, PlayerPayload, PuzzlePayload } from '../../shared/api'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  const body = await r.json().catch(() => ({ error: `Request failed (${r.status})` }))
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status})`)
  return body as T
}

export const api = {
  config: () => req<ConfigPayload>('/api/config'),
  puzzle: (mode: 'daily' | 'practice', player?: string, exclude: number[] = []) =>
    req<{ session: string; puzzle: PuzzlePayload; practiceKey?: number }>(
      `/api/puzzle?mode=${mode}${player ? `&player=${player}` : ''}${exclude.length ? `&exclude=${exclude.join(',')}` : ''}`,
    ),
  guess: (session: string, guess: string) => req<GuessResponse>('/api/guess', { method: 'POST', body: JSON.stringify({ session, guess }) }),
  claim: (session: string) => req<ClaimResponse>('/api/claim', { method: 'POST', body: JSON.stringify({ session }) }),
  player: (address: string) => req<PlayerPayload>(`/api/player?address=${address}`),
  leaderboard: () => req<{ rows: LeaderboardRow[] }>('/api/leaderboard'),
}
