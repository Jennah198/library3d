export interface Shelf {
  id: number
  slug: string
  title: string
  titleAr: string
  titleAm: string
  description: string
  color: string
  x: number
  z: number
  rotation: number
  bookCount: number
  languages: string[]
}

export interface Book {
  id: number
  title: string
  author: string
  language: string
  year: number | null
  description: string
  coverColor: string
  readUrl: string | null
  sample: boolean
  shelfSlug: string
  shelfTitle: string
}

export interface LibraryItem extends Book {
  collection: string
  notes: string
  savedAt: string
}

export interface User {
  id: number
  username: string
}

export interface Facets {
  languages: { code: string; count: number }[]
  years: number[]
  authors: string[]
}
