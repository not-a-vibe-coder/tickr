import CandleChart from './CandleChart'
import type { PuzzlePayload } from '../../shared/api'

/** The daily/practice mystery chart: real daily candles, indexed to 100 at the first close. */
export default function GameChart({ puzzle, showVolume, tone }: { puzzle: PuzzlePayload; showVolume: boolean; tone: 'play' | 'won' | 'lost' }) {
  const candles = (puzzle.candles ?? puzzle.points.map((c, i) => [i ? puzzle.points[i - 1] : c, c, c, c] as const)).map(([o, h, l, c], i) => ({ o, h, l, c, v: puzzle.volume[i] }))
  const n = candles.length
  const total = puzzle.points[n - 1] - 100
  const monthOf = (i: number) => [...puzzle.monthTicks].reverse().find((m) => m.i <= i)?.label ?? ''
  return (
    <div className={`rounded-2xl border bg-obsidian/60 px-3 pt-3 ${tone === 'won' ? 'border-market/30' : tone === 'lost' ? 'border-loss/30' : 'border-line'}`}>
      <div className="micro flex items-center justify-between px-1 !text-[9.5px] text-muted">
        <span>Daily candles · indexed to 100</span>
        <span className={total >= 0 ? 'text-market' : 'text-loss'}>
          {total >= 0 ? '+' : ''}
          {total.toFixed(1)}% over the period
        </span>
      </div>
      <CandleChart
        candles={candles}
        showVolume={showVolume}
        labelAt={(i) => `${monthOf(i)} · day ${i + 1}`}
        ticks={puzzle.monthTicks.filter((_, k) => n < 160 || k % 1 === 0)}
        fmt={(v) => v.toFixed(1)}
        animateKey={`${puzzle.day ?? 'p'}-${n}-${puzzle.points[3]}`}
        className="h-64 sm:h-80"
        ariaLabel={`Mystery candlestick chart, ${total >= 0 ? 'up' : 'down'} ${Math.abs(total).toFixed(1)} percent over ${n} trading days. Arrow keys inspect candles.`}
      />
    </div>
  )
}
