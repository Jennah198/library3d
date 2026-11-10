import { useEffect } from 'react'
import { Library3D } from './scene/Library3D'
import { useStore } from './store'
import { AuthModal } from './ui/AuthModal'
import { BookCard } from './ui/BookCard'
import { ListView } from './ui/ListView'
import { Minimap } from './ui/Minimap'
import { DoorHint, Fade, Hint, Toast, Tooltip } from './ui/Overlays'
import { ShelfPanel } from './ui/ShelfPanel'
import { TopBar } from './ui/TopBar'

export default function App() {
  const view = useStore((s) => s.view)
  const phase = useStore((s) => s.phase)
  const hasCard = useStore((s) => s.selectedBook !== null)
  const hasShelf = useStore((s) => s.activeShelf !== null)
  const hover = useStore((s) => s.hoverBook !== null)

  useEffect(() => {
    const { loadShelves, initAuth } = useStore.getState()
    void loadShelves()
    void initAuth()
  }, [])

  // The pointer is a hand while over a spine.
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
  }, [hover])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState()
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (e.key === 'Escape') {
        if (s.selectedBook) s.selectBook(null)
        else if (s.activeShelf) s.setActiveShelf(null)
        return
      }
      if (s.view !== '3d' || s.phase !== 'hall') return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const ids = Object.keys(s.layout)
      if (ids.length === 0) return
      e.preventDefault()
      const i = s.activeShelf ? ids.indexOf(s.activeShelf) : -1
      const step = e.key === 'ArrowRight' ? 1 : -1
      s.setActiveShelf(ids[(i + step + ids.length) % ids.length]!)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`app ${hasCard ? 'has-card' : ''} ${hasShelf ? 'has-shelf' : ''}`}>
      {view === '3d' ? <Library3D /> : <ListView />}
      <TopBar />
      {view === '3d' && (
        <>
          <DoorHint />
          {phase === 'hall' && (
            <>
              <Minimap />
              {hasShelf && <ShelfPanel />}
              <BookCard />
              <Tooltip />
              <Hint />
            </>
          )}
        </>
      )}
      <Fade />
      <Toast />
      <AuthModal />
    </div>
  )
}
