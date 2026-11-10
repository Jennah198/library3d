import { Hono } from 'hono'
import { z } from 'zod'
import { hashPassword, issueToken, requireAuth, verifyPassword } from '../auth.js'
import { db } from '../db.js'
import { httpError, parseJson, type AppEnv } from '../http.js'

export const authRoutes = new Hono<AppEnv>()

const credentials = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[A-Za-z0-9_.-]+$/, 'Use letters, numbers, dot, dash or underscore'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

authRoutes.post('/auth/register', async (c) => {
  const { username, password } = await parseJson(c, credentials)
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)
  if (exists) throw httpError(409, 'That username is taken')
  const res = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hashPassword(password))
  const id = Number(res.lastInsertRowid)
  return c.json({ token: await issueToken(id), user: { id, username } }, 201)
})

authRoutes.post('/auth/login', async (c) => {
  const { username, password } = await parseJson(c, credentials)
  const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined
  // Same error for unknown user and wrong password.
  if (!row || !verifyPassword(password, row.password_hash)) throw httpError(401, 'Wrong username or password')
  return c.json({ token: await issueToken(row.id), user: { id: row.id, username: row.username } })
})

authRoutes.get('/me', requireAuth, (c) => {
  const row = db.prepare('SELECT id, username FROM users WHERE id = ?').get(c.get('userId')) as
    | { id: number; username: string }
    | undefined
  if (!row) throw httpError(401, 'Account no longer exists')
  return c.json({ user: row })
})
