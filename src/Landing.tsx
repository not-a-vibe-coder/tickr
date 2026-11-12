import { useEffect, useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { BushLArt, BushRArt, CandleIcon, CaptainArt, ChestArt, PalmArt, RATIO, SHIP_RATIO, ShipArt } from './components/landing/art'
import './components/landing/landing.css'

/* ── layout (design-box units) ─────────────────────────────────────────── */
type Box = { x: number; y: number; w: number }
type Lay = {
  w: number
  h: number
  wave: { y0: number; y1: number; gap0: number; gap1: number }
  ship: { x0: number; w0: number; x1: number; w1: number }
  palm: Box
  capt: Box
  chest: Box
  bushL: Box
  bushR: Box
}
const LAY: { land: Lay; port: Lay } = {
  land: {
    w: 1600, h: 900,
    wave: { y0: 748, y1: 272, gap0: 1, gap1: 0.6 },
    ship: { x0: 1130, w0: 640, x1: 1345, w1: 176 },
    palm: { x: -70, y: 40, w: 540 }, capt: { x: 330, y: 404, w: 310 }, chest: { x: 640, y: 660, w: 190 },
    bushL: { x: 60, y: 740, w: 760 }, bushR: { x: 1370, y: 760, w: 300 },
  },
  port: {
    w: 800, h: 1500,
    wave: { y0: 1300, y1: 430, gap0: 1, gap1: 0.7 },
    ship: { x0: 420, w0: 560, x1: 640, w1: 150 },
    palm: { x: -150, y: 200, w: 540 }, capt: { x: 210, y: 560, w: 320 }, chest: { x: 530, y: 830, w: 190 },
    bushL: { x: -40, y: 1330, w: 520 }, bushR: { x: 570, y: 1340, w: 260 },
  },
}

/* ── waves: back to front. dy = offset from the main swell; span = open line over part of the width;
      jag = drawn as a jagged price line instead of a smooth swell ──────────────────────────── */
type Layer = { dy: number; a: number; k: number; v: number; ph: number; fill?: string; span?: [number, number]; jag?: boolean }
const BACK: Layer[] = [
  { dy: -100, a: 20, k: 1.5, v: 0.9, ph: 0, fill: 'var(--band)' },
  { dy: -52, a: 23, k: 1.9, v: 1.15, ph: 1.7, fill: 'var(--paper)' },
]
const FRONT: Layer[] = [
  { dy: 0, a: 25, k: 1.7, v: 1.3, ph: 3.1, fill: 'var(--band2)' },
  { dy: 26, a: 18, k: 2.4, v: 1, ph: 4.4, span: [0.06, 0.44], jag: true },
  { dy: 48, a: 22, k: 1.45, v: 1.4, ph: 0.6, fill: 'var(--paper)' },
  { dy: 76, a: 15, k: 2.1, v: 1.2, ph: 5.1, span: [0.52, 0.97] },
  { dy: 104, a: 24, k: 1.8, v: 1.25, ph: 2.2, fill: 'var(--paper)' },
  { dy: 130, a: 14, k: 2.7, v: 1, ph: 1.1, span: [0.0, 0.62], jag: true },
  { dy: 158, a: 20, k: 1.6, v: 1.1, ph: 3.8 },
]

/* ── easing helpers ─────────────────────────────────────────────────────── */
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const mix = (a: number, b: number, p: number) => a + (b - a) * p
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a))
const io = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
const out = (k: number) => 1 - Math.pow(1 - k, 3)
const back = (k: number) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2)
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}
const tf = (x: number, y: number, r = 0, s = 1) => `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`

export default function Landing() {
  const frame = useRef<HTMLElement>(null)
  const scene = useRef<HTMLDivElement>(null)
  const wBack = useRef<SVGSVGElement>(null)
  const wFront = useRef<SVGSVGElement>(null)
  const cloud = useRef<HTMLDivElement>(null)
  const t1 = useRef<HTMLDivElement>(null)
  const t2 = useRef<HTMLDivElement>(null)
  const h2 = useRef<HTMLHeadingElement>(null)
  const p2 = useRef<HTMLParagraphElement>(null)
  const btn2 = useRef<HTMLSpanElement>(null)
  const logo = useRef<HTMLDivElement>(null)
  const ship = useRef<HTMLDivElement>(null)
  const palm = useRef<HTMLDivElement>(null)
  const capt = useRef<HTMLDivElement>(null)
  const chest = useRef<HTMLDivElement>(null)
  const bushL = useRef<HTMLDivElement>(null)
  const bushR = useRef<HTMLDivElement>(null)
  const shade = useRef<HTMLCanvasElement>(null)
  const cur = useRef<HTMLDivElement>(null)
  const ping = useRef<HTMLDivElement>(null)
  const goRef = useRef<(to: number) => void>(() => {})

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('tl-lock')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (fine) root.classList.add('fine')

    const backPaths = Array.from(wBack.current!.querySelectorAll('path'))
    const frontPaths = Array.from(wFront.current!.querySelectorAll('path'))
    const sprites = { palm: palm.current!, capt: capt.current!, chest: chest.current!, bushL: bushL.current!, bushR: bushR.current! }

    let L = LAY.land
    let DX = 0
    let DY = 0
    let p = 0
    let pFrom = 0
    let pTo = 0
    let pT0 = -1e9
    const t0 = performance.now()

    const resize = () => {
      const W = frame.current!.clientWidth
      const H = frame.current!.clientHeight
      const portrait = H > W
      root.classList.toggle('portrait', portrait)
      L = portrait ? LAY.port : LAY.land
      const S = Math.min(W / L.w, H / L.h)
      DX = (W / S - L.w) / 2
      DY = (H / S - L.h) / 2
      scene.current!.style.transform = `translate(${DX * S}px,${DY * S}px) scale(${S})`
      for (const svg of [wBack.current!, wFront.current!]) {
        svg.setAttribute('width', String(L.w))
        svg.setAttribute('height', String(L.h))
      }
      for (const [id, el] of Object.entries(sprites)) {
        const b = L[id as keyof typeof sprites]
        el.style.left = `${b.x}px`
        el.style.top = `${b.y}px`
        el.style.width = `${b.w}px`
        el.style.height = `${b.w * RATIO[id as keyof typeof RATIO]}px`
      }
      cloud.current!.style.top = `${portrait ? 110 : 150}px`
    }

    const yAt = (l: Layer, x: number, t: number, pp: number) => {
      const Wv = L.wave
      const base = mix(Wv.y0, Wv.y1, pp) + l.dy * mix(Wv.gap0, Wv.gap1, pp)
      const a = l.a * mix(1, 0.72, pp)
      const f = ((2 * Math.PI) / 1100) * l.k * (1 - 0.35 * pp)
      const swell = base + a * Math.sin(f * x + t * l.v + l.ph) + a * 0.45 * Math.sin(f * 2.3 * x - t * l.v * 0.7 + l.ph * 1.7)
      return l.jag ? swell + (hash(Math.floor(x / 22) + l.ph * 31) - 0.5) * a * 1.3 : swell
    }

    const drawLayers = (layers: Layer[], paths: SVGPathElement[], t: number) => {
      const x0 = -DX - 20
      const x1 = L.w + DX + 20
      const bottom = L.h + DY + 40
      layers.forEach((l, i) => {
        const from = l.span ? mix(x0, x1, l.span[0]) : x0
        const to = l.span ? mix(x0, x1, l.span[1]) : x1
        let d = ''
        for (let x = from; ; x += 22) {
          const xx = Math.min(x, to)
          d += `${d ? 'L' : 'M'}${xx.toFixed(1)} ${yAt(l, xx, t, p).toFixed(1)}`
          if (xx >= to) break
        }
        if (l.fill) d += `L${x1.toFixed(1)} ${bottom.toFixed(1)}L${x0.toFixed(1)} ${bottom.toFixed(1)}Z`
        paths[i].setAttribute('d', d)
      })
    }

    // palm-frond shade: a tiny canvas stretched huge, so its low resolution is the blur
    const ctx = shade.current!.getContext('2d')!
    ctx.scale(0.5, 0.5)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 128, 72)
    ctx.strokeStyle = 'rgba(120,114,96,.9)'
    ctx.lineCap = 'round'
    for (const [ax, ay, bx, by, lw] of [[-10, 26, 38, -8, 8], [-8, 46, 58, -2, 5], [-10, 62, 74, 6, 4], [14, 78, 96, 16, 4], [40, 82, 118, 22, 3], [78, 80, 140, 34, 5], [-12, 74, 22, 56, 6]]) {
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.quadraticCurveTo((ax + bx) / 2 + 6, (ay + by) / 2 + 8, bx, by)
      ctx.stroke()
    }

    // cursor
    const ptr = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, down: false, over: false, pingAt: -1e9, px: 0, py: 0 }
    const onMove = (e: PointerEvent) => {
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.over = !!(e.target as Element).closest?.('a,button')
    }
    const onDown = (e: PointerEvent) => {
      ptr.down = true
      ptr.pingAt = performance.now()
      ptr.px = e.clientX
      ptr.py = e.clientY
    }
    const onUp = () => (ptr.down = false)

    const go = (to: number) => {
      if (pTo === to) return
      pFrom = p
      pTo = to
      pT0 = performance.now()
    }
    goRef.current = go

    let wheelLock = 0
    const onWheel = (e: WheelEvent) => {
      const now = performance.now()
      if (now < wheelLock) return
      if (e.deltaY > 8) go(1)
      else if (e.deltaY < -8) go(0)
      else return
      wheelLock = now + 1200
    }
    let touchY = 0
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY)
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - e.changedTouches[0].clientY
      if (dy > 40) go(1)
      else if (dy < -40) go(0)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') go(1)
      if (e.key === 'ArrowUp' || e.key === 'PageUp') go(0)
    }

    let last = t0
    const render = (now: number) => {
      const t = reduced ? 0 : (now - t0) / 1000
      const DUR = reduced ? 1 : 2100
      p = mix(pFrom, pTo, io(seg(now, pT0, pT0 + DUR)))

      drawLayers(BACK, backPaths, t)
      drawLayers(FRONT, frontPaths, t)

      // ship rides the main swell, sunk 5% into it, tilting with the slope
      const c = L.ship
      const sw = mix(c.w0, c.w1, p)
      const sx = mix(c.x0, c.x1, p)
      const sh = sw * SHIP_RATIO
      const wy = yAt(FRONT[0], sx, t, p)
      const slope = (yAt(FRONT[0], sx + 90, t, p) - yAt(FRONT[0], sx - 90, t, p)) / 180
      const s = ship.current!.style
      s.width = `${sw}px`
      s.height = `${sh}px`
      s.left = `${sx - sw / 2}px`
      s.top = `${wy + sw * 0.05 - sh}px`
      s.transform = `rotate(${Math.atan(slope) * 57.3 * 0.75}deg)`

      const cl = cloud.current!.style
      cl.left = `${(((L.w * 0.72 - t * 16) % (L.w + 700)) + (L.w + 700)) % (L.w + 700) - 400}px`
      cl.opacity = String(1 - seg(p, 0.3, 0.7))

      const intro = reduced ? 1 : out(seg(now, t0 + 200, t0 + 1100))
      const a = t1.current!.style
      a.opacity = String(intro * (1 - seg(p, 0.62, 0.7)))
      a.transform = tf(0, (1 - intro) * 26 - p * 40)
      a.pointerEvents = p > 0.1 ? 'none' : ''
      t1.current!.inert = p > 0.1
      logo.current!.style.opacity = String(1 - seg(p, 0.12, 0.3))

      const e = io(seg(p, 0.04, 0.92))
      palm.current!.style.transform = tf(mix(-L.palm.w - 80, 0, e), mix(-170, 0, e), Math.sin(t * 0.8) * 0.7)
      capt.current!.style.transform = tf(mix(-L.capt.w - 160, 0, e), 0, Math.sin(t * 1.1) * 0.5 * p)
      chest.current!.style.transform = tf(mix(-L.chest.w - 720, 0, e), mix(120, 0, e))
      const b = out(seg(p, 0.5, 1))
      bushL.current!.style.transform = tf(0, mix(340, 0, b))
      bushR.current!.style.transform = tf(0, mix(300, 0, b))

      const hk = seg(p, 0.42, 0.82)
      h2.current!.style.opacity = String(hk * hk)
      h2.current!.style.transform = tf(0, mix(70, 0, out(hk)))
      const pk = seg(p, 0.76, 0.92)
      p2.current!.style.opacity = String(pk)
      p2.current!.style.transform = tf(0, mix(16, 0, pk))
      const bk = seg(p, 0.86, 1)
      btn2.current!.style.opacity = String(bk)
      btn2.current!.style.transform = `scale(${mix(0.7, 1, back(bk))})`
      t2.current!.style.pointerEvents = p > 0.9 ? '' : 'none'
      t2.current!.inert = p <= 0.9

      shade.current!.style.transform = `translate(${Math.sin(t * 0.35) * 2.2}%,${Math.cos(t * 0.27) * 1.6}%) rotate(${Math.sin(t * 0.22) * 0.8}deg)`

      if (fine) {
        const dt = Math.min(0.05, (now - last) / 1000)
        const f = 1 - Math.exp(-dt * 22)
        ptr.cx += (ptr.x - ptr.cx) * f
        ptr.cy += (ptr.y - ptr.cy) * f
        const sc = ptr.down ? 0.7 : ptr.over ? 1.35 : 1
        cur.current!.style.transform = `translate(${ptr.cx}px,${ptr.cy}px) scale(${sc})`
        const k = seg(now, ptr.pingAt, ptr.pingAt + 650)
        ping.current!.style.transform = `translate(${ptr.px}px,${ptr.py}px) scale(${1 + out(k) * 1.9})`
        ping.current!.style.opacity = String(k < 1 ? 1 - k : 0)
      }
      last = now
    }

    resize()
    let raf = 0
    const loop = (n: number) => {
      render(n)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    addEventListener('resize', resize)
    addEventListener('pointermove', onMove)
    addEventListener('pointerdown', onDown)
    addEventListener('pointerup', onUp)
    addEventListener('wheel', onWheel, { passive: true })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchend', onTouchEnd, { passive: true })
    addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerdown', onDown)
      removeEventListener('pointerup', onUp)
      removeEventListener('wheel', onWheel)
      removeEventListener('touchstart', onTouchStart)
      removeEventListener('touchend', onTouchEnd)
      removeEventListener('keydown', onKey)
      root.classList.remove('tl-lock', 'fine', 'portrait')
    }
  }, [])

  const go = (to: number) => (e: MouseEvent) => {
    e.preventDefault()
    goRef.current(to)
  }

  return (
    <div className="tl">
      <main ref={frame} className="frame" aria-label="Tickr">
        <div ref={logo} className="logo">
          <CandleIcon />
          Tickr
        </div>
        <nav aria-label="Primary">
          <button type="button" onClick={go(0)}>Voyage<CandleIcon /></button>
          <button type="button" onClick={go(1)}>Today's case<CandleIcon /></button>
          <Link to="/leaderboard">Leaderboard<CandleIcon /></Link>
          <Link to="/trade">Trade<CandleIcon /></Link>
        </nav>

        <div ref={scene} className="scene">
          <div ref={cloud} className="spr" aria-hidden="true">
            <svg viewBox="0 0 300 80" width="300" height="80"><path fill="#d3cebe" d="M0 79c14-3 26-3 38-10-4-16 10-30 30-26 6-22 42-34 62-16 16-12 42-6 50 14 10-2 18 2 22 8 24 22 66 26 98 30z" /></svg>
          </div>
          <svg ref={wBack} className="w" aria-hidden="true">
            {BACK.map((l, i) => <path key={i} fill={l.fill ?? 'none'} stroke="var(--line)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />)}
          </svg>

          <div ref={t1} className="t1">
            <div className="eb">Robinhood Chain · Season 0</div>
            <h1>Every chart<br />has a story</h1>
            <a href="#" className="tpill" onClick={go(1)}>Set sail</a>
          </div>

          <div ref={ship} className="spr ship" aria-hidden="true"><ShipArt /></div>

          <svg ref={wFront} className="w" aria-hidden="true">
            {FRONT.map((l, i) => <path key={i} fill={l.fill ?? 'none'} stroke="var(--line)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />)}
          </svg>

          <div ref={palm} className="spr palm" aria-hidden="true"><PalmArt /></div>
          <div ref={capt} className="spr capt" aria-hidden="true"><CaptainArt /></div>
          <div ref={chest} className="spr" aria-hidden="true"><ChestArt /></div>
          <div ref={bushL} className="spr" aria-hidden="true"><BushLArt /></div>
          <div ref={bushR} className="spr" aria-hidden="true"><BushRArt /></div>

          <div ref={t2} className="t2">
            <h2 ref={h2}>Today's<br />mystery chart</h2>
            <p ref={p2}>One real chart, six guesses.<br />Solve it, win $WIF from the daily pot.</p>
            <span ref={btn2} className="btnw">
              <i className="tick a" />
              <i className="tick b" />
              <i className="tick c" />
              <Link to="/start" className="tpill">Play now</Link>
            </span>
          </div>
        </div>

        <canvas ref={shade} id="shade" width={64} height={36} aria-hidden="true" />
        <p className="legal">Testnet · $TCKR points have no monetary value · Not affiliated with Robinhood Markets, Inc.</p>
      </main>
      <div ref={ping} className="tl-ping" aria-hidden="true" />
      <div ref={cur} className="tl-cur" aria-hidden="true" />
    </div>
  )
}
