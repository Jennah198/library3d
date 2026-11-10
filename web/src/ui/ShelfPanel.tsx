import { useMemo, useState } from 'react'
import { langInfo } from '../lang'
import { PERSONAL_PREFIX, useStore } from '../store'
import { groupBooks, type GroupBy } from '../util'
import type { Book } from '../types'

/** Right-hand panel listing the open shelf as language > year > author (or author > year). */
export function ShelfPanel() {
  const active = useStore((s) => s.activeShelf)
  const shelves = useStore((s) => s.shelves)
  const shelfBooks = useStore((s) => s.shelfBooks)
  const library = useStore((s) => s.library)
  const sortBy = useStore((s) => s.sortBy)
  const setSortBy = useStore((s) => s.setSortBy)
  const selected = useStore((s) => s.selectedBook)
  const setActive = useStore((s) => s.setActiveShelf)
  const pickBook = useStore((s) => s.pickBook)
  const setHover = useStore((s) => s.setHoverBook)
  const [filter, setFilter] = useState('')

  const personal = active?.startsWith(PERSONAL_PREFIX) ?? false
  const shelf = !personal ? shelves.find((s) => s.slug === active) : undefined
  const title = personal ? active!.slice(PERSONAL_PREFIX.length) : shelf?.title
  const books: Book[] | undefined = personal
    ? library.filter((i) => `${PERSONAL_PREFIX}${i.collection}` === active)
    : active
      ? shelfBooks[active]
      : undefined
  const savedIds = useMemo(() => new Set(library.map((i) => i.id)), [library])

  const needle = filter.trim().toLowerCase()
  const visible = useMemo(
    () => (books ?? []).filter((b) => !needle || b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle)),
    [books, needle],
  )
  const tree = useMemo(() => groupBooks(visible, sortBy as GroupBy), [visible, sortBy])

  if (!active || !title) return null

  return (
    <aside className="panel shelf-panel" aria-label={`${title} shelf`}>
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {shelf && (
            <p className="native">
              <span lang="am">{shelf.titleAm}</span> · <span lang="ar" dir="rtl">{shelf.titleAr}</span>
            </p>
          )}
        </div>
        <button className="icon" aria-label="Close shelf" onClick={() => setActive(null)}>
          ×
        </button>
      </header>
      {shelf && <p className="muted">{shelf.description}</p>}

      <div className="panel-tools">
        <div className="seg" role="group" aria-label="Group books by">
          <button className={sortBy === 'year' ? 'on' : ''} onClick={() => setSortBy('year')}>
            Year › Author
          </button>
          <button className={sortBy === 'author' ? 'on' : ''} onClick={() => setSortBy('author')}>
            Author › Year
          </button>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter this shelf…"
          aria-label="Filter books on this shelf"
        />
      </div>

      <div className="tree">
        {!books && <p className="muted pad">Loading books…</p>}
        {books && books.length === 0 && <p className="muted pad">Nothing here yet.</p>}
        {books && books.length > 0 && visible.length === 0 && <p className="muted pad">No books match your filter.</p>}
        {tree.map((lang) => {
          const info = langInfo(lang.code)
          return (
            <section key={lang.code} className="lang">
              <h3 dir={info.dir}>
                <span>{info.native}</span>
                {info.native !== info.name && <small>{info.name}</small>}
                <em>{lang.count}</em>
              </h3>
              {lang.groups.map((g) => (
                <div key={g.label} className="group">
                  <h4 dir="auto">{g.label}</h4>
                  {g.sections.map((sec) => (
                    <div key={sec.label} className="section">
                      <h5 dir="auto">{sec.label}</h5>
                      {sec.books.map((b) => (
                        <button
                          key={b.id}
                          className={`row ${selected?.id === b.id ? 'on' : ''}`}
                          onClick={() => pickBook(active, b)}
                          onMouseEnter={() => setHover(b)}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover(b)}
                          onBlur={() => setHover(null)}
                        >
                          <span className="swatch" style={{ background: b.coverColor }} />
                          <span dir="auto" className="grow">{b.title}</span>
                          {savedIds.has(b.id) && <span className="star" title="In your library" aria-label="In your library">★</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )
        })}
      </div>
    </aside>
  )
}
