import { CandleIcon } from './landing/art'

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-[28px] leading-none ${className}`}>
      <CandleIcon className="h-[26px] w-[22px]" />
      Tickr
    </span>
  )
}

export function SeasonBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`micro inline-flex items-center gap-2 rounded-full border-2 border-line-ink bg-surface px-3 py-1.5 text-ink ${className}`}>
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-market" />
      Season 0 · Testnet
    </span>
  )
}
