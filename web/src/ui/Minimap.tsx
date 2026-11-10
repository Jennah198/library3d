import { usePose } from '../pose'
import { ROOM_BOUNDS } from '../scene/constants'
import { useStore } from '../store'

const DEPTH = 1.5 // drawn deeper than the real 0.8 so shelves are easy to hit

/** Floor plan of the current room plus a written catalogue of its shelves. */
export function Minimap() {
  const room = useStore((s) => s.room)
  const layout = useStore((s) => s.layout)
  const active = useStore((s) => s.activeShelf)
  const open = useStore((s) => s.mapOpen)
  const setMapOpen = useStore((s) => s.setMapOpen)
  const setActive = useStore((s) => s.setActiveShelf)
  const shelves = useStore((s) => s.shelves)
  const library = useStore((s) => s.library)
  const { x, z, yaw } = usePose()
  const b = ROOM_BOUNDS[room]
  const pad = 0.8
  const entries = Object.values(layout)

  const countFor = (slug: string) =>
    room === 'public'
      ? shelves.find((s) => s.slug === slug)?.bookCount
      : library.filter((i) => `my:${i.collection}` === slug).length

  return (
    <aside className={`map ornate ${open ? 'open' : ''}`} aria-label="Floor plan and catalogue">
      <button className="map-head" onClick={() => setMapOpen(!open)} aria-expanded={open}>
        <span>{room === 'public' ? 'Map & catalogue' : 'My study'}</span>
        <span aria-hidden>{open ? '–' : '+'}</span>
      </button>
      {open && (
        <>
          <svg
            className="plan"
            viewBox={`${b.minX - pad} ${b.minZ - pad} ${b.maxX - b.minX + pad * 2} ${b.maxZ - b.minZ + pad * 2}`}
            role="img"
            aria-label="Top-down floor plan"
          >
            <rect x={b.minX} y={b.minZ} width={b.maxX - b.minX} height={b.maxZ - b.minZ} className="plan-floor" />
            {room === 'public' && (
              <g>
                <rect x={b.minX - 0.25} y={-1.2} width={0.5} height={2.4} className="plan-door" />
                <text x={b.minX + 0.5} y={0.28} className="plan-label dim">
                  Entrance
                </text>
              </g>
            )}
            {entries.map((l) => {
              const isActive = active === l.slug
              const fz = Math.cos(l.rotation)
              return (
                <g
                  key={l.slug}
                  role="button"
                  tabIndex={0}
                  aria-label={`${l.title}${countFor(l.slug) !== undefined ? `, ${countFor(l.slug)} books` : ''}`}
                  className={`plan-shelf ${isActive ? 'active' : ''}`}
                  onClick={() => setActive(l.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setActive(l.slug)
                    }
                  }}
                >
                  <rect x={l.x - l.width / 2} y={l.z - DEPTH / 2} width={l.width} height={DEPTH} rx={0.15} fill={l.color} />
                  <line
                    x1={l.x - l.width / 2}
                    x2={l.x + l.width / 2}
                    y1={l.z + (fz * DEPTH) / 2}
                    y2={l.z + (fz * DEPTH) / 2}
                    className="plan-front"
                  />
                  <text x={l.x} y={l.z + 0.3} className="plan-label" textAnchor="middle">
                    {l.title.length > 11 ? `${l.title.slice(0, 10)}…` : l.title}
                  </text>
                </g>
              )
            })}
            <g transform={`translate(${x} ${z}) rotate(${(-yaw * 180) / Math.PI})`} className="plan-me" pointerEvents="none">
              <circle r={0.55} />
              <path d="M0 1.5 L0.75 0.35 L-0.75 0.35 Z" />
            </g>
          </svg>

          <ul className="catalogue">
            {entries.map((l) => (
              <li key={l.slug}>
                <button className={active === l.slug ? 'on' : ''} onClick={() => setActive(l.slug)}>
                  <span className="dot" style={{ background: l.color }} />
                  <span className="grow">{l.title}</span>
                  <span className="muted">{countFor(l.slug) ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
