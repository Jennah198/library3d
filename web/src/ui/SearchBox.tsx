import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../api'
import { langInfo, yearLabel } from '../lang'
import { useStore } from '../store'
import type { Book } from '../types'

export function SearchBox() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Book[]>([])
  const [total, setTotal] = useState(0)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [error, setError] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const listId = useId()
  const focusBook = useStore((s) => s.focusBook)
  const setView = useStore((s) => s.setView)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setTotal(0)
      setError(false)
      return
    }
    let stale = false
    const timer = setTimeout(async () => {
      try {
        const r = await api.books({ q: term, limit: 8 })
        if (stale) return
        setResults(r.items)
        setTotal(r.total)
        setCursor(0)
        setError(false)
      } catch {
        if (!stale) setError(true)
      }
    }, 220)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [q])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const choose = (book: Book) => {
    setOpen(false)
    void focusBook(book)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      const pick = results[cursor]
      if (pick) choose(pick)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && q.trim().length >= 2

  return (
    <div className="search" ref={box}>
      <input
        type="search"
        value={q}
        placeholder="Search title or author…"
        aria-label="Search the catalogue"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <div className="search-pop" id={listId} role="listbox">
          {error && <p className="muted pad">Search is unavailable right now.</p>}
          {!error && results.length === 0 && <p className="muted pad">No books match “{q.trim()}”.</p>}
          {results.map((b, i) => (
            <button
              key={b.id}
              role="option"
              aria-selected={i === cursor}
              className={`result ${i === cursor ? 'on' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => choose(b)}
            >
              <span className="swatch" style={{ background: b.coverColor }} />
              <span className="result-text">
                <span className="result-title" dir="auto">{b.title}</span>
                <span className="result-meta">
                  <span dir="auto">{b.author}</span> · {yearLabel(b.year)}
                </span>
                <span className="result-where">
                  {b.shelfTitle} › <bdi>{langInfo(b.language).native}</bdi>
                </span>
              </span>
            </button>
          ))}
          {total > results.length && (
            <button
              className="result more"
              onClick={() => {
                setOpen(false)
                setView('list', q.trim())
              }}
            >
              See all {total} results in list view
            </button>
          )}
        </div>
      )}
    </div>
  )
}
