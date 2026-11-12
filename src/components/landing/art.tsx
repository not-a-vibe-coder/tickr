/**
 * Flat storybook artwork for the landing scene: ink outlines, parchment, a few warm flat colours.
 * Each piece is a standalone SVG sized by its parent's width (height follows the viewBox ratio),
 * so it can later be swapped for generated artwork without touching the layout code.
 */
const INK = '#16130e'
const PAPER = '#f1ecdd'
const GREEN = '#4f8a52'
const GREEN_D = '#2f6b3a'
const LEAF = '#5d8a4c'
const LEAF_D = '#3f6a36'
const RED = '#a33a24'
const WOOD = '#8a5a3c'
const WOOD_D = '#6b4129'
const GOLD = '#d9a53a'
const SAND = '#e3cf9f'
const TRUNK = '#b98a55'

const S = { stroke: INK, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

/** Ship viewBox ratio (h / w), used by the layout to sit the hull on the swell. */
export const SHIP_RATIO = 408 / 400

export function ShipArt() {
  return (
    <svg viewBox="0 0 400 408" className="block h-full w-full" aria-hidden="true">
      {/* bowsprit + rigging */}
      <path d="M58 286 L8 246" {...S} fill="none" />
      <path d="M8 246 L120 92 M210 42 L8 246 M210 42 L388 262 M300 112 L388 262" stroke={INK} strokeWidth={2} fill="none" opacity={0.7} />
      {/* masts */}
      <path d="M120 296 V92 M210 300 V36 M300 292 V108" {...S} strokeWidth={7} fill="none" />
      {/* sails */}
      <path d="M78 122 Q120 112 162 122 L168 252 Q120 264 72 252 Z" fill={PAPER} {...S} />
      <path d="M156 66 Q210 54 264 66 L272 236 Q210 252 148 236 Z" fill={PAPER} {...S} />
      <path d="M262 136 Q300 128 338 136 L342 248 Q300 258 258 248 Z" fill={PAPER} {...S} />
      {/* candlestick chart on the mainsail */}
      {[
        { x: 172, o: 196, c: 170, h: 160, l: 206 },
        { x: 191, o: 172, c: 186, h: 162, l: 196 },
        { x: 210, o: 184, c: 150, h: 140, l: 192 },
        { x: 229, o: 152, c: 128, h: 116, l: 160 },
        { x: 248, o: 130, c: 104, h: 92, l: 138 },
      ].map((k) => (
        <g key={k.x}>
          <line x1={k.x} x2={k.x} y1={k.h} y2={k.l} stroke={INK} strokeWidth={2.5} />
          <rect x={k.x - 6} y={Math.min(k.o, k.c)} width={12} height={Math.abs(k.o - k.c)} fill={k.c < k.o ? GREEN : RED} stroke={INK} strokeWidth={2.5} />
        </g>
      ))}
      {/* crow's nest + flag */}
      <rect x={196} y={96} width={28} height={14} fill={WOOD} {...S} strokeWidth={4} />
      <path d="M210 38 L254 50 L210 62 Z" fill={GREEN_D} {...S} strokeWidth={4} />
      {/* hull */}
      <path d="M34 282 L330 282 L372 256 L364 300 L340 372 Q204 400 76 372 Z" fill={WOOD} {...S} />
      <path d="M44 304 L352 296" stroke={GOLD} strokeWidth={9} strokeLinecap="round" />
      <path d="M44 304 L352 296" stroke={INK} strokeWidth={2} fill="none" transform="translate(0 -6)" />
      <path d="M44 304 L352 296" stroke={INK} strokeWidth={2} fill="none" transform="translate(0 6)" />
      {[106, 152, 198, 244, 290].map((x) => (
        <circle key={x} cx={x} cy={334} r={8} fill={INK} />
      ))}
      <path d="M90 366 Q204 388 330 362" stroke={WOOD_D} strokeWidth={8} fill="none" />
    </svg>
  )
}

export function PalmArt() {
  return (
    <svg viewBox="0 0 300 420" className="block h-full w-full" aria-hidden="true">
      {/* sand base */}
      <path d="M40 410 Q150 360 270 410 Z" fill={SAND} {...S} />
      {/* trunk */}
      <path d="M160 404 Q176 300 146 210 Q126 150 132 118 L150 120 Q148 156 166 210 Q196 300 186 404 Z" fill={TRUNK} {...S} />
      {[370, 330, 290, 252, 214, 180, 150].map((y, i) => (
        <path key={y} d={`M${158 + (i < 3 ? 2 : -12 + i)} ${y} q12 6 24 0`} stroke={INK} strokeWidth={3} fill="none" />
      ))}
      {/* fronds */}
      <g fill={LEAF} {...S} strokeWidth={4.5}>
        <path d="M140 118 Q80 70 10 96 Q70 92 120 132 Z" />
        <path d="M140 118 Q110 40 40 28 Q100 60 128 124 Z" fill={LEAF_D} />
        <path d="M142 116 Q160 30 230 18 Q176 54 152 124 Z" />
        <path d="M144 118 Q220 70 292 104 Q226 96 156 136 Z" fill={LEAF_D} />
        <path d="M142 120 Q196 150 220 220 Q186 160 140 136 Z" />
        <path d="M138 120 Q84 150 60 214 Q100 160 140 136 Z" fill={LEAF_D} />
      </g>
      {/* coconuts */}
      <g fill={WOOD_D} {...S} strokeWidth={3.5}>
        <circle cx={132} cy={132} r={10} />
        <circle cx={152} cy={134} r={10} />
      </g>
    </svg>
  )
}

/** Captain Tick: Tickr's candlestick mascot in a tricorn, holding today's case file. */
export function CaptainArt() {
  return (
    <svg viewBox="0 0 260 330" className="block h-full w-full" aria-hidden="true">
      {/* sand patch */}
      <ellipse cx={128} cy={316} rx={112} ry={14} fill={SAND} {...S} strokeWidth={4} />
      {/* lower wick + boots */}
      <path d="M128 270 V300" {...S} strokeWidth={7} />
      <path d="M96 298 h26 v14 h-34 q0 -14 8 -14 Z M134 298 h26 q8 0 8 14 h-34 Z" fill={INK} />
      {/* body */}
      <rect x={70} y={96} width={116} height={180} rx={20} fill={GREEN} {...S} />
      <path d="M84 112 V258" stroke="#7fb57d" strokeWidth={8} strokeLinecap="round" />
      {/* belt */}
      <rect x={70} y={214} width={116} height={16} fill={WOOD_D} {...S} strokeWidth={4} />
      <rect x={118} y={210} width={20} height={24} fill={GOLD} {...S} strokeWidth={4} />
      {/* face */}
      <circle cx={108} cy={150} r={11} fill={PAPER} {...S} strokeWidth={4} />
      <circle cx={111} cy={152} r={4.5} fill={INK} />
      {/* eye patch */}
      <path d="M72 128 L184 162" stroke={INK} strokeWidth={4} />
      <ellipse cx={152} cy={150} rx={13} ry={11} fill={INK} />
      <path d="M104 182 Q128 202 154 180" fill="none" {...S} strokeWidth={4.5} />
      <path d="M112 186 Q128 196 146 185" fill={PAPER} stroke="none" />
      {/* tricorn hat */}
      <path d="M54 102 Q128 62 204 102 Q190 78 168 74 Q150 30 128 30 Q106 30 88 74 Q66 78 54 102 Z" fill={INK} {...S} strokeWidth={4} />
      <path d="M62 98 Q128 68 196 98" stroke={GOLD} strokeWidth={4} fill="none" />
      <circle cx={128} cy={60} r={7} fill={PAPER} stroke={INK} strokeWidth={3} />
      {/* upper wick peeking through the hat */}
      <path d="M128 30 V14" {...S} strokeWidth={7} />
      {/* left arm on hip */}
      <path d="M72 168 Q44 182 56 214 Q66 222 74 210" fill="none" {...S} strokeWidth={10} />
      <path d="M72 168 Q44 182 56 214 Q66 222 74 210" fill="none" stroke={GREEN} strokeWidth={4} />
      {/* right arm holding the case file scroll */}
      <path d="M184 168 Q214 160 224 128" fill="none" {...S} strokeWidth={10} />
      <path d="M184 168 Q214 160 224 128" fill="none" stroke={GREEN} strokeWidth={4} />
      <g transform="rotate(-12 226 104)">
        <rect x={196} y={70} width={62} height={70} rx={4} fill={PAPER} {...S} strokeWidth={4} />
        <path d="M196 76 h62 M196 134 h62" stroke={INK} strokeWidth={3} />
        <path d="M204 122 L216 106 L226 114 L240 92 L250 98" fill="none" stroke={RED} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <text x={227} y={92} textAnchor="middle" fontFamily="Georgia, serif" fontSize={13} fontWeight={700} fill={INK}>?</text>
      </g>
    </svg>
  )
}

export function ChestArt() {
  return (
    <svg viewBox="0 0 220 190" className="block h-full w-full" aria-hidden="true">
      {/* open lid */}
      <path d="M30 86 L44 26 Q110 0 176 26 L190 86 Z" fill={WOOD} {...S} />
      <path d="M44 26 L54 86 M176 26 L166 86" stroke={GOLD} strokeWidth={8} />
      {/* coins */}
      <g fill={GOLD} {...S} strokeWidth={3.5}>
        <ellipse cx={64} cy={90} rx={22} ry={12} />
        <ellipse cx={110} cy={80} rx={24} ry={13} />
        <ellipse cx={156} cy={90} rx={22} ry={12} />
        <ellipse cx={88} cy={98} rx={22} ry={12} />
        <ellipse cx={134} cy={98} rx={22} ry={12} />
      </g>
      <text x={110} y={86} textAnchor="middle" fontFamily="Georgia, serif" fontSize={14} fontWeight={700} fill={INK}>T</text>
      {/* box */}
      <rect x={24} y={96} width={172} height={80} rx={6} fill={WOOD} {...S} />
      <path d="M24 122 h172" stroke={WOOD_D} strokeWidth={6} />
      <rect x={52} y={96} width={16} height={80} fill={GOLD} {...S} strokeWidth={3.5} />
      <rect x={152} y={96} width={16} height={80} fill={GOLD} {...S} strokeWidth={3.5} />
      <rect x={98} y={112} width={24} height={28} rx={3} fill={GOLD} {...S} strokeWidth={3.5} />
      <circle cx={110} cy={124} r={3.5} fill={INK} />
    </svg>
  )
}

function Bush({ blobs }: { blobs: { cx: number; cy: number; r: number; d?: boolean }[] }) {
  return (
    <>
      {blobs.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.d ? LEAF_D : LEAF} {...S} strokeWidth={4.5} />
      ))}
    </>
  )
}

export function BushLArt() {
  return (
    <svg viewBox="0 0 700 400" className="block h-full w-full" aria-hidden="true">
      <path d="M0 150 Q330 40 700 130 L700 400 L0 400 Z" fill={SAND} {...S} />
      <path d="M120 200 q20 -10 40 0 M420 150 q24 -10 48 0 M560 210 q16 -8 32 0" stroke={INK} strokeWidth={3} fill="none" />
      <Bush blobs={[{ cx: 40, cy: 190, r: 70, d: true }, { cx: 120, cy: 220, r: 60 }, { cx: 20, cy: 280, r: 80 }, { cx: 190, cy: 290, r: 56, d: true }]} />
      <Bush blobs={[{ cx: 640, cy: 200, r: 60 }, { cx: 690, cy: 260, r: 70, d: true }, { cx: 590, cy: 290, r: 52 }]} />
    </svg>
  )
}

export function BushRArt() {
  return (
    <svg viewBox="0 0 300 220" className="block h-full w-full" aria-hidden="true">
      <Bush blobs={[{ cx: 70, cy: 120, r: 60, d: true }, { cx: 150, cy: 90, r: 64 }, { cx: 236, cy: 124, r: 58, d: true }, { cx: 120, cy: 180, r: 60 }, { cx: 210, cy: 190, r: 56 }]} />
    </svg>
  )
}

/** Ratios (h / w) of each piece, so the layout can size boxes before the SVG lays out. */
export const RATIO = {
  palm: 420 / 300,
  capt: 330 / 260,
  chest: 190 / 220,
  bushL: 400 / 700,
  bushR: 220 / 300,
}

export function CandleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 30" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M8 3v5M8 22v5M19 6v4M19 24v3" />
      <rect x="4" y="8" width="8" height="14" rx="1.5" fill="currentColor" />
      <rect x="15" y="10" width="8" height="14" rx="1.5" />
    </svg>
  )
}
