import { useEffect, useState } from 'react'
import { langInfo, yearLabel } from '../lang'
import { useStore } from '../store'
import { Emblem, Flourish } from './Ornament'

/** Shown on the porch until the door is opened. */
export function DoorHint() {
  const phase = useStore((s) => s.phase)
  const doorOpen = useStore((s) => s.doorOpen)
  const error = useStore((s) => s.shelvesError)
  const { openDoor, setView, loadShelves } = useStore.getState()
  if (phase !== 'door') return null
  return (
    <div className={`door-hint ${doorOpen ? 'gone' : ''}`}>
      <Emblem size={40} className="door-emblem" />
      <h1>Library</h1>
      <p className="door-names">
        <span lang="am">ቤተ መጻሕፍት</span> · <span lang="ar" dir="rtl">مكتبة</span>
      </p>
      <Flourish className="door-flourish" />
      {error ? (
        <>
          <p className="error">{error}</p>
          <button className="btn" onClick={() => void loadShelves()}>Try again</button>
        </>
      ) : (
        <>
          <p className="door-invite">Click the door to step inside.</p>
          <div className="actions center">
            <button className="btn primary" onClick={openDoor}>Open the door</button>
            <button className="btn" onClick={() => setView('list')}>Browse as a list instead</button>
          </div>
        </>
      )}
    </div>
  )
}

/** Title of whatever spine the pointer is over. */
export function Tooltip() {
  const book = useStore((s) => s.hoverBook)
  if (!book) return null
  return (
    <div className="tooltip" role="status">
      <b dir="auto">{book.title}</b>
      <span dir="auto">{book.author}</span>
      <span>
        {yearLabel(book.year)} · {langInfo(book.language).native}
      </span>
    </div>
  )
}

/** One-time hint after you walk in. */
export function Hint() {
  const phase = useStore((s) => s.phase)
  const [show, setShow] = useState(true)
  useEffect(() => {
    if (phase !== 'hall') return
    const t = setTimeout(() => setShow(false), 9000)
    return () => clearTimeout(t)
  }, [phase])
  if (phase !== 'hall' || !show) return null
  return (
    <div className="hint" onClick={() => setShow(false)}>
      Drag to look around · scroll to zoom · click a shelf to open it · ← → to move between shelves
    </div>
  )
}

export function Fade() {
  const fading = useStore((s) => s.fading)
  return <div className={`fade ${fading ? 'on' : ''}`} aria-hidden />
}

export function Toast() {
  const notice = useStore((s) => s.notice)
  if (!notice) return null
  return (
    <div className="toast" role="status">
      {notice}
    </div>
  )
}
