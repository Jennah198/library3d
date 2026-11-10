import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { langInfo, yearLabel } from '../lang'
import { useStore } from '../store'
import type { Book, Facets } from '../types'

const PAGE = 30

/** Plain, accessible catalogue: search, filter, save. Works without WebGL. */
export function ListView() {
  const shelves = useStore((s) => s.shelves)
  const user = useStore((s) => s.user)
  const library = useStore((s) => s.library)
  const initialQuery = useStore((s) => s.listQuery)
  const { save, unsave, focusBook, focusSaved, setView, setAuthOpen } = useStore.getState()

  const [tab, setTab] = useState<'public' | 'mine'>('public')
  const [q, setQ] = useState(initialQuery)
  const [shelf, setShelf] = useState('')
  const [language, setLanguage] = useState('')
  const [author, setAuthor] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState<'year' | 'title' | 'author'>('year')
  const [facets, setFacets] = useState<Facets | null>(null)
  const [items, setItems] = useState<Book[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const savedIds = useMemo(() => new Set(library.map((i) => i.id)), [library])

  useEffect(() => {
    api.facets(shelf || undefined).then(setFacets, () => setFacets(null))
    setLanguage('')
    setAuthor('')
    setYear('')
  }, [shelf])

  useEffect(() => {
    if (tab !== 'public') return
    let stale = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const r = await api.books({
          q: q.trim() || undefined,
          shelf: shelf || undefined,
          language: language || undefined,
          author: author || undefined,
          year: year ? Number(year) : undefined,
          sort,
          limit: PAGE,
          offset: 0,
        })
        if (stale) return
        setItems(r.items)
        setTotal(r.total)
        setOffset(r.items.length)
        setError(null)
      } catch (e) {
        if (!stale) setError(e instanceof Error ? e.message : 'Could not load books')
      } finally {
        if (!stale) setLoading(false)
      }
    }, 200)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [tab, q, shelf, language, author, year, sort])

  const loadMore = async () => {
    setLoading(true)
    try {
      const r = await api.books({
        q: q.trim() || undefined,
        shelf: shelf || undefined,
        language: language || undefined,
        author: author || undefined,
        year: year ? Number(year) : undefined,
        sort,
        limit: PAGE,
        offset,
      })
      setItems((prev) => [...prev, ...r.items])
      setOffset((o) => o + r.items.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more')
    } finally {
      setLoading(false)
    }
  }

  const mine = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return library.filter((i) => !needle || i.title.toLowerCase().includes(needle) || i.author.toLowerCase().includes(needle))
  }, [library, q])

  const rows: Book[] = tab === 'public' ? items : mine

  return (
    <main className="list-view">
      <div className="list-inner">
        <div className="list-head">
          <h1>Catalogue</h1>
          <div className="seg" role="tablist">
            <button role="tab" aria-selected={tab === 'public'} className={tab === 'public' ? 'on' : ''} onClick={() => setTab('public')}>
              Public library
            </button>
            <button
              role="tab"
              aria-selected={tab === 'mine'}
              className={tab === 'mine' ? 'on' : ''}
              onClick={() => (user ? setTab('mine') : setAuthOpen(true))}
            >
              My library{user ? ` (${library.length})` : ''}
            </button>
          </div>
        </div>

        <div className="filters">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or author…" aria-label="Search" />
          {tab === 'public' && (
            <>
              <select value={shelf} onChange={(e) => setShelf(e.target.value)} aria-label="Shelf">
                <option value="">All shelves</option>
                {shelves.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.title}</option>
                ))}
              </select>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
                <option value="">All languages</option>
                {facets?.languages.map((l) => (
                  <option key={l.code} value={l.code}>{langInfo(l.code).native} ({l.count})</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
                <option value="">Any year</option>
                {facets?.years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Author">
                <option value="">Any author</option>
                {facets?.authors.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort by">
                <option value="year">By language &amp; year</option>
                <option value="author">By author</option>
                <option value="title">By title</option>
              </select>
            </>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        <p className="muted count" aria-live="polite">
          {tab === 'public' ? (loading && items.length === 0 ? 'Loading…' : `${total} book${total === 1 ? '' : 's'}`) : `${mine.length} saved`}
        </p>

        <ul className="books">
          {rows.map((b) => {
            const saved = savedIds.has(b.id)
            return (
              <li key={b.id} className="book-row">
                <span className="swatch" style={{ background: b.coverColor }} />
                <div className="grow">
                  <div className="t" dir="auto">{b.title}</div>
                  <div className="m">
                    <bdi>{b.author}</bdi> · {yearLabel(b.year)} · <bdi>{langInfo(b.language).native}</bdi> · {b.shelfTitle}
                    {'collection' in b && <> · <i>{(b as { collection: string }).collection}</i></>}
                  </div>
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    if (tab === 'mine') {
                      const item = library.find((i) => i.id === b.id)
                      if (item) void focusSaved(item)
                    } else void focusBook(b)
                  }}
                >
                  Show in 3D
                </button>
                <button className={`btn ${saved ? '' : 'primary'}`} onClick={() => (saved ? void unsave(b.id) : void save(b))}>
                  {saved ? '★ Remove' : '☆ Save'}
                </button>
              </li>
            )
          })}
        </ul>

        {tab === 'public' && items.length < total && (
          <button className="btn more" disabled={loading} onClick={() => void loadMore()}>
            {loading ? 'Loading…' : `Show more (${total - items.length} left)`}
          </button>
        )}
        {tab === 'mine' && mine.length === 0 && <p className="muted pad">Nothing saved yet. Browse the public library and press Save.</p>}
        <p className="muted small foot">
          Prefer to wander? <button className="link" onClick={() => setView('3d')}>Return to the 3D library</button>
        </p>
      </div>
    </main>
  )
}
