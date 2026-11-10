export function TickMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#171D19" stroke="rgba(255,255,255,0.12)" />
      <path d="M6.5 20.5l5-5 4 3 5-8 5.5 3.8" fill="none" stroke="#B8F36B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="14.3" r="1.6" fill="#B8F36B" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <TickMark />
      <span className="font-display text-[19px] font-semibold tracking-[-0.04em]">TICKR</span>
    </span>
  )
}
