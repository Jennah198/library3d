import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { sortLangCodes, langInfo } from '../lang'
import { useStore, type SortBy } from '../store'
import type { Book } from '../types'
import { CASE_D, CASE_W, LEVEL_H } from './constants'
import { spineText } from './fonts'
import { Label3D } from './Label3D'
import { Outlines } from '@react-three/drei'
import { archFrame, archShape, P } from './art'

export const MIN_LEVELS = 3
export const caseHeight = (levels: number) => 0.12 + levels * LEVEL_H + 0.14
export const levelsFor = (languageCount: number) => Math.max(MIN_LEVELS, languageCount)

interface Placement {
  book: Book
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
}

const hash01 = (n: number, salt: number) => (Math.imul(n * 7919 + salt * 104729, 2654435761) >>> 0) / 4294967296

const USABLE_W = 3.8
const START_X = -USABLE_W / 2
const GAP = 0.015

/**
 * One tier (shelf board) per language, top to bottom in language order.
 * Within a tier books are ordered by year then author, or author then year.
 */
function layoutBooks(books: Book[], tiers: string[], levels: number, sortBy: SortBy): Placement[] {
  const cmpAuthor = (a: Book, b: Book) => a.author.localeCompare(b.author, undefined, { sensitivity: 'base' })
  const cmpYear = (a: Book, b: Book) => (a.year ?? Infinity) - (b.year ?? Infinity) || 0
  const cmp =
    sortBy === 'year'
      ? (a: Book, b: Book) => cmpYear(a, b) || cmpAuthor(a, b) || a.title.localeCompare(b.title)
      : (a: Book, b: Book) => cmpAuthor(a, b) || cmpYear(a, b) || a.title.localeCompare(b.title)

  const out: Placement[] = []
  tiers.forEach((code, t) => {
    const level = levels - 1 - t
    const list = books.filter((b) => b.language === code).sort(cmp)
    const widths = list.map((b) => 0.14 + hash01(b.id, 1) * 0.14)
    const total = widths.reduce((sum, w) => sum + w + GAP, 0)
    const k = total > USABLE_W ? USABLE_W / total : 1
    const baseY = 0.12 + 0.06 + level * LEVEL_H
    let cursor = START_X
    list.forEach((book, i) => {
      const w = widths[i]! * k
      // Kept under 0.8 so the language label above each tier is never hidden by a tall book.
      const h = 0.56 + hash01(book.id, 2) * 0.24
      out.push({ book, x: cursor + w / 2, y: baseY + h / 2, z: 0.05, w, h, d: 0.5 })
      cursor += w + GAP * k
    })
  })
  return out
}

const WOOD = P.walnut
const WOOD_DARK = P.walnutDark
const BACK = '#18302c'

/** The crest over each case: an ogee arch in teal, edged in gold. Shared by every case. */
let crestGeo: { body: THREE.ExtrudeGeometry; rim: THREE.ShapeGeometry } | null = null
function crest() {
  crestGeo ??= {
    body: new THREE.ExtrudeGeometry(archShape(3.7, 0.55, 1.05), { depth: 0.08, bevelEnabled: false, curveSegments: 20 }),
    rim: new THREE.ShapeGeometry(archFrame(3.56, 0.55, 0.95, 0.055), 20),
  }
  return crestGeo
}

export interface BookcaseProps {
  /** Layout key: a shelf slug, or "my:<collection>" in the study. */
  id: string
  title: string
  titleAr?: string
  titleAm?: string
  color: string
  x: number
  z: number
  rotation: number
  /** Languages known up front (from the shelf summary), so tiers exist before books load. */
  languages: string[]
  books?: Book[]
  /** Called once when the camera first comes within range, to lazy-load books. */
  onNear?: () => void
}

export function Bookcase({ id, title, titleAr, titleAm, color, x, z, rotation, languages, books, onNear }: BookcaseProps) {
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.InstancedMesh>(null)
  const near = useRef({ t: 0, done: false })

  const active = useStore((s) => s.activeShelf === id)
  const sortBy = useStore((s) => s.sortBy)
  const hoverId = useStore((s) => s.hoverBook?.id ?? null)
  const selectedId = useStore((s) => s.selectedBook?.id ?? null)

  const tiers = useMemo(
    () => sortLangCodes(books && books.length ? books.map((b) => b.language) : languages),
    [books, languages],
  )
  const levels = levelsFor(tiers.length)
  const H = caseHeight(levels)
  const placements = useMemo(() => layoutBooks(books ?? [], tiers, levels, sortBy), [books, tiers, levels, sortBy])
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), [])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const matrix = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const col = new THREE.Color()
    placements.forEach((p, i) => {
      pos.set(p.x, p.y, p.z)
      scale.set(p.w, p.h, p.d)
      m.setMatrixAt(i, matrix.compose(pos, quat, scale))
      m.setColorAt(i, col.set(p.book.coverColor))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [placements])

  // Load this shelf's books the first time the camera gets close.
  useFrame((state, dt) => {
    const n = near.current
    if (!onNear || n.done || !group.current) return
    n.t += dt
    if (n.t < 0.4) return
    n.t = 0
    if (state.camera.position.distanceTo(group.current.position) < 17) {
      n.done = true
      onNear()
    }
  })

  const setCursor = (c: string) => {
    document.body.style.cursor = c
  }

  const onSpineMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const book = e.instanceId === undefined ? undefined : placements[e.instanceId]?.book
    if (book) useStore.getState().setHoverBook(book)
  }
  const onSpineClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return
    e.stopPropagation()
    const book = e.instanceId === undefined ? undefined : placements[e.instanceId]?.book
    if (book) useStore.getState().pickBook(id, book)
  }

  const highlights = placements.filter((p) => p.book.id === hoverId || p.book.id === selectedId)

  return (
    <group
      ref={group}
      position={[x, 0, z]}
      rotation={[0, rotation, 0]}
      onClick={(e) => {
        if (e.delta > 4) return
        e.stopPropagation()
        useStore.getState().setActiveShelf(id)
      }}
      onPointerOver={() => setCursor('pointer')}
      onPointerOut={() => setCursor('')}
    >
      {/* frame */}
      <mesh position={[-CASE_W / 2 + 0.05, H / 2, 0]}>
        <boxGeometry args={[0.1, H, CASE_D]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      <mesh position={[CASE_W / 2 - 0.05, H / 2, 0]}>
        <boxGeometry args={[0.1, H, CASE_D]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      <mesh position={[0, H / 2, -CASE_D / 2 + 0.02]}>
        <boxGeometry args={[CASE_W - 0.2, H, 0.04]} />
        <meshStandardMaterial color={BACK} roughness={0.95} />
      </mesh>
      <mesh position={[0, H - 0.07, 0]}>
        <boxGeometry args={[CASE_W, 0.14, CASE_D]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.06, 0.02]}>
        <boxGeometry args={[CASE_W, 0.12, CASE_D + 0.04]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
      </mesh>
      {/* gold band along the top rail */}
      <mesh position={[0, H - 0.07, CASE_D / 2 + 0.006]}>
        <boxGeometry args={[CASE_W - 0.2, 0.05, 0.012]} />
        <meshStandardMaterial color={P.gold} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* boards */}
      {Array.from({ length: levels }, (_, level) => (
        <mesh key={level} position={[0, 0.12 + 0.03 + level * LEVEL_H, 0]}>
          <boxGeometry args={[CASE_W - 0.2, 0.06, CASE_D - 0.04]} />
          <meshStandardMaterial color={WOOD} roughness={0.75} />
        </mesh>
      ))}

      {Array.from({ length: levels }, (_, level) => (
        <mesh key={`edge${level}`} position={[0, 0.12 + 0.03 + level * LEVEL_H, CASE_D / 2 - 0.015]}>
          <boxGeometry args={[CASE_W - 0.2, 0.018, 0.012]} />
          <meshStandardMaterial color={P.gold} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {/* language labels, one per tier */}
      {tiers.map((code, t) => {
        const level = levels - 1 - t
        const label = langInfo(code).native
        return (
          <Label3D
            key={code}
            text={label}
            width={1.4}
            height={0.13}
            align="left"
            color="#d9b86c"
            position={[START_X + 0.7 - 0.02, 0.12 + 0.06 + level * LEVEL_H + LEVEL_H - 0.16, -0.3]}
          />
        )
      })}

      {/* spines */}
      {placements.length > 0 && (
        <instancedMesh
          key={placements.length}
          ref={mesh}
          args={[undefined, undefined, placements.length]}
          onPointerMove={onSpineMove}
          onPointerOut={() => useStore.getState().setHoverBook(null)}
          onClick={onSpineClick}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.7} />
        </instancedMesh>
      )}

      {/* hovered / selected book is pulled forward */}
      {highlights.map((p) => {
        const selected = p.book.id === selectedId
        return (
          <mesh key={p.book.id} position={[p.x, p.y, p.z + 0.14]} scale={[p.w, p.h, p.d]} raycast={() => null}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={p.book.coverColor}
              emissive={p.book.coverColor}
              emissiveIntensity={selected ? 0.7 : 0.35}
              roughness={0.6}
            />
            {selected && <lineSegments geometry={edges} raycast={() => null}>
              <lineBasicMaterial color="#ffe08a" />
            </lineSegments>}
          </mesh>
        )
      })}

      {/* title text on spines, only for the open shelf */}
      {active &&
        placements.map((p) => (
          <Label3D
            key={p.book.id}
            text={spineText(p.book.title)}
            width={p.h * 0.92}
            height={Math.min(0.12, p.w * 0.8)}
            position={[p.x, p.y, p.z + p.d / 2 + (p.book.id === hoverId || p.book.id === selectedId ? 0.14 : 0) + 0.004]}
            rotation={[0, 0, -Math.PI / 2]}
          />
        ))}

      {/* gilded capitals on the side posts */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (CASE_W / 2 - 0.05), H - 0.2, CASE_D / 2 + 0.01]}>
          <boxGeometry args={[0.14, 0.12, 0.03]} />
          <meshStandardMaterial color={P.gold} metalness={0.5} roughness={0.35} />
        </mesh>
      ))}

      {/* arched crest above the case */}
      <group position={[0, H, 0]}>
        <mesh geometry={crest().body} position={[0, 0, -0.04]}>
          <meshStandardMaterial color={P.teal} roughness={0.75} />
          <Outlines thickness={0.012} color={P.ink} />
        </mesh>
        <mesh geometry={crest().rim} position={[0, 0, 0.042]}>
          <meshStandardMaterial color={P.gold} metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.06, 0.045]}>
          <boxGeometry args={[3.4, 0.04, 0.012]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.83, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.012, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.83, 0.044]}>
          <ringGeometry args={[0.075, 0.1, 24]} />
          <meshStandardMaterial color={P.gold} metalness={0.5} roughness={0.35} />
        </mesh>
        <Label3D
          text={title}
          family="display"
          color="#efe2c4"
          width={3.0}
          height={titleAr || titleAm ? 0.3 : 0.38}
          position={[0, titleAr || titleAm ? 0.47 : 0.38, 0.05]}
        />
        {titleAm && <Label3D text={titleAm} width={1.4} height={0.19} color="#d9b86c" position={[-0.78, 0.2, 0.05]} />}
        {titleAr && <Label3D text={titleAr} width={1.4} height={0.21} color="#d9b86c" position={[0.78, 0.2, 0.05]} />}
      </group>
    </group>
  )
}
