import { useId, useMemo, type Ref } from 'react'
import { areaPath, linePath, scale } from '../lib/chart'

type Props = {
  points: number[]
  volume?: number[]
  width?: number
  height?: number
  className?: string
  lineRef?: Ref<SVGPathElement>
  areaRef?: Ref<SVGPathElement>
  volumeRef?: Ref<SVGGElement>
  /** Rect inside a clipPath — animate its `width` attr (0 → width) to draw the chart left→right. */
  revealRef?: Ref<SVGRectElement>
  showArea?: boolean
  showVolume?: boolean
  grid?: boolean
  strokeWidth?: number
  color?: string
}

/** Responsive SVG price chart with optional area, volume and grid layers. */
export default function MysteryChart({
  points,
  volume,
  width = 1000,
  height = 400,
  className,
  lineRef,
  areaRef,
  volumeRef,
  revealRef,
  showArea = true,
  showVolume = false,
  grid = false,
  strokeWidth = 2,
  color = 'var(--color-market)',
}: Props) {
  const id = useId().replace(/:/g, '')
  const pts = useMemo(() => scale(points, width, height * (showVolume ? 0.8 : 1)), [points, width, height, showVolume])
  const d = useMemo(() => linePath(pts), [pts])
  const a = useMemo(() => areaPath(pts, height * (showVolume ? 0.8 : 1)), [pts, height, showVolume])

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="70%" stopColor={color} stopOpacity="0.02" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`reveal-${id}`}>
          <rect ref={revealRef} x="-10" y="-50" width={width + 20} height={height + 100} />
        </clipPath>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {grid && (
        <g stroke="rgba(255,255,255,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke">
          {Array.from({ length: 5 }, (_, i) => (
            <line key={i} x1="0" x2={width} y1={(height * 0.8 * (i + 0.5)) / 5} y2={(height * 0.8 * (i + 0.5)) / 5} vectorEffect="non-scaling-stroke" strokeDasharray="2 6" />
          ))}
        </g>
      )}

      {showVolume && volume && (
        <g ref={volumeRef}>
          {volume.map((v, i) => {
            const bw = width / volume.length
            const up = i === 0 || points[i] >= points[i - 1]
            const vh = v * height * 0.17
            return (
              <rect
                key={i}
                x={i * bw + bw * 0.18}
                y={height - vh}
                width={bw * 0.64}
                height={vh}
                fill={up ? 'rgba(184,243,107,0.28)' : 'rgba(226,113,106,0.28)'}
              />
            )
          })}
        </g>
      )}

      <g clipPath={`url(#reveal-${id})`}>
      {showArea && <path ref={areaRef} d={a} fill={`url(#area-${id})`} />}
      <path
        ref={lineRef}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        filter={`url(#glow-${id})`}
      />
      </g>
    </svg>
  )
}
