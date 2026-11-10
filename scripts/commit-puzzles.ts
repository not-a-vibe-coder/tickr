/** Commit answer hashes for today + the next N days (default 7). Usage: npm run commit -- 14 */
import { commitUpcoming } from '../server/handlers.ts'

const n = Number(process.argv[2] ?? 7)
const r = await commitUpcoming(n)
console.log(r.committed.length ? `committed days ${r.committed.join(', ')}${'tx' in r ? ` (tx ${r.tx})` : ''}` : 'all upcoming days already committed')
