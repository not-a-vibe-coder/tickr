import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import DifficultySelect, { type Difficulty } from '@/components/ui/8bit-difficulty-select'
import { Button } from '@/components/ui/8bit-button'
import { CandleIcon } from '@/components/landing/art'

/** Level select: the three ways to play, mapped onto Tickr's existing modes. */
const LEVELS: Record<Difficulty, { mode: string; to: string; blurb: string; stakes: string }> = {
  easy: {
    mode: 'Practice',
    to: '/play/practice',
    blurb: 'Unlimited past charts. Learn the shapes with nothing on the line.',
    stakes: 'No streak · No $TCKR',
  },
  normal: {
    mode: 'Daily case',
    to: '/play',
    blurb: "Today's mystery chart, the same for everyone. Six guesses, a clue after every miss, and a daily $WIF pot for solvers.",
    stakes: 'Win $WIF · Builds your streak',
  },
  hard: {
    mode: 'Duel',
    to: '/duel',
    blurb: "Beat a friend on today's chart. Solve it, then send your duel link.",
    stakes: 'Daily rewards · Bragging rights',
  },
}

export default function LevelSelect() {
  const [level, setLevel] = useState<Difficulty>('normal')
  const nav = useNavigate()
  const l = LEVELS[level]

  return (
    <div className="frame-page grain flex flex-col">
      <header className="flex items-center justify-between px-6 pt-6 md:px-12 md:pt-10">
        <Link to="/" className="flex items-center gap-2 font-display text-[28px] leading-none">
          <CandleIcon className="h-[28px] w-[24px]" /> Tickr
        </Link>
        <Link to="/" className="micro inline-flex items-center gap-2 text-ink/80 hover:text-ink">
          <ArrowLeft size={14} /> Back to shore
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-5 py-12 md:flex-row md:items-center md:gap-16">
        <DifficultySelect
          className="w-full max-w-[380px]"
          value={level}
          onChange={setLevel}
          title="Select difficulty"
          description="Choose your voyage"
        />

        <section className="w-full max-w-md text-center md:text-left" aria-live="polite">
          <p className="eyebrow text-[18px] text-ink/70">{level} mode</p>
          <h1 className="display mt-3 text-[56px] md:text-[72px]">{l.mode}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink/80">{l.blurb}</p>
          <p className="micro mt-4 text-ink/60">{l.stakes}</p>
          <Button size="lg" className="mt-8" onClick={() => nav(l.to)}>
            Start ▸
          </Button>
        </section>
      </main>
    </div>
  )
}
