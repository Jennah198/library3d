import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authRoutes } from './routes/auth.js'
import { catalog } from './routes/catalog.js'
import { libraryRoutes } from './routes/library.js'

export const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())
app.use('/api/*', cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }))

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api', catalog)
app.route('/api', authRoutes)
app.route('/api', libraryRoutes)

app.notFound((c) => c.json({ error: 'Not found' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})
