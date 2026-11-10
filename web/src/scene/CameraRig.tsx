import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type ElementRef } from 'react'
import * as THREE from 'three'
import { usePose } from '../pose'
import { useStore } from '../store'
import { clamp, prefersReducedMotion, sleep } from '../util'
import { POSES, ROOM_BOUNDS } from './constants'

type Controls = ElementRef<typeof CameraControls>

const EYE = 1.75

/**
 * Owns the camera: the walk through the door, flying to a shelf when one is
 * opened, jumping between rooms, and keeping you inside the walls.
 */
export function CameraRig() {
  const controls = useRef<Controls>(null)
  const { size, camera } = useThree()
  const phase = useStore((s) => s.phase)
  const doorOpen = useStore((s) => s.doorOpen)
  const room = useStore((s) => s.room)
  const activeShelf = useStore((s) => s.activeShelf)
  const shelfLayout = useStore((s) => (s.activeShelf ? s.layout[s.activeShelf] : undefined))
  const lastRoom = useRef(room)
  const poseClock = useRef(0)
  const dir = useRef(new THREE.Vector3())

  // Initial pose + keep the camera inside the room once you are in.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const s = useStore.getState()
    const start = s.room === 'personal' ? POSES.personal : s.phase === 'hall' ? POSES.hall : POSES.door
    void c.setLookAt(...start.pos, ...start.target, false)

    const keepInside = () => {
      const st = useStore.getState()
      if (st.phase !== 'hall') return
      const b = ROOM_BOUNDS[st.room]
      const p = c.camera.position
      const x = clamp(p.x, b.minX + 0.45, b.maxX - 0.45)
      const z = clamp(p.z, b.minZ + 0.45, b.maxZ - 0.45)
      const y = clamp(p.y, 0.5, b.height - 0.5)
      if (x !== p.x || y !== p.y || z !== p.z) p.set(x, y, z)
    }
    c.addEventListener('update', keepInside)
    return () => c.removeEventListener('update', keepInside)
  }, [])

  // Door opened: wait for the leaves to swing, then walk inside.
  useEffect(() => {
    const c = controls.current
    if (!c || !doorOpen || phase !== 'door') return
    let cancelled = false
    const reduced = prefersReducedMotion()
    void (async () => {
      await sleep(reduced ? 0 : 650)
      if (cancelled) return
      c.smoothTime = reduced ? 0.01 : 1.1
      await Promise.race([c.setLookAt(...POSES.hall.pos, ...POSES.hall.target, true), sleep(2600)])
      if (!cancelled) useStore.getState().finishEntering()
    })()
    return () => {
      cancelled = true
    }
  }, [doorOpen, phase])

  // Shelf opened / closed, or room changed.
  useEffect(() => {
    const c = controls.current
    if (!c || phase !== 'hall') return
    const roomChanged = lastRoom.current !== room
    lastRoom.current = room
    const reduced = prefersReducedMotion()
    c.smoothTime = reduced ? 0.01 : 0.7
    const animate = !roomChanged

    if (activeShelf && shelfLayout) {
      const persp = camera as THREE.PerspectiveCamera
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(persp.fov / 2))
      const aspect = size.width / size.height
      const wide = size.width > 760

      // Fit the whole case and its sign into the part of the screen the UI leaves free:
      // the side panel on wide screens, the bottom sheet on phones.
      const availW = wide ? clamp(1 - 640 / size.width, 0.4, 0.92) : 0.96
      const availH = wide ? 0.88 : 0.46
      const totalH = shelfLayout.height + 1.05
      const needW = shelfLayout.width + 0.6
      const dist = Math.max(2.8, totalH / (2 * tanHalf * availH), needW / (2 * tanHalf * aspect * availW))

      const visibleH = 2 * dist * tanHalf
      const ty = wide ? totalH / 2 : totalH / 2 - visibleH * 0.2
      const nx = Math.sin(shelfLayout.rotation)
      const nz = Math.cos(shelfLayout.rotation)
      void c.setLookAt(shelfLayout.x + nx * dist, EYE, shelfLayout.z + nz * dist, shelfLayout.x, ty, shelfLayout.z, animate)
    } else {
      const p = room === 'personal' ? POSES.personal : POSES.hall
      void c.setLookAt(...p.pos, ...p.target, animate)
    }
  }, [activeShelf, shelfLayout, room, phase, size.width, size.height, camera])

  // Publish position for the minimap.
  useFrame((state, dt) => {
    poseClock.current += dt
    if (poseClock.current < 0.1) return
    poseClock.current = 0
    const p = state.camera.position
    const d = state.camera.getWorldDirection(dir.current)
    usePose.getState().set(p.x, p.z, Math.atan2(d.x, d.z))
  })

  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={phase === 'hall'}
      minDistance={0.8}
      maxDistance={13}
      minPolarAngle={Math.PI * 0.36}
      maxPolarAngle={Math.PI * 0.56}
      dollySpeed={0.6}
    />
  )
}
