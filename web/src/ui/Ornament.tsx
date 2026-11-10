/** Small hand-drawn ornaments for the UI, inked in currentColor. */

/** A rayed sun holding a crescent moon. */
export function Emblem({ size = 28, className }: { size?: number; className?: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    const r0 = 11.5
    const r1 = i % 2 ? 15 : 17.5
    return `M${(20 + Math.cos(a) * r0).toFixed(2)} ${(20 + Math.sin(a) * r0).toFixed(2)}L${(20 + Math.cos(a) * r1).toFixed(2)} ${(20 + Math.sin(a) * r1).toFixed(2)}`
  }).join('')
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" aria-hidden fill="none" stroke="currentColor" strokeLinecap="round">
      <path d={rays} strokeWidth="1.3" />
      <circle cx="20" cy="20" r="9.5" strokeWidth="1.4" />
      <path d="M23.5 13.6a7 7 0 1 0 0 12.8a5.6 5.6 0 1 1 0-12.8z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** A whiplash divider: two curling stems meeting at a lozenge. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg className={className} width="220" height="18" viewBox="0 0 220 18" aria-hidden fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M4 9h70c10 0 14-6 8-7.5S72 4 78 9s14 0 20 0" strokeWidth="1.2" />
      <path d="M216 9h-70c-10 0-14-6-8-7.5S148 4 142 9s-14 0-20 0" strokeWidth="1.2" />
      <path d="M110 3l6 6l-6 6l-6-6z" fill="currentColor" stroke="none" />
      <circle cx="98" cy="9" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="122" cy="9" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
