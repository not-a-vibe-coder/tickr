import type { Sector } from './companies'

/**
 * Sector + display name for common US tickers. Used to:
 *  - mark a guess 🟨 "same sector" for any Robinhood Stock Token we know the sector of
 *  - name tokens when the live asset list is unavailable (local dev / mock market)
 * The live token universe itself comes from Robinhood's /rhj/assets API.
 */
export const UNIVERSE: [symbol: string, name: string, sector: Sector][] = [
  ['AAPL', 'Apple', 'Technology'], ['MSFT', 'Microsoft', 'Technology'], ['NVDA', 'NVIDIA', 'Technology'], ['AMD', 'Advanced Micro Devices', 'Technology'],
  ['INTC', 'Intel', 'Technology'], ['AVGO', 'Broadcom', 'Technology'], ['QCOM', 'Qualcomm', 'Technology'], ['TXN', 'Texas Instruments', 'Technology'],
  ['MU', 'Micron Technology', 'Technology'], ['ARM', 'Arm Holdings', 'Technology'], ['TSM', 'Taiwan Semiconductor', 'Technology'], ['ASML', 'ASML', 'Technology'],
  ['SMCI', 'Super Micro Computer', 'Technology'], ['DELL', 'Dell Technologies', 'Technology'], ['HPQ', 'HP', 'Technology'], ['IBM', 'IBM', 'Technology'],
  ['ORCL', 'Oracle', 'Technology'], ['CRM', 'Salesforce', 'Technology'], ['ADBE', 'Adobe', 'Technology'], ['NOW', 'ServiceNow', 'Technology'],
  ['INTU', 'Intuit', 'Technology'], ['PLTR', 'Palantir', 'Technology'], ['SNOW', 'Snowflake', 'Technology'], ['CRWD', 'CrowdStrike', 'Technology'],
  ['PANW', 'Palo Alto Networks', 'Technology'], ['NET', 'Cloudflare', 'Technology'], ['DDOG', 'Datadog', 'Technology'], ['SHOP', 'Shopify', 'Technology'],
  ['ZM', 'Zoom', 'Technology'], ['MSTR', 'Strategy (MicroStrategy)', 'Technology'], ['APLD', 'Applied Digital', 'Technology'], ['IONQ', 'IonQ', 'Technology'],
  ['RGTI', 'Rigetti Computing', 'Technology'], ['U', 'Unity Software', 'Technology'], ['PATH', 'UiPath', 'Technology'], ['SOUN', 'SoundHound AI', 'Technology'],
  ['GOOGL', 'Alphabet (Google)', 'Communication'], ['GOOG', 'Alphabet Class C', 'Communication'], ['META', 'Meta Platforms', 'Communication'], ['NFLX', 'Netflix', 'Communication'],
  ['DIS', 'Walt Disney', 'Communication'], ['SPOT', 'Spotify', 'Communication'], ['RDDT', 'Reddit', 'Communication'], ['SNAP', 'Snap', 'Communication'],
  ['PINS', 'Pinterest', 'Communication'], ['RBLX', 'Roblox', 'Communication'], ['T', 'AT&T', 'Communication'], ['VZ', 'Verizon', 'Communication'],
  ['TMUS', 'T-Mobile US', 'Communication'], ['CMCSA', 'Comcast', 'Communication'], ['WBD', 'Warner Bros. Discovery', 'Communication'], ['EA', 'Electronic Arts', 'Communication'],
  ['TTWO', 'Take-Two Interactive', 'Communication'], ['GME', 'GameStop', 'Consumer Discretionary'], ['AMC', 'AMC Entertainment', 'Communication'],
  ['AMZN', 'Amazon', 'Consumer Discretionary'], ['TSLA', 'Tesla', 'Consumer Discretionary'], ['HD', 'Home Depot', 'Consumer Discretionary'], ['NKE', 'Nike', 'Consumer Discretionary'],
  ['MCD', "McDonald's", 'Consumer Discretionary'], ['SBUX', 'Starbucks', 'Consumer Discretionary'], ['CMG', 'Chipotle', 'Consumer Discretionary'], ['LULU', 'Lululemon', 'Consumer Discretionary'],
  ['ABNB', 'Airbnb', 'Consumer Discretionary'], ['BKNG', 'Booking Holdings', 'Consumer Discretionary'], ['UBER', 'Uber', 'Industrials'], ['LYFT', 'Lyft', 'Industrials'],
  ['DASH', 'DoorDash', 'Consumer Discretionary'], ['RIVN', 'Rivian', 'Consumer Discretionary'], ['LCID', 'Lucid Group', 'Consumer Discretionary'], ['F', 'Ford', 'Consumer Discretionary'],
  ['GM', 'General Motors', 'Consumer Discretionary'], ['TGT', 'Target', 'Consumer Staples'], ['CCL', 'Carnival', 'Consumer Discretionary'], ['MAR', 'Marriott', 'Consumer Discretionary'],
  ['CHWY', 'Chewy', 'Consumer Discretionary'], ['ETSY', 'Etsy', 'Consumer Discretionary'], ['EBAY', 'eBay', 'Consumer Discretionary'], ['BABA', 'Alibaba', 'Consumer Discretionary'],
  ['PDD', 'PDD Holdings', 'Consumer Discretionary'], ['MELI', 'MercadoLibre', 'Consumer Discretionary'], ['NIO', 'NIO', 'Consumer Discretionary'],
  ['WMT', 'Walmart', 'Consumer Staples'], ['COST', 'Costco', 'Consumer Staples'], ['KO', 'Coca-Cola', 'Consumer Staples'], ['PEP', 'PepsiCo', 'Consumer Staples'],
  ['PG', 'Procter & Gamble', 'Consumer Staples'], ['PM', 'Philip Morris', 'Consumer Staples'], ['MO', 'Altria', 'Consumer Staples'], ['CELH', 'Celsius', 'Consumer Staples'],
  ['JPM', 'JPMorgan Chase', 'Financials'], ['BAC', 'Bank of America', 'Financials'], ['WFC', 'Wells Fargo', 'Financials'], ['C', 'Citigroup', 'Financials'],
  ['GS', 'Goldman Sachs', 'Financials'], ['MS', 'Morgan Stanley', 'Financials'], ['SCHW', 'Charles Schwab', 'Financials'], ['V', 'Visa', 'Financials'],
  ['MA', 'Mastercard', 'Financials'], ['AXP', 'American Express', 'Financials'], ['PYPL', 'PayPal', 'Financials'], ['XYZ', 'Block', 'Financials'],
  ['COIN', 'Coinbase', 'Financials'], ['HOOD', 'Robinhood Markets', 'Financials'], ['SOFI', 'SoFi', 'Financials'], ['AFRM', 'Affirm', 'Financials'],
  ['BRK.B', 'Berkshire Hathaway', 'Financials'], ['BLK', 'BlackRock', 'Financials'], ['UPST', 'Upstart', 'Financials'], ['CRCL', 'Circle', 'Financials'],
  ['UNH', 'UnitedHealth', 'Healthcare'], ['JNJ', 'Johnson & Johnson', 'Healthcare'], ['LLY', 'Eli Lilly', 'Healthcare'], ['PFE', 'Pfizer', 'Healthcare'],
  ['MRK', 'Merck', 'Healthcare'], ['ABBV', 'AbbVie', 'Healthcare'], ['NVO', 'Novo Nordisk', 'Healthcare'], ['MRNA', 'Moderna', 'Healthcare'],
  ['HIMS', 'Hims & Hers', 'Healthcare'], ['ISRG', 'Intuitive Surgical', 'Healthcare'], ['TMO', 'Thermo Fisher', 'Healthcare'], ['AMGN', 'Amgen', 'Healthcare'],
  ['BA', 'Boeing', 'Industrials'], ['CAT', 'Caterpillar', 'Industrials'], ['GE', 'GE Aerospace', 'Industrials'], ['LMT', 'Lockheed Martin', 'Industrials'],
  ['RTX', 'RTX', 'Industrials'], ['UPS', 'UPS', 'Industrials'], ['FDX', 'FedEx', 'Industrials'], ['DAL', 'Delta Air Lines', 'Industrials'],
  ['UAL', 'United Airlines', 'Industrials'], ['AAL', 'American Airlines', 'Industrials'], ['RKLB', 'Rocket Lab', 'Industrials'], ['JOBY', 'Joby Aviation', 'Industrials'],
  ['XOM', 'ExxonMobil', 'Energy'], ['CVX', 'Chevron', 'Energy'], ['OXY', 'Occidental Petroleum', 'Energy'], ['COP', 'ConocoPhillips', 'Energy'],
  ['OKLO', 'Oklo', 'Energy'], ['SMR', 'NuScale Power', 'Industrials'], ['ENPH', 'Enphase Energy', 'Technology'], ['FSLR', 'First Solar', 'Technology'],
]

export const SECTOR_OF: Record<string, Sector> = Object.fromEntries(UNIVERSE.map(([s, , sec]) => [s, sec]))
