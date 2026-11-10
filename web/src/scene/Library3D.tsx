import { Environment, Lightformer } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { P } from './art'
import { CameraRig } from './CameraRig'
import { POSES } from './constants'
import { PersonalRoom } from './PersonalRoom'
import { PublicHall } from './PublicHall'

/**
 * Warm image-based lighting built from glowing panels (no HDR download): a bright skylight
 * overhead and lamp-coloured fill around the sides, so polished stone, brass and gilt
 * have something real to reflect.
 */
function Studio() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.55}>
      <Lightformer form="circle" intensity={6} color="#fff1d6" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={6} />
      <Lightformer form="rect" intensity={1.6} color="#ffcf8f" position={[0, 2.5, -9]} scale={[20, 3, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#ffcf8f" position={[0, 2.5, 9]} rotation={[0, Math.PI, 0]} scale={[20, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#f4dcb0" position={[-14, 3, 0]} rotation={[0, Math.PI / 2, 0]} scale={[14, 4, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#f4dcb0" position={[14, 3, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[14, 4, 1]} />
      <Lightformer form="rect" intensity={0.4} color="#6b4a2c" position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 20, 1]} />
    </Environment>
  )
}

/** A soft glow on the lamps and skylight, filmic tone mapping, a gentle vignette. */
function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1.15} luminanceSmoothing={0.15} intensity={0.45} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.32} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  )
}

export function Library3D() {
  const room = useStore((s) => s.room)
  const start = useMemo(() => {
    const s = useStore.getState()
    return s.room === 'personal' ? POSES.personal : s.phase === 'hall' ? POSES.hall : POSES.door
  }, [])

  return (
    <Canvas
      className="scene"
      dpr={[1, 1.5]}
      shadows="percentage"
      camera={{ fov: 50, near: 0.1, far: 160, position: start.pos }}
      gl={{ antialias: false, toneMapping: THREE.NoToneMapping, powerPreference: 'high-performance' }}
      aria-label="3D library. Use the list view for a keyboard-friendly alternative."
    >
      <color attach="background" args={[P.sky]} />
      <Suspense fallback={null}>
        <Studio />
        {room === 'public' ? <PublicHall /> : <PersonalRoom />}
        <Effects />
      </Suspense>
      <CameraRig />
    </Canvas>
  )
}
