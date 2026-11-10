import { db } from './db.js'

export const LANG_ORDER = ['en', 'ar', 'am']

/** SQL fragment ordering rows by language tier (English, Arabic, Amharic, others). */
export const LANG_ORDER_SQL = `CASE b.language WHEN 'en' THEN 0 WHEN 'ar' THEN 1 WHEN 'am' THEN 2 ELSE 3 END`

/** Default shelf ordering: language -> year -> author -> title. Unknown years go last. */
export const SHELF_ORDER_SQL = `${LANG_ORDER_SQL}, b.year IS NULL, b.year, b.author COLLATE NOCASE, b.title COLLATE NOCASE`

export const BOOK_COLS = `
  b.id, b.title, b.author, b.language, b.year, b.description,
  b.cover_color AS coverColor, b.read_url AS readUrl, b.sample,
  s.slug AS shelfSlug, s.title AS shelfTitle`

export const BOOK_FROM = `FROM books b JOIN shelves s ON s.id = b.shelf_id`

type Row = Record<string, unknown>

export interface BookDto {
  id: number
  title: string
  author: string
  language: string
  year: number | null
  description: string
  coverColor: string
  readUrl: string | null
  sample: boolean
  shelfSlug: string
  shelfTitle: string
}

export function toBook(row: Row): BookDto {
  return { ...(row as unknown as BookDto), sample: row.sample === 1 }
}

export function sortLangs(codes: string[]): string[] {
  const rank = (c: string) => (LANG_ORDER.includes(c) ? LANG_ORDER.indexOf(c) : LANG_ORDER.length)
  return [...codes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export function listShelves(slug?: string) {
  const rows = db
    .prepare(
      `SELECT s.id, s.slug, s.title, s.title_ar AS titleAr, s.title_am AS titleAm,
              s.description, s.color, s.x, s.z, s.rotation,
              COUNT(b.id) AS bookCount,
              COALESCE(GROUP_CONCAT(DISTINCT b.language), '') AS languages
       FROM shelves s LEFT JOIN books b ON b.shelf_id = s.id
       ${slug ? 'WHERE s.slug = ?' : ''}
       GROUP BY s.id ORDER BY s.id`,
    )
    .all(...(slug ? [slug] : [])) as Row[]
  return rows.map((r) => ({ ...r, languages: sortLangs(String(r.languages).split(',').filter(Boolean)) }))
}
