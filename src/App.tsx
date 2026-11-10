import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './Landing'

// The game app (auth, wallet, chain) loads only when a player enters it.
const GameApp = lazy(() => import('./app/GameApp'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/*"
          element={
            <Suspense fallback={<div className="grid min-h-screen place-items-center bg-obsidian"><span className="micro text-muted">Opening the case file…</span></div>}>
              <GameApp />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
