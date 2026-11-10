import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../auth.js'
import { db } from '../db.js'
import { httpError, parseJson, type AppEnv } from '../http.js'
import { BOOK_COLS, BOOK_FROM, toBook } from '../queries.js'

/** Personal library: every route needs a signed-in user and only touches that user's rows. */
export const libraryRoutes = new Hono<AppEnv>()
libraryRoutes.use('*', requireAuth)

const MAX_COLLECTIONS = 6
const DEFAULT_COLLECTION = 'Saved'

const itemBody = z.object({
  collection: z.string().trim().min(1).max(40).optional(),
  notes: z.string().max(2000).optional(),
})

function listItems(userId: number) {
  const rows = db
    .prepare(
      `SELECT ${BOOK_COLS}, li.collection, li.notes, li.saved_at AS savedAt
       FROM library_items li
       JOIN books b ON b.id = li.book_id
       JOIN shelves s ON s.id = b.shelf_id
       WHERE li.user_id = ?
       ORDER BY li.collection COLLATE NOCASE, li.saved_at DESC`,
    )
    .all(userId) as Record<string, unknown>[]
  return rows.map(toBook)
}

function bookId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id)) throw httpError(400, 'Invalid book id')
  return id
}

libraryRoutes.get('/library', (c) => c.json({ items: listItems(c.get('userId')) }))

/** Save a book (or change its collection / notes if already saved). */
libraryRoutes.put('/library/:bookId', async (c) => {
  const userId = c.get('userId')
  const id = bookId(c.req.param('bookId'))
  const body = await parseJson(c, itemBody)

  const book = db.prepare('SELECT 1 FROM books WHERE id = ?').get(id)
  if (!book) throw httpError(404, 'Book not found')

  if (body.collection) {
    const known = db
      .prepare('SELECT 1 FROM library_items WHERE user_id = ? AND collection = ? LIMIT 1')
      .get(userId, body.collection)
    if (!known) {
      const { n } = db
        .prepare('SELECT COUNT(DISTINCT collection) AS n FROM library_items WHERE user_id = ?')
        .get(userId) as { n: number }
      if (n >= MAX_COLLECTIONS) throw httpError(422, `You can have at most ${MAX_COLLECTIONS} collections`)
    }
  }

  db.prepare(
    `INSERT INTO library_items (user_id, book_id, collection, notes) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, book_id) DO UPDATE SET
       collection = COALESCE(?, collection),
       notes = COALESCE(?, notes)`,
  ).run(userId, id, body.collection ?? DEFAULT_COLLECTION, body.notes ?? '', body.collection ?? null, body.notes ?? null)

  const item = listItems(userId).find((i) => i.id === id)
  return c.json({ item })
})

libraryRoutes.delete('/library/:bookId', (c) => {
  const res = db
    .prepare('DELETE FROM library_items WHERE user_id = ? AND book_id = ?')
    .run(c.get('userId'), bookId(c.req.param('bookId')))
  if (res.changes === 0) throw httpError(404, 'That book is not in your library')
  return c.json({ ok: true })
})

// Referenced so the import stays explicit about the shared SQL fragments.
void BOOK_FROM
