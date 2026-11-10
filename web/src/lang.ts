export interface LangInfo {
  code: string
  name: string
  native: string
  dir: 'ltr' | 'rtl'
}

const KNOWN: Record<string, LangInfo> = {
  en: { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
  ar: { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
  am: { code: 'am', name: 'Amharic', native: 'አማርኛ', dir: 'ltr' },
}

export const LANG_ORDER = ['en', 'ar', 'am']

export function langInfo(code: string): LangInfo {
  return KNOWN[code] ?? { code, name: code.toUpperCase(), native: code.toUpperCase(), dir: 'ltr' }
}

/** Language codes in shelf order: English, Arabic, Amharic, then any others alphabetically. */
export function sortLangCodes(codes: Iterable<string>): string[] {
  const rank = (c: string) => (LANG_ORDER.includes(c) ? LANG_ORDER.indexOf(c) : LANG_ORDER.length)
  return [...new Set(codes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export const yearLabel = (year: number | null) => (year === null ? 'Unknown year' : String(year))
