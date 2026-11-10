import { useEffect, useId, useMemo, useState } from 'react'
import { langInfo, yearLabel } from '../lang'
import { useStore } from '../store'
import { Where } from './Where'

/** Details for the selected book, with save / remove and (once saved) collection and notes. */
export function BookCard() {
  const book = useStore((s) => s.selectedBook)
  const item = useStore((s) => (s.selectedBook ? s.library.find((i) => i.id === s.selectedBook!.id) : undefined))
  const user = useStore((s) => s.user)
  const room = useStore((s) => s.room)
  const library = useStore((s) => s.library)
  const collections = useMemo(() => [...new Set(library.map((i) => i.collection))], [library])
  const { selectBook, save, unsave, updateItem, focusBook } = useStore.getState()
  const [notes, setNotes] = useState('')
  const [newCollection, setNewCollection] = useState('')
  const listId = useId()

  useEffect(() => {
    setNotes(item?.notes ?? '')
    setNewCollection('')
  }, [book?.id, item?.notes])

  if (!book) return null
  const lang = langInfo(book.language)
  const saved = Boolean(item)

  return (
    <section className="card ornate" aria-label="Book details">
      <button className="icon close" aria-label="Close details" onClick={() => selectBook(null)}>
        ×
      </button>
      <div className="card-top">
        <span className="spine" style={{ background: book.coverColor }} aria-hidden />
        <div>
          <h2 dir="auto">{book.title}</h2>
          <p className="by" dir="auto">{book.author}</p>
        </div>
      </div>

      <dl className="facts">
        <div>
          <dt>Language</dt>
          <dd>{lang.native}{lang.native !== lang.name && ` · ${lang.name}`}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{yearLabel(book.year)}</dd>
        </div>
        <div>
          <dt>On the shelf</dt>
          <dd>
            <Where book={book} />
          </dd>
        </div>
      </dl>

      {book.description && <p className="desc">{book.description}</p>}
      {book.sample && <p className="chip">Sample record — verify details</p>}

      <div className="actions">
        {saved ? (
          <button className="btn" onClick={() => void unsave(book.id)}>
            ★ In your library · Remove
          </button>
        ) : (
          <button className="btn primary" onClick={() => void save(book)}>
            {user ? '☆ Save to my library' : 'Sign in to save'}
          </button>
        )}
        {room === 'personal' && (
          <button className="btn" onClick={() => void focusBook(book)}>
            Show in public library
          </button>
        )}
        {book.readUrl && (
          <a className="btn" href={book.readUrl} target="_blank" rel="noreferrer noopener">
            Read ↗
          </a>
        )}
      </div>

      {item && (
        <div className="mine">
          <label>
            <span>Collection</span>
            <select
              value={item.collection}
              onChange={(e) => void updateItem(book.id, { collection: e.target.value })}
            >
              {collections.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <form
            className="inline"
            onSubmit={(e) => {
              e.preventDefault()
              const name = newCollection.trim()
              if (name) void updateItem(book.id, { collection: name })
              setNewCollection('')
            }}
          >
            <input
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              placeholder="New collection…"
              maxLength={40}
              list={listId}
              aria-label="New collection name"
            />
            <button className="btn" disabled={!newCollection.trim()}>
              Move
            </button>
            <datalist id={listId}>
              {collections.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </form>
          <label>
            <span>Notes</span>
            <textarea
              value={notes}
              rows={3}
              maxLength={2000}
              placeholder="Private notes about this book"
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== item.notes) void updateItem(book.id, { notes })
              }}
            />
          </label>
        </div>
      )}
    </section>
  )
}
