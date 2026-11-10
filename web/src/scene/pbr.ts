import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { artCanvas, rng, type TexKey } from './art'

/**
 * Physically based material sets (colour, normal and roughness maps) generated from
 * tileable noise at startup, so surfaces have real grain and relief without shipping images.
 */

type Field = Float32Array

/** Tileable 2D value noise; `px`/`py` are the lattice sizes at which it repeats. */
function valueNoise(seed: number) {
  const N = 256
  const r = rng(seed)
  const v = new Float32Array(N * N)
  for (let i = 0; i < v.length; i++) v[i] = r()
  return (x: number, y: number, px: number, py = px) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const u = xf * xf * (3 - 2 * xf)
    const w = yf * yf * (3 - 2 * yf)
    const p = Math.max(1, Math.min(N, Math.round(px)))
    const q = Math.max(1, Math.min(N, Math.round(py)))
    const x0 = ((xi % p) + p) % p
    const y0 = ((yi % q) + q) % q
    const x1 = (x0 + 1) % p
    const y1 = (y0 + 1) % q
    const a = v[y0 * N + x0]!
    const b = v[y0 * N + x1]!
    const c = v[y1 * N + x0]!
    const d = v[y1 * N + x1]!
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w
  }
}

/** Fractal noise over [0,1)² that tiles; `base` is the lattice count of the first octave. */
function fbm(noise: ReturnType<typeof valueNoise>, u: number, v: number, base: number, octaves: number, bx = base, by = base) {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let fx = bx
  let fy = by
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(u * fx, v * fy, fx, fy)
    norm += amp
    amp *= 0.5
    fx *= 2
    fy *= 2
  }
  return sum / norm
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

interface Raw {
  w: number
  h: number
  color: Uint8ClampedArray
  height: Field
  rough: Field
}

function canvasFrom(w: number, h: number, fill: (data: Uint8ClampedArray) => void): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const img = g.createImageData(w, h)
  fill(img.data)
  g.putImageData(img, 0, 0)
  return c
}

/** Tangent-space normal map from a height field (wraps at the edges so it tiles). */
function normalCanvas(height: Field, w: number, h: number, strength: number) {
  return canvasFrom(w, h, (d) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const l = height[y * w + ((x - 1 + w) % w)]!
        const r = height[y * w + ((x + 1) % w)]!
        const t = height[((y - 1 + h) % h) * w + x]!
        const b = height[((y + 1) % h) * w + x]!
        let nx = (l - r) * strength
        let ny = (b - t) * strength
        let nz = 1
        const k = 1 / Math.hypot(nx, ny, nz)
        nx *= k
        ny *= k
        nz *= k
        const i = (y * w + x) * 4
        d[i] = (nx * 0.5 + 0.5) * 255
        d[i + 1] = (ny * 0.5 + 0.5) * 255
        d[i + 2] = (nz * 0.5 + 0.5) * 255
        d[i + 3] = 255
      }
  })
}

function roughCanvas(rough: Field, w: number, h: number) {
  return canvasFrom(w, h, (d) => {
    for (let i = 0; i < rough.length; i++) {
      const v = clamp01(rough[i]!) * 255
      d[i * 4] = v
      d[i * 4 + 1] = v
      d[i * 4 + 2] = v
      d[i * 4 + 3] = 255
    }
  })
}

function raw(w: number, h: number): Raw {
  return { w, h, color: new Uint8ClampedArray(w * h * 4), height: new Float32Array(w * h), rough: new Float32Array(w * h) }
}

function put(r: Raw, i: number, cr: number, cg: number, cb: number) {
  r.color[i * 4] = cr
  r.color[i * 4 + 1] = cg
  r.color[i * 4 + 2] = cb
  r.color[i * 4 + 3] = 255
}

/* ── generators ──────────────────────────────────────────────── */

/** Wood with long grain running along v (vertical). Light and dark are the earlywood/latewood tones. */
function wood(seed: number, light: [number, number, number], dark: [number, number, number]): Raw {
  const S = 512
  const r = raw(S, S)
  const n = valueNoise(seed)
  const n2 = valueNoise(seed + 1)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S
      const v = y / S
      // growth rings: thin dark latewood lines, warped by stretched noise, over fine fibres
      const warp = fbm(n, u, v, 3, 4, 3, 1)
      const phase = u * 22 + warp * 3.5
      const late = Math.pow(Math.abs(Math.sin(phase * Math.PI)), 9)
      const band = 0.5 + 0.5 * Math.sin(phase * Math.PI * 0.25 + warp * 4)
      const fiber = fbm(n2, u, v, 128, 3, 128, 2)
      const pore = smooth(0.7, 0.9, n2(u * 256, v * 24, 256, 24))
      const t = clamp01(0.82 - late * 0.55 - (1 - fiber) * 0.28 - pore * 0.12 + band * 0.12)
      const i = y * S + x
      put(r, i, dark[0] + (light[0] - dark[0]) * t, dark[1] + (light[1] - dark[1]) * t, dark[2] + (light[2] - dark[2]) * t)
      r.height[i] = 1 - late * 0.5 - pore * 0.3 + fiber * 0.2
      r.rough[i] = 0.38 + (1 - t) * 0.3 + pore * 0.15
    }
  return r
}

/** Rotate a raw set 90° so the grain runs along u (for horizontal boards). */
function turn(src: Raw): Raw {
  const S = src.w
  const r = raw(S, S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const si = x * S + y
      const di = y * S + x
      r.color.set(src.color.subarray(si * 4, si * 4 + 4), di * 4)
      r.height[di] = src.height[si]!
      r.rough[di] = src.rough[si]!
    }
  return r
}

/** Pebbled book leather / bookcloth, near-white so instance colours tint it. */
function leather(): Raw {
  const S = 256
  const r = raw(S, S)
  const n = valueNoise(51)
  const n2 = valueNoise(52)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S
      const v = y / S
      const pebble = fbm(n, u, v, 48, 2)
      const wear = smooth(0.55, 0.85, fbm(n2, u, v, 3, 4))
      const tone = 0.78 + fbm(n2, u, v, 8, 3) * 0.2 + wear * 0.25
      const i = y * S + x
      const c = clamp01(tone) * 255
      put(r, i, c, c * 0.98, c * 0.95)
      r.height[i] = pebble
      r.rough[i] = 0.55 + pebble * 0.25 - wear * 0.2
    }
  return r
}

/** Polished marble slabs with veins. `slabs` is how many slabs across one tile. */
function marble(slabs: number, size: number): Raw {
  const S = size
  const r = raw(S, S)
  const n = valueNoise(61)
  const n2 = valueNoise(62)
  const slab = S / Math.max(1, slabs)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S
      const v = y / S
      const turb = fbm(n, u, v, 4, 5)
      const vein1 = Math.pow(1 - Math.abs(Math.sin((u * 2 + v * 3 + turb * 3.2) * Math.PI)), 14)
      const vein2 = Math.pow(1 - Math.abs(Math.sin((u * 5 - v * 2 + fbm(n2, u, v, 8, 4) * 4) * Math.PI)), 30)
      const cloud = fbm(n2, u, v, 6, 4)
      let cr = 234 - cloud * 18 - vein1 * 70 - vein2 * 40
      let cg = 226 - cloud * 20 - vein1 * 72 - vein2 * 42
      let cb = 210 - cloud * 24 - vein1 * 78 - vein2 * 46
      let rough = 0.14 + cloud * 0.08 + vein1 * 0.08
      let h = 0.5
      if (slabs > 0) {
        const sx = Math.floor(x / slab)
        const sy = Math.floor(y / slab)
        const shade = ((sx * 7 + sy * 13) % 5) * 3
        cr -= shade
        cg -= shade
        cb -= shade
        const ex = Math.min(x % slab, slab - (x % slab))
        const ey = Math.min(y % slab, slab - (y % slab))
        const joint = 1 - smooth(0, 2.2, Math.min(ex, ey))
        cr = cr * (1 - joint * 0.45)
        cg = cg * (1 - joint * 0.45)
        cb = cb * (1 - joint * 0.45)
        rough += joint * 0.5
        h -= joint * 0.5
      }
      const i = y * S + x
      put(r, i, cr, cg, cb)
      r.height[i] = h + cloud * 0.02
      r.rough[i] = rough
    }
  return r
}

/** Fluted marble for column shafts: 20 concave flutes wrapped once around. */
function flutedMarble(): Raw {
  const W = 512
  const H = 256
  const r = raw(W, H)
  const n = valueNoise(71)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x / W
      const v = y / H
      const f = (u * 20) % 1
      const profile = f < 0.08 || f > 0.92 ? 1 : 1 - Math.sin(((f - 0.08) / 0.84) * Math.PI)
      const cloud = fbm(n, u, v, 4, 4)
      const vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + v * 1 + cloud * 3) * Math.PI)), 20)
      const i = y * W + x
      const ao = 0.82 + profile * 0.18
      put(r, i, (232 - cloud * 16 - vein * 50) * ao, (224 - cloud * 18 - vein * 52) * ao, (208 - cloud * 20 - vein * 56) * ao)
      r.height[i] = profile
      r.rough[i] = 0.3 + cloud * 0.1
    }
  return r
}

/** Page edges seen from above: fine lines across the block, slightly yellowed. */
function pages(): Raw {
  const W = 256
  const H = 64
  const r = raw(W, H)
  const n = valueNoise(81)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x / W
      const line = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 48 + n(u * 32, (y / H) * 2, 32, 2) * 2)
      const age = fbm(n, u, y / H, 4, 3)
      const i = y * W + x
      const c = 226 - line * 22 - age * 22
      put(r, i, c, c * 0.95, c * 0.82)
      r.height[i] = line
      r.rough[i] = 0.85
    }
  return r
}

/** Fine plaster relief to put under painted walls. */
function plaster(): Raw {
  const S = 256
  const r = raw(S, S)
  const n = valueNoise(91)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x
      const h = fbm(n, x / S, y / S, 16, 4)
      put(r, i, 255, 255, 255)
      r.height[i] = h
      r.rough[i] = 0.82 + h * 0.15
    }
  return r
}

/* ── texture sets ────────────────────────────────────────────── */

export interface PBRSet {
  map?: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

interface Def {
  make: () => Raw
  strength: number
  color: boolean
}

const DEFS = {
  walnut: { make: () => wood(101, [124, 82, 50], [58, 34, 18]), strength: 2.2, color: true },
  walnutH: { make: () => turn(wood(101, [124, 82, 50], [58, 34, 18])), strength: 2.2, color: true },
  walnutDark: { make: () => wood(103, [86, 54, 32], [38, 22, 12]), strength: 2, color: true },
  oak: { make: () => wood(105, [150, 104, 62], [82, 52, 28]), strength: 2.6, color: true },
  oakH: { make: () => turn(wood(105, [150, 104, 62], [82, 52, 28])), strength: 2.6, color: true },
  leather: { make: leather, strength: 3, color: true },
  marbleFloor: { make: () => marble(4, 1024), strength: 6, color: true },
  marble: { make: () => marble(0, 512), strength: 1, color: true },
  flutes: { make: flutedMarble, strength: 9, color: true },
  pages: { make: pages, strength: 2, color: true },
  plaster: { make: plaster, strength: 3, color: false },
} satisfies Record<string, Def>

export type PBRKey = keyof typeof DEFS

const cache = new Map<PBRKey, PBRSet>()

function tex(canvas: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  return t
}

function baseSet(key: PBRKey): PBRSet {
  let s = cache.get(key)
  if (!s) {
    const def: Def = DEFS[key]
    const r = def.make()
    s = {
      map: def.color ? tex(canvasFrom(r.w, r.h, (d) => d.set(r.color)), true) : undefined,
      normalMap: tex(normalCanvas(r.height, r.w, r.h, def.strength), false),
      roughnessMap: tex(roughCanvas(r.rough, r.w, r.h), false),
    }
    cache.set(key, s)
  }
  return s
}

function cloneSet(s: PBRSet, rx: number, ry: number): PBRSet {
  const c = (t: THREE.Texture) => {
    const k = t.clone()
    k.repeat.set(rx, ry)
    k.needsUpdate = true
    return k
  }
  return { map: s.map && c(s.map), normalMap: c(s.normalMap), roughnessMap: c(s.roughnessMap) }
}

/** A PBR texture set with its own repeat. Spread it into a meshStandardMaterial. */
export function usePBR(key: PBRKey, rx = 1, ry = 1): PBRSet {
  const set = useMemo(() => cloneSet(baseSet(key), rx, ry), [key, rx, ry])
  useEffect(
    () => () => {
      set.map?.dispose()
      set.normalMap.dispose()
      set.roughnessMap.dispose()
    },
    [set],
  )
  return set
}

/** The shared, unrepeated set (for instanced meshes and module-level materials). */
export function pbr(key: PBRKey): PBRSet {
  return baseSet(key)
}

/* ── relief for the painted textures ─────────────────────────── */

const reliefCache = new Map<string, THREE.Texture>()

/** A normal map derived from a painted texture's brightness (grout, joints, brushwork). */
function reliefBase(key: TexKey, strength: number) {
  const id = `${key}:${strength}`
  let t = reliefCache.get(id)
  if (!t) {
    const src = artCanvas(key)
    const w = Math.min(src.width, 1024)
    const h = Math.round((src.height * w) / src.width)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    g.drawImage(src, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data
    const height = new Float32Array(w * h)
    for (let i = 0; i < height.length; i++) height[i] = (d[i * 4]! * 0.3 + d[i * 4 + 1]! * 0.59 + d[i * 4 + 2]! * 0.11) / 255
    t = tex(normalCanvas(height, w, h, strength), false)
    reliefCache.set(id, t)
  }
  return t
}

export function useRelief(key: TexKey, strength: number, rx = 1, ry = 1, ox = 0, oy = 0): THREE.Texture {
  const t = useMemo(() => {
    const k = reliefBase(key, strength).clone()
    k.repeat.set(rx, ry)
    k.offset.set(ox, oy)
    k.needsUpdate = true
    return k
  }, [key, strength, rx, ry, ox, oy])
  useEffect(() => () => t.dispose(), [t])
  return t
}
