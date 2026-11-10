import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { useStore } from '../store'
import { P } from './art'
import { CameraRig } from './CameraRig'
import { POSES } from './constants'
import { PersonalRoom } from './PersonalRoom'
import { PublicHall } from './PublicHall'

export function Library3D() {
  const room = useStore((s) => s.room)
  const start = useMemo(() => {
    const s = useStore.getState()
    return s.room === 'personal' ? POSES.personal : s.phase === 'hall' ? POSES.hall : POSES.door
  }, [])

  return (
    <Canvas
      className="scene"
      dpr={[1, 1.75]}
      camera={{ fov: 55, near: 0.1, far: 160, position: start.pos }}
      gl={{ antialias: true }}
      aria-label="3D library. Use the list view for a keyboard-friendly alternative."
    >
      <color attach="background" args={[P.sky]} />
      <Suspense fallback={null}>{room === 'public' ? <PublicHall /> : <PersonalRoom />}</Suspense>
      <CameraRig />
    </Canvas>
  )
}
