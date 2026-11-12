import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './Landing'
import LevelSelect from './LevelSelect'
import LoaderScreen from './components/LoaderScreen'

// The game app (auth, wallet, chain) loads only when a player enters it.
const GameApp = lazy(() => import('./app/GameApp'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<LevelSelect />} />
        <Route
          path="/*"
          element={
            <Suspense fallback={<LoaderScreen text="Opening the case file…" />}>
              <GameApp />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
