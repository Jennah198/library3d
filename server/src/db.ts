import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const dbPath = process.env.DATABASE_PATH ?? './data/library.db'
if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true })

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS shelves (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  title_ar    TEXT NOT NULL DEFAULT '',
  title_am    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#8b5a2b',
  x           REAL NOT NULL,
  z           REAL NOT NULL,
  rotation    REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS books (
  id          INTEGER PRIMARY KEY,
  shelf_id    INTEGER NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  language    TEXT NOT NULL,
  year        INTEGER,
  description TEXT NOT NULL DEFAULT '',
  cover_color TEXT NOT NULL,
  read_url    TEXT,
  sample      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_books_shelf ON books(shelf_id, language, year, author);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS library_items (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  collection TEXT NOT NULL DEFAULT 'Saved',
  notes      TEXT NOT NULL DEFAULT '',
  saved_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, book_id)
);
`)
