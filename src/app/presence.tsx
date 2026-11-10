import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/** Heartbeat-based presence. Every tab sends a beat every 20s for 'site' plus whatever channel it's viewing. */
type Presence = { online: number; watching: Record<string, number>; setChannel: (c: string | null) => void }
const Ctx = createContext<Presence>({ online: 0, watching: {}, setChannel: () => undefined })
export const usePresence = () => useContext(Ctx)

function sessionId() {
  try {
    let id = sessionStorage.getItem('tickr.sid')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('tickr.sid', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [channel, setChannel] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    const sid = sessionId()
    let alive = true
    const beat = () => {
      if (document.visibilityState === 'hidden') return
      fetch('/api/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sid, channels: channel ? [channel] : [] }) })
        .then((r) => r.json())
        .then((j: { counts?: Record<string, number> }) => alive && j.counts && setCounts(j.counts))
        .catch(() => undefined)
    }
    beat()
    const id = setInterval(beat, 20_000)
    document.addEventListener('visibilitychange', beat)
    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [channel])
  return <Ctx.Provider value={{ online: counts.site ?? 0, watching: counts, setChannel }}>{children}</Ctx.Provider>
}

/** Registers the current view as watching a channel (e.g. a token chart) while mounted. */
export function useWatch(channel: string | null) {
  const { setChannel, watching } = usePresence()
  useEffect(() => {
    setChannel(channel)
    return () => setChannel(null)
  }, [channel, setChannel])
  return channel ? watching[channel] ?? 0 : 0
}

export function OnlinePill({ className = '' }: { className?: string }) {
  const { online } = usePresence()
  if (!online) return null
  return (
    <span className={`micro inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-paper/80 ${className}`} title="Players online right now">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-market" />
      <span className="tabular-nums">{online.toLocaleString()}</span> online
    </span>
  )
}
