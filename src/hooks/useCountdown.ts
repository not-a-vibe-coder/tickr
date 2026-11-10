import { useEffect, useState } from 'react'

/** Time remaining until the next daily puzzle (00:00 UTC). */
export function useCountdown() {
  const calc = () => {
    const now = new Date()
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    const diff = Math.max(0, next - now.getTime())
    const h = Math.floor(diff / 3.6e6)
    const m = Math.floor((diff % 3.6e6) / 6e4)
    const s = Math.floor((diff % 6e4) / 1e3)
    return { h, m, s, label: [h, m, s].map((v) => String(v).padStart(2, '0')).join(':') }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [])
  return t
}
