import { Outlines } from '@react-three/drei'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { prefersReducedMotion } from '../util'
import { archFrame, archShape, P, rng, useTex, type TexKey } from './art'

type GroupProps = Omit<ThreeElements['group'], 'ref' | 'children'>

/** Ink outline thickness, in world units. */
const INK_W = 0.014

/* ── Ionic column ────────────────────────────────────────────── */

export function Column({ height, ...group }: GroupProps & { height: number }) {
  const flutes = useTex('flutes')
  const shaftH = height - 0.24 - 0.26
  return (
    <group {...group}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.82, 0.1, 0.82]} />
        <meshStandardMaterial color={P.marble} roughness={0.7} />
        <Outlines thickness={INK_W} color={P.ink} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.34, 0.38, 0.1, 32]} />
        <meshStandardMaterial color={P.marble} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.31, 0.045, 10, 32]} />
        <meshStandardMaterial color={P.marble} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.24 + shaftH / 2, 0]}>
        <cylinderGeometry args={[0.25, 0.29, shaftH, 20, 1, true]} />
        <meshStandardMaterial map={flutes} roughness={0.6} />
        <Outlines thickness={INK_W} color={P.ink} />
      </mesh>
      {/* capital: necking ring, echinus, volutes, abacus */}
      <group position={[0, height - 0.26, 0]}>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.255, 0.03, 8, 28]} />
          <meshStandardMaterial color={P.gold} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.36, 0.27, 0.12, 28]} />
          <meshStandardMaterial color={P.marble} roughness={0.6} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.36, 0.1, 0]}>
            {[-0.2, 0.2].map((z) => (
              <mesh key={z} position={[0, 0, z]}>
                <torusGeometry args={[0.085, 0.032, 8, 20]} />
                <meshStandardMaterial color={P.marble} roughness={0.6} />
                <Outlines thickness={INK_W * 0.7} color={P.ink} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.4, 14]} />
              <meshStandardMaterial color={P.marble} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.23]}>
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshStandardMaterial color={P.gold} metalness={0.5} roughness={0.35} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.21, 0]}>
          <boxGeometry args={[0.92, 0.1, 0.72]} />
          <meshStandardMaterial color={P.marble} roughness={0.6} />
          <Outlines thickness={INK_W} color={P.ink} />
        </mesh>
      </group>
    </group>
  )
}

/* ── arch niche ──────────────────────────────────────────────── */

/**
 * A painted panel in a pointed arch, framed by a gold band and an ink line.
 * Lies in the local XY plane facing +z; the bottom edge is at y = `base`.
 */
export function ArchNiche({
  w,
  spring,
  apex,
  base = 0,
  tex = 'niche',
  band = 0.14,
  frame = P.gold,
  ...group
}: GroupProps & { w: number; spring: number; apex: number; base?: number; tex?: TexKey; band?: number; frame?: string }) {
  const h = apex - base
  const map = useTex(tex, 1 / w, 1 / h, 0.5, -base / h)
  const { panel, gold, ink } = useMemo(
    () => ({
      panel: new THREE.ShapeGeometry(archShape(w, spring, apex, base), 24),
      gold: new THREE.ShapeGeometry(archFrame(w, spring, apex, band, base), 24),
      ink: new THREE.ShapeGeometry(archFrame(w + band * 2, spring, apex + band * 1.4, 0.035, base), 24),
    }),
    [w, spring, apex, base, band],
  )
  useLayoutEffect(
    () => () => {
      panel.dispose()
      gold.dispose()
      ink.dispose()
    },
    [panel, gold, ink],
  )
  return (
    <group {...group}>
      <mesh geometry={panel}>
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>
      <mesh geometry={gold} position={[0, 0, 0.006]}>
        <meshStandardMaterial color={frame} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh geometry={ink} position={[0, 0, 0.007]}>
        <meshBasicMaterial color={P.ink} />
      </mesh>
    </group>
  )
}

/* ── entablature ─────────────────────────────────────────────── */

/** The beam along the top of a wall: a marble block with a painted frieze on its face (+z). */
export function Entablature({ length, height = 0.6, depth = 0.36, ...group }: GroupProps & { length: number; height?: number; depth?: number }) {
  const map = useTex('frieze', length / 4.8, 1)
  return (
    <group {...group}>
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[length, height, depth]} />
        <meshStandardMaterial color={P.marble} roughness={0.75} />
      </mesh>
      <mesh position={[0, -height * 0.08, depth + 0.002]}>
        <planeGeometry args={[length, height * 0.7]} />
        <meshStandardMaterial map={map} roughness={0.7} />
      </mesh>
      <mesh position={[0, height / 2 - 0.04, depth / 2 + 0.04]}>
        <boxGeometry args={[length, 0.08, depth + 0.08]} />
        <meshStandardMaterial color={P.marble} roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ── hanging lantern ─────────────────────────────────────────── */

/** A pierced brass lantern, Moorish style, with a warm light inside. */
export function Lantern({ chain = 0, intensity = 30, distance = 17, ...group }: GroupProps & { chain?: number; intensity?: number; distance?: number }) {
  const brass = <meshStandardMaterial color="#9a7432" metalness={0.75} roughness={0.35} />
  return (
    <group {...group}>
      {chain > 0 && (
        <mesh position={[0, 0.42 + chain / 2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, chain, 6]} />
          <meshStandardMaterial color="#2b2118" />
        </mesh>
      )}
      <mesh position={[0, 0.36, 0]}>
        <coneGeometry args={[0.25, 0.22, 8]} />
        {brass}
        <Outlines thickness={INK_W * 0.8} color={P.ink} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        {brass}
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.2, 0.15, 0.5, 8, 1, true]} />
        <meshStandardMaterial color="#ffd38a" emissive="#ffb04a" emissiveIntensity={1.9} side={THREE.DoubleSide} />
        <Outlines thickness={INK_W * 0.8} color={P.ink} />
      </mesh>
      {/* brass ribs over the glass */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={i} position={[Math.cos(a) * 0.178, 0, Math.sin(a) * 0.178]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.02, 0.5, 0.02]} />
            {brass}
          </mesh>
        )
      })}
      <mesh position={[0, -0.33, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.15, 0.16, 8]} />
        {brass}
      </mesh>
      <pointLight color="#ffcf8f" intensity={intensity} distance={distance} decay={1.5} />
    </group>
  )
}

/* ── fountain ────────────────────────────────────────────────── */

const PETALS = 34

/** A tiled courtyard fountain with a raised bowl and rose petals floating on the water. */
export function Fountain(group: GroupProps) {
  const tile = useTex('basin', 5, 1)
  const water = useRef<THREE.MeshStandardMaterial>(null)
  const petals = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = petals.current
    if (!m) return
    const r = rng(77)
    const mat = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (let i = 0; i < PETALS; i++) {
      const a = r() * Math.PI * 2
      const d = 0.55 + r() * 0.85
      e.set(-Math.PI / 2, 0, r() * Math.PI)
      q.setFromEuler(e)
      const s = 0.6 + r() * 0.6
      mat.compose(new THREE.Vector3(Math.cos(a) * d, 0.452, Math.sin(a) * d), q, new THREE.Vector3(s, s, s))
      m.setMatrixAt(i, mat)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(({ clock }) => {
    if (!water.current || prefersReducedMotion()) return
    water.current.emissiveIntensity = 0.28 + Math.sin(clock.elapsedTime * 1.3) * 0.06
  })

  return (
    <group {...group}>
      {/* basin */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[1.55, 1.6, 0.48, 48, 1, true]} />
        <meshStandardMaterial map={tile} roughness={0.3} side={THREE.DoubleSide} />
        <Outlines thickness={INK_W} color={P.ink} />
      </mesh>
      <mesh position={[0, 0.49, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.56, 0.07, 10, 64]} />
        <meshStandardMaterial color={P.marble} roughness={0.5} />
        <Outlines thickness={INK_W * 0.8} color={P.ink} />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.53, 48]} />
        <meshStandardMaterial ref={water} color="#2f8a86" emissive="#1d6b6a" emissiveIntensity={0.3} roughness={0.08} metalness={0.2} />
      </mesh>
      <instancedMesh ref={petals} args={[undefined, undefined, PETALS]} raycast={() => null}>
        <circleGeometry args={[0.045, 6]} />
        <meshStandardMaterial color="#c0392b" roughness={0.6} side={THREE.DoubleSide} />
      </instancedMesh>
      {/* pedestal and upper bowl */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.13, 0.2, 0.95, 20]} />
        <meshStandardMaterial color={P.marble} roughness={0.55} />
        <Outlines thickness={INK_W} color={P.ink} />
      </mesh>
      <mesh position={[0, 1.42, 0]} scale={[1, 0.38, 1]}>
        <sphereGeometry args={[0.7, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={P.marble} roughness={0.5} side={THREE.DoubleSide} />
        <Outlines thickness={INK_W} color={P.ink} />
      </mesh>
      <mesh position={[0, 1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.66, 32]} />
        <meshStandardMaterial color="#2f8a86" emissive="#1d6b6a" emissiveIntensity={0.35} roughness={0.08} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.69, 0.035, 8, 40]} />
        <meshStandardMaterial color={P.gold} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial color={P.gold} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* a thin falling sheet of water from the bowl */}
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.66, 0.74, 0.96, 32, 1, true]} />
        <meshStandardMaterial color="#9fe0dc" transparent opacity={0.14} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ── planter ─────────────────────────────────────────────────── */

/** A terracotta pot with a shrub in red bloom. */
export function Planter({ seed = 1, ...group }: GroupProps & { seed?: number }) {
  const leaves = useRef<THREE.InstancedMesh>(null)
  const flowers = useRef<THREE.InstancedMesh>(null)
  const LEAVES = 14
  const FLOWERS = 22

  useLayoutEffect(() => {
    const r = rng(seed * 97)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const place = (mesh: THREE.InstancedMesh | null, n: number, spread: number, size: [number, number], lift: number) => {
      if (!mesh) return
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2
        const d = Math.sqrt(r()) * spread
        const s = size[0] + r() * (size[1] - size[0])
        m.compose(new THREE.Vector3(Math.cos(a) * d, lift + r() * 0.55 - d * 0.3, Math.sin(a) * d), q, new THREE.Vector3(s, s, s))
        mesh.setMatrixAt(i, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    place(leaves.current, LEAVES, 0.38, [0.16, 0.24], 0.72)
    place(flowers.current, FLOWERS, 0.46, [0.05, 0.08], 0.82)
  }, [seed])

  return (
    <group {...group}>
      <mesh position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.34, 0.24, 0.54, 20]} />
        <meshStandardMaterial color={P.terra} roughness={0.85} />
        <Outlines thickness={INK_W} color={P.ink} />
      </mesh>
      <mesh position={[0, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.035, 8, 24]} />
        <meshStandardMaterial color="#9c4a30" roughness={0.85} />
      </mesh>
      <instancedMesh ref={leaves} args={[undefined, undefined, LEAVES]} raycast={() => null}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4f6b3a" roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={flowers} args={[undefined, undefined, FLOWERS]} raycast={() => null}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#c8322a" roughness={0.7} flatShading />
      </instancedMesh>
    </group>
  )
}

/* ── cypress ─────────────────────────────────────────────────── */

export function Cypress({ height = 6, ...group }: GroupProps & { height?: number }) {
  return (
    <group {...group}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 8]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
      <mesh position={[0, 0.5 + height / 2, 0]} scale={[1, 1, 1]}>
        <coneGeometry args={[0.75, height, 10]} />
        <meshStandardMaterial color="#2c4532" roughness={0.95} flatShading />
        <Outlines thickness={0.03} color="#14201a" />
      </mesh>
    </group>
  )
}
