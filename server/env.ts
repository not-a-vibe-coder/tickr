/** Server configuration from environment variables. */
const e = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined)

export const env = {
  /** Secret used to pick puzzles, sign sessions and derive commitment salts. REQUIRED in production. */
  secret: e('TICKR_SECRET') ?? 'dev-only-secret-change-me',
  /** Private key of the game-server signer (also the relayer that pays gas). */
  signerKey: e('TICKR_SIGNER_KEY') as `0x${string}` | undefined,
  contract: (e('TICKR_CONTRACT') || null) as `0x${string}` | null,
  network: (e('TICKR_NETWORK') ?? 'robinhood-testnet') as 'robinhood-testnet' | 'local',
  rpcUrl: e('TICKR_RPC_URL'),
  /** Launch day (YYYY-MM-DD, UTC) = puzzle #001. */
  launchDate: e('TICKR_LAUNCH_DATE') ?? '2026-11-10',
  /** Set to "false" to make players submit their own solve transactions. */
  relay: e('TICKR_RELAY') !== 'false',
}

export const isProdSecret = env.secret !== 'dev-only-secret-change-me'
