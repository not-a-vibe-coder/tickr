# Tickr

**Every chart has a story.** Tickr is a market-learning game on **Robinhood Chain**.

- **Daily case (`/play`):** one mystery candlestick chart of a real company, the same for everyone. You get six guesses from any Robinhood Stock Token, and each miss unlocks a clue.
- **$TCKR points:** every player starts with 10,000. Solves (100–600), streak bonuses and milestones (3, 7, 14 and 30 days) add more. Points are non-transferable and have no monetary value on testnet. A $TCKR token is planned for mainnet, with tokenomics still to be decided.
- **Demo trading (`/trade`):** trade any Robinhood Stock Token with $TCKR at live prices (buys fill at the ask, sells at the bid). Every trade and position lives on-chain.
- **Leaderboards (`/leaderboard`):** rank by net worth (cash + positions at live prices) or by streak.
- **Also included:** `/play/practice` for unlimited past charts, `/me` for your case file and portfolio, and `/duel` for challenge links.

## How it works

```
 player ──email (Privy)──▶ embedded wallet address
   │
   ▼
 /api/puzzle ─▶ today's chart (real prices, rebased to 100; the company is never sent)
 /api/guess  ─▶ checks the guess server-side, returns 🟥/🟨/🟩 + the next clue
                (the game state lives in an encrypted session token, so there's no database)
 /api/claim  ─▶ server signs an EIP-712 "Solve" and relays it (players never pay gas)
                      │
                      ▼
            TickrGame.sol on Robinhood Chain testnet
            • answer hash committed before the day starts (Vercel cron), revealable after
            • verifies the signature, updates the streak, awards $TCKR points

 /api/trade  ─▶ the player signs a trade intent (no gas, no popup)
                → the server verifies it, takes the live Robinhood bid/ask,
                  signs a 2-minute EIP-712 Quote and relays TickrGame.trade()
                → the contract moves points and positions; replayed or tampered quotes revert

 market data:  token list + logos + live bid/ask  ← Robinhood Stock Token API (api.robinhood.com/rhj)
               candles + previous close           ← Yahoo Finance chart API
               daily-puzzle history (OHLC)        ← Yahoo › Stooq › GitHub mirrors, fetched at build
```

| Folder | What's in it |
| --- | --- |
| `contracts/` | Foundry project: `TickrGame.sol`, tests, deploy script |
| `server/` | Game logic: secret puzzle schedule, market data, sessions, chain calls |
| `api/` | Vercel serverless functions (thin wrappers around `server/handlers.ts`) |
| `shared/` | Company list, clue logic, chain config and ABI (used by both client and server) |
| `src/` | React app: landing page (`components/`) and the game (`app/`) |
| `scripts/` | `fetch-market-data.ts` (runs before every build) and `commit-puzzles.ts` |

## Deploy (about 20 minutes)

### 1. Create the game wallet

This one key deploys the contract, owns it, signs solves and relays them.

```bash
cast wallet new        # save the address + private key
```

Fund the address with testnet ETH from <https://faucet.testnet.chain.robinhood.com>. This wallet relays every solve and trade, so keep it topped up.

### 2. Deploy the contract

```bash
git submodule update --init --recursive
cd contracts
forge test
PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
```

You don't need a token pool: $TCKR points live inside the contract. The point amounts can be tuned with `setPointsConfig` / `setMilestoneBonus` until the tokenomics are final.

### 3. Sign-in (Privy)

Create an app at <https://dashboard.privy.io>, enable **Email** login, and add your Vercel domain to the allowed origins. Copy the App ID.

Without an App ID, the app falls back to a one-click guest wallet stored in the browser. That's handy for local development.

### 4. Deploy to Vercel

Import the repo. Set the variables from `.env.example`:

| Variable | Value |
| --- | --- |
| `TICKR_SECRET` | Long random string (`openssl rand -hex 32`). **Never change it after launch.** It decides the schedule. |
| `TICKR_SIGNER_KEY` | Game wallet private key |
| `TICKR_CONTRACT` | Deployed `TickrGame` address |
| `TICKR_PREVIEW_DATE` | Preview season start, default `2026-11-10` (Preview #1) |
| `TICKR_LAUNCH_DATE` | Season 0 launch, default `2026-12-20` (puzzle #001) |
| `CRON_SECRET` | Any random string |
| `VITE_PRIVY_APP_ID` | From step 3 |
| `TICKR_RPC_URL` | Optional. An Alchemy URL is more reliable than the public RPC. |

Every build runs `scripts/fetch-market-data.ts`, which pulls real daily history for the 49 puzzles in the pool (Yahoo, then Stooq, then GitHub mirrors as fallbacks). The build log prints `market data: N/49 puzzles ready`.

### 5. Commit the first puzzles

A Vercel cron commits the next 7 days' answer hashes every night. Trigger it once right after deploying so today's puzzle is committed:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/cron/commit
```

You can also run `npm run commit` locally with the same `TICKR_*` env vars. The schedule depends only on `TICKR_SECRET` and the date, so both paths pick identical puzzles.

## Seasons: preview now, Season 0 on 20 December

Before the launch date, the daily runs as a **preview season**. Puzzles are labelled "Preview #1, #2…", a banner counts down to launch, and the leaderboard is marked as resetting. From 20 December, puzzles are numbered `#001`, `#002`… automatically, with no redeploy.

To give everyone a clean start at launch, reset streaks by deploying a **fresh** `TickrGame` on 20 December:

1. Run the deploy from step 2 again and fund the new contract's prize pool.
2. Update `TICKR_CONTRACT` in Vercel and redeploy.
3. Trigger `/api/cron/commit` once.

The puzzle schedule carries on uninterrupted, because it's derived from `TICKR_SECRET`, not from the contract.

## Local development

```bash
npm install
npm run data            # fetch market data → server/generated/market.json
npm run dev             # app + API on http://localhost:5173
```

Full local chain:

```bash
anvil
cd contracts && PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  forge script script/Deploy.s.sol --rpc-url local --broadcast
# .env.local: TICKR_NETWORK=local, TICKR_CONTRACT=<printed address>, TICKR_SIGNER_KEY=<same key>, TICKR_SECRET=anything
#             TICKR_MOCK_MARKET=1   ← simulated live prices/candles when you're offline
npm run commit
npm run dev
```

## Fairness & honesty notes

- The daily answer is chosen with an HMAC of `TICKR_SECRET`. Its hash is committed on-chain before the day starts. `GET /api/reveal?day=N` returns the answer and salt for any past day, and anyone can check them with `revealPuzzle()`.
- Charts are real historical prices, rebased to 100 so absolute prices don't give the company away.
- Sessions are stateless, so a determined player could restart a daily session to retry it. Adding a small KV store keyed by player and day would close that gap.
- Season 0 runs on **testnet**. $TCKR points have **no monetary value** and trading is demo-only. Tickr is an independent project and is not affiliated with Robinhood Markets, Inc. Not investment advice.
