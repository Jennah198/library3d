import { Billboard, Stars } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ArchNiche, Column, Cypress, Entablature, Lantern, Planter } from './Architecture'
import { P, useTex } from './art'
import { DOOR_H, DOOR_W, HALL, WALL_X } from './constants'
import { Label3D } from './Label3D'

const FACADE_W = 15.2
const H = HALL.height
const PORCH = 0.3
const COL_Z = [-5.8, -2.6, 2.6, 5.8]
const PED_W = 16
const PED_H = 2.1

function rect(x0: number, y0: number, x1: number, y1: number) {
  const s = new THREE.Shape()
  s.moveTo(x0, y0)
  s.lineTo(x1, y0)
  s.lineTo(x1, y1)
  s.lineTo(x0, y1)
  s.closePath()
  return s
}

/**
 * The library's temple front, seen from the garden at dusk: a stone facade with an arched
 * doorway, four Ionic columns, a pediment carrying the name, cypresses and a crescent moon.
 * Built in the facade's own frame: local x runs along the wall (world +z), local +z points out.
 */
export function Exterior() {
  const stone = useTex('stone', 0.5, 0.5)
  const moon = useTex('moon')
  const path = useTex('stone', 6.25, 1.5)

  const geo = useMemo(() => {
    const hw = FACADE_W / 2
    const dw = DOOR_W / 2
    const wall = new THREE.ShapeGeometry([rect(-hw, 0, -dw, H), rect(dw, 0, hw, H), rect(-dw, DOOR_H, dw, H)])
    const tri = new THREE.Shape()
    tri.moveTo(-PED_W / 2, 0)
    tri.lineTo(PED_W / 2, 0)
    tri.lineTo(0, PED_H)
    tri.closePath()
    const pediment = new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false })
    return { wall, pediment }
  }, [])
  useEffect(
    () => () => {
      geo.wall.dispose()
      geo.pediment.dispose()
    },
    [geo],
  )

  const rake = Math.atan2(PED_H, PED_W / 2)
  const rakeLen = Math.hypot(PED_W / 2, PED_H) + 0.35

  return (
    <group>
      <Stars radius={80} depth={30} count={1400} factor={3.2} saturation={0} fade speed={0} />
      <Billboard position={[9, 22, -22]}>
        <mesh raycast={() => null}>
          <planeGeometry args={[7, 7]} />
          <meshBasicMaterial map={moon} transparent depthWrite={false} fog={false} toneMapped={false} />
        </mesh>
      </Billboard>
      <directionalLight position={[-40, 25, -20]} intensity={0.55} color="#cfe0d0" />

      {/* garden ground, path and cypresses */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#26331f" roughness={1} />
      </mesh>
      <mesh position={[-26, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.5, 3]} />
        <meshStandardMaterial map={path} color="#cbb894" roughness={0.95} />
      </mesh>
      {[
        [-17.5, 9.0, 6.4],
        [-21.5, 9.8, 7.2],
        [-26, 10.6, 6.2],
        [-30, 11.6, 7.4],
      ].flatMap(([x, z, h]) =>
        [-1, 1].map((s) => <Cypress key={`${x}${s}`} position={[x!, 0, s * z!]} height={h!} />),
      )}
      <Planter seed={11} position={[-22.4, 0, 2.1]} />
      <Planter seed={12} position={[-22.4, 0, -2.1]} />
      <Planter seed={13} position={[-28.4, 0, 2.1]} />
      <Planter seed={14} position={[-28.4, 0, -2.1]} />

      <group position={[WALL_X - 0.2 - 0.005, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* stepped porch */}
        <mesh position={[0, PORCH / 4, 3.3]}>
          <boxGeometry args={[14.4, PORCH / 2, 6.6]} />
          <meshStandardMaterial color={P.sand} roughness={0.9} />
        </mesh>
        <mesh position={[0, (PORCH * 3) / 4, 3.0]}>
          <boxGeometry args={[13.8, PORCH / 2, 6.0]} />
          <meshStandardMaterial color={P.marble} roughness={0.85} />
        </mesh>

        {/* facade with the doorway cut out */}
        <mesh geometry={geo.wall}>
          <meshStandardMaterial map={stone} roughness={0.95} />
        </mesh>

        {/* the arched door surround: terracotta jambs and a sunburst tympanum */}
        <ArchNiche w={DOOR_W} spring={DOOR_H} apex={DOOR_H + 1.25} base={DOOR_H} tex="tympanum" band={0.22} frame={P.terra} position={[0, 0, 0.004]} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (DOOR_W / 2 + 0.11), DOOR_H / 2, 0.02]}>
            <boxGeometry args={[0.22, DOOR_H, 0.04]} />
            <meshStandardMaterial color={P.terra} roughness={0.8} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 1.85, 2.75, 0.36]}>
            <mesh position={[0, 0.55, -0.18]}>
              <boxGeometry args={[0.05, 0.05, 0.36]} />
              <meshStandardMaterial color="#9a7432" metalness={0.7} roughness={0.35} />
            </mesh>
            <Lantern intensity={16} distance={12} />
          </group>
        ))}

        {/* portico */}
        {COL_Z.map((x) => (
          <Column key={x} height={H - 0.7 - PORCH} position={[x, PORCH, 0.42]} />
        ))}
        <Entablature length={PED_W} height={0.7} depth={0.85} position={[0, H - 0.35, 0]} />

        {/* pediment with the library's name */}
        <group position={[0, H, 0.15]}>
          <mesh geometry={geo.pediment}>
            <meshStandardMaterial color={P.teal} roughness={0.85} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[(s * PED_W) / 4, PED_H / 2 + 0.05, 0.6]} rotation={[0, 0, -s * rake]}>
              <boxGeometry args={[rakeLen, 0.2, 0.3]} />
              <meshStandardMaterial color={P.marble} roughness={0.75} />
            </mesh>
          ))}
          <mesh position={[0, 0.06, 0.6]}>
            <boxGeometry args={[PED_W, 0.12, 0.3]} />
            <meshStandardMaterial color={P.gold} metalness={0.3} roughness={0.5} />
          </mesh>
          <Label3D text="LIBRARY" family="display" color="#e9c97c" width={4.4} height={0.62} position={[0, 0.82, 0.52]} />
          <Label3D text="ቤተ መጻሕፍት" width={1.8} height={0.26} color="#efe2c4" position={[-1.3, 0.34, 0.52]} />
          <Label3D text="مكتبة" width={1.8} height={0.3} color="#efe2c4" position={[1.3, 0.34, 0.52]} />
          <mesh position={[0, PED_H - 0.12, 0.7]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color={P.gold} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>

        <Planter seed={21} position={[-4.2, PORCH, 1.1]} />
        <Planter seed={22} position={[4.2, PORCH, 1.1]} />
      </group>
    </group>
  )
}
