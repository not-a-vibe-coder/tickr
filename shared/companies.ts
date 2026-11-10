/** Every company a player can guess, with the facts used as clues. Shared by client and server. */

export type Sector =
  | 'Technology'
  | 'Communication'
  | 'Consumer Discretionary'
  | 'Consumer Staples'
  | 'Financials'
  | 'Healthcare'
  | 'Industrials'
  | 'Energy'

export type CompanyInfo = {
  ticker: string
  name: string
  sector: Sector
  industry: string
  hq: string
  founded: number
}

export const COMPANIES: CompanyInfo[] = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology', industry: 'Consumer Electronics', hq: 'Cupertino, California', founded: 1976 },
  { ticker: 'ABNB', name: 'Airbnb', sector: 'Consumer Discretionary', industry: 'Travel & Lodging Platform', hq: 'San Francisco, California', founded: 2008 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors', hq: 'Santa Clara, California', founded: 1969 },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer Discretionary', industry: 'E-commerce & Cloud', hq: 'Seattle, Washington', founded: 1994 },
  { ticker: 'CCL', name: 'Carnival', sector: 'Consumer Discretionary', industry: 'Cruise Lines', hq: 'Miami, Florida', founded: 1972 },
  { ticker: 'COST', name: 'Costco', sector: 'Consumer Staples', industry: 'Warehouse Retail', hq: 'Issaquah, Washington', founded: 1983 },
  { ticker: 'DAL', name: 'Delta Air Lines', sector: 'Industrials', industry: 'Airlines', hq: 'Atlanta, Georgia', founded: 1925 },
  { ticker: 'DIS', name: 'Walt Disney', sector: 'Communication', industry: 'Entertainment & Media', hq: 'Burbank, California', founded: 1923 },
  { ticker: 'GOOGL', name: 'Alphabet (Google)', sector: 'Communication', industry: 'Internet Search & Ads', hq: 'Mountain View, California', founded: 1998 },
  { ticker: 'HOOD', name: 'Robinhood Markets', sector: 'Financials', industry: 'Retail Brokerage', hq: 'Menlo Park, California', founded: 2013 },
  { ticker: 'IBM', name: 'IBM', sector: 'Technology', industry: 'IT Services & Software', hq: 'Armonk, New York', founded: 1911 },
  { ticker: 'INTC', name: 'Intel', sector: 'Technology', industry: 'Semiconductors', hq: 'Santa Clara, California', founded: 1968 },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', industry: 'Banking', hq: 'New York, New York', founded: 1799 },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'Consumer Staples', industry: 'Beverages', hq: 'Atlanta, Georgia', founded: 1892 },
  { ticker: 'MCD', name: "McDonald's", sector: 'Consumer Discretionary', industry: 'Restaurants', hq: 'Chicago, Illinois', founded: 1940 },
  { ticker: 'META', name: 'Meta Platforms (Facebook)', sector: 'Communication', industry: 'Social Media', hq: 'Menlo Park, California', founded: 2004 },
  { ticker: 'MRNA', name: 'Moderna', sector: 'Healthcare', industry: 'Biotechnology', hq: 'Cambridge, Massachusetts', founded: 2010 },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', industry: 'Software & Cloud', hq: 'Redmond, Washington', founded: 1975 },
  { ticker: 'NFLX', name: 'Netflix', sector: 'Communication', industry: 'Streaming Entertainment', hq: 'Los Gatos, California', founded: 1997 },
  { ticker: 'NKE', name: 'Nike', sector: 'Consumer Discretionary', industry: 'Footwear & Apparel', hq: 'Beaverton, Oregon', founded: 1964 },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', industry: 'Semiconductors', hq: 'Santa Clara, California', founded: 1993 },
  { ticker: 'PFE', name: 'Pfizer', sector: 'Healthcare', industry: 'Pharmaceuticals', hq: 'New York, New York', founded: 1849 },
  { ticker: 'PLTR', name: 'Palantir', sector: 'Technology', industry: 'Data Analytics Software', hq: 'Denver, Colorado', founded: 2003 },
  { ticker: 'PYPL', name: 'PayPal', sector: 'Financials', industry: 'Digital Payments', hq: 'San Jose, California', founded: 1998 },
  { ticker: 'SBUX', name: 'Starbucks', sector: 'Consumer Discretionary', industry: 'Coffee Chains', hq: 'Seattle, Washington', founded: 1971 },
  { ticker: 'SHOP', name: 'Shopify', sector: 'Technology', industry: 'E-commerce Software', hq: 'Ottawa, Canada', founded: 2006 },
  { ticker: 'SPOT', name: 'Spotify', sector: 'Communication', industry: 'Music Streaming', hq: 'Stockholm, Sweden', founded: 2006 },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Discretionary', industry: 'Electric Vehicles', hq: 'Austin, Texas', founded: 2003 },
  { ticker: 'V', name: 'Visa', sector: 'Financials', industry: 'Payment Networks', hq: 'San Francisco, California', founded: 1958 },
  { ticker: 'WMT', name: 'Walmart', sector: 'Consumer Staples', industry: 'Retail', hq: 'Bentonville, Arkansas', founded: 1962 },
  { ticker: 'ZM', name: 'Zoom', sector: 'Technology', industry: 'Video Communications Software', hq: 'San Jose, California', founded: 2011 },
]

export const companyByTicker = (t: string) => COMPANIES.find((c) => c.ticker === t.toUpperCase())

export type GuessResult = 'miss' | 'warm' | 'hit'

export const CLUE_LABELS = ['Sector', 'Chart year', 'Industry', 'Founded', 'Headquarters'] as const

export function clueFor(c: CompanyInfo, year: number, i: number): { label: string; value: string } {
  const values = [c.sector, String(year), c.industry, String(c.founded), c.hq]
  return { label: CLUE_LABELS[i], value: values[i] }
}

export function evaluateGuess(guess: CompanyInfo, answer: CompanyInfo): GuessResult {
  if (guess.ticker === answer.ticker) return 'hit'
  return guess.sector === answer.sector ? 'warm' : 'miss'
}

export const MAX_GUESSES = 6
