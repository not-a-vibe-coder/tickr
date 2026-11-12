import type { ClaimResponse, ConfigPayload, GuessResponse, LeaderboardRow, PlayerPayload, PuzzlePayload, WifInfo } from '../../shared/api'
import type { Candle, PortfolioPayload, Quote, Timeframe } from '../../shared/market'

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
  quotes: (symbols: string[]) => req<{ quotes: Quote[] }>(`/api/market/quotes?symbols=${symbols.join(',')}`),
  candles: (symbol: string, tf: Timeframe) => req<{ candles: Candle[] }>(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}`),
  portfolio: (address: string) => req<PortfolioPayload>(`/api/portfolio?address=${address}`),
  wif: (player?: string | null) => req<WifInfo>(`/api/wif${player ? `?player=${player}` : ''}`),
  wifClues: (session: string) => req<{ clues: GuessResponse['clues']; cluesBought: number }>('/api/wif/clues', { method: 'POST', body: JSON.stringify({ session }) }),
  trade: (body: Record<string, unknown>) => req<{ txHash: string; symbol: string; side: string; qty: number; price: number; value: number }>('/api/trade', { method: 'POST', body: JSON.stringify(body) }),
}
