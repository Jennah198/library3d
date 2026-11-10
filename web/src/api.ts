import type { Book, Facets, LibraryItem, Shelf, User } from './types'

const TOKEN_KEY = 'library.token'
let token: string | null = null
try {
  token = localStorage.getItem(TOKEN_KEY)
} catch {
  /* storage can be unavailable (private mode); the session just won't persist */
}

export const hasToken = () => token !== null

export function setToken(next: string | null) {
  token = next
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Cannot reach the library server')
  }
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? res.statusText
    throw new ApiError(res.status, message)
  }
  return data as T
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export interface BookQuery {
  q?: string
  shelf?: string
  language?: string
  author?: string
  year?: number
  sort?: 'year' | 'title' | 'author'
  limit?: number
  offset?: number
}

export const api = {
  shelves: () => request<Shelf[]>('/shelves'),
  shelf: (slug: string) => request<{ shelf: Shelf; books: Book[] }>(`/shelves/${encodeURIComponent(slug)}`),
  books: (query: BookQuery) => request<{ items: Book[]; total: number }>(`/books${qs({ ...query })}`),
  facets: (shelf?: string) => request<Facets>(`/facets${qs({ shelf })}`),

  register: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<{ user: User }>('/me'),

  library: () => request<{ items: LibraryItem[] }>('/library'),
  save: (bookId: number, body: { collection?: string; notes?: string } = {}) =>
    request<{ item: LibraryItem }>(`/library/${bookId}`, { method: 'PUT', body: JSON.stringify(body) }),
  unsave: (bookId: number) => request<{ ok: true }>(`/library/${bookId}`, { method: 'DELETE' }),
}
