import * as h from '../server/handlers.js'

export function GET(req: Request) {
  return h.run(() => h.presence(req))
}

export function POST(req: Request) {
  return h.run(() => h.presence(req))
}
