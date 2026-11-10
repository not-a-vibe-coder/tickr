/** Market wire types shared by the trade terminal and the server. */

export type Asset = {
  symbol: string
  name: string
  logo: string | null
  /** Contract address on Robinhood Chain testnet if deployed there, else mainnet, else null. */
  address: string | null
  chainId: number | null
}

export type Quote = {
  symbol: string
  price: number
  bid: number
  ask: number
  /** % change vs previous close, if known. */
  change: number | null
  halted: boolean
  at: string
}

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }

export type Timeframe = '1D' | '5D' | '1M' | '6M' | '1Y'

export type Holding = {
  symbol: string
  qty: number
  cost: number
  price: number | null
  value: number
  pnl: number
  pnlPct: number
}

export type PortfolioPayload = {
  address: string
  cash: number
  holdings: Holding[]
  netWorth: number
  joined: boolean
}

export type NetWorthRow = { address: string; netWorth: number; cash: number; positions: number; streak: number }

export type TradeQuote = {
  quote: { player: string; symbol: string; isBuy: boolean; qty: string; price: string; nonce: string; deadline: string }
  price: number
  value: number
}
