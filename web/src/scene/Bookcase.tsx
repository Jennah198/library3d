import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { langInfo, sortLangCodes } from '../lang'
import { useStore, type SortBy } from '../store'
import type { Book } from '../types'
import { archFrame, archShape } from './art'
import { CASE_D, CASE_W, LEVEL_H } from './constants'
import { spineText } from './fonts'
import { Label3D } from './Label3D'
import { pbr } from './pbr'

/* ── dimensions (metres) ─────────────────────────────────────── */

const PLINTH = 0.14
const CORNICE = 0.18
const BOARD = 0.035
const SIDE = 0.08
const USABLE_W = CASE_W - SIDE * 2 - 0.2
const START_X = -USABLE_W / 2
const GAP = 0.004
/** Front face of the books: just behind the board's lip. */
const BOOK_FRONT = CASE_D / 2 - 0.035

export const MIN_LEVELS = 3
export const caseHeight = (levels: number) => PLINTH + levels * LEVEL_H + CORNICE
export const levelsFor = (languageCount: number) => Math.max(MIN_LEVELS, languageCount)

const hash01 = (n: number, salt: number) => (Math.imul(n * 7919 + salt * 104729, 2654435761) >>> 0) / 4294967296

interface Volume {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  color: string
  /** Gilt bands across the spine. */
  bands: boolean
}

interface Placement extends Volume {
  book: Book
}

/** Old bindings for the volumes that fill out each shelf. */
const FILLER_COLORS = ['#5a2318', '#3b2a1a', '#2f3b26', '#6b3a1f', '#4a1c1c', '#23303a', '#5c4a2a', '#3a1f2b', '#7a5a34', '#2a2420']

/**
 * One tier (shelf board) per language, top to bottom in language order.
 * Within a tier the catalogue's books stand first, ordered by year then author (or author
 * then year); a brass bookend follows, then older, unlabelled volumes fill the rest.
 */
function layoutBooks(books: Book[], tiers: string[], levels: number, sortBy: SortBy, fill: boolean) {
  const cmpAuthor = (a: Book, b: Book) => a.author.localeCompare(b.author, undefined, { sensitivity: 'base' })
  const cmpYear = (a: Book, b: Book) => (a.year ?? Infinity) - (b.year ?? Infinity) || 0
  const cmp =
    sortBy === 'year'
      ? (a: Book, b: Book) => cmpYear(a, b) || cmpAuthor(a, b) || a.title.localeCompare(b.title)
      : (a: Book, b: Book) => cmpAuthor(a, b) || cmpYear(a, b) || a.title.localeCompare(b.title)

  const placed: Placement[] = []
  const fillers: Volume[] = []
  const bookends: { x: number; y: number }[] = []
  for (let level = 0; level < levels; level++) {
    const t = levels - 1 - level
    const code = tiers[t]
    const list = code ? books.filter((b) => b.language === code).sort(cmp) : []
    const baseY = PLINTH + level * LEVEL_H + BOARD
    const widths = list.map((b) => 0.055 + hash01(b.id, 1) * 0.045)
    const total = widths.reduce((sum, w) => sum + w + GAP, 0)
    const k = total > USABLE_W - 0.1 ? (USABLE_W - 0.1) / total : 1
    let cursor = START_X
    list.forEach((book, i) => {
      const w = widths[i]! * k
      // Under 0.5 so the gilt tier label above the books stays clear.
      const h = 0.34 + hash01(book.id, 2) * 0.15
      const d = 0.24 + hash01(book.id, 3) * 0.06
      placed.push({ book, x: cursor + w / 2, y: baseY + h / 2, z: BOOK_FRONT - d / 2, w, h, d, color: book.coverColor, bands: hash01(book.id, 4) > 0.3 })
      cursor += w + GAP * k
    })
    if (!fill) continue
    if (list.length) {
      bookends.push({ x: cursor + 0.012, y: baseY })
      cursor += 0.05
    }
    let n = level * 1000 + tiers.length * 7
    while (cursor < START_X + USABLE_W - 0.04) {
      n++
      const w = Math.min(0.035 + hash01(n, 5) * 0.045, START_X + USABLE_W - cursor)
      if (hash01(n, 9) < 0.04) {
        cursor += 0.03 + hash01(n, 10) * 0.06 // a gap where a volume is out on loan
        continue
      }
      const h = 0.28 + hash01(n, 6) * 0.2
      const d = 0.22 + hash01(n, 7) * 0.07
      fillers.push({
        x: cursor + w / 2,
        y: baseY + h / 2,
        z: BOOK_FRONT - d / 2 - hash01(n, 11) * 0.015,
        w,
        h,
        d,
        color: FILLER_COLORS[Math.floor(hash01(n, 8) * FILLER_COLORS.length)]!,
        bands: hash01(n, 12) > 0.25,
      })
      cursor += w + GAP
    }
  }
  return { placed, fillers, bookends }
}

/* ── shared geometry and materials (built once, used by every case) ── */

let shared: ReturnType<typeof makeShared> | null = null

function makeShared() {
  const wood = (key: 'walnut' | 'walnutH' | 'walnutDark', rx: number, ry: number) => {
    const s = pbr(key)
    const c = (t: THREE.Texture) => {
      const k = t.clone()
      k.repeat.set(rx, ry)
      k.needsUpdate = true
      return k
    }
    return new THREE.MeshStandardMaterial({ map: c(s.map!), normalMap: c(s.normalMap), roughnessMap: c(s.roughnessMap), roughness: 1 })
  }
  const leather = pbr('leather')
  const pages = pbr('pages')
  const crestShape = archShape(3.5, 0.42, 0.86)
  return {
    post: wood('walnut', 0.5, 2),
    board: wood('walnutH', 4, 0.3),
    back: wood('walnutDark', 3, 1.5),
    crestWood: wood('walnut', 2.5, 1.2),
    cover: new THREE.MeshStandardMaterial({ map: leather.map, normalMap: leather.normalMap, roughnessMap: leather.roughnessMap, roughness: 1 }),
    pages: new THREE.MeshStandardMaterial({ map: pages.map, normalMap: pages.normalMap, roughness: 0.9 }),
    gilt: new THREE.MeshStandardMaterial({ color: '#c9a14a', metalness: 0.95, roughness: 0.32 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b08a45', metalness: 0.9, roughness: 0.38 }),
    bookGeo: new RoundedBoxGeometry(1, 1, 1, 2, 0.12),
    boxGeo: new THREE.BoxGeometry(1, 1, 1),
    crestBody: new THREE.ExtrudeGeometry(crestShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 }),
    crestRim: new THREE.ShapeGeometry(archFrame(3.38, 0.42, 0.78, 0.04), 24),
  }
}

function useShared() {
  shared ??= makeShared()
  return shared
}

/* ── component ───────────────────────────────────────────────── */

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
  /** Fill the empty end of each shelf with old volumes (off in the personal study). */
  fill?: boolean
}

/** A walnut bookcase with pilasters, a stepped cornice and a carved crest. */
export function Bookcase({ id, title, titleAr, titleAm, color, x, z, rotation, languages, books, onNear, fill = true }: BookcaseProps) {
  const S = useShared()
  const group = useRef<THREE.Group>(null)
  const covers = useRef<THREE.InstancedMesh>(null)
  const pageBlocks = useRef<THREE.InstancedMesh>(null)
  const fillerCovers = useRef<THREE.InstancedMesh>(null)
  const bands = useRef<THREE.InstancedMesh>(null)
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
  const { placed, fillers, bookends } = useMemo(
    () => layoutBooks(books ?? [], tiers, levels, sortBy, fill),
    [books, tiers, levels, sortBy, fill],
  )
  const all = useMemo(() => [...placed, ...fillers], [placed, fillers])
  const banded = useMemo(() => all.filter((v) => v.bands), [all])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const col = new THREE.Color()
    const write = (mesh: THREE.InstancedMesh | null, list: Volume[], shape: (v: Volume) => [number, number, number, number, number, number], tint: boolean) => {
      if (!mesh) return
      list.forEach((v, i) => {
        const [px, py, pz, sx, sy, sz] = shape(v)
        mesh.setMatrixAt(i, m.compose(pos.set(px, py, pz), quat, scale.set(sx, sy, sz)))
        if (tint) mesh.setColorAt(i, col.set(v.color).multiplyScalar(0.82))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    const cover = (v: Volume): [number, number, number, number, number, number] => [v.x, v.y, v.z, v.w, v.h, v.d]
    write(covers.current, placed, cover, true)
    write(fillerCovers.current, fillers, cover, true)
    // the page block shows between the boards along the top
    write(pageBlocks.current, all, (v) => [v.x, v.y + 0.002, v.z - 0.004, v.w * 0.86, v.h - 0.008, v.d - 0.012], false)
    // two raised gilt bands across each banded spine (written as pairs)
    const b = bands.current
    if (b) {
      banded.forEach((v, i) => {
        for (const [k, dy] of [[0, v.h / 2 - 0.05], [1, -v.h / 2 + 0.045]] as const) {
          b.setMatrixAt(i * 2 + k, m.compose(pos.set(v.x, v.y + dy, v.z + v.d / 2 + 0.002), quat, scale.set(v.w * 0.96, 0.009, 0.006)))
        }
      })
      b.instanceMatrix.needsUpdate = true
      b.computeBoundingSphere()
    }
  }, [placed, fillers, all, banded])

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
    const book = e.instanceId === undefined ? undefined : placed[e.instanceId]?.book
    if (book) useStore.getState().setHoverBook(book)
  }
  const onSpineClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return
    e.stopPropagation()
    const book = e.instanceId === undefined ? undefined : placed[e.instanceId]?.book
    if (book) useStore.getState().pickBook(id, book)
  }

  const highlights = placed.filter((p) => p.book.id === hoverId || p.book.id === selectedId)
  const top = PLINTH + levels * LEVEL_H
  const innerW = CASE_W - SIDE * 2

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
      {/* carcass: plinth, sides, back */}
      <mesh geometry={S.boxGeo} material={S.post} position={[0, 0.06, 0.01]} scale={[CASE_W + 0.04, 0.12, CASE_D + 0.04]} castShadow receiveShadow />
      <mesh geometry={S.bookGeo} material={S.post} position={[0, 0.131, 0.01]} scale={[CASE_W + 0.02, 0.024, CASE_D + 0.03]} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={S.boxGeo} material={S.post} position={[s * (CASE_W / 2 - SIDE / 2), H / 2, 0]} scale={[SIDE, H, CASE_D]} castShadow receiveShadow />
          {/* pilaster with base and capital */}
          <mesh geometry={S.bookGeo} material={S.post} position={[s * (CASE_W / 2 - SIDE / 2), PLINTH + (top - PLINTH) / 2, CASE_D / 2 + 0.014]} scale={[0.12, top - PLINTH - 0.08, 0.03]} castShadow receiveShadow />
          <mesh geometry={S.bookGeo} material={S.post} position={[s * (CASE_W / 2 - SIDE / 2), top - 0.03, CASE_D / 2 + 0.02]} scale={[0.16, 0.06, 0.045]} castShadow />
          <mesh geometry={S.bookGeo} material={S.post} position={[s * (CASE_W / 2 - SIDE / 2), PLINTH + 0.04, CASE_D / 2 + 0.02]} scale={[0.16, 0.08, 0.045]} castShadow />
          <mesh geometry={S.boxGeo} material={S.gilt} position={[s * (CASE_W / 2 - SIDE / 2), top - 0.064, CASE_D / 2 + 0.031]} scale={[0.15, 0.008, 0.026]} />
        </group>
      ))}
      <mesh geometry={S.boxGeo} material={S.back} position={[0, H / 2, -CASE_D / 2 + 0.01]} scale={[innerW, H - 0.05, 0.02]} receiveShadow />

      {/* boards, each with a rounded front lip */}
      {Array.from({ length: levels + 1 }, (_, level) => {
        const y = PLINTH + level * LEVEL_H + BOARD / 2
        return (
          <group key={level}>
            <mesh geometry={S.boxGeo} material={S.board} position={[0, y, -0.01]} scale={[innerW, BOARD, CASE_D - 0.03]} castShadow receiveShadow />
            <mesh geometry={S.bookGeo} material={S.board} position={[0, y - 0.006, CASE_D / 2 - 0.012]} scale={[innerW, 0.05, 0.026]} castShadow receiveShadow />
          </group>
        )
      })}

      {/* stepped cornice */}
      {[
        [0.03, 0.06, 0, 0],
        [0.085, 0.05, 0.06, 0.05],
        [0.14, 0.045, 0.12, 0.09],
      ].map(([y, h, dw, dd]) => (
        <mesh key={y} geometry={S.bookGeo} material={S.post} position={[0, top + y!, 0.01 + dd! / 2]} scale={[CASE_W + dw!, h!, CASE_D + dd!]} castShadow receiveShadow />
      ))}
      <mesh geometry={S.boxGeo} material={S.gilt} position={[0, top + 0.06, CASE_D / 2 + 0.04]} scale={[CASE_W + 0.04, 0.01, 0.01]} />

      {/* gilt tier labels, lettered on the back panel above each language's books */}
      {tiers.map((code, t) => {
        const level = levels - 1 - t
        return (
          <Label3D
            key={code}
            text={langInfo(code).native}
            family="display"
            width={1.0}
            height={0.065}
            align="left"
            color="#d9b86c"
            position={[START_X + 0.5, PLINTH + level * LEVEL_H + BOARD + 0.535, -CASE_D / 2 + 0.022]}
          />
        )
      })}

      {/* books */}
      {placed.length > 0 && (
        <instancedMesh
          key={`c${placed.length}`}
          ref={covers}
          args={[S.bookGeo, S.cover, placed.length]}
          castShadow
          receiveShadow
          onPointerMove={onSpineMove}
          onPointerOut={() => useStore.getState().setHoverBook(null)}
          onClick={onSpineClick}
        />
      )}
      {fillers.length > 0 && (
        <instancedMesh key={`f${fillers.length}`} ref={fillerCovers} args={[S.bookGeo, S.cover, fillers.length]} castShadow receiveShadow raycast={() => null} />
      )}
      {all.length > 0 && (
        <instancedMesh key={`p${all.length}`} ref={pageBlocks} args={[S.boxGeo, S.pages, all.length]} receiveShadow raycast={() => null} />
      )}
      {banded.length > 0 && (
        <instancedMesh key={`b${banded.length}`} ref={bands} args={[S.boxGeo, S.gilt, banded.length * 2]} raycast={() => null} />
      )}
      {bookends.map((b) => (
        <group key={`${b.x},${b.y}`} position={[b.x, b.y, BOOK_FRONT - 0.13]}>
          <mesh geometry={S.boxGeo} material={S.brass} position={[0, 0.11, 0]} scale={[0.008, 0.22, 0.14]} castShadow />
          <mesh geometry={S.boxGeo} material={S.brass} position={[0.04, 0.004, 0]} scale={[0.08, 0.008, 0.14]} />
        </group>
      ))}

      {/* hovered / selected book eases forward off the shelf */}
      {highlights.map((p) => {
        const selected = p.book.id === selectedId
        return (
          <mesh key={p.book.id} geometry={S.bookGeo} position={[p.x, p.y + 0.01, p.z + (selected ? 0.12 : 0.07)]} scale={[p.w, p.h, p.d]} raycast={() => null} castShadow>
            <meshStandardMaterial
              map={S.cover.map}
              normalMap={S.cover.normalMap}
              roughnessMap={S.cover.roughnessMap}
              color={new THREE.Color(p.book.coverColor).multiplyScalar(0.82)}
              emissive={p.book.coverColor}
              emissiveIntensity={selected ? 0.22 : 0.1}
            />
          </mesh>
        )
      })}

      {/* gilt titles on the spines, only for the open shelf */}
      {active &&
        placed.map((p) => {
          const lift = p.book.id === selectedId ? 0.12 : p.book.id === hoverId ? 0.07 : 0
          return (
            <Label3D
              key={p.book.id}
              text={spineText(p.book.title)}
              width={p.h * 0.62}
              height={Math.min(0.06, p.w * 0.66)}
              color="#e9d08c"
              position={[p.x, p.y + (lift ? 0.01 : 0), p.z + p.d / 2 + lift + 0.004]}
              rotation={[0, 0, -Math.PI / 2]}
            />
          )
        })}

      {/* carved crest with a gilt edge and an enamel medallion in the shelf's colour */}
      <group position={[0, top + 0.16, 0.06]}>
        <mesh geometry={S.crestBody} material={S.crestWood} position={[0, 0, -0.03]} castShadow receiveShadow />
        <mesh geometry={S.crestRim} material={S.gilt} position={[0, 0, 0.034]} />
        <mesh position={[0, 0.7, 0.036]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.012, 28]} />
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.7, 0.035]}>
          <torusGeometry args={[0.068, 0.012, 8, 28]} />
          <primitive object={S.gilt} attach="material" />
        </mesh>
        <Label3D text={title} family="display" color="#e2c47a" width={2.8} height={titleAr || titleAm ? 0.24 : 0.3} position={[0, titleAr || titleAm ? 0.38 : 0.3, 0.036]} />
        {titleAm && <Label3D text={titleAm} width={1.2} height={0.15} color="#d4b46a" position={[-0.68, 0.14, 0.036]} />}
        {titleAr && <Label3D text={titleAr} width={1.2} height={0.17} color="#d4b46a" position={[0.68, 0.14, 0.036]} />}
      </group>
    </group>
  )
}
