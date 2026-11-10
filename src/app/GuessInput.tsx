import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Search } from 'lucide-react'
import { COMPANIES, type CompanyInfo } from '../../shared/companies'

/** Accessible company combobox + submit. */
export default function GuessInput({
  used,
  disabled,
  busy,
  label,
  onGuess,
}: {
  used: string[]
  disabled?: boolean
  busy?: boolean
  label: string
  onGuess: (ticker: string) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CompanyInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')
  const id = useId()
  const input = useRef<HTMLInputElement>(null)

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return COMPANIES.filter((c) => !used.includes(c.ticker))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().startsWith(q))
      .slice(0, 7)
  }, [query, used])

  const choose = (c: CompanyInfo) => {
    setSelected(c)
    setQuery(c.name)
    setOpen(false)
    setError('')
  }
  const submit = () => {
    if (disabled || busy) return
    const q = query.trim().toLowerCase()
    const c = selected ?? options.find((o) => o.name.toLowerCase() === q || o.ticker.toLowerCase() === q) ?? (options.length === 1 ? options[0] : undefined)
    if (!c) return setError('Pick a company from the list.')
    onGuess(c.ticker)
    setQuery('')
    setSelected(null)
    setActive(0)
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
      if (open && options[active] && !selected) choose(options[active])
      else submit()
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label htmlFor={`${id}-in`} className="micro mb-2 block text-muted">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={input}
            id={`${id}-in`}
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${id}-o${active}` : undefined}
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={disabled ? 'Case closed' : 'Search company or ticker…'}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
              setOpen(true)
              setActive(0)
              setError('')
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKey}
            className="h-12 w-full rounded-xl border border-line bg-obsidian/70 pl-10 pr-3 text-[15px] text-paper placeholder:text-muted/60 focus:border-market/50 focus:outline-none disabled:opacity-50"
          />
          <AnimatePresence>
            {open && !disabled && options.length > 0 && (
              <motion.ul
                id={`${id}-list`}
                role="listbox"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-auto rounded-xl border border-line bg-surface shadow-2xl"
              >
                {options.map((o, i) => (
                  <li
                    key={o.ticker}
                    id={`${id}-o${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      choose(o)
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-[13px] ${i === active ? 'bg-white/[0.05]' : ''}`}
                  >
                    <span className="truncate">
                      <span className="mr-2 font-mono text-[11px] text-market">{o.ticker}</span>
                      {o.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{o.sector}</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <button type="submit" disabled={disabled || busy || !query} className="inline-flex h-12 items-center gap-2 rounded-xl bg-market px-4 text-[13px] font-semibold text-obsidian transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? 'Checking…' : 'Guess'} <ArrowRight size={14} />
        </button>
      </div>
      <p className="mt-2 h-4 text-[12px] text-loss" role="alert">{error}</p>
    </form>
  )
}
