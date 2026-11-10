import { langInfo, yearLabel } from '../lang'
import type { Book } from '../types'

/**
 * "History › العربية › 1377 › ابن خلدون": each part is isolated with <bdi> so mixed
 * Arabic / Latin / Ethiopic segments keep their reading order instead of being reshuffled.
 */
export function Where({ book }: { book: Book }) {
  const parts = [book.shelfTitle, langInfo(book.language).native, yearLabel(book.year), book.author]
  return (
    <span dir="ltr">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ' › '}
          <bdi>{part}</bdi>
        </span>
      ))}
    </span>
  )
}
