import { sortLangCodes, yearLabel } from './lang'
import type { Book } from './types'

export type GroupBy = 'year' | 'author'

export interface Section {
  label: string
  books: Book[]
}
export interface Group {
  label: string
  sections: Section[]
}
export interface LangGroup {
  code: string
  count: number
  groups: Group[]
}

const byAuthor = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })
const byYear = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity) || 0

/** Language -> year -> author -> books (or language -> author -> year -> books). */
export function groupBooks(books: Book[], by: GroupBy): LangGroup[] {
  return sortLangCodes(books.map((b) => b.language)).map((code) => {
    const inLang = books.filter((b) => b.language === code)
    const outer = new Map<string, Book[]>()
    const outerKey = (b: Book) => (by === 'year' ? yearLabel(b.year) : b.author)
    for (const b of inLang) outer.set(outerKey(b), [...(outer.get(outerKey(b)) ?? []), b])

    const outerKeys = [...outer.keys()].sort((a, b) => {
      const A = outer.get(a)![0]!
      const B = outer.get(b)![0]!
      return by === 'year' ? byYear(A.year, B.year) : byAuthor(a, b)
    })

    const groups: Group[] = outerKeys.map((key) => {
      const members = outer.get(key)!
      const inner = new Map<string, Book[]>()
      const innerKey = (b: Book) => (by === 'year' ? b.author : yearLabel(b.year))
      for (const b of members) inner.set(innerKey(b), [...(inner.get(innerKey(b)) ?? []), b])
      const innerKeys = [...inner.keys()].sort((a, b) => {
        const A = inner.get(a)![0]!
        const B = inner.get(b)![0]!
        return by === 'year' ? byAuthor(a, b) : byYear(A.year, B.year)
      })
      return {
        label: key,
        sections: innerKeys.map((k) => ({
          label: k,
          books: inner.get(k)!.sort((a, b) => a.title.localeCompare(b.title)),
        })),
      }
    })
    return { code, count: inLang.length, groups }
  })
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
