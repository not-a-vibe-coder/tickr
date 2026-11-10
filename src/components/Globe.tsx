import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/gsap'

type V3 = [number, number, number]

/** Abstract dotted globe with illuminated player points and connecting arcs (canvas 2D). */
export default function Globe({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduced = prefersReducedMotion()

    // fibonacci sphere
    const N = 1100
    const dots: V3[] = []
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = Math.PI * (3 - Math.sqrt(5)) * i
      dots.push([Math.cos(th) * r, y, Math.sin(th) * r])
    }
    // deterministic "players"
    const players = dots.filter((_, i) => (i * 7919) % 31 === 0).slice(0, 34)
    const arcs: [V3, V3, number][] = players.slice(0, 16).map((p, i) => [p, players[(i * 5 + 3) % players.length], i * 0.37])

    let w = 0, h = 0, R = 0, raf = 0, visible = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      // offset* ignores CSS transforms (the scene scales this canvas on scroll)
      w = canvas.offsetWidth; h = canvas.offsetHeight; R = Math.min(w, h) * 0.42
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const tilt = 0.38
    const project = ([x, y, z]: V3, rot: number) => {
      const cx = x * Math.cos(rot) + z * Math.sin(rot)
      const cz = -x * Math.sin(rot) + z * Math.cos(rot)
      const cy = y * Math.cos(tilt) - cz * Math.sin(tilt)
      const zz = y * Math.sin(tilt) + cz * Math.cos(tilt)
      return { x: w / 2 + cx * R, y: h / 2 + cy * R, z: zz }
    }
    const slerp = (a: V3, b: V3, t: number, lift: number): V3 => {
      const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
      const om = Math.acos(Math.min(1, Math.max(-1, dot))) || 1e-6
      const s = Math.sin(om)
      const k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s
      const alt = 1 + Math.sin(Math.PI * t) * lift
      return [(a[0] * k1 + b[0] * k2) * alt, (a[1] * k1 + b[1] * k2) * alt, (a[2] * k1 + b[2] * k2) * alt]
    }

    const draw = (time: number) => {
      const rot = time * 0.00008
      ctx.clearRect(0, 0, w, h)
      // atmosphere
      const g = ctx.createRadialGradient(w / 2, h / 2, R * 0.6, w / 2, h / 2, R * 1.35)
      g.addColorStop(0, 'rgba(184,243,107,0.06)'); g.addColorStop(1, 'rgba(184,243,107,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, R * 1.35, 0, Math.PI * 2); ctx.fill()
      // rim
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(w / 2, h / 2, R, 0, Math.PI * 2); ctx.stroke()

      for (const d of dots) {
        const p = project(d, rot)
        if (p.z < -0.05) continue
        ctx.fillStyle = `rgba(243,244,237,${0.06 + p.z * 0.28})`
        ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6)
      }
      // arcs
      for (const [a, b, off] of arcs) {
        const phase = ((time * 0.00025 + off) % 1.6)
        ctx.beginPath()
        let started = false
        for (let i = 0; i <= 40; i++) {
          const t = i / 40
          const p = project(slerp(a, b, t, 0.22), rot)
          if (p.z < 0) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true } else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = 'rgba(184,243,107,0.18)'; ctx.lineWidth = 1; ctx.stroke()
        // travelling pulse
        if (phase <= 1) {
          const p = project(slerp(a, b, phase, 0.22), rot)
          if (p.z > 0) {
            ctx.fillStyle = 'rgba(184,243,107,0.95)'
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill()
          }
        }
      }
      // players
      for (const pl of players) {
        const p = project(pl, rot)
        if (p.z < 0) continue
        ctx.fillStyle = `rgba(184,243,107,${0.15 * p.z})`
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(184,243,107,${0.5 + p.z * 0.5})`
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill()
      }
    }

    const loop = (t: number) => {
      if (visible) draw(t)
      raf = requestAnimationFrame(loop)
    }
    resize()
    const ro = new ResizeObserver(() => { resize(); if (reduced) draw(4000) })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    if (reduced) draw(4000)
    else raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect() }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
