import * as h from '../server/handlers.js'

export function POST(req: Request) {
  return h.run(() => h.claim(req))
}
