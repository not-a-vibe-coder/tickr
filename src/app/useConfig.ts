import { useEffect, useState } from 'react'
import type { ConfigPayload } from '../../shared/api'
import { api } from './api'

let cache: Promise<ConfigPayload> | null = null
export function useConfig() {
  const [cfg, setCfg] = useState<ConfigPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    cache ??= api.config()
    cache.then(setCfg).catch((e) => {
      cache = null
      setError(String(e.message ?? e))
    })
  }, [])
  return { cfg, error }
}

export function useCountdownTo(ts: number | undefined) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!ts) return '--:--:--'
  const d = Math.max(0, ts - now)
  return [d / 3.6e6, (d % 3.6e6) / 6e4, (d % 6e4) / 1e3].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':')
}
