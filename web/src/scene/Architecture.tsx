import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { prefersReducedMotion } from '../util'
import { archFrame, archShape, P, rng, useTex, type TexKey } from './art'
import { usePBR, useRelief } from './pbr'

type GroupProps = Omit<ThreeElements['group'], 'ref' | 'children'>

const GILT = { color: '#c9a14a', metalness: 0.95, roughness: 0.3 } as const
const BRONZE = { color: '#5a4126', metalness: 0.85, roughness: 0.45 } as const

/* ── Ionic column in veined marble ───────────────────────────── */

export function Column({ height, ...group }: GroupProps & { height: number }) {
  const shaft = usePBR('flutes')
  const stone = usePBR('marble', 0.5, 0.5)
  const shaftH = height - 0.24 - 0.26
  const marble = <meshStandardMaterial {...stone} roughness={1} />
  return (
    <group {...group}>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.1, 0.82]} />
        {marble}
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.38, 0.1, 40]} />
        {marble}
      </mesh>
      <mesh position={[0, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.31, 0.045, 12, 40]} />
        {marble}
      </mesh>
      <mesh position={[0, 0.24 + shaftH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.29, shaftH, 48, 1, true]} />
        <meshStandardMaterial {...shaft} roughness={1} />
      </mesh>
      {/* capital: necking ring, echinus, volutes, abacus */}
      <group position={[0, height - 0.26, 0]}>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.255, 0.028, 10, 36]} />
          <meshStandardMaterial {...GILT} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.27, 0.12, 36]} />
          {marble}
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.36, 0.1, 0]}>
            {[-0.2, 0.2].map((z) => (
              <mesh key={z} position={[0, 0, z]} castShadow>
                <torusGeometry args={[0.085, 0.034, 12, 28]} />
                {marble}
              </mesh>
            ))}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.4, 20]} />
              {marble}
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.21, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 0.1, 0.72]} />
          {marble}
        </mesh>
      </group>
    </group>
  )
}

/* ── arch niche: a painted panel in a gilt frame ─────────────── */

/**
 * A mural in a pointed arch, framed by a gilt moulding and a bronze fillet.
 * Lies in the local XY plane facing +z; the bottom edge is at y = `base`.
 */
export function ArchNiche({
  w,
  spring,
  apex,
  base = 0,
  tex = 'niche',
  band = 0.14,
  frame,
  emissive = 0,
  ...group
}: GroupProps & { w: number; spring: number; apex: number; base?: number; tex?: TexKey; band?: number; frame?: string; emissive?: number }) {
  const h = apex - base
  const map = useTex(tex, 1 / w, 1 / h, 0.5, -base / h)
  const relief = useRelief(tex, 2.5, 1 / w, 1 / h, 0.5, -base / h)
  const { panel, gold, fillet } = useMemo(
    () => ({
      panel: new THREE.ShapeGeometry(archShape(w, spring, apex, base), 32),
      gold: new THREE.ExtrudeGeometry(archFrame(w, spring, apex, band, base), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 32 }),
      fillet: new THREE.ShapeGeometry(archFrame(w + band * 2 + 0.024, spring, apex + band * 1.4 + 0.017, 0.03, base), 32),
    }),
    [w, spring, apex, base, band],
  )
  useLayoutEffect(
    () => () => {
      panel.dispose()
      gold.dispose()
      fillet.dispose()
    },
    [panel, gold, fillet],
  )
  return (
    <group {...group}>
      <mesh geometry={panel} receiveShadow>
        <meshStandardMaterial map={map} normalMap={relief} roughness={0.82} emissiveMap={emissive ? map : null} emissive={emissive ? '#ffffff' : '#000000'} emissiveIntensity={emissive} />
      </mesh>
      <mesh geometry={gold} position={[0, 0, 0.002]} castShadow receiveShadow>
        <meshStandardMaterial {...GILT} color={frame ?? GILT.color} metalness={frame ? 0.1 : GILT.metalness} roughness={frame ? 0.7 : GILT.roughness} />
      </mesh>
      <mesh geometry={fillet} position={[0, 0, 0.004]}>
        <meshStandardMaterial {...BRONZE} />
      </mesh>
    </group>
  )
}

/* ── entablature ─────────────────────────────────────────────── */

/** The beam along the top of a wall: marble mouldings around a painted frieze (faces +z). */
export function Entablature({ length, height = 0.6, depth = 0.36, ...group }: GroupProps & { length: number; height?: number; depth?: number }) {
  const map = useTex('frieze', length / 4.8, 1)
  const relief = useRelief('frieze', 3, length / 4.8, 1)
  const stone = usePBR('marble', length / 3, 0.4)
  return (
    <group {...group}>
      <mesh position={[0, 0, depth / 2]} receiveShadow>
        <boxGeometry args={[length, height, depth]} />
        <meshStandardMaterial {...stone} roughness={1} />
      </mesh>
      <mesh position={[0, -height * 0.08, depth + 0.002]} receiveShadow>
        <planeGeometry args={[length, height * 0.7]} />
        <meshStandardMaterial map={map} normalMap={relief} roughness={0.75} />
      </mesh>
      <mesh position={[0, height / 2 - 0.04, depth / 2 + 0.04]} receiveShadow>
        <boxGeometry args={[length, 0.08, depth + 0.08]} />
        <meshStandardMaterial {...stone} roughness={1} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.02, depth / 2 + 0.02]} receiveShadow>
        <boxGeometry args={[length, 0.04, depth + 0.04]} />
        <meshStandardMaterial {...stone} roughness={1} />
      </mesh>
    </group>
  )
}

/* ── hanging lantern ─────────────────────────────────────────── */

/** A pierced brass lantern with a warm flame-coloured glass and a light inside. */
export function Lantern({ chain = 0, intensity = 30, distance = 17, ...group }: GroupProps & { chain?: number; intensity?: number; distance?: number }) {
  const brass = <meshStandardMaterial color="#9a7432" metalness={0.95} roughness={0.32} />
  return (
    <group {...group}>
      {chain > 0 && (
        <mesh position={[0, 0.42 + chain / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, chain, 6]} />
          <meshStandardMaterial color="#2b2118" metalness={0.8} roughness={0.5} />
        </mesh>
      )}
      <mesh position={[0, 0.36, 0]} castShadow>
        <coneGeometry args={[0.25, 0.22, 8]} />
        {brass}
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.04, 12, 10]} />
        {brass}
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.2, 0.15, 0.5, 8, 1, true]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffb050" emissiveIntensity={3.2} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={i} position={[Math.cos(a) * 0.178, 0, Math.sin(a) * 0.178]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.018, 0.5, 0.018]} />
            {brass}
          </mesh>
        )
      })}
      <mesh position={[0, -0.33, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.15, 0.16, 8]} />
        {brass}
      </mesh>
      <pointLight color="#ffc987" intensity={intensity} distance={distance} decay={1.6} />
    </group>
  )
}

/* ── fountain ────────────────────────────────────────────────── */

const PETALS = 34

/** A tiled marble fountain with a raised bowl and rose petals floating on clear water. */
export function Fountain(group: GroupProps) {
  const tile = useTex('basin', 5, 1)
  const tileRelief = useRelief('basin', 3, 5, 1)
  const stone = usePBR('marble', 1, 1)
  const water = useRef<THREE.MeshPhysicalMaterial>(null)
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
      e.set(-Math.PI / 2 + (r() - 0.5) * 0.3, (r() - 0.5) * 0.3, r() * Math.PI)
      q.setFromEuler(e)
      const s = 0.6 + r() * 0.6
      mat.compose(new THREE.Vector3(Math.cos(a) * d, 0.452, Math.sin(a) * d), q, new THREE.Vector3(s, s * 0.7, s))
      m.setMatrixAt(i, mat)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(({ clock }) => {
    const w = water.current
    if (!w || prefersReducedMotion()) return
    // a slow drift of the ripple pattern across the surface
    if (w.normalMap) w.normalMap.offset.set(clock.elapsedTime * 0.01, clock.elapsedTime * 0.006)
  })

  const ripples = usePBR('plaster', 3, 3)

  return (
    <group {...group}>
      <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.6, 0.48, 64, 1, true]} />
        <meshStandardMaterial map={tile} normalMap={tileRelief} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.49, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[1.56, 0.07, 14, 80]} />
        <meshStandardMaterial {...stone} roughness={1} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.56, 48]} />
        <meshStandardMaterial map={tile} roughness={0.4} color="#6aa6a2" />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.53, 64]} />
        <meshPhysicalMaterial
          ref={water}
          color="#2f7f7c"
          roughness={0.04}
          metalness={0}
          transmission={0.6}
          thickness={0.4}
          ior={1.33}
          clearcoat={1}
          normalMap={ripples.normalMap}
          normalScale={new THREE.Vector2(0.15, 0.15)}
          transparent
          opacity={0.92}
        />
      </mesh>
      <instancedMesh ref={petals} args={[undefined, undefined, PETALS]} raycast={() => null} receiveShadow>
        <circleGeometry args={[0.045, 10]} />
        <meshStandardMaterial color="#b02a22" roughness={0.55} side={THREE.DoubleSide} />
      </instancedMesh>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.2, 0.95, 32]} />
        <meshStandardMaterial {...stone} roughness={1} />
      </mesh>
      <mesh position={[0, 1.42, 0]} scale={[1, 0.38, 1]} castShadow receiveShadow>
        <sphereGeometry args={[0.7, 48, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial {...stone} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.66, 40]} />
        <meshPhysicalMaterial color="#2f7f7c" roughness={0.05} clearcoat={1} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.69, 0.035, 10, 48]} />
        <meshStandardMaterial {...GILT} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.1, 24, 16]} />
        <meshStandardMaterial {...GILT} />
      </mesh>
      {/* a thin sheet of water falling from the bowl */}
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.66, 0.74, 0.96, 48, 1, true]} />
        <meshPhysicalMaterial color="#cfeeea" roughness={0.1} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ── planter ─────────────────────────────────────────────────── */

/** A terracotta pot with a dense shrub in red bloom. */
export function Planter({ seed = 1, ...group }: GroupProps & { seed?: number }) {
  const leaves = useRef<THREE.InstancedMesh>(null)
  const flowers = useRef<THREE.InstancedMesh>(null)
  const LEAVES = 140
  const FLOWERS = 40

  useLayoutEffect(() => {
    const r = rng(seed * 97)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const col = new THREE.Color()
    const v = new THREE.Vector3()
    const place = (mesh: THREE.InstancedMesh | null, n: number, radius: number, size: [number, number], tint: (c: THREE.Color) => void) => {
      if (!mesh) return
      for (let i = 0; i < n; i++) {
        // points on a slightly flattened dome above the pot
        v.set(r() - 0.5, r() * 0.9, r() - 0.5).normalize().multiplyScalar(radius * (0.7 + r() * 0.3))
        v.y = 0.62 + v.y * 0.85
        e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI)
        q.setFromEuler(e)
        const s = size[0] + r() * (size[1] - size[0])
        mesh.setMatrixAt(i, m.compose(v, q, new THREE.Vector3(s, s * 0.35, s * 0.6)))
        tint(col)
        mesh.setColorAt(i, col)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    place(leaves.current, LEAVES, 0.42, [0.07, 0.11], (c) => c.setHSL(0.25 + r() * 0.05, 0.45, 0.16 + r() * 0.12))
    place(flowers.current, FLOWERS, 0.46, [0.035, 0.05], (c) => c.setHSL(0.0 + r() * 0.02, 0.75, 0.35 + r() * 0.1))
  }, [seed])

  return (
    <group {...group}>
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.24, 0.54, 40]} />
        <meshStandardMaterial color="#a65a3c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.34, 0.035, 12, 40]} />
        <meshStandardMaterial color="#94492f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 24]} />
        <meshStandardMaterial color="#3b2a1c" roughness={1} />
      </mesh>
      <instancedMesh ref={leaves} args={[undefined, undefined, LEAVES]} raycast={() => null} castShadow receiveShadow>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={flowers} args={[undefined, undefined, FLOWERS]} raycast={() => null} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.55} />
      </instancedMesh>
    </group>
  )
}

/* ── cypress ─────────────────────────────────────────────────── */

export function Cypress({ height = 6, ...group }: GroupProps & { height?: number }) {
  const tiers = 7
  return (
    <group {...group}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 10]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </mesh>
      {Array.from({ length: tiers }, (_, i) => {
        const t = i / (tiers - 1)
        const r = 0.78 * (1 - t * 0.85)
        return (
          <mesh key={i} position={[0, 0.6 + t * (height - 0.6), 0]} scale={[r, (height / tiers) * 0.95, r]} castShadow>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color={i % 2 ? '#2f4a33' : '#2a4430'} roughness={0.95} />
          </mesh>
        )
      })}
    </group>
  )
}
