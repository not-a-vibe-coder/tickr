import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { RESULT_META, type GuessResult } from './ResultBadge'

export function scorecardText(puzzle: number | string, results: GuessResult[], solved: boolean, streak: number) {
  const grid = results.map((r) => RESULT_META[r].emoji).join('')
  const label = typeof puzzle === 'string' ? puzzle : `#${String(puzzle).padStart(3, '0')}`
  return [
    `TICKR ${label} · ${solved ? results.length : 'X'}/6`,
    grid,
    `🔥 Streak ${streak}`,
    'Season 0 · Robinhood Chain testnet',
  ].join('\n')
}

/** Copies (or natively shares) the emoji scorecard. */
export function ShareButton({ text, className = '' }: { text: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  const share = async () => {
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text })
        return
      }
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('error')
    }
    setTimeout(() => setState('idle'), 2200)
  }
  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-market px-5 py-3 text-[13px] font-semibold text-obsidian transition hover:bg-paper active:scale-[0.98] ${className}`}
    >
      {state === 'copied' ? <Check size={15} /> : <Share2 size={15} />}
      <span aria-live="polite">{state === 'copied' ? 'Copied to clipboard' : state === 'error' ? 'Copy blocked — try again' : 'Share result'}</span>
    </button>
  )
}

export default function Scorecard({ puzzle, results, solved, streak, hideStreak, label }: { puzzle: number; results: GuessResult[]; solved: boolean; streak: number; hideStreak?: boolean; label?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-obsidian/70 p-5 text-center">
      <p className="micro text-muted">{label ?? `Tickr #${String(puzzle).padStart(3, '0')}`}</p>
      <p className="mt-2 font-display text-4xl font-semibold tracking-tight">{solved ? results.length : 'X'}/6</p>
      <p className="mt-3 text-2xl tracking-[0.2em]" aria-label={results.map((r) => RESULT_META[r].label).join(', ')}>
        {results.map((r) => RESULT_META[r].emoji).join('')}
      </p>
      {!hideStreak && streak > 0 && <p className="micro mt-3 text-amber">🔥 Streak {streak}</p>}
    </div>
  )
}
