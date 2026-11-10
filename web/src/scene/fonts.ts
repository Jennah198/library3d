/** Shorten very long titles before they are drawn on a spine (the label also shrinks to fit). */
export function spineText(title: string, limit = 34): string {
  const chars = [...title]
  return chars.length > limit ? `${chars.slice(0, limit - 1).join('')}…` : title
}
