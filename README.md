# Tickr

**Every chart has a story.** Tickr is a daily stock-market guessing game on Robinhood Chain. Every day, every player gets the same mystery price chart with the company hidden. You get six guesses, and each miss unlocks a clue.

This repo holds the cinematic landing page with a playable local demo.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · GSAP + ScrollTrigger · Framer Motion · Lucide

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Structure

```
src/
  components/    Hero, GuessSequence, ClueReveal, CompanyReveal, ProductDemo,
                 Rewards, GlobalCommunity (+ Globe), FinalCTA, Navigation, Footer
  data/demo.ts   demo puzzles, company list, illustrative chart generator
  hooks/         useGsap (scoped GSAP context + reduced-motion), useCountdown
  lib/           gsap registration, chart path helpers
```

## Notes

- Season 0 runs on **Robinhood Chain testnet**. Rewards are test tokens with no monetary value.
- All charts on the page are **illustrative**, generated from a seeded random walk. They are not real market data.
- The demo game runs entirely in local state. It doesn't connect to a wallet, a chain or a market-data provider.
- Pinned scroll scenes run on desktop (≥1024px). On smaller screens they play once when they come into view. `prefers-reduced-motion` shows static final states.
- Tickr is an independent project and is not affiliated with Robinhood Markets, Inc.
