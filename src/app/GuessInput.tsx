import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search } from 'lucide-react'
import { searchAssets, TokenLogo, useAssets } from './useAssets'
import type { Asset } from '../../shared/market'
import { COMPANIES } from '../../shared/companies'

/**
 * Company picker over every Robinhood Stock Token.
 * Type a ticker or name → ↑/↓ to move → Enter (or click) locks the guess in. One action, no second confirm.
 */
export default function GuessInput({ used, disabled, busy, label, onGuess }: { used: string[]; disabled?: boolean; busy?: boolean; label: string; onGuess: (ticker: string) => void }) {
  const tokens = useAssets()
  // Guessable = every Robinhood Stock Token plus every company in the puzzle pool.
  // Some answers (HOOD, ABNB, KO…) aren't tokenised yet; without this they could never be guessed.
  const assets = useMemo(() => {
    if (!tokens.length) return tokens
    const have = new Set(tokens.map((t) => t.symbol))
    const extra: Asset[] = COMPANIES.filter((c) => !have.has(c.ticker)).map((c) => ({ symbol: c.ticker, name: c.name, logo: null, address: null, chainId: null }))
    return [...tokens, ...extra]
  }, [tokens])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  const options = useMemo(() => (query.trim() ? searchAssets(assets, query, 8, used) : []), [assets, query, used])
  useEffect(() => setActive(0), [query])
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (a: Asset) => {
    if (disabled || busy) return
    onGuess(a.symbol)
    setQuery('')
    setOpen(false)
    input.current?.focus()
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
      if (options[active]) pick(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && !disabled && query.trim().length > 0

  return (
    <div className="relative">
      <label htmlFor={`${id}-in`} className="micro mb-2 flex items-center justify-between text-muted">
        <span>{label}</span>
        <span className="normal-case tracking-normal text-muted/70">{assets.length ? `${assets.length} companies` : ''}</span>
      </label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={input}
          id={`${id}-in`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[active] ? `${id}-o${active}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={disabled}
          value={query}
          placeholder={disabled ? 'Case closed' : busy ? 'Checking…' : 'Type a ticker or company — e.g. TSLA, Nvidia'}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          className="h-[52px] w-full rounded-xl border border-line bg-obsidian/70 pl-11 pr-24 text-[15px] text-paper placeholder:text-muted/60 focus:border-market/50 focus:outline-none disabled:opacity-50"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] text-muted">
          <CornerDownLeft size={11} /> guess
        </span>
      </div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-[340px] overflow-auto rounded-xl border border-line bg-surface p-1 shadow-2xl"
          >
            {options.length === 0 ? (
              <li className="px-3 py-3 text-[13px] text-muted">{assets.length ? `No company matches “${query}”.` : 'Loading tokens…'}</li>
            ) : (
              options.map((o, i) => (
                <li
                  key={o.symbol}
                  id={`${id}-o${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(o)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] ${i === active ? 'bg-paper/[0.06]' : ''}`}
                >
                  <TokenLogo asset={o} size={26} />
                  <span className="w-14 shrink-0 font-mono text-[12px] font-semibold text-market">{o.symbol}</span>
                  <span className="truncate text-paper/85">{o.name}</span>
                  {i === active && <CornerDownLeft size={13} className="ml-auto shrink-0 text-muted" />}
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
