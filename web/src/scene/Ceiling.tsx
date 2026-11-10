import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { pbr } from './pbr'

/** Dark walnut beams dividing the painted ceiling into coffers. */
export function CofferBeams({ minX, maxX, minZ, maxZ, y, step, depth = 0.26, width = 0.2 }: { minX: number; maxX: number; minZ: number; maxZ: number; y: number; step: number; depth?: number; width?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const beams = useMemo(() => {
    const list: [number, number, number, number][] = [] // x, z, sx, sz
    for (let x = minX; x <= maxX + 1e-6; x += step) list.push([x, (minZ + maxZ) / 2, width, maxZ - minZ])
    for (let z = minZ; z <= maxZ + 1e-6; z += step) list.push([(minX + maxX) / 2, z, maxX - minX, width])
    return list
  }, [minX, maxX, minZ, maxZ, step, width])
  const material = useMemo(() => {
    const s = pbr('walnutDark')
    return new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1 })
  }, [])

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const mat = new THREE.Matrix4()
    beams.forEach(([x, z, sx, sz], i) => {
      m.setMatrixAt(i, mat.compose(new THREE.Vector3(x, y - depth / 2, z), new THREE.Quaternion(), new THREE.Vector3(sx, depth, sz)))
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [beams, y, depth])

  return (
    <instancedMesh key={beams.length} ref={ref} args={[undefined, material, beams.length]} raycast={() => null} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

/**
 * A glazed oculus in the ceiling: bronze ring and leading, bright sky glass, and the
 * daylight it lets in, as a soft shadow-casting spotlight.
 */
export function Oculus({ y, radius }: { y: number; radius: number }) {
  const target = useMemo(() => new THREE.Object3D(), [])
  return (
    <group>
      <primitive object={target} position={[0.9, 0, 0.5]} />
      <mesh position={[0, y - 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color="#fff6e2" emissive="#fff1d2" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, y - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={false}>
        <torusGeometry args={[radius, 0.09, 16, 96]} />
        <meshStandardMaterial color="#6b4c2a" metalness={0.85} roughness={0.4} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[0, y - 0.05, 0]} rotation={[0, (i / 8) * Math.PI, 0]}>
          <boxGeometry args={[radius * 2, 0.035, 0.03]} />
          <meshStandardMaterial color="#4a3520" metalness={0.8} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, y - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.45, 0.02, 8, 64]} />
        <meshStandardMaterial color="#4a3520" metalness={0.8} roughness={0.5} />
      </mesh>
      <spotLight
        position={[0, y - 0.1, 0]}
        target={target}
        color="#fff0d8"
        intensity={240}
        angle={1.0}
        penumbra={0.9}
        decay={2}
        distance={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
      />
    </group>
  )
}
