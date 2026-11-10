import { create } from 'zustand'
import { ApiError, api, hasToken, setToken } from './api'
import type { Book, LibraryItem, Shelf, User } from './types'
import { sleep } from './util'

export type Phase = 'door' | 'hall'
export type Room = 'public' | 'personal'
export type View = '3d' | 'list'
export type SortBy = 'year' | 'author'

/** Where a bookcase stands, shared between the 3D rooms, the camera and the minimap. */
export interface ShelfLayout {
  slug: string
  title: string
  color: string
  x: number
  z: number
  rotation: number
  width: number
  height: number
}

/** Shelf ids in the personal study look like "my:Saved". */
export const PERSONAL_PREFIX = 'my:'
export const personalId = (collection: string) => `${PERSONAL_PREFIX}${collection}`

const DEFAULT_COLLECTION = 'Saved'

interface State {
  phase: Phase
  doorOpen: boolean
  room: Room
  view: View
  sortBy: SortBy

  shelves: Shelf[]
  shelvesError: string | null
  shelfBooks: Record<string, Book[]>
  layout: Record<string, ShelfLayout>

  activeShelf: string | null
  selectedBook: Book | null
  hoverBook: Book | null
  listQuery: string

  user: User | null
  library: LibraryItem[]
  authOpen: boolean
  pendingSave: Book | null

  fading: boolean
  notice: string | null
  mapOpen: boolean

  loadShelves: () => Promise<void>
  ensureShelf: (slug: string) => Promise<void>
  setLayout: (layout: Record<string, ShelfLayout>) => void

  openDoor: () => void
  finishEntering: () => void
  enterInstantly: () => void
  goToRoom: (room: Room) => Promise<void>
  setView: (view: View, query?: string) => void
  setSortBy: (sortBy: SortBy) => void
  setMapOpen: (open: boolean) => void

  setActiveShelf: (id: string | null) => void
  selectBook: (book: Book | null) => void
  pickBook: (shelfId: string, book: Book) => void
  setHoverBook: (book: Book | null) => void
  focusBook: (book: Book) => Promise<void>
  focusSaved: (item: LibraryItem) => Promise<void>

  initAuth: () => Promise<void>
  authenticate: (mode: 'login' | 'register', username: string, password: string) => Promise<void>
  logout: () => void
  setAuthOpen: (open: boolean) => void
  loadLibrary: () => Promise<void>
  save: (book: Book, collection?: string) => Promise<void>
  unsave: (bookId: number) => Promise<void>
  updateItem: (bookId: number, patch: { collection?: string; notes?: string }) => Promise<void>
  notify: (message: string) => void
}

const pending = new Set<string>()
let noticeTimer: ReturnType<typeof setTimeout> | undefined

export const useStore = create<State>()((set, get) => {
  const handleApiError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      get().logout()
      get().notify('Your session ended. Please sign in again.')
    } else {
      get().notify(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return {
    phase: 'door',
    doorOpen: false,
    room: 'public',
    view: '3d',
    sortBy: 'year',

    shelves: [],
    shelvesError: null,
    shelfBooks: {},
    layout: {},

    activeShelf: null,
    selectedBook: null,
    hoverBook: null,
    listQuery: '',

    user: null,
    library: [],
    authOpen: false,
    pendingSave: null,

    fading: false,
    notice: null,
    mapOpen: typeof window === 'undefined' ? true : window.innerWidth > 760,

    async loadShelves() {
      try {
        set({ shelves: await api.shelves(), shelvesError: null })
      } catch (err) {
        set({ shelvesError: err instanceof Error ? err.message : 'Could not load the catalogue' })
      }
    },

    async ensureShelf(slug) {
      if (get().shelfBooks[slug] || pending.has(slug)) return
      pending.add(slug)
      try {
        const { books } = await api.shelf(slug)
        set((s) => ({ shelfBooks: { ...s.shelfBooks, [slug]: books } }))
      } catch (err) {
        get().notify(err instanceof Error ? err.message : 'Could not load that shelf')
      } finally {
        pending.delete(slug)
      }
    },

    setLayout: (layout) => set({ layout }),

    openDoor: () => {
      if (!get().doorOpen) set({ doorOpen: true })
    },
    finishEntering: () => set({ phase: 'hall' }),
    enterInstantly: () => set({ doorOpen: true, phase: 'hall' }),

    async goToRoom(room) {
      if (room === 'personal' && !get().user) {
        set({ authOpen: true })
        return
      }
      if (get().phase === 'door') get().enterInstantly()
      if (get().room === room) return
      set({ fading: true })
      await sleep(280)
      set({ room, activeShelf: null, selectedBook: null, hoverBook: null })
      await sleep(140)
      set({ fading: false })
    },

    setView: (view, query) => {
      set({ view, ...(query !== undefined ? { listQuery: query } : {}), hoverBook: null })
    },
    setSortBy: (sortBy) => set({ sortBy }),
    setMapOpen: (mapOpen) => set({ mapOpen }),

    setActiveShelf: (id) => {
      if (id === get().activeShelf) return
      set({ activeShelf: id, selectedBook: null, hoverBook: null })
      if (id && !id.startsWith(PERSONAL_PREFIX)) void get().ensureShelf(id)
    },
    selectBook: (book) => set({ selectedBook: book }),
    pickBook: (shelfId, book) => {
      if (get().activeShelf !== shelfId) set({ activeShelf: shelfId })
      set({ selectedBook: book })
    },
    setHoverBook: (book) => {
      if (get().hoverBook?.id !== book?.id) set({ hoverBook: book })
    },

    async focusBook(book) {
      if (get().view === 'list') set({ view: '3d' })
      await get().goToRoom('public')
      if (get().phase === 'door') get().enterInstantly()
      void get().ensureShelf(book.shelfSlug)
      set({ activeShelf: book.shelfSlug, selectedBook: book, hoverBook: null })
    },

    async focusSaved(item) {
      if (get().view === 'list') set({ view: '3d' })
      await get().goToRoom('personal')
      set({ activeShelf: personalId(item.collection), selectedBook: item, hoverBook: null })
    },

    async initAuth() {
      if (!hasToken()) return
      try {
        const { user } = await api.me()
        set({ user })
        await get().loadLibrary()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) setToken(null)
      }
    },

    async authenticate(mode, username, password) {
      const res = mode === 'login' ? await api.login(username, password) : await api.register(username, password)
      setToken(res.token)
      set({ user: res.user, authOpen: false })
      await get().loadLibrary()
      const book = get().pendingSave
      if (book) {
        set({ pendingSave: null })
        await get().save(book)
      }
    },

    logout: () => {
      setToken(null)
      set({ user: null, library: [], pendingSave: null })
      if (get().room === 'personal') void get().goToRoom('public')
    },

    setAuthOpen: (authOpen) => set({ authOpen, ...(authOpen ? {} : { pendingSave: null }) }),

    async loadLibrary() {
      try {
        set({ library: (await api.library()).items })
      } catch (err) {
        handleApiError(err)
      }
    },

    async save(book, collection) {
      if (!get().user) {
        set({ authOpen: true, pendingSave: book })
        return
      }
      const before = get().library
      if (!before.some((i) => i.id === book.id)) {
        const optimistic: LibraryItem = {
          ...book,
          collection: collection ?? DEFAULT_COLLECTION,
          notes: '',
          savedAt: new Date().toISOString(),
        }
        set({ library: [...before, optimistic] })
      }
      try {
        const { item } = await api.save(book.id, collection ? { collection } : {})
        set((s) => ({ library: s.library.map((i) => (i.id === item.id ? item : i)) }))
        get().notify(`Saved to “${item.collection}”`)
      } catch (err) {
        set({ library: before })
        handleApiError(err)
      }
    },

    async unsave(bookId) {
      const before = get().library
      set({ library: before.filter((i) => i.id !== bookId) })
      try {
        await api.unsave(bookId)
      } catch (err) {
        set({ library: before })
        handleApiError(err)
      }
    },

    async updateItem(bookId, patch) {
      const before = get().library
      set({ library: before.map((i) => (i.id === bookId ? { ...i, ...patch } : i)) })
      try {
        const { item } = await api.save(bookId, patch)
        set((s) => ({ library: s.library.map((i) => (i.id === item.id ? item : i)) }))
      } catch (err) {
        set({ library: before })
        handleApiError(err)
      }
    },

    notify: (message) => {
      clearTimeout(noticeTimer)
      set({ notice: message })
      noticeTimer = setTimeout(() => set({ notice: null }), 3500)
    },
  }
})
