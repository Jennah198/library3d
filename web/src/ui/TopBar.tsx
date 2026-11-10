import { useStore } from '../store'
import { Emblem } from './Ornament'
import { SearchBox } from './SearchBox'

export function TopBar() {
  const view = useStore((s) => s.view)
  const room = useStore((s) => s.room)
  const user = useStore((s) => s.user)
  const count = useStore((s) => s.library.length)
  const { setView, goToRoom, setAuthOpen, logout } = useStore.getState()

  return (
    <header className="topbar">
      <div className="brand" aria-label="Library">
        <Emblem size={26} className="brand-emblem" />
        <span className="brand-name">Library</span>
        <span className="brand-sub" lang="am">ቤተ መጻሕፍት</span>
        <span className="brand-sub" lang="ar" dir="rtl">مكتبة</span>
      </div>

      <SearchBox />

      <nav className="nav" aria-label="Main">
        <div className="seg" role="group" aria-label="View">
          <button className={view === '3d' ? 'on' : ''} onClick={() => setView('3d')}>3D</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
        </div>
        {view === '3d' && (
          <button className="btn" onClick={() => void goToRoom(room === 'public' ? 'personal' : 'public')}>
            {room === 'public' ? `My library${user ? ` (${count})` : ''}` : '← Public library'}
          </button>
        )}
        {user ? (
          <button className="btn ghost" onClick={logout} title="Sign out">
            {user.username} · Sign out
          </button>
        ) : (
          <button className="btn" onClick={() => setAuthOpen(true)}>Sign in</button>
        )}
      </nav>
    </header>
  )
}
