import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db.js'
import { httpError, parseQuery } from '../http.js'
import { BOOK_COLS, BOOK_FROM, LANG_ORDER_SQL, SHELF_ORDER_SQL, listShelves, sortLangs, toBook } from '../queries.js'

export const catalog = new Hono()

type Param = string | number

catalog.get('/shelves', (c) => c.json(listShelves()))

catalog.get('/shelves/:slug', (c) => {
  const slug = c.req.param('slug')
  const [shelf] = listShelves(slug)
  if (!shelf) throw httpError(404, 'Shelf not found')
  // Already ordered language -> year -> author -> title, which is the physical order on the shelf.
  const rows = db
    .prepare(`SELECT ${BOOK_COLS} ${BOOK_FROM} WHERE s.slug = ? ORDER BY ${SHELF_ORDER_SQL}`)
    .all(slug) as Record<string, unknown>[]
  return c.json({ shelf, books: rows.map(toBook) })
})

const booksQuery = z.object({
  q: z.string().trim().max(100).optional(),
  shelf: z.string().max(50).optional(),
  language: z.string().min(2).max(3).optional(),
  author: z.string().max(100).optional(),
  year: z.coerce.number().int().optional(),
  sort: z.enum(['year', 'title', 'author']).default('year'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
})

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`

catalog.get('/books', (c) => {
  const f = parseQuery(c, booksQuery)
  const where: string[] = []
  const params: Param[] = []
  if (f.q) {
    where.push(`(b.title LIKE ? ESCAPE '\\' OR b.author LIKE ? ESCAPE '\\' OR b.description LIKE ? ESCAPE '\\')`)
    const p = likePattern(f.q)
    params.push(p, p, p)
  }
  if (f.shelf) (where.push('s.slug = ?'), params.push(f.shelf))
  if (f.language) (where.push('b.language = ?'), params.push(f.language))
  if (f.author) (where.push('b.author = ?'), params.push(f.author))
  if (f.year !== undefined) (where.push('b.year = ?'), params.push(f.year))
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const order = {
    year: `${LANG_ORDER_SQL}, b.year IS NULL, b.year, b.author COLLATE NOCASE, b.title COLLATE NOCASE`,
    author: `b.author COLLATE NOCASE, b.year IS NULL, b.year, b.title COLLATE NOCASE`,
    title: `b.title COLLATE NOCASE`,
  }[f.sort]

  const { total } = db.prepare(`SELECT COUNT(*) AS total ${BOOK_FROM} ${clause}`).get(...params) as { total: number }
  const rows = db
    .prepare(`SELECT ${BOOK_COLS} ${BOOK_FROM} ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, f.limit, f.offset) as Record<string, unknown>[]
  return c.json({ items: rows.map(toBook), total })
})

catalog.get('/books/:id', (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) throw httpError(400, 'Invalid book id')
  const row = db.prepare(`SELECT ${BOOK_COLS} ${BOOK_FROM} WHERE b.id = ?`).get(id) as Record<string, unknown> | undefined
  if (!row) throw httpError(404, 'Book not found')
  return c.json(toBook(row))
})

/** Values available for filtering, optionally scoped to one shelf. */
catalog.get('/facets', (c) => {
  const shelf = c.req.query('shelf')
  const scope = shelf ? 'WHERE s.slug = ?' : ''
  const scoped = (extra: string) => (shelf ? `WHERE s.slug = ? AND ${extra}` : `WHERE ${extra}`)
  const params = shelf ? [shelf] : []

  const languages = db
    .prepare(`SELECT b.language AS code, COUNT(*) AS count ${BOOK_FROM} ${scope} GROUP BY b.language`)
    .all(...params) as { code: string; count: number }[]
  const years = db
    .prepare(`SELECT DISTINCT b.year AS year ${BOOK_FROM} ${scoped('b.year IS NOT NULL')} ORDER BY b.year`)
    .all(...params) as { year: number }[]
  const authors = db
    .prepare(`SELECT DISTINCT b.author AS author ${BOOK_FROM} ${scope} ORDER BY b.author COLLATE NOCASE`)
    .all(...params) as { author: string }[]

  const codes = sortLangs(languages.map((l) => l.code))
  return c.json({
    languages: codes.map((code) => ({ code, count: languages.find((l) => l.code === code)!.count })),
    years: years.map((y) => y.year),
    authors: authors.map((a) => a.author),
  })
})
