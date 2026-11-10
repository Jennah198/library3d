import { useEffect, useMemo } from 'react'
import { sortLangCodes } from '../lang'
import { personalId, useStore, type ShelfLayout } from '../store'
import { Bookcase, caseHeight, levelsFor } from './Bookcase'
import { CASE_W, MAX_COLLECTIONS, STUDY, studySlots } from './constants'
import { Label3D } from './Label3D'
import { ArchNiche, Entablature, Lantern, Planter } from './Architecture'
import { P, useTex } from './art'

const W = STUDY.maxX - STUDY.minX
const D = STUDY.maxZ - STUDY.minZ
const T = 0.4
const H = STUDY.height
const WALL_REPEAT_Y = H / 6.5

/** The signed-in user's private study: one bookcase per collection (max six). */
export function PersonalRoom() {
  const library = useStore((s) => s.library)
  const setLayout = useStore((s) => s.setLayout)
  const floor = useTex('marble', W / 4, D / 4)
  const ceiling = useTex('coffer', W / 2.6, D / 2.6)
  const rug = useTex('medallion')
  const longWall = useTex('fresco', (W + T * 2) / 6, WALL_REPEAT_Y)
  const endWall = useTex('fresco', D / 6, WALL_REPEAT_Y)

  const collections = useMemo(() => {
    const names = new Set(library.map((i) => i.collection))
    names.add('Saved')
    return [...names].sort((a, b) => (a === 'Saved' ? -1 : b === 'Saved' ? 1 : a.localeCompare(b))).slice(0, MAX_COLLECTIONS)
  }, [library])

  const cases = useMemo(() => {
    const slots = studySlots(collections.length)
    return collections.map((name, i) => {
      const books = library.filter((it) => it.collection === name)
      return { name, slot: slots[i]!, books, languages: sortLangCodes(books.map((b) => b.language)) }
    })
  }, [collections, library])

  useEffect(() => {
    const layout: Record<string, ShelfLayout> = {}
    for (const c of cases) {
      layout[personalId(c.name)] = {
        slug: personalId(c.name),
        title: c.name,
        color: '#b08a3e',
        x: c.slot.x,
        z: c.slot.z,
        rotation: c.slot.rotation,
        width: CASE_W,
        height: caseHeight(levelsFor(c.languages.length)),
      }
    }
    setLayout(layout)
  }, [cases, setLayout])

  const empty = library.length === 0

  return (
    <group>
      <fog attach="fog" args={[P.sky, 18, 60]} />
      <ambientLight intensity={0.6} color="#ffe2b8" />
      <hemisphereLight args={['#ffe2b0', '#2a3a30', 0.6]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={ceiling} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.4, 64]} />
        <meshStandardMaterial map={rug} roughness={0.8} />
      </mesh>

      {/* walls */}
      <mesh position={[0, H / 2, STUDY.minZ - T / 2]}>
        <boxGeometry args={[W + T * 2, H, T]} />
        <meshStandardMaterial map={longWall} roughness={0.95} />
      </mesh>
      <mesh position={[0, H / 2, STUDY.maxZ + T / 2]}>
        <boxGeometry args={[W + T * 2, H, T]} />
        <meshStandardMaterial map={longWall} roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (W / 2 + T / 2), H / 2, 0]}>
          <boxGeometry args={[T, H, D]} />
          <meshStandardMaterial map={endWall} roughness={0.95} />
        </mesh>
      ))}
      <Entablature length={W} height={0.5} position={[0, H - 0.25, STUDY.minZ]} />
      <Entablature length={W} height={0.5} position={[0, H - 0.25, STUDY.maxZ]} rotation={[0, Math.PI, 0]} />
      <Entablature length={D} height={0.5} position={[STUDY.maxX, H - 0.25, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <Entablature length={D} height={0.5} position={[STUDY.minX, H - 0.25, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* the painted sun on the east wall, a botanical arch over the desk on the west */}
      <ArchNiche w={4.2} spring={3.3} apex={5.1} base={0.9} tex="sun" band={0.16} position={[STUDY.maxX - 0.004, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <ArchNiche w={3.6} spring={3.3} apex={5.0} base={1.1} position={[STUDY.minX + 0.004, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <Planter seed={5} position={[STUDY.maxX - 0.8, 0, 2.7]} />
      <Planter seed={6} position={[STUDY.maxX - 0.8, 0, -2.7]} />
      <Lantern position={[0, H - 1.6, 0]} chain={1.18} intensity={22} distance={14} />

      {/* reading desk with a lamp, against the west wall */}
      <group position={[-6.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[2.0, 0.07, 0.95]} />
          <meshStandardMaterial color={P.walnut} roughness={0.7} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, 0.38, 0]}>
            <boxGeometry args={[0.07, 0.76, 0.85]} />
            <meshStandardMaterial color={P.walnutDark} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0.6, 0.98, -0.1]}>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial color="#ffe3b0" emissive="#ffc877" emissiveIntensity={2} />
        </mesh>
        <pointLight position={[0.6, 1.1, -0.1]} color="#ffd9a0" intensity={22} distance={12} decay={1.5} />
      </group>
      {[
        [-3.2, -2.2],
        [3.2, -2.2],
        [-3.2, 2.2],
        [3.2, 2.2],
      ].map(([x, z]) => (
        <pointLight key={`${x},${z}`} position={[x!, 3.8, z!]} color="#ffd9a0" intensity={18} distance={12} decay={1.5} />
      ))}

      {empty && (
        <Label3D
          text="Your study is empty. Save books from the public library to fill it."
          width={7}
          height={0.34}
          color="#d9b86c"
          position={[0, 2.3, STUDY.minZ + 0.35]}
        />
      )}

      {cases.map((c) => (
        <Bookcase
          key={c.name}
          id={personalId(c.name)}
          title={c.name}
          color="#b08a3e"
          x={c.slot.x}
          z={c.slot.z}
          rotation={c.slot.rotation}
          languages={c.languages}
          books={c.books}
        />
      ))}
    </group>
  )
}
