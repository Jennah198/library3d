import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { prefersReducedMotion } from '../util'
import { DOOR_H, DOOR_W, WALL_X } from './constants'
import { pbr } from './pbr'

const OPEN_ANGLE = 1.7
const PANEL_W = DOOR_W / 2
/** Leaf thickness (along x, through the wall). */
const T = 0.075
const STILE = 0.17
const RAIL_TOP = 0.17
const RAIL_LOCK = 0.2
const RAIL_BOT = 0.3
const LOCK_Y = 1.05
const WALL_T = 0.4

/* ── shared parts ────────────────────────────────────────────── */

let parts: ReturnType<typeof makeParts> | null = null

function makeParts() {
  const wood = (key: 'oak' | 'oakH', rx: number, ry: number) => {
    const s = pbr(key)
    const c = (t: THREE.Texture) => {
      const k = t.clone()
      k.repeat.set(rx, ry)
      k.needsUpdate = true
      return k
    }
    return new THREE.MeshStandardMaterial({ map: c(s.map!), normalMap: c(s.normalMap), roughnessMap: c(s.roughnessMap), roughness: 0.9, color: '#8f6d4f' })
  }
  /** A raised panel: a flat field whose bevelled edges slope down to the frame. */
  const raised = (w: number, h: number) => {
    const inset = 0.055
    const s = new THREE.Shape()
    s.moveTo(-w / 2 + inset, -h / 2 + inset)
    s.lineTo(w / 2 - inset, -h / 2 + inset)
    s.lineTo(w / 2 - inset, h / 2 - inset)
    s.lineTo(-w / 2 + inset, h / 2 - inset)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.016, bevelSize: inset - 0.004, bevelSegments: 2 })
    // planar UVs in metres so the grain runs up the panel
    const pos = g.attributes.position!
    const uv = g.attributes.uv!
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) * 2.2, pos.getY(i) * 0.5)
    return g
  }
  const fieldW = PANEL_W - STILE * 2
  return {
    stile: wood('oak', 0.35, 2.2),
    rail: wood('oakH', 1, 0.25),
    panel: wood('oak', 1, 1),
    iron: new THREE.MeshStandardMaterial({ color: '#2a2724', metalness: 0.75, roughness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b48a3e', metalness: 0.95, roughness: 0.28 }),
    box: new THREE.BoxGeometry(1, 1, 1),
    stud: new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    lower: raised(fieldW, LOCK_Y - RAIL_LOCK / 2 - RAIL_BOT),
    upper: raised(fieldW, DOOR_H - RAIL_TOP - (LOCK_Y + RAIL_LOCK / 2)),
  }
}

function useParts() {
  parts ??= makeParts()
  return parts
}

/* ── one leaf ────────────────────────────────────────────────── */

/**
 * A frame-and-panel oak leaf, built centred on its own origin: width along z, thickness along x.
 * `meet` is the z sign of the edge where the two leaves meet.
 */
function Leaf({ meet }: { meet: 1 | -1 }) {
  const P = useParts()
  const fieldW = PANEL_W - STILE * 2
  const lowerY = (RAIL_BOT + LOCK_Y - RAIL_LOCK / 2) / 2
  const upperY = (LOCK_Y + RAIL_LOCK / 2 + DOOR_H - RAIL_TOP) / 2
  const hinge = -meet
  return (
    <group>
      {/* stiles and rails */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={P.box} material={P.stile} position={[0, DOOR_H / 2, s * (PANEL_W / 2 - STILE / 2)]} scale={[T, DOOR_H, STILE]} castShadow receiveShadow />
      ))}
      {[
        [DOOR_H - RAIL_TOP / 2, RAIL_TOP],
        [LOCK_Y, RAIL_LOCK],
        [RAIL_BOT / 2, RAIL_BOT],
      ].map(([y, h]) => (
        <mesh key={y} geometry={P.box} material={P.rail} position={[0, y!, 0]} scale={[T, h!, fieldW]} castShadow receiveShadow />
      ))}
      {/* panel boards, raised on both faces */}
      {(
        [
          [lowerY, P.lower, LOCK_Y - RAIL_LOCK / 2 - RAIL_BOT],
          [upperY, P.upper, DOOR_H - RAIL_TOP - (LOCK_Y + RAIL_LOCK / 2)],
        ] as const
      ).map(([y, geo, h]) => (
        <group key={y} position={[0, y, 0]}>
          <mesh geometry={P.box} material={P.panel} scale={[0.024, h, fieldW]} receiveShadow />
          <mesh geometry={geo} material={P.panel} position={[-0.012, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow />
          <mesh geometry={geo} material={P.panel} position={[0.012, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow />
        </group>
      ))}

      {/* wrought-iron strap hinges with nail heads, on the outside face */}
      {[0.42, DOOR_H / 2 + 0.2, DOOR_H - 0.42].map((y) => (
        <group key={y} position={[-T / 2 - 0.004, y, hinge * (PANEL_W / 2 - 0.3)]}>
          <mesh geometry={P.box} material={P.iron} scale={[0.008, 0.055, 0.6]} castShadow />
          <mesh geometry={P.box} material={P.iron} position={[0, 0, hinge * 0.3]} scale={[0.008, 0.085, 0.07]} castShadow />
          {[-0.22, -0.08, 0.06, 0.2].map((z) => (
            <mesh key={z} geometry={P.stud} material={P.iron} position={[-0.004, 0, z]} rotation={[0, 0, Math.PI / 2]} scale={0.011} />
          ))}
        </group>
      ))}
      {/* studs along the lock rail */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} geometry={P.stud} material={P.iron} position={[-T / 2, LOCK_Y, -fieldW / 2 + 0.06 + i * ((fieldW - 0.12) / 5)]} rotation={[0, 0, Math.PI / 2]} scale={0.014} />
      ))}

      {/* outside: brass ring pull and keyhole plate; inside: a lever */}
      <group position={[-T / 2, LOCK_Y + 0.28, meet * (PANEL_W / 2 - 0.13)]}>
        <mesh position={[-0.008, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={P.brass} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.016, 28]} />
        </mesh>
        <mesh position={[-0.03, -0.075, 0]} rotation={[0, Math.PI / 2, 0]} material={P.brass} castShadow>
          <torusGeometry args={[0.075, 0.011, 12, 36]} />
        </mesh>
      </group>
      <mesh geometry={P.box} material={P.brass} position={[-T / 2 - 0.003, LOCK_Y - 0.02, meet * (PANEL_W / 2 - 0.13)]} scale={[0.006, 0.16, 0.05]} />
      <mesh geometry={P.box} material={P.iron} position={[-T / 2 - 0.007, LOCK_Y - 0.04, meet * (PANEL_W / 2 - 0.13)]} scale={[0.004, 0.035, 0.012]} />
      <group position={[T / 2 + 0.01, LOCK_Y, meet * (PANEL_W / 2 - 0.1)]}>
        <mesh geometry={P.box} material={P.brass} scale={[0.012, 0.16, 0.045]} />
        <mesh geometry={P.box} material={P.brass} position={[0.03, 0.035, -meet * 0.06]} scale={[0.018, 0.022, 0.13]} castShadow />
      </group>

      {/* brass kick plate */}
      <mesh geometry={P.box} material={P.brass} position={[-T / 2 - 0.002, 0.11, 0]} scale={[0.004, 0.18, PANEL_W - 0.06]} />
      {/* astragal: the strip covering the gap where the leaves meet */}
      {meet === 1 && <mesh geometry={P.box} material={P.stile} position={[-T / 2 - 0.008, DOOR_H / 2, PANEL_W / 2]} scale={[0.016, DOOR_H - 0.02, 0.05]} castShadow />}
    </group>
  )
}

/** Double oak door in the west wall. Click either leaf to open; the camera then walks in. */
export function Door() {
  const P = useParts()
  const open = useStore((s) => s.doorOpen)
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const angle = useRef(open ? OPEN_ANGLE : 0)

  useFrame((_, dt) => {
    const target = open ? OPEN_ANGLE : 0
    angle.current = prefersReducedMotion() ? target : THREE.MathUtils.damp(angle.current, target, 2.6, dt)
    if (left.current) left.current.rotation.y = angle.current
    if (right.current) right.current.rotation.y = -angle.current
  })

  const onEnter = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (!useStore.getState().doorOpen) document.body.style.cursor = 'pointer'
  }
  const onClick = (e: { stopPropagation: () => void; delta: number }) => {
    if (e.delta > 4) return
    e.stopPropagation()
    document.body.style.cursor = ''
    useStore.getState().openDoor()
  }

  // Each leaf is hinged on its outer edge and swings inward (toward +x).
  const leaf = (side: -1 | 1) => (
    <group
      ref={side === -1 ? left : right}
      position={[WALL_X, 0, side * (DOOR_W / 2)]}
      onPointerOver={onEnter}
      onPointerOut={() => (document.body.style.cursor = '')}
      onClick={onClick}
    >
      <group position={[0, 0, -side * (PANEL_W / 2)]}>
        <Leaf meet={side === -1 ? 1 : -1} />
      </group>
    </group>
  )

  return (
    <group>
      {leaf(-1)}
      {leaf(1)}
      {/* oak lining the opening: two jambs and a head */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={P.box} material={P.stile} position={[WALL_X, DOOR_H / 2, s * (DOOR_W / 2 + 0.03)]} scale={[WALL_T + 0.02, DOOR_H, 0.06]} castShadow receiveShadow />
      ))}
      <mesh geometry={P.box} material={P.rail} position={[WALL_X, DOOR_H + 0.03, 0]} scale={[WALL_T + 0.02, 0.06, DOOR_W + 0.12]} castShadow receiveShadow />
    </group>
  )
}
