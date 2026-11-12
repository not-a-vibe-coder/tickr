# How to use Tickr

Tickr is a daily stock-chart guessing game on Robinhood Chain. Every day everyone gets the same mystery chart. Name the company in six guesses, keep your streak, and win $WIF.

**Play:** <https://tickr-charts.vercel.app>

---

## 1. Get set up

You need:

- **A browser wallet**: MetaMask, Rabby, Coinbase Wallet or any injected wallet.
- **Nothing else to start.** Practice mode works without a wallet, and the daily game costs no gas: the server records your solve and pays your reward.
- **Optional: some $WIF** on Robinhood Chain mainnet, if you want to buy extra clues. $WIF is `0x5173b8eA6923c2d40267890D45C46a3480954773` and trades on the ETH/WIF pools on Robinhood Chain. A tiny bit of ETH on mainnet pays the gas for clue purchases.

Click **Connect wallet** in the top bar to sign in. Tickr adds the Robinhood Chain networks for you when they're needed.

## 2. Pick a mode

From the landing page, click **Play** to open the level select:

| Level | Mode | What it is | What's at stake |
| --- | --- | --- | --- |
| Easy | **Practice** (`/play/practice`) | Unlimited past charts | Nothing. Learn the shapes. |
| Normal | **Daily case** (`/play`) | Today's chart, the same for everyone | Your streak and the daily $WIF pot |
| Hard | **Duel** (`/duel`) | Today's chart against a friend | Bragging rights |

## 3. Play the daily case

1. **Read the chart.** It's a year of real price history for a stock or Stock Token, with the name hidden.
2. **Guess.** Type a company name or ticker and pick it from the list.
3. **Read the feedback** after each guess:
   - 🟩 **Hit**: that's the company. You solved it.
   - 🟨 **Warm**: wrong company, but the **same sector**.
   - ⬜ **Miss**: wrong company and wrong sector.
4. **Use the clues.** Every miss reveals the next clue, in this order:
   1. Sector
   2. Year of the chart
   3. Industry
   4. Year the company was founded
   5. Headquarters
5. **You have six guesses.** Solve it and the result card shows your score, your streak and your $WIF reward.

The chart changes at **00:00 UTC**. A countdown on the page shows when the next one drops.

## 4. Win $WIF

When you solve the daily case with a wallet connected:

- **Connect before you start.** Your daily game is tied to the wallet that was connected when the chart loaded.
- **Nothing to sign.** Your solve and streak are recorded on-chain automatically.
- **Get paid automatically.** The $WIF pot contract on Robinhood Chain mainnet sends the reward to your wallet. You pay no gas.
- **Fewer guesses pay more:** reward = 6 × (7 − guesses) $WIF.

  | Solved in | Reward |
  | --- | --- |
  | 1 guess | 36 $WIF |
  | 2 guesses | 30 $WIF |
  | 3 guesses | 24 $WIF |
  | 4 guesses | 18 $WIF |
  | 5 guesses | 12 $WIF |
  | 6 guesses | 6 $WIF |

- **One reward per wallet per day.**
- **The pot has a daily cap** (shown in the "Daily $WIF pot" panel as "$WIF left today"). It's first come, first served, so solving early matters.
- The result card links to your reward transaction on the explorer.

## 5. Buy a clue with $WIF

Stuck and don't want to burn a guess? In the **Daily $WIF pot** panel, click **Unlock next clue**.

1. Your wallet switches to Robinhood Chain mainnet if needed.
2. The first time, approve $WIF for the pot contract (one transaction, enough for 5 clues).
3. Confirm the clue purchase (one transaction). The clue appears straight away.

- **Price:** 12 $WIF per clue, up to 5 extra clues per day.
- **Where it goes:** 20% is burned for good, and 80% goes back into the pot that pays tomorrow's solvers.
- Clue purchases only apply to the daily case, on the wallet that bought them.

## 6. Duel a friend

1. Solve today's daily case.
2. Copy the **duel link** from the result card and send it.
3. Your friend gets the same chart and has to beat your guess count.

## 7. Streaks, leaderboard and profile

- **Streak:** solve the daily case on consecutive days to grow it. Miss a day and it resets.
- **$TCKR points:** each daily solve adds 100–600 $TCKR (more for fewer guesses), with streak bonuses at 3, 7, 14 and 30 days.
- **Leaderboard** (`/leaderboard`): rank by net worth (cash plus positions at live prices) or by streak.
- **Your profile** (`/me`): your stats, streak and demo portfolio. Share your public profile at `/u/<your-address>`.

## 8. Demo trading with $TCKR

Every player gets **10,000 $TCKR** demo points on Robinhood Chain testnet to paper-trade Stock Token prices on the **Trade** page (`/trade`).

- **Points only:** $TCKR has no value and no real stocks are bought.
- **Signed, not paid:** each trade is a free signature, and the server relays it.
- **Restricted countries:** demo trading isn't available in the countries on Robinhood's Stock Token restricted-jurisdictions list, or in the US, Canada, the UK or Switzerland. The daily game and $WIF rewards work everywhere.

## 9. Is it fair?

Before each day starts, a hash of that day's answer is committed on-chain (`TickrGame` on Robinhood Chain testnet). After the day ends, anyone can check that the revealed answer matches the hash, so the answer can't be changed once people start guessing.

## Contracts

| Contract | Network | Address |
| --- | --- | --- |
| `TickrWifPot` ($WIF rewards and clue purchases) | Robinhood Chain mainnet | [`0x44AFB41f82dd69FeBa7de0f0aC474F8ca05F0F5A`](https://robinhoodchain.blockscout.com/address/0x44AFB41f82dd69FeBa7de0f0aC474F8ca05F0F5A) |
| `TickrGame` (answer commitments, streaks, $TCKR) | Robinhood Chain testnet | [`0xbEC1f2fb8f554249D92a8f239a358fec62B8525B`](https://explorer.testnet.chain.robinhood.com/address/0xbEC1f2fb8f554249D92a8f239a358fec62B8525B) |
| $WIF token | Robinhood Chain mainnet | [`0x5173b8eA6923c2d40267890D45C46a3480954773`](https://robinhoodchain.blockscout.com/address/0x5173b8eA6923c2d40267890D45C46a3480954773) |

## Troubleshooting

- **"Sign in before playing the daily":** connect your wallet, then reload `/play` and solve again. Solves made before connecting can't be saved or rewarded.
- **No $WIF arrived:** you may have already claimed today, or the daily cap was used up. The pot panel shows what's left.
- **"You need 12 $WIF…":** your wallet doesn't hold enough $WIF on Robinhood Chain mainnet to buy a clue.
- **Clue purchase fails:** make sure the wallet has a little ETH on Robinhood Chain mainnet for gas.
- **Trade page says it's unavailable:** your location is in a restricted jurisdiction.

---

Tickr is a game. $TCKR is a demo point with no value, and nothing in Tickr is investment advice.
