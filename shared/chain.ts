import { defineChain } from 'viem'

/** Robinhood Chain testnet (Arbitrum Orbit, settles to Sepolia). */
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Robinhood Explorer', url: 'https://explorer.testnet.chain.robinhood.com' } },
  testnet: true,
})

export const localChain = defineChain({
  id: 31337,
  name: 'Local (anvil)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
})

/** Generated from contracts/out (TickrGame v2). */
export const TICKR_ABI = [{"type": "function", "name": "commitPuzzles", "inputs": [{"name": "days_", "type": "uint32[]", "internalType": "uint32[]"}, {"name": "hashes", "type": "bytes32[]", "internalType": "bytes32[]"}], "outputs": [], "stateMutability": "nonpayable"}, {"type": "function", "name": "commitments", "inputs": [{"name": "day", "type": "uint32", "internalType": "uint32"}], "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}], "stateMutability": "view"}, {"type": "function", "name": "getPlayers", "inputs": [{"name": "offset", "type": "uint256", "internalType": "uint256"}, {"name": "limit", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "addrs", "type": "address[]", "internalType": "address[]"}, {"name": "stats", "type": "tuple[]", "internalType": "struct TickrGame.Player[]", "components": [{"name": "lastDay", "type": "uint32", "internalType": "uint32"}, {"name": "streak", "type": "uint32", "internalType": "uint32"}, {"name": "bestStreak", "type": "uint32", "internalType": "uint32"}, {"name": "solves", "type": "uint32", "internalType": "uint32"}, {"name": "totalGuesses", "type": "uint32", "internalType": "uint32"}]}, {"name": "cash", "type": "uint256[]", "internalType": "uint256[]"}], "stateMutability": "view"}, {"type": "function", "name": "getPortfolio", "inputs": [{"name": "player", "type": "address", "internalType": "address"}], "outputs": [{"name": "cash", "type": "uint256", "internalType": "uint256"}, {"name": "symbols", "type": "string[]", "internalType": "string[]"}, {"name": "qty", "type": "uint256[]", "internalType": "uint256[]"}, {"name": "cost", "type": "uint256[]", "internalType": "uint256[]"}], "stateMutability": "view"}, {"type": "function", "name": "grantPoints", "inputs": [{"name": "player", "type": "address", "internalType": "address"}, {"name": "amount", "type": "uint256", "internalType": "uint256"}, {"name": "reason", "type": "string", "internalType": "string"}], "outputs": [], "stateMutability": "nonpayable"}, {"type": "function", "name": "joined", "inputs": [{"name": "", "type": "address", "internalType": "address"}], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}], "stateMutability": "view"}, {"type": "function", "name": "liveStreak", "inputs": [{"name": "player", "type": "address", "internalType": "address"}, {"name": "today", "type": "uint32", "internalType": "uint32"}], "outputs": [{"name": "", "type": "uint32", "internalType": "uint32"}], "stateMutability": "view"}, {"type": "function", "name": "milestoneBonus", "inputs": [{"name": "streak", "type": "uint32", "internalType": "uint32"}], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "playerCount", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "players", "inputs": [{"name": "", "type": "address", "internalType": "address"}], "outputs": [{"name": "lastDay", "type": "uint32", "internalType": "uint32"}, {"name": "streak", "type": "uint32", "internalType": "uint32"}, {"name": "bestStreak", "type": "uint32", "internalType": "uint32"}, {"name": "solves", "type": "uint32", "internalType": "uint32"}, {"name": "totalGuesses", "type": "uint32", "internalType": "uint32"}], "stateMutability": "view"}, {"type": "function", "name": "points", "inputs": [{"name": "", "type": "address", "internalType": "address"}], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "recordSolve", "inputs": [{"name": "player", "type": "address", "internalType": "address"}, {"name": "day", "type": "uint32", "internalType": "uint32"}, {"name": "guesses", "type": "uint8", "internalType": "uint8"}, {"name": "deadline", "type": "uint256", "internalType": "uint256"}, {"name": "signature", "type": "bytes", "internalType": "bytes"}], "outputs": [], "stateMutability": "nonpayable"}, {"type": "function", "name": "revealPuzzle", "inputs": [{"name": "day", "type": "uint32", "internalType": "uint32"}, {"name": "answer", "type": "string", "internalType": "string"}, {"name": "salt", "type": "bytes32", "internalType": "bytes32"}], "outputs": [], "stateMutability": "nonpayable"}, {"type": "function", "name": "revealedAnswers", "inputs": [{"name": "day", "type": "uint32", "internalType": "uint32"}], "outputs": [{"name": "", "type": "string", "internalType": "string"}], "stateMutability": "view"}, {"type": "function", "name": "solvedIn", "inputs": [{"name": "", "type": "address", "internalType": "address"}, {"name": "day", "type": "uint32", "internalType": "uint32"}], "outputs": [{"name": "", "type": "uint8", "internalType": "uint8"}], "stateMutability": "view"}, {"type": "function", "name": "starterPoints", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "trade", "inputs": [{"name": "q", "type": "tuple", "internalType": "struct TickrGame.Quote", "components": [{"name": "player", "type": "address", "internalType": "address"}, {"name": "symbol", "type": "string", "internalType": "string"}, {"name": "isBuy", "type": "bool", "internalType": "bool"}, {"name": "qty", "type": "uint256", "internalType": "uint256"}, {"name": "price", "type": "uint256", "internalType": "uint256"}, {"name": "nonce", "type": "uint256", "internalType": "uint256"}, {"name": "deadline", "type": "uint256", "internalType": "uint256"}]}, {"name": "signature", "type": "bytes", "internalType": "bytes"}], "outputs": [], "stateMutability": "nonpayable"}, {"type": "function", "name": "tradeCount", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"}, {"type": "function", "name": "usedNonce", "inputs": [{"name": "", "type": "address", "internalType": "address"}, {"name": "", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}], "stateMutability": "view"}, {"type": "event", "name": "Joined", "inputs": [{"name": "player", "type": "address", "indexed": true, "internalType": "address"}, {"name": "starterPoints", "type": "uint256", "indexed": false, "internalType": "uint256"}], "anonymous": false}, {"type": "event", "name": "Solved", "inputs": [{"name": "player", "type": "address", "indexed": true, "internalType": "address"}, {"name": "day", "type": "uint32", "indexed": true, "internalType": "uint32"}, {"name": "guesses", "type": "uint8", "indexed": false, "internalType": "uint8"}, {"name": "streak", "type": "uint32", "indexed": false, "internalType": "uint32"}, {"name": "pointsAwarded", "type": "uint256", "indexed": false, "internalType": "uint256"}], "anonymous": false}, {"type": "event", "name": "Traded", "inputs": [{"name": "player", "type": "address", "indexed": true, "internalType": "address"}, {"name": "symbolHash", "type": "bytes32", "indexed": true, "internalType": "bytes32"}, {"name": "symbol", "type": "string", "indexed": false, "internalType": "string"}, {"name": "isBuy", "type": "bool", "indexed": false, "internalType": "bool"}, {"name": "qty", "type": "uint256", "indexed": false, "internalType": "uint256"}, {"name": "price", "type": "uint256", "indexed": false, "internalType": "uint256"}, {"name": "value", "type": "uint256", "indexed": false, "internalType": "uint256"}, {"name": "realizedPnl", "type": "int256", "indexed": false, "internalType": "int256"}], "anonymous": false}] as const

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const

export const QUOTE_TYPES = {
  Quote: [
    { name: 'player', type: 'address' },
    { name: 'symbol', type: 'string' },
    { name: 'isBuy', type: 'bool' },
    { name: 'qty', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

export const EIP712_VERSION = '2'

export const SOLVE_TYPES = {
  Solve: [
    { name: 'player', type: 'address' },
    { name: 'day', type: 'uint32' },
    { name: 'guesses', type: 'uint8' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const
