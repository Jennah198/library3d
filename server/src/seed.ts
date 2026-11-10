import { pathToFileURL } from 'node:url'
import { db } from './db.js'
import { books, shelves } from './seed-data.js'

const COVER_PALETTE = ['#7b2d26', '#2f4858', '#3b5b3a', '#8a5a2b', '#4a3b6b', '#a36a1f', '#1f4e5f', '#6b2d4f', '#5b4636', '#365e57']

function colorFor(title: string): string {
  let h = 0
  for (const ch of title) h = (Math.imul(h, 31) + ch.codePointAt(0)!) | 0
  return COVER_PALETTE[Math.abs(h) % COVER_PALETTE.length]!
}

/** Inserts the demo catalog. Does nothing if books already exist, unless force is set. */
export function seed({ force = false } = {}): boolean {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM books').get() as { n: number }
  if (n > 0 && !force) return false

  db.exec('BEGIN')
  try {
    if (force) {
      db.exec('DELETE FROM library_items; DELETE FROM books; DELETE FROM shelves;')
    }
    const insertShelf = db.prepare(
      `INSERT INTO shelves (slug, title, title_ar, title_am, description, color, x, z, rotation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    const shelfIds = new Map<string, number>()
    for (const s of shelves) {
      const res = insertShelf.run(s.slug, s.title, s.titleAr, s.titleAm, s.description, s.color, s.x, s.z, s.rotation)
      shelfIds.set(s.slug, Number(res.lastInsertRowid))
    }

    const insertBook = db.prepare(
      `INSERT INTO books (shelf_id, title, author, language, year, description, cover_color, sample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const [shelf, language, year, author, title, sample] of books) {
      const shelfId = shelfIds.get(shelf)
      if (!shelfId) throw new Error(`Unknown shelf "${shelf}" for book "${title}"`)
      const description = sample ? 'Placeholder record used to demonstrate this shelf. Replace it with real catalog data.' : ''
      insertBook.run(shelfId, title, author, language, year, description, colorFor(title), sample ? 1 : 0)
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return true
}

// `npm run seed` (add `-- --force` to wipe and reseed; this also deletes saved library items)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const force = process.argv.includes('--force')
  const did = seed({ force })
  console.log(did ? `Seeded ${shelves.length} shelves and ${books.length} books.` : 'Catalog already has books; use --force to reseed.')
}
