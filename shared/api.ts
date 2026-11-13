import type { GuessResult } from './companies'

/** Wire types between the app and the game server. */

export type PuzzleMode = 'daily' | 'practice'

export type PuzzlePayload = {
  mode: PuzzleMode
  /** Daily: epoch-day number (also the on-chain day id). Practice: null. */
  day: number | null
  /** Human puzzle number, e.g. 3. */
  number: number | null
  /** Display label, e.g. "Preview #3" or "#003". Null for practice. */
  label: string | null
  /** Price path normalised so the first close = 100. Absolute prices are hidden. */
  points: number[]
  /** Daily candles [open, high, low, close], rebased the same way as `points`. */
  candles: [number, number, number, number][]
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
  previewDay: number
  season: 'preview' | 'season0'
  /** ms timestamp of the Season 0 launch (00:00 UTC). */
  launchAt: number
  puzzleNumber: number
  puzzleLabel: string
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
  /** $TCKR points (cash available for demo trading). */
  points: number
  joined: boolean
  milestones: { streak: number; bonus: number; earned: boolean }[]
}

export type LeaderboardRow = { address: string; streak: number; bestStreak: number; solves: number; avgGuesses: number; netWorth: number; cash: number; positions: number }

export type ClaimResponse = {
  txHash?: string
  signature?: string
  deadline: string
  day: number
  guesses: number
  alreadyRecorded?: boolean
  /** $WIF reward on Robinhood Chain mainnet (absent when the pot isn't configured). */
  wif?: { txHash?: string; amount?: string; alreadyClaimed?: boolean; error?: string }
}

/** GET /api/wif/history?player= : a player's $WIF account with Tickr, from on-chain events. */
export type WifHistory =
  | { enabled: false }
  | {
      enabled: true
      explorer: string
      token: string
      /** Current wallet balance (all $WIF the wallet holds, not only from Tickr). */
      wallet: string
      /** Total $WIF won from daily solves. */
      earned: string
      /** Total $WIF spent on clues. */
      spent: string
      /** Part of `spent` that was burned. */
      burned: string
      /** earned − spent (may start with "-"). */
      net: string
      wins: number
      cluesBought: number
      events: (
        | { kind: 'reward'; day: number; amount: string; guesses: number; txHash: string }
        | { kind: 'clue'; day: number; amount: string; clueNumber: number; burned: string; txHash: string }
      )[]
    }

export type WifInfo =
  | { enabled: false }
  | {
      enabled: true
      day: number
      chainId: number
      pot: string
      token: string
      explorer: string
      balance: string
      rewardUnit: string
      maxReward: string
      dailyCap: string
      leftToday: string
      cluePrice: string
      cluePriceWei: string
      burnBps: number
      totalPaid: string
      totalBurned: string
      /** The player's own $WIF: `wif` is their wallet balance on Robinhood Chain mainnet (decimal string). */
      me: { claimed: boolean; cluesBought: number; wif: string } | null
    }
