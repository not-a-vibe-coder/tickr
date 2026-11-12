import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/goudy-bookletter-1911'
import '@fontsource/sorts-mill-goudy'
import '@fontsource/josefin-sans/600.css'
import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/600.css'
import '@fontsource/open-sans/700.css'
import '@fontsource/press-start-2p'
import './styles/index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
