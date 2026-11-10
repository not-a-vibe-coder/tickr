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

export const TICKR_ABI = [
  { type: 'function', name: 'recordSolve', stateMutability: 'nonpayable', inputs: [{ name: 'player', type: 'address' }, { name: 'day', type: 'uint32' }, { name: 'guesses', type: 'uint8' }, { name: 'deadline', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'commitPuzzles', stateMutability: 'nonpayable', inputs: [{ name: 'days_', type: 'uint32[]' }, { name: 'hashes', type: 'bytes32[]' }], outputs: [] },
  { type: 'function', name: 'revealPuzzle', stateMutability: 'nonpayable', inputs: [{ name: 'day', type: 'uint32' }, { name: 'answer', type: 'string' }, { name: 'salt', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'commitments', stateMutability: 'view', inputs: [{ name: 'day', type: 'uint32' }], outputs: [{ type: 'bytes32' }] },
  { type: 'function', name: 'revealedAnswers', stateMutability: 'view', inputs: [{ name: 'day', type: 'uint32' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'solvedIn', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }, { name: 'day', type: 'uint32' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'players', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }], outputs: [{ name: 'lastDay', type: 'uint32' }, { name: 'streak', type: 'uint32' }, { name: 'bestStreak', type: 'uint32' }, { name: 'solves', type: 'uint32' }, { name: 'totalGuesses', type: 'uint32' }] },
  { type: 'function', name: 'liveStreak', stateMutability: 'view', inputs: [{ name: 'player', type: 'address' }, { name: 'today', type: 'uint32' }], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'playerCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getPlayers', stateMutability: 'view', inputs: [{ name: 'offset', type: 'uint256' }, { name: 'limit', type: 'uint256' }], outputs: [{ name: 'addrs', type: 'address[]' }, { name: 'stats', type: 'tuple[]', components: [{ name: 'lastDay', type: 'uint32' }, { name: 'streak', type: 'uint32' }, { name: 'bestStreak', type: 'uint32' }, { name: 'solves', type: 'uint32' }, { name: 'totalGuesses', type: 'uint32' }] }] },
  { type: 'function', name: 'getMilestones', stateMutability: 'view', inputs: [], outputs: [{ name: 'streaks', type: 'uint32[]' }, { name: 'rewards', type: 'tuple[]', components: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }] }] },
  { type: 'event', name: 'Solved', inputs: [{ name: 'player', type: 'address', indexed: true }, { name: 'day', type: 'uint32', indexed: true }, { name: 'guesses', type: 'uint8', indexed: false }, { name: 'streak', type: 'uint32', indexed: false }] },
  { type: 'event', name: 'RewardPaid', inputs: [{ name: 'player', type: 'address', indexed: true }, { name: 'streak', type: 'uint32', indexed: true }, { name: 'token', type: 'address', indexed: false }, { name: 'amount', type: 'uint256', indexed: false }] },
] as const

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const

export const SOLVE_TYPES = {
  Solve: [
    { name: 'player', type: 'address' },
    { name: 'day', type: 'uint32' },
    { name: 'guesses', type: 'uint8' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const
