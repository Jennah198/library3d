import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { MiddlewareHandler } from 'hono'
import { sign, verify } from 'hono/jwt'
import { httpError, type AppEnv } from './http.js'

const DEV_SECRET = 'dev-only-secret-change-me'
const secret = process.env.JWT_SECRET ?? DEV_SECRET
if (secret === DEV_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

export function issueToken(userId: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  return sign({ sub: String(userId), exp }, secret, 'HS256')
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw httpError(401, 'Sign in required')
  try {
    const payload = await verify(token, secret, 'HS256')
    c.set('userId', Number(payload.sub))
  } catch {
    throw httpError(401, 'Session expired, please sign in again')
  }
  await next()
}
