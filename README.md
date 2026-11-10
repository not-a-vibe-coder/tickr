# Tickr

**Every chart has a story.** Tickr is a daily stock-market guessing game on **Robinhood Chain**. Every day, everyone gets the same mystery price chart from a real company. You get six guesses, and each miss unlocks a clue. Solve days in a row to build a streak. Streaks are recorded on-chain, and milestones pay out test stock tokens.

- `/` is the cinematic landing page.
- `/play` is today's daily case. `/play/practice` gives unlimited practice cases.
- `/leaderboard` is read live from the contract. `/me` shows your streak, milestones and test-token balances.
- `/duel?…` holds challenge links you can send to friends.

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
            • verifies the signature, updates the streak, pays milestone rewards
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

Fund the address with testnet ETH from <https://faucet.testnet.chain.robinhood.com>. Request the stock tokens you want to use as rewards (TSLA, AMZN, PLTR, AMD) from the same faucet. Copy each token's contract address from the explorer: <https://explorer.testnet.chain.robinhood.com>.

### 2. Deploy the contract

```bash
git submodule update --init --recursive
cd contracts
export PRIVATE_KEY=0x...                          # game wallet
export REWARD_TOKENS=0xTSLA,0xAMZN,0xPLTR,0xAMD   # rewards for 3, 7, 14 and 30-day streaks
export REWARD_AMOUNT=100000000000000000           # 0.1 token per milestone (18 decimals)
forge test
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast
```

Then fund the prize pool by sending the faucet tokens to the contract:

```bash
cast send 0xTSLA "transfer(address,uint256)" <TickrGame> 2000000000000000000 \
  --rpc-url robinhood_testnet --private-key $PRIVATE_KEY
```

If the pool runs dry, the contract still records solves. It emits `RewardUnfunded` instead of paying.

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
| `TICKR_LAUNCH_DATE` | First day, e.g. `2026-11-11`. That day becomes puzzle #001. |
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

## Local development

```bash
npm install
npm run data            # fetch market data → server/generated/market.json
npm run dev             # app + API on http://localhost:5173
```

Full local chain:

```bash
anvil
cd contracts && PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 DEPLOY_MOCKS=true \
  forge script script/Deploy.s.sol --rpc-url local --broadcast
# .env.local: TICKR_NETWORK=local, TICKR_CONTRACT=<printed address>, TICKR_SIGNER_KEY=<same key>, TICKR_SECRET=anything
npm run commit
npm run dev
```

## Fairness & honesty notes

- The daily answer is chosen with an HMAC of `TICKR_SECRET`. Its hash is committed on-chain before the day starts. `GET /api/reveal?day=N` returns the answer and salt for any past day, and anyone can check them with `revealPuzzle()`.
- Charts are real historical prices, rebased to 100 so absolute prices don't give the company away.
- Sessions are stateless, so a determined player could restart a daily session to retry it. Adding a small KV store keyed by player and day would close that gap.
- Season 0 runs on **testnet**. Rewards are test tokens with **no monetary value**. Tickr is an independent project and is not affiliated with Robinhood Markets, Inc. Not investment advice.
