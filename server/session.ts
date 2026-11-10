import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { env } from './env.js'

/**
 * Stateless game session. The server never stores games: the client carries this
 * encrypted + authenticated token (AES-256-GCM) and every guess returns a fresh one.
 * The client can't read which puzzle it refers to, nor forge guesses.
 */
export type Session = {
  v: 1
  mode: 'daily' | 'practice'
  /** daily: epoch day. practice: pool index. */
  ref: number
  player?: string
  guesses: string[]
  iat: number
}

const key = () => createHash('sha256').update(`tickr-session:${env.secret}`).digest()

export function encodeSession(s: Session) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(JSON.stringify(s)), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url')
}

export function decodeSession(token: string): Session | null {
  try {
    const raw = Buffer.from(token, 'base64url')
    const d = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12))
    d.setAuthTag(raw.subarray(12, 28))
    const s = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString()) as Session
    return s.v === 1 ? s : null
  } catch {
    return null
  }
}
