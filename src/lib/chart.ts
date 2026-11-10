export function scale(points: number[], w: number, h: number, pad = 0.08) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  return points.map((p, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - (((p - min) / span) * (1 - pad * 2) + pad) * h,
  }))
}

export function linePath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

export function areaPath(pts: { x: number; y: number }[], h: number) {
  return `${linePath(pts)} L${pts[pts.length - 1].x},${h} L0,${h} Z`
}
