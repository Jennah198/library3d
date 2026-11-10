import { useEffect } from 'react'
import * as THREE from 'three'
import { useStore, type ShelfLayout } from '../store'
import { ArchNiche, Column, Entablature, Fountain, Lantern, Planter } from './Architecture'
import { P, useTex } from './art'
import { usePBR, useRelief } from './pbr'
import { CofferBeams, Oculus } from './Ceiling'
import { Bookcase, caseHeight, levelsFor } from './Bookcase'
import { CASE_W, DOOR_H, DOOR_W, HALL, WALL_X } from './constants'
import { Door } from './Door'
import { Exterior } from './Exterior'

const WALL_T = 0.4
const W = HALL.maxX - HALL.minX
const D = HALL.maxZ - HALL.minZ
const H = HALL.height
/** Entablature height; the columns stop beneath it. */
const ENT = 0.6
const COL_XS = [-12, -6, 0, 6, 12]
const SIDE_LEN = (D - DOOR_W) / 2

/**
 * The public hall: a colonnaded reading room. Each bookcase stands inside a painted
 * ogee arch between Ionic columns, a sun is painted on the east wall and the ceiling,
 * and a tiled fountain sits on the mosaic runner in the middle.
 */
export function PublicHall() {
  const shelves = useStore((s) => s.shelves)
  const shelfBooks = useStore((s) => s.shelfBooks)
  const ensureShelf = useStore((s) => s.ensureShelf)
  const setLayout = useStore((s) => s.setLayout)

  const floor = usePBR('marbleFloor', W / 4, D / 4)
  const rug = useTex('rug')
  const rugRelief = useRelief('rug', 4)
  const ceiling = useTex('coffer', W / 2.6, D / 2.6)
  const ceilingRelief = useRelief('coffer', 2, W / 2.6, D / 2.6)
  const longWall = useTex('fresco', (W + WALL_T * 2) / 6, 1)
  const endWall = useTex('fresco', D / 6, 1)
  const sideWall = useTex('fresco', SIDE_LEN / 6, 1)
  const overDoor = useTex('fresco', DOOR_W / 6, (H - DOOR_H) / H, 0, DOOR_H / H)
  const plaster = usePBR('plaster', 8, 3)
  const wallMat = (map: THREE.Texture) => <meshStandardMaterial map={map} normalMap={plaster.normalMap} roughnessMap={plaster.roughnessMap} roughness={1} />

  useEffect(() => {
    const layout: Record<string, ShelfLayout> = {}
    for (const s of shelves) {
      layout[s.slug] = {
        slug: s.slug,
        title: s.title,
        color: s.color,
        x: s.x,
        z: s.z,
        rotation: s.rotation,
        width: CASE_W,
        height: caseHeight(levelsFor(s.languages.length)),
      }
    }
    setLayout(layout)
  }, [shelves, setLayout])

  const wallMid = H / 2
  const colH = H - ENT

  return (
    <group>
      <fog attach="fog" args={[P.sky, 30, 90]} />
      <ambientLight intensity={0.12} color="#ffe9c8" />
      <hemisphereLight args={['#ffe2b0', '#3a2a1a', 0.3]} />

      {/* floor, mosaic runner, ceiling with its painted sun */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial {...floor} roughness={1} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W - 1.5, 4]} />
        <meshStandardMaterial map={rug} normalMap={rugRelief} roughness={0.55} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={ceiling} normalMap={ceilingRelief} roughness={0.85} />
      </mesh>
      <CofferBeams minX={HALL.minX} maxX={HALL.maxX} minZ={HALL.minZ} maxZ={HALL.maxZ} y={H} step={2.6} />
      <Oculus y={H} radius={2.2} />

      {/* north, south and east walls */}
      <mesh position={[0, wallMid, HALL.minZ - WALL_T / 2]}>
        <boxGeometry args={[W + WALL_T * 2, H, WALL_T]} />
        {wallMat(longWall)}
      </mesh>
      <mesh position={[0, wallMid, HALL.maxZ + WALL_T / 2]}>
        <boxGeometry args={[W + WALL_T * 2, H, WALL_T]} />
        {wallMat(longWall)}
      </mesh>
      <mesh position={[HALL.maxX + WALL_T / 2, wallMid, 0]}>
        <boxGeometry args={[WALL_T, H, D]} />
        {wallMat(endWall)}
      </mesh>

      {/* west wall with the doorway cut out */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[WALL_X, wallMid, side * (DOOR_W / 2 + SIDE_LEN / 2)]}>
          <boxGeometry args={[WALL_T, H, SIDE_LEN]} />
          {wallMat(sideWall)}
        </mesh>
      ))}
      <mesh position={[WALL_X, DOOR_H + (H - DOOR_H) / 2, 0]}>
        <boxGeometry args={[WALL_T, H - DOOR_H, DOOR_W]} />
        {wallMat(overDoor)}
      </mesh>
      <mesh position={[WALL_X, 0.1, 0]}>
        <boxGeometry args={[WALL_T, 0.2, DOOR_W]} />
        <meshStandardMaterial color={P.marble} roughness={0.5} />
      </mesh>
      <ArchNiche
        w={DOOR_W}
        spring={DOOR_H}
        apex={DOOR_H + 1.25}
        base={DOOR_H}
        tex="tympanum"
        band={0.22}
        frame={'#d8c8a6'}
        position={[WALL_X + WALL_T / 2 + 0.003, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      <Door />
      <Exterior />

      {/* entablature around the top of all four walls */}
      <Entablature length={W} position={[0, H - ENT / 2, HALL.minZ]} />
      <Entablature length={W} position={[0, H - ENT / 2, HALL.maxZ]} rotation={[0, Math.PI, 0]} />
      <Entablature length={D} position={[HALL.maxX, H - ENT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <Entablature length={D} position={[HALL.minX + WALL_T / 2, H - ENT / 2, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* colonnades along the long walls, and a pair framing the east mural */}
      {COL_XS.map((x) => (
        <group key={x}>
          <Column height={colH} position={[x, 0, HALL.minZ + 0.34]} />
          <Column height={colH} position={[x, 0, HALL.maxZ - 0.34]} rotation={[0, Math.PI, 0]} />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <Column key={s} height={colH} position={[HALL.maxX - 0.34, 0, s * 3.6]} rotation={[0, -Math.PI / 2, 0]} />
      ))}

      {/* an arch niche behind every bookcase */}
      {shelves.map((s) => {
        const north = s.z < 0
        return (
          <ArchNiche
            key={s.slug}
            w={5}
            spring={3.35}
            apex={5.2}
            position={[s.x, 0, north ? HALL.minZ + 0.004 : HALL.maxZ - 0.004]}
            rotation={[0, north ? 0 : Math.PI, 0]}
          />
        )
      })}

      {/* the painted sun on the east wall, over a marble ledge */}
      <ArchNiche
        w={5.2}
        spring={3.7}
        apex={5.6}
        base={0.9}
        tex="sun"
        band={0.18}
        position={[HALL.maxX - 0.004, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <mesh position={[HALL.maxX - 0.18, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.9, 5.7]} />
        <meshStandardMaterial color={P.marble} roughness={0.4} />
      </mesh>

      <Fountain position={[0, 0, 0]} />
      <Planter seed={1} position={[11.7, 0, 2.9]} />
      <Planter seed={2} position={[11.7, 0, -2.9]} />
      <Planter seed={3} position={[-12.2, 0, 2.1]} />
      <Planter seed={4} position={[-12.2, 0, -2.1]} />

      {[-9, -4.5, 4.5, 9].map((x) => {
        const y = x === 0 ? H - 1.3 : H - 1.7
        return <Lantern key={x} position={[x, y, 0]} chain={H - y - 0.42} />
      })}

      {shelves.map((s) => (
        <Bookcase
          key={s.slug}
          id={s.slug}
          title={s.title}
          titleAr={s.titleAr}
          titleAm={s.titleAm}
          color={s.color}
          x={s.x}
          z={s.z}
          rotation={s.rotation}
          languages={s.languages}
          books={shelfBooks[s.slug]}
          onNear={() => void ensureShelf(s.slug)}
        />
      ))}
    </group>
  )
}
