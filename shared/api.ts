import type { GuessResult } from './companies'

/** Wire types between the app and the game server. */

export type PuzzleMode = 'daily' | 'practice'

export type PuzzlePayload = {
  mode: PuzzleMode
  /** Daily: epoch-day number (also the on-chain day id). Practice: null. */
  day: number | null
  /** Human puzzle number, e.g. #003. */
  number: number | null
  /** Price path normalised so the first close = 100. Absolute prices are hidden. */
  points: number[]
  /** 0..1 relative volume per point. */
  volume: number[]
  /** Month label per point index where a month starts. */
  monthTicks: { i: number; label: string }[]
}

export type GuessResponse = {
  session: string
  guess: { ticker: string; name: string; result: GuessResult }
  guesses: { ticker: string; name: string; result: GuessResult }[]
  clues: { label: string; value: string }[]
  status: 'playing' | 'won' | 'lost'
  answer?: { ticker: string; name: string; year: number }
}

export type ConfigPayload = {
  chainId: number
  chainName: string
  rpcUrl: string
  explorer: string
  contract: `0x${string}` | null
  today: number
  launchDay: number
  puzzleNumber: number
  nextPuzzleAt: number
  relayer: boolean
}

export type PlayerPayload = {
  address: string
  streak: number
  bestStreak: number
  solves: number
  avgGuesses: number | null
  lastDay: number
  solvedToday: number
  rewards: { streak: number; token: string; symbol: string; amount: string; earned: boolean }[]
  balances: { token: string; symbol: string; balance: string }[]
}

export type LeaderboardRow = { address: string; streak: number; bestStreak: number; solves: number; avgGuesses: number }

export type ClaimResponse = { txHash?: string; signature?: string; deadline: string; day: number; guesses: number; alreadyRecorded?: boolean }
