import { Check, Flame, X } from 'lucide-react'

export type GuessResult = 'miss' | 'warm' | 'hit'

export const RESULT_META: Record<GuessResult, { label: string; cls: string; emoji: string }> = {
  miss: { label: 'Miss', cls: 'text-loss border-loss/30 bg-loss/10', emoji: '🟥' },
  warm: { label: 'Same sector', cls: 'text-amber border-amber/30 bg-amber/10', emoji: '🟨' },
  hit: { label: 'Solved', cls: 'text-market border-market/40 bg-market/10', emoji: '🟩' },
}

export default function ResultBadge({ result, className = '' }: { result: GuessResult; className?: string }) {
  const m = RESULT_META[result]
  const Icon = result === 'hit' ? Check : result === 'warm' ? Flame : X
  return (
    <span className={`micro inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 !text-[9.5px] ${m.cls} ${className}`}>
      <Icon size={11} strokeWidth={2.5} aria-hidden="true" />
      {m.label}
    </span>
  )
}
