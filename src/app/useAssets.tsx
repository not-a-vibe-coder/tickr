import { useEffect, useState } from 'react'
import type { Asset } from '../../shared/market'

let cache: Promise<Asset[]> | null = null
export function loadAssets() {
  cache ??= fetch('/api/market/assets')
    .then((r) => r.json())
    .then((j: { assets: Asset[] }) => j.assets)
    .catch((e) => {
      cache = null
      throw e
    })
  return cache
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([])
  useEffect(() => {
    loadAssets().then(setAssets).catch(() => setAssets([]))
  }, [])
  return assets
}

/** Ranked search: exact ticker › ticker prefix › name prefix › word prefix › substring. */
export function searchAssets(assets: Asset[], query: string, limit = 8, exclude: string[] = []) {
  const q = query.trim().toLowerCase().replace(/^\$/, '')
  const pool = assets.filter((a) => !exclude.includes(a.symbol))
  if (!q) return pool.slice(0, limit)
  const scored: [number, Asset][] = []
  for (const a of pool) {
    const s = a.symbol.toLowerCase()
    const n = a.name.toLowerCase()
    let score = -1
    if (s === q) score = 0
    else if (s.startsWith(q)) score = 1 + s.length / 100
    else if (n.startsWith(q)) score = 2
    else if (n.split(/[\s().&-]+/).some((w) => w.startsWith(q))) score = 3
    else if (s.includes(q) || n.includes(q)) score = 4
    if (score >= 0) scored.push([score, a])
  }
  return scored.sort((x, y) => x[0] - y[0] || x[1].symbol.localeCompare(y[1].symbol)).slice(0, limit).map(([, a]) => a)
}

export function TokenLogo({ asset, size = 24 }: { asset: Pick<Asset, 'symbol' | 'logo'>; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (asset.logo && !broken)
    return <img src={asset.logo} alt="" width={size} height={size} onError={() => setBroken(true)} className="shrink-0 rounded-full bg-white/10 object-cover" style={{ width: size, height: size }} />
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-market/15 font-display font-semibold text-market" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {asset.symbol.slice(0, 1)}
    </span>
  )
}
