import Navigation from './components/Navigation'
import Hero from './components/Hero'
import GuessSequence from './components/GuessSequence'
import ClueReveal from './components/ClueReveal'
import CompanyReveal from './components/CompanyReveal'
import ProductDemo from './components/ProductDemo'
import Rewards from './components/Rewards'
import GlobalCommunity from './components/GlobalCommunity'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="grain">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-market focus:px-4 focus:py-2 focus:text-obsidian">
        Skip to content
      </a>
      <Navigation />
      <main id="main">
        <Hero />
        <GuessSequence />
        <ClueReveal />
        <CompanyReveal />
        <ProductDemo />
        <Rewards />
        <GlobalCommunity />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
