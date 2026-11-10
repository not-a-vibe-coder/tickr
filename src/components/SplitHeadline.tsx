import type { ElementType, ReactNode } from 'react'

/**
 * Renders each word inside an overflow mask so GSAP can slide `.word-inner` up.
 * Pass lines as an array; a line may contain ReactNodes for accents.
 */
export default function SplitHeadline({
  lines,
  as: Tag = 'h2',
  className = '',
  wordClassName = '',
  id,
}: {
  lines: (string | ReactNode)[]
  as?: ElementType
  className?: string
  /** Applied to every word (e.g. a per-word text gradient, which survives transforms). */
  wordClassName?: string
  id?: string
}) {
  return (
    <Tag className={`display ${className}`} id={id}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {typeof line === 'string'
            ? line.split(' ').map((w, wi) => (
                <span key={wi} className="word inline-block overflow-hidden pb-[0.06em] align-bottom">
                  <span className={`word-inner inline-block ${wordClassName}`}>{w}</span>
                  {wi < line.split(' ').length - 1 && <span>&nbsp;</span>}
                </span>
              ))
            : (
                <span className="word inline-block overflow-hidden pb-[0.06em] align-bottom">
                  <span className={`word-inner inline-block ${wordClassName}`}>{line}</span>
                </span>
              )}
        </span>
      ))}
    </Tag>
  )
}
