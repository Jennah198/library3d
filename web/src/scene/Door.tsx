import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { prefersReducedMotion } from '../util'
import { DOOR_H, DOOR_W, WALL_X } from './constants'

const OPEN_ANGLE = 1.7
const PANEL_W = DOOR_W / 2
const WOOD = '#4f321d'
const WOOD_LIGHT = '#6a4527'
const BRASS = '#d6b25e'

/** Double door in the west wall. Click either leaf to open; the camera then walks in. */
export function Door() {
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
        <mesh position={[0, DOOR_H / 2, 0]}>
          <boxGeometry args={[0.08, DOOR_H, PANEL_W]} />
          <meshStandardMaterial color={WOOD} roughness={0.7} />
        </mesh>
        {/* raised panels on the outside face */}
        {[0.75, 2.2].map((y) => (
          <mesh key={y} position={[-0.05, y, 0]}>
            <boxGeometry args={[0.03, y < 1 ? 1.0 : 1.5, PANEL_W - 0.3]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.65} />
          </mesh>
        ))}
        {/* gilded boss on each leaf */}
        <mesh position={[-0.07, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.03, 16]} />
          <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* handle by the meeting edge */}
        <mesh position={[-0.1, 1.1, side * (PANEL_W / 2 - 0.12) * -1]}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )

  return (
    <group>
      {leaf(-1)}
      {leaf(1)}
    </group>
  )
}
