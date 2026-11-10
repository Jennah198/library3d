import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

export function AuthModal() {
  const open = useStore((s) => s.authOpen)
  const pending = useStore((s) => s.pendingSave)
  const { setAuthOpen, authenticate } = useStore.getState()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setPassword('')
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAuthOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setAuthOpen])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await authenticate(mode, username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setAuthOpen(false)}>
      <form className="modal gilded" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <h2 id="auth-title">{mode === 'login' ? 'Sign in' : 'Create your library card'}</h2>
        <p className="muted">
          {pending ? <>Sign in to save <b dir="auto">{pending.title}</b> to your personal library.</> : 'Your personal library keeps the books you save.'}
        </p>
        <label>
          <span>Username</span>
          <input
            ref={first}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
        </label>
        {mode === 'register' && <p className="muted small">At least 8 characters.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button className="btn primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" className="btn" onClick={() => setAuthOpen(false)}>
            Cancel
          </button>
        </div>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError(null)
          }}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
