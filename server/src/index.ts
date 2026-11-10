import { existsSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from './app.js'
import { seed } from './seed.js'

if (seed()) console.log('Empty catalog: seeded the demo shelves and books.')

// In production the built web app is served from this same process.
const webDist = resolve(process.env.WEB_DIST ?? '../web/dist')
if (existsSync(webDist)) {
  const rel = relative(process.cwd(), webDist) || '.'
  app.use('/*', serveStatic({ root: rel }))
  app.get('*', serveStatic({ path: `${rel}/index.html` }))
}

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Library API listening on http://localhost:${info.port}`)
})
