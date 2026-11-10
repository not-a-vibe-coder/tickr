import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Copy, Flame, Lock, RotateCcw, Search, Swords, Trophy, Check } from 'lucide-react'
import MysteryChart from './MysteryChart'
import SplitHeadline from './SplitHeadline'
import ResultBadge, { type GuessResult } from './ResultBadge'
import Scorecard, { ShareButton, scorecardText } from './Scorecard'
import { TickMark } from './Logo'
import { COMPANIES, MONTHS, PUZZLES, SAMPLE_LEADERBOARD, type Company } from '../data/demo'
import { useCountdown } from '../hooks/useCountdown'

type Guess = { company: Company; result: GuessResult }
type Mode = 'daily' | 'practice' | 'duel'

const byTicker = (t: string) => COMPANIES.find((c) => c.ticker === t)!

function evaluate(guess: Company, answer: Company): GuessResult {
  if (guess.ticker === answer.ticker) return 'hit'
  return guess.sector === answer.sector ? 'warm' : 'miss'
}

/** Fully playable local-state demo. No blockchain or market data connection. */
export default function ProductDemo() {
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<Mode>('daily')
  const [puzzleIdx, setPuzzleIdx] = useState(0)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Company | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [streak, setStreak] = useState(6)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const { label: countdown } = useCountdown()

  const puzzle = PUZZLES[puzzleIdx]
  const answer = byTicker(puzzle.answer)
  const won = guesses.some((g) => g.result === 'hit')
  const lost = !won && guesses.length >= 6
  const done = won || lost
  const wrong = guesses.filter((g) => g.result !== 'hit').length
  const unlocked = Math.min(5, wrong)

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    const used = new Set(guesses.map((g) => g.company.ticker))
    return COMPANIES.filter((c) => !used.has(c.ticker))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().startsWith(q))
      .slice(0, 6)
  }, [query, guesses])

  const choose = (c: Company) => {
    setSelected(c)
    setQuery(c.name)
    setOpen(false)
    setError('')
  }

  const submit = () => {
    if (done) return
    const c = selected ?? options.find((o) => o.name.toLowerCase() === query.trim().toLowerCase() || o.ticker.toLowerCase() === query.trim().toLowerCase())
    if (!c) {
      setError('Pick a company from the list.')
      return
    }
    const result = evaluate(c, answer)
    setGuesses((g) => [...g, { company: c, result }])
    if (result === 'hit') setStreak((s) => s + 1)
    setQuery('')
    setSelected(null)
    setError('')
    setActive(0)
    inputRef.current?.focus()
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(options.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && options[active] && !selected) choose(options[active])
      else submit()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const restart = (next = true) => {
    setGuesses([])
    setQuery('')
    setSelected(null)
    setError('')
    if (next) setPuzzleIdx((i) => (i + 1) % PUZZLES.length)
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    if (m === 'daily' && puzzleIdx !== 0) {
      setPuzzleIdx(0)
      restart(false)
    }
    if (m === 'practice' && puzzleIdx === 0) {
      setPuzzleIdx(1)
      restart(false)
    }
  }

  const share = scorecardText(puzzle.id, guesses.map((g) => g.result), won, streak)
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 }

  return (
    <section id="play" className="relative scroll-mt-16 py-20 lg:py-24" aria-labelledby="play-title">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_40%_at_50%_30%,rgba(184,243,107,0.06),transparent_70%)]" />
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="micro mb-5 flex items-center gap-3 text-muted">
              <span className="text-market">▶</span> <span className="h-px w-8 bg-line" /> Interactive demo
            </p>
            <SplitHeadline id="play-title" className="text-[12vw] sm:text-[9vw] lg:text-[5.6vw] 2xl:text-[88px]" lines={['Open the', <>case file<span className="text-market">.</span></>]} />
          </div>
          <p className="max-w-sm text-[16px] leading-relaxed text-paper/65 lg:pb-2">
            Play a demo puzzle right here. Search a company, lock in a guess, unlock clues. Demo data runs locally — nothing here touches a wallet.
          </p>
        </div>

        {/* app window */}
        <div className="panel overflow-hidden rounded-[28px]">
          {/* app bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <TickMark className="h-7 w-7" />
              <div role="tablist" aria-label="Game mode" className="flex rounded-full border border-line bg-obsidian/60 p-1">
                {(['daily', 'practice', 'duel'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`relative rounded-full px-3.5 py-1.5 text-[12px] font-medium capitalize transition-colors sm:px-4 ${mode === m ? 'text-obsidian' : 'text-paper/60 hover:text-paper'}`}
                  >
                    {mode === m && <motion.span layoutId="mode-pill" transition={spring} className="absolute inset-0 rounded-full bg-paper" />}
                    <span className="relative">{m}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-amber">
                <Flame size={13} /> <motion.span key={streak} initial={reduce ? false : { y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{streak}</motion.span>
              </span>
              <span className="hidden rounded-full border border-line px-3 py-1.5 text-muted sm:inline">
                Next <span className="text-market tabular-nums">{countdown}</span>
              </span>
            </div>
          </div>

          {mode === 'duel' ? (
            <DuelView onPlay={() => switchMode('daily')} />
          ) : (
            <div className="grid lg:grid-cols-[1.35fr_1fr]">
              {/* left: chart + clues */}
              <div className="border-b border-line p-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="micro flex items-center justify-between text-muted">
                  <span>{mode === 'daily' ? 'Demo daily' : 'Practice'} · Case #{String(puzzle.id).padStart(3, '0')}</span>
                  <span className="!text-[9px] text-muted/70">Illustrative chart</span>
                </div>
                <div className="relative mt-4 h-56 rounded-2xl border border-line bg-obsidian/60 p-3 sm:h-72">
                  <div className="absolute inset-3 bottom-8">
                    <MysteryChart key={puzzle.id} points={puzzle.series} volume={puzzle.volume} showVolume={unlocked >= 1 || done} grid className="h-full w-full" color={won ? 'var(--color-market)' : lost ? 'var(--color-loss)' : 'var(--color-market)'} />
                  </div>
                  <div className={`absolute bottom-2 left-3 right-3 flex justify-between font-mono text-[9px] text-muted transition-opacity duration-500 ${unlocked >= 3 || done ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!(unlocked >= 3 || done)}>
                    {MONTHS.filter((_, i) => i % 2 === 0).map((m) => <span key={m}>{m} {String(puzzle.year).slice(2)}</span>)}
                  </div>
                </div>

                <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Clues">
                  {puzzle.clues.map((c, i) => {
                    const isOpen = i < unlocked || done
                    return (
                      <li key={c.label} className={`relative overflow-hidden rounded-xl border px-3 py-2.5 ${isOpen ? 'border-amber/25 bg-amber/[0.04]' : 'border-dashed border-line'} ${i === 4 ? 'col-span-2 sm:col-span-2' : ''}`}>
                        <span className="micro block !text-[9px] text-muted">Clue {i + 1} · {c.label}</span>
                        <AnimatePresence mode="wait" initial={false}>
                          {isOpen ? (
                            <motion.span key="v" initial={reduce ? false : { opacity: 0, filter: 'blur(8px)', y: 6 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} transition={{ duration: 0.5 }} className="mt-1 block truncate font-display text-[15px] font-medium">
                              {c.value}
                            </motion.span>
                          ) : (
                            <motion.span key="l" exit={{ opacity: 0 }} className="mt-1 flex items-center gap-1.5 text-[12px] text-muted/60">
                              <Lock size={11} /> After guess {i + 1}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* right: guessing */}
              <div className="relative p-4 sm:p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    submit()
                  }}
                  className="relative"
                >
                  <label htmlFor={`${listId}-input`} className="micro mb-2 block text-muted">
                    Guess {Math.min(guesses.length + 1, 6)} of 6
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        ref={inputRef}
                        id={`${listId}-input`}
                        role="combobox"
                        aria-expanded={open && options.length > 0}
                        aria-controls={`${listId}-list`}
                        aria-autocomplete="list"
                        aria-activedescendant={open && options[active] ? `${listId}-opt-${active}` : undefined}
                        autoComplete="off"
                        disabled={done}
                        value={query}
                        placeholder={done ? 'Case closed' : 'Search company or ticker…'}
                        onChange={(e) => {
                          setQuery(e.target.value)
                          setSelected(null)
                          setOpen(true)
                          setActive(0)
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 120)}
                        onKeyDown={onKey}
                        className="h-12 w-full rounded-xl border border-line bg-obsidian/70 pl-10 pr-3 text-[14px] text-paper placeholder:text-muted/60 focus:border-market/50 focus:outline-none disabled:opacity-50"
                      />
                      <AnimatePresence>
                        {open && !done && options.length > 0 && (
                          <motion.ul
                            id={`${listId}-list`}
                            role="listbox"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
                          >
                            {options.map((o, i) => (
                              <li
                                key={o.ticker}
                                id={`${listId}-opt-${i}`}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  choose(o)
                                }}
                                onMouseEnter={() => setActive(i)}
                                className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[13px] ${i === active ? 'bg-white/[0.05]' : ''}`}
                              >
                                <span>
                                  <span className="mr-2 font-mono text-[11px] text-market">{o.ticker}</span>
                                  {o.name}
                                </span>
                                <span className="text-[11px] text-muted">{o.sector}</span>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                    <button type="submit" disabled={done || (!selected && !query)} className="inline-flex h-12 items-center gap-2 rounded-xl bg-market px-4 text-[13px] font-semibold text-obsidian transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40">
                      Guess <ArrowRight size={14} />
                    </button>
                  </div>
                  <p className="mt-2 h-4 text-[12px] text-loss" role="alert">{error}</p>
                </form>

                <ol className="mt-2 space-y-2" aria-label="Guess history" aria-live="polite">
                  {Array.from({ length: 6 }, (_, i) => {
                    const g = guesses[i]
                    return (
                      <li key={i} className={`relative flex h-12 items-center gap-3 overflow-hidden rounded-xl border px-3.5 transition-colors duration-500 ${g ? (g.result === 'hit' ? 'border-market/50 bg-market/[0.06]' : g.result === 'warm' ? 'border-amber/25' : 'border-loss/25') : 'border-line'}`}>
                        <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
                        <AnimatePresence>
                          {g && (
                            <motion.div initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={spring} className="flex min-w-0 flex-1 items-center gap-3">
                              <span className="shrink-0 font-display text-[16px] font-semibold tracking-tight">{g.company.ticker}</span>
                              <span className="truncate text-[12px] text-muted">{g.company.name}</span>
                              <ResultBadge result={g.result} className="ml-auto shrink-0" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {!g && i === guesses.length && !done && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-market/70" aria-hidden="true" />}
                      </li>
                    )
                  })}
                </ol>

                {/* completion */}
                <AnimatePresence>
                  {done && (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 z-30 flex flex-col justify-center gap-4 bg-charcoal/95 p-5 backdrop-blur-md sm:p-8"
                      role="dialog"
                      aria-label={won ? 'Puzzle solved' : 'Game over'}
                    >
                      <div>
                        <p className={`micro ${won ? 'text-market' : 'text-loss'}`}>{won ? 'Case closed' : 'Case unsolved'}</p>
                        <p className="mt-2 font-display text-3xl font-semibold uppercase leading-[0.95] tracking-tight sm:text-4xl">{answer.name}</p>
                        <p className="mt-1 font-mono text-sm text-market">{answer.ticker}</p>
                      </div>
                      <Scorecard puzzle={puzzle.id} results={guesses.map((g) => g.result)} solved={won} streak={streak} />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <ShareButton text={share} className="flex-1" />
                        <button type="button" onClick={() => { setMode('practice'); restart(true) }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-[13px] font-medium transition hover:border-paper/40">
                          <RotateCcw size={14} /> Next practice case
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* meta panels */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StreakPanel streak={streak} />
          <LeaderboardPanel streak={streak} />
          <CountdownPanel />
        </div>
      </div>
    </section>
  )
}

function StreakPanel({ streak }: { streak: number }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="panel rounded-3xl p-6">
      <div className="micro flex items-center justify-between text-muted">
        <span>Streak tracker</span>
        <Flame size={14} className="text-amber" />
      </div>
      <p className="mt-4 font-display text-5xl font-semibold tracking-tighter">
        {streak}<span className="text-xl text-muted"> days</span>
      </p>
      <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label={`${streak} day streak`}>
        {days.map((d, i) => {
          const on = i >= 14 - streak
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`h-7 w-full rounded-md ${on ? 'bg-market/80 shadow-[0_0_12px_rgba(184,243,107,0.35)]' : 'bg-white/[0.05]'}`} />
              <span className="font-mono text-[9px] text-muted">{d}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-[12px] text-muted">Next milestone: Day 14 · test token drop</p>
    </div>
  )
}

function LeaderboardPanel({ streak }: { streak: number }) {
  const rows = SAMPLE_LEADERBOARD.map((r) => (r.handle === 'you' ? { ...r, streak } : r))
  return (
    <div id="leaderboard" className="panel scroll-mt-24 rounded-3xl p-6">
      <div className="micro flex items-center justify-between text-muted">
        <span>Leaderboard · Season 0</span>
        <Trophy size={14} className="text-market" />
      </div>
      <ol className="mt-4 space-y-1">
        {rows.map((r, i) => (
          <li key={r.handle} className={`flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] ${r.handle === 'you' ? 'bg-market/[0.07] text-market' : ''}`}>
            <span className="w-5 font-mono text-[11px] text-muted">{r.handle === 'you' ? '—' : `0${i + 1}`}</span>
            <span className="flex-1 truncate">@{r.handle}</span>
            <span className="font-mono text-[11px] text-amber">🔥{r.streak}</span>
            <span className="w-10 text-right font-mono text-[11px] text-muted">{r.avg.toFixed(1)}</span>
          </li>
        ))}
      </ol>
      <p className="micro mt-3 !text-[9px] text-muted/60">Sample players · streak · avg guesses</p>
    </div>
  )
}

function CountdownPanel() {
  const { h, m, s } = useCountdown()
  return (
    <div className="panel relative overflow-hidden rounded-3xl p-6 md:col-span-2 lg:col-span-1">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-market/10 blur-3xl" />
      <p className="micro text-muted">Next mystery chart</p>
      <div className="mt-4 flex items-baseline gap-2 font-display font-semibold tracking-tighter" aria-live="off">
        {[h, m, s].map((v, i) => (
          <span key={i} className="flex items-baseline gap-2">
            <span className="text-5xl tabular-nums">{String(v).padStart(2, '0')}</span>
            <span className="font-mono text-[11px] text-muted">{['h', 'm', 's'][i]}</span>
          </span>
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-paper/60">Every player on Earth gets the same chart at 00:00 UTC. Miss a day, lose the streak.</p>
    </div>
  )
}

function DuelView({ onPlay }: { onPlay: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText('Think you can read a chart faster than me? Duel me on Tickr — Case #001.')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
      <div>
        <Swords className="text-market" size={28} />
        <h3 className="mt-5 font-display text-4xl font-semibold uppercase leading-[0.95] tracking-tight">Same chart.<br />Who cracks it first?</h3>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-paper/65">Send a duel link. You both get the identical mystery chart. Fewer guesses wins; ties go to the faster solve.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full bg-market px-5 py-3 text-[13px] font-semibold text-obsidian transition hover:bg-paper">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Invite copied' : 'Copy duel invite'}
          </button>
          <button type="button" onClick={onPlay} className="rounded-full border border-line px-5 py-3 text-[13px] font-medium transition hover:border-paper/40">Play solo instead</button>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-obsidian/60 p-5">
        <p className="micro flex justify-between text-muted"><span>Duel · Case #001</span><span className="text-amber">Example</span></p>
        {[
          { name: 'You', guesses: ['miss', 'warm', 'hit'] as GuessResult[], time: '01:42' },
          { name: '@lagos_quant', guesses: ['warm', 'warm', 'miss', 'hit'] as GuessResult[], time: '02:10' },
        ].map((p, pi) => (
          <div key={p.name} className={`mt-4 rounded-xl border p-4 ${pi === 0 ? 'border-market/40' : 'border-line'}`}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium">{p.name}</span>
              <span className="font-mono text-[11px] text-muted">{p.time}</span>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1.5">
              {Array.from({ length: 6 }, (_, i) => {
                const r = p.guesses[i]
                return <span key={i} className={`h-2.5 rounded-full ${r === 'hit' ? 'bg-market' : r === 'warm' ? 'bg-amber' : r === 'miss' ? 'bg-loss' : 'bg-white/[0.06]'}`} />
              })}
            </div>
            <p className={`micro mt-3 !text-[9px] ${pi === 0 ? 'text-market' : 'text-muted'}`}>{pi === 0 ? 'Winner · 3/6' : 'Solved · 4/6'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
