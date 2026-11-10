import * as h from '../server/handlers.js'

export function GET(req: Request) {
  void req
  return h.run(() => h.activity())
}
