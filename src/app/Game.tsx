import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Anchor, Check, ExternalLink, Heart, Link2, Loader2, Lock, RotateCcw, Swords } from 'lucide-react'
import { Link } from 'react-router-dom'
import GameChart from './GameChart'
import GuessInput from './GuessInput'
import ResultBadge from '../components/ResultBadge'
import { CaptainArt } from '../components/landing/art'
import { LoaderInline } from '../components/LoaderScreen'
import WifPanel, { fmtWif } from './WifPanel'
import { robinhoodMainnet } from '../../shared/wif'
import Scorecard, { ShareButton, scorecardText } from '../components/Scorecard'
import { CLUE_LABELS, MAX_GUESSES, type GuessResult } from '../../shared/companies'
import type { ClaimResponse, ConfigPayload, GuessResponse, PuzzlePayload } from '../../shared/api'
import { api } from './api'
import { useAuth } from './auth'
import { useCountdownTo } from './useConfig'

type GuessRow = GuessResponse['guesses'][number]
type ClaimState = { state: 'idle' | 'recording' | 'done' | 'error' | 'unavailable'; txHash?: string; message?: string; wif?: ClaimResponse['wif'] }
type Saved = {
  session: string
  puzzle: PuzzlePayload
  guesses: GuessRow[]
  clues: { label: string; value: string }[]
  status: GuessResponse['status']
  answer?: GuessResponse['answer']
  claim: ClaimState
  practiceKey?: number
}

const storeKey = (day: number, addr: string) => `tickr.daily.${day}.${addr.toLowerCase()}`
const load = (k: string): Saved | null => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null')
  } catch {
    return null
  }
}
const save = (k: string, v: Saved) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

export const statsChanged = () => window.dispatchEvent(new Event('tickr:stats'))

export default function Game({ mode, cfg, duel, streak = 0 }: { mode: 'daily' | 'practice'; cfg: ConfigPayload; duel?: { by: string; results: GuessResult[] }; streak?: number }) {
  const auth = useAuth()
  const reduce = useReducedMotion()
  const [g, setG] = useState<Saved | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seen = useRef<number[]>([])
  const countdown = useCountdownTo(cfg.nextPuzzleAt)

  const key = mode === 'daily' && auth.address ? storeKey(cfg.today, auth.address) : null

  const start = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (key) {
        const s = load(key)
        if (s) {
          setG(s)
          return
        }
      }
      const r = await api.puzzle(mode, mode === 'daily' ? auth.address ?? undefined : undefined, seen.current)
      if (r.practiceKey !== undefined) seen.current = [...seen.current, r.practiceKey].slice(-20)
      setG({ session: r.session, puzzle: r.puzzle, guesses: [], clues: [], status: 'playing', claim: { state: 'idle' }, practiceKey: r.practiceKey })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [mode, key, auth.address])

  useEffect(() => {
    if (mode === 'daily' && !auth.address) {
      setLoading(false)
      setG(null)
      return
    }
    void start()
  }, [mode, auth.address, start])

  useEffect(() => {
    if (key && g) save(key, g)
  }, [key, g])

  const claim = useCallback(
    async (state: Saved) => {
      if (!cfg.contract) {
        setG({ ...state, claim: { state: 'unavailable', message: 'On-chain streaks are not live on this server yet.' } })
        return
      }
      setG({ ...state, claim: { state: 'recording' } })
      try {
        const r = await api.claim(state.session)
        const next: ClaimState = r.alreadyRecorded ? { state: 'done', wif: r.wif } : r.txHash ? { state: 'done', txHash: r.txHash, wif: r.wif } : { state: 'error', message: 'Relayer unavailable — try again shortly.' }
        setG((cur) => (cur ? { ...cur, claim: next } : cur))
        setTimeout(statsChanged, 2500)
      } catch (e) {
        setG((cur) => (cur ? { ...cur, claim: { state: 'error', message: (e as Error).message } } : cur))
      }
    },
    [cfg.contract],
  )

  const onGuess = async (ticker: string) => {
    if (!g || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.guess(g.session, ticker)
      const next: Saved = { ...g, session: r.session, guesses: r.guesses, clues: r.clues, status: r.status, answer: r.answer }
      setG(next)
      if (mode === 'daily' && r.status === 'won') void claim(next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // ── gates ──
  if (mode === 'daily' && auth.ready && !auth.address) {
    return (
      <div className="panel grid place-items-center rounded-[28px] px-6 py-20 text-center">
        <p className="micro text-market">Daily case {cfg.puzzleLabel}</p>
        <h2 className="mt-4 font-display text-4xl uppercase tracking-tight sm:text-5xl">Sign in to play the daily</h2>
        <p className="mt-4 max-w-md text-[15px] text-paper/65">Your streak is recorded on Robinhood Chain testnet against your wallet address. Connect Robinhood Wallet, MetaMask or any EVM wallet. You'll only ever sign messages. No gas, no transactions.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={auth.login} className="rounded-full bg-market px-6 py-3 text-[13px] font-semibold text-obsidian transition hover:bg-paper">
            Connect wallet
          </button>
          <Link to="/play/practice" className="rounded-full border border-line px-6 py-3 text-[13px] font-medium transition hover:border-paper/40">Try practice first</Link>
        </div>
      </div>
    )
  }
  if (loading || !g) {
    return (
      <div className="panel grid min-h-[480px] place-items-center rounded-[28px]">
        {error ? (
          <div className="text-center">
            <p className="text-loss">{error}</p>
            <button onClick={() => void start()} className="mt-4 rounded-full border border-line px-5 py-2.5 text-[13px]">Try again</button>
          </div>
        ) : (
          <LoaderInline text="Pulling the chart…" />
        )}
      </div>
    )
  }

  const done = g.status !== 'playing'
  const results = g.guesses.map((x) => x.result)
  const wrong = g.guesses.filter((x) => x.result !== 'hit').length
  const share = [
    mode === 'daily' ? scorecardText(g.puzzle.label ?? g.puzzle.number ?? 0, results, g.status === 'won', streak).replace(/\n🔥 Streak 0/, '') : `TICKR practice · ${g.status === 'won' ? results.length : 'X'}/6\n${results.map((r) => ({ miss: '🟥', warm: '🟨', hit: '🟩' })[r]).join('')}`,
    `${location.origin}/play`,
  ].join('\n')
  const duelUrl = g.puzzle.day && auth.address ? `${location.origin}/duel?d=${g.puzzle.day}&r=${results.map((r) => r[0]).join('')}&by=${auth.address.slice(0, 6)}${auth.address.slice(-4)}` : null

  return (
    <div className="panel overflow-hidden rounded-[28px]">
      {duel && (
        <div className="flex items-center gap-3 border-b border-line bg-amber/[0.06] px-5 py-3 text-[13px]">
          <Swords size={15} className="text-amber" />
          <span>
            Duel: <b>{duel.by}</b> solved this chart in <b>{duel.results.length}/6</b>. Beat it.
          </span>
        </div>
      )}
      <div className="grid lg:grid-cols-[1.4fr_1fr]">
        {/* chart + clues */}
        <div className="border-b border-line p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="micro mb-3 flex items-center justify-between text-muted">
            <span>{mode === 'daily' ? `Daily case ${g.puzzle.label ?? ''}` : 'Practice case'}</span>
            <span>{g.puzzle.points.length} trading days</span>
          </div>
          <GameChart puzzle={g.puzzle} showVolume={wrong >= 1 || done} tone={g.status === 'won' ? 'won' : g.status === 'lost' ? 'lost' : 'play'} />
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Clues">
            {CLUE_LABELS.map((label, i) => {
              const c = g.clues[i]
              return (
                <li key={label} className={`rounded-xl border px-3 py-2.5 ${c ? 'border-amber/25 bg-amber/[0.04]' : 'border-dashed border-line'} ${i === 4 ? 'col-span-2 sm:col-span-2' : ''}`}>
                  <span className="micro block !text-[9px] text-muted">Clue {i + 1} · {label}</span>
                  <AnimatePresence mode="wait" initial={false}>
                    {c ? (
                      <motion.span key="v" initial={reduce ? false : { opacity: 0, filter: 'blur(8px)', y: 6 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} transition={{ duration: 0.5 }} className="mt-1 block truncate font-display text-[15px]">
                        {c.value}
                      </motion.span>
                    ) : (
                      <span className="mt-1 flex items-center gap-1.5 text-[12px] text-muted/60"><Lock size={11} /> After miss {i + 1}</span>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </div>

        {/* guessing */}
        <div className="relative p-4 sm:p-6">
          <GuessInput used={g.guesses.map((x) => x.ticker)} disabled={done} busy={busy} label={`Guess ${Math.min(g.guesses.length + 1, MAX_GUESSES)} of ${MAX_GUESSES}`} onGuess={onGuess} />
          {error && <p className="-mt-1 mb-2 text-[12px] text-loss">{error}</p>}
          <div className="mb-3 flex items-center justify-between">
            <span className="micro text-muted">Lives</span>
            <span className="flex gap-1.5" role="img" aria-label={`${MAX_GUESSES - g.guesses.length} of ${MAX_GUESSES} guesses left`}>
              {Array.from({ length: MAX_GUESSES }, (_, i) => (
                <Heart key={i} size={18} strokeWidth={2.5} className={`transition-opacity ${i < MAX_GUESSES - g.guesses.length ? 'fill-loss text-line-ink' : 'text-ink/25'}`} />
              ))}
            </span>
          </div>
          <ol className="space-y-2" aria-label="Your guesses" aria-live="polite">
            {Array.from({ length: MAX_GUESSES }, (_, i) => {
              const row = g.guesses[i]
              return (
                <li key={i} className={`flex h-12 items-center gap-3 overflow-hidden rounded-xl border px-3.5 transition-colors duration-500 ${row ? (row.result === 'hit' ? 'border-market/50 bg-market/[0.06]' : row.result === 'warm' ? 'border-amber/25' : 'border-loss/25') : 'border-line'}`}>
                  <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
                  {row && (
                    <motion.div initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="shrink-0 font-display text-[16px] tracking-tight">{row.ticker}</span>
                      <span className="truncate text-[12px] text-muted">{row.name}</span>
                      <ResultBadge result={row.result} className="ml-auto shrink-0" />
                    </motion.div>
                  )}
                  {!row && i === g.guesses.length && !done && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-market/70" aria-hidden="true" />}
                </li>
              )
            })}
          </ol>
          {mode === 'daily' && (
            <WifPanel session={g.session} canBuy={!done && g.clues.length < 5} onClues={(clues) => setG((cur) => (cur ? { ...cur, clues } : cur))} />
          )}

          <AnimatePresence>
            {done && g.answer && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-20 flex flex-col gap-3.5 overflow-y-auto bg-surface p-5 sm:p-7"
                role="dialog"
                aria-label={g.status === 'won' ? 'Case closed' : 'Case unsolved'}
              >
                <div className="flex items-start gap-4">
                {g.status === 'won' ? <div className="bob w-16 shrink-0"><CaptainArt /></div> : <Anchor size={40} className="mt-1 shrink-0 text-ink/60" aria-hidden="true" />}
                <div>
                  <p className={`micro ${g.status === 'won' ? 'text-market' : 'text-loss'}`}>{g.status === 'won' ? 'Case closed' : 'Case unsolved'}</p>
                  <p className="mt-2 font-display text-3xl uppercase leading-[0.95] tracking-tight">{g.answer.name}</p>
                  <p className="mt-1 font-mono text-sm text-market">{g.answer.ticker} · {g.answer.year}</p>
                </div>
                </div>
                <Scorecard puzzle={g.puzzle.number ?? 0} results={results} solved={g.status === 'won'} streak={g.claim.state === 'done' ? streak : 0} hideStreak={mode === 'practice' || g.status !== 'won'} label={mode === 'practice' ? 'Practice' : g.puzzle.label ? `Tickr ${g.puzzle.label}` : undefined} />

                {mode === 'daily' && g.status === 'won' && <ClaimStatus claim={g.claim} explorer={cfg.explorer} onRetry={() => void claim(g)} />}
                {mode === 'daily' && g.status === 'lost' && <p className="text-[13px] text-paper/60">No streak today. A new chart drops in <span className="font-mono text-market">{countdown}</span>.</p>}

                <div className="mt-auto flex flex-col gap-2">
                  <ShareButton text={share} className="w-full" />
                  {mode === 'daily' && duelUrl && g.status === 'won' && <CopyButton text={duelUrl} label="Copy duel link" icon={<Link2 size={14} />} />}
                  {mode === 'practice' ? (
                    <button onClick={() => void start()} className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-[13px] font-medium transition hover:border-paper/40">
                      <RotateCcw size={14} /> Next practice case
                    </button>
                  ) : (
                    <Link to="/play/practice" className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-[13px] font-medium transition hover:border-paper/40">
                      Keep playing in practice
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function ClaimStatus({ claim, explorer, onRetry }: { claim: ClaimState; explorer: string; onRetry: () => void }) {
  if (claim.state === 'recording' || claim.state === 'idle')
    return <p className="flex items-center gap-2 rounded-xl border border-line px-3.5 py-3 text-[13px] text-paper/75"><Loader2 size={14} className="animate-spin text-market" /> Recording your solve on Robinhood Chain…</p>
  if (claim.state === 'done')
    return (
      <>
      <p className="flex items-center gap-2 rounded-xl border border-market/30 bg-market/[0.06] px-3.5 py-3 text-[13px]">
        <Check size={14} className="text-market" /> Streak + $TCKR points saved on-chain.
        {claim.txHash && explorer && (
          <a href={`${explorer}/tx/${claim.txHash}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-market hover:underline">
            View tx <ExternalLink size={12} />
          </a>
        )}
      </p>
      <WifReward wif={claim.wif} />
      </>
    )
  return (
    <div className="rounded-xl border border-loss/30 px-3.5 py-3 text-[13px]">
      <p className="text-loss">Couldn't record on-chain: {claim.message}</p>
      {claim.state === 'error' && <button onClick={onRetry} className="mt-2 text-market hover:underline">Retry</button>}
    </div>
  )
}

function WifReward({ wif }: { wif?: ClaimResponse['wif'] }) {
  if (!wif) return null
  const mainnet = robinhoodMainnet.blockExplorers.default.url
  if (wif.error) return <p className="rounded-xl border border-loss/30 px-3.5 py-3 text-[13px] text-loss">{wif.error}</p>
  if (wif.alreadyClaimed) return <p className="rounded-xl border border-line px-3.5 py-3 text-[13px] text-paper/75">Today's $WIF reward is already in your wallet.</p>
  const amt = Number(wif.amount ?? 0)
  return (
    <p className="flex items-center gap-2 rounded-xl border-2 border-line-ink bg-band px-3.5 py-3 text-[13px]">
      <Check size={14} className="text-market" />
      {amt > 0 ? <span><b>+{fmtWif(amt)} $WIF</b> sent to your wallet.</span> : <span>Today's $WIF pot is empty. Come back tomorrow.</span>}
      {wif.txHash && (
        <a href={`${mainnet}/tx/${wif.txHash}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-market hover:underline">
          View tx <ExternalLink size={12} />
        </a>
      )}
    </p>
  )
}

export function CopyButton({ text, label, icon }: { text: string; label: string; icon?: React.ReactNode }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setOk(true)
          setTimeout(() => setOk(false), 2000)
        } catch {
          /* blocked */
        }
      }}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-[13px] font-medium transition hover:border-paper/40"
    >
      {ok ? <Check size={14} /> : icon} {ok ? 'Copied' : label}
    </button>
  )
}
