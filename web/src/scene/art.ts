import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Hand-painted textures for the scene, drawn procedurally on canvases so the app ships no
 * image assets. Every line is jittered and stroked twice so it reads as pen-and-ink, and the
 * palette follows Art Nouveau prints: patinated teal, sage, ochre gold, terracotta, parchment.
 */

export const P = {
  ink: '#2b2118',
  parch: '#efe2c4',
  parchDeep: '#dcc9a0',
  marble: '#e8dcc4',
  sand: '#d8c49c',
  teal: '#1f3d3a',
  tealDeep: '#142a27',
  verdigris: '#3f6b62',
  jade: '#5f8f80',
  sage: '#7f8c5a',
  sageDeep: '#55613f',
  ochre: '#c99a3c',
  gold: '#d6b25e',
  terra: '#b0573b',
  rose: '#a8524f',
  lapis: '#2f5878',
  walnut: '#4f321d',
  walnutDark: '#2e1c10',
  sky: '#1b2d29',
} as const

type Rand = () => number
type Pt = [number, number]
type G = CanvasRenderingContext2D

export function rng(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}

/* ── pen-and-ink helpers ─────────────────────────────────────── */

/** A smooth, slightly shaky stroke through points, inked twice like a hand-drawn line. */
function sketch(g: G, pts: Pt[], r: Rand, jitter = 1.2, passes = 2) {
  if (pts.length < 2) return
  const alpha = g.globalAlpha
  for (let p = 0; p < passes; p++) {
    const q = pts.map(([x, y]) => [x + (r() - 0.5) * jitter, y + (r() - 0.5) * jitter] as Pt)
    g.beginPath()
    g.moveTo(q[0]![0], q[0]![1])
    for (let i = 1; i < q.length - 1; i++) {
      const a = q[i]!
      const b = q[i + 1]!
      g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
    const last = q[q.length - 1]!
    g.lineTo(last[0], last[1])
    g.globalAlpha = alpha * (p === 0 ? 1 : 0.45)
    g.stroke()
  }
  g.globalAlpha = alpha
}

function line(g: G, x1: number, y1: number, x2: number, y2: number, r: Rand, jitter = 1.2) {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 24))
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) pts.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n])
  sketch(g, pts, r, jitter)
}

/** Soft blotches: plaster, patina, paper. */
function mottle(g: G, w: number, h: number, r: Rand, color: string, n: number, min: number, max: number, alpha: number) {
  g.save()
  g.fillStyle = color
  for (let i = 0; i < n; i++) {
    const x = r() * w
    const y = r() * h
    const rad = min + r() * (max - min)
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, color)
    grad.addColorStop(1, 'transparent')
    g.globalAlpha = alpha * (0.4 + r() * 0.6)
    g.fillStyle = grad
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  g.restore()
}

function speckle(g: G, w: number, h: number, r: Rand, color: string, n: number, alpha: number) {
  g.save()
  g.fillStyle = color
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * r()
    g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5)
  }
  g.restore()
}

/** Art Nouveau whiplash: a stem whose curvature grows towards a spiral tip. */
function stem(x: number, y: number, a: number, len: number, curl: number, r: Rand): Pt[] {
  const pts: Pt[] = [[x, y]]
  const n = 48
  const ds = len / n
  for (let i = 1; i <= n; i++) {
    const t = i / n
    a += curl * (0.012 + t ** 4 * 0.33) + (r() - 0.5) * 0.04
    x += Math.cos(a) * ds
    y += Math.sin(a) * ds
    pts.push([x, y])
  }
  return pts
}

function leaf(g: G, x: number, y: number, a: number, s: number, fill: string, ink: string, r: Rand, fat = 0.36) {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(s * 0.45, -s * fat, s, 0)
  g.quadraticCurveTo(s * 0.45, s * fat, 0, 0)
  g.fillStyle = fill
  g.fill()
  g.strokeStyle = ink
  g.lineWidth = Math.max(0.8, s * 0.05)
  g.stroke()
  g.lineWidth *= 0.7
  sketch(g, [[0, 0], [s * 0.5, (r() - 0.5) * s * 0.06], [s * 0.9, 0]], r, 0.6, 1)
  g.restore()
}

function vine(g: G, x: number, y: number, a: number, len: number, curl: number, r: Rand, c: { line: string; leaf: string; ink: string }, width = 2) {
  const pts = stem(x, y, a, len, curl, r)
  g.strokeStyle = c.line
  g.lineWidth = width
  sketch(g, pts, r, 0.8)
  for (let i = 6; i < pts.length - 8; i += 5) {
    const [px, py] = pts[i]!
    const [qx, qy] = pts[i + 1]!
    const dir = Math.atan2(qy - py, qx - px)
    const side = i % 10 === 6 ? 1 : -1
    leaf(g, px, py, dir + side * (0.7 + r() * 0.3), len * (0.07 + r() * 0.04), c.leaf, c.ink, r)
  }
}

function fern(g: G, x: number, y: number, a: number, len: number, bend: number, r: Rand, color: string, ink: string) {
  const pts = stem(x, y, a, len, bend, r)
  g.strokeStyle = ink
  g.lineWidth = Math.max(1, len * 0.008)
  sketch(g, pts, r, 0.6)
  for (let i = 2; i < pts.length - 1; i += 2) {
    const t = i / pts.length
    const [px, py] = pts[i]!
    const [qx, qy] = pts[i + 1]!
    const dir = Math.atan2(qy - py, qx - px)
    const s = len * 0.16 * Math.sin(Math.PI * (0.15 + t * 0.85)) * (1 - t * 0.5)
    leaf(g, px, py, dir - 1.15, s, color, ink, r, 0.22)
    leaf(g, px, py, dir + 1.15, s, color, ink, r, 0.22)
  }
}

/** Queen Anne's lace: rays out to little clusters of dots. */
function umbel(g: G, x: number, y: number, h: number, rad: number, r: Rand, color: string, ink: string) {
  const top: Pt = [x + (r() - 0.5) * rad * 0.3, y - h]
  g.strokeStyle = ink
  g.lineWidth = 1.2
  sketch(g, [[x, y], [x + (r() - 0.5) * 8, y - h * 0.5], top], r, 0.6)
  for (let i = 0; i < 11; i++) {
    const ang = Math.PI * (1.08 + (i / 10) * 0.84)
    const ex = top[0] + Math.cos(ang) * rad
    const ey = top[1] + Math.sin(ang) * rad * 0.7
    g.lineWidth = 0.8
    line(g, top[0], top[1], ex, ey, r, 0.5)
    g.fillStyle = color
    for (let k = 0; k < 7; k++) {
      g.beginPath()
      g.arc(ex + (r() - 0.5) * rad * 0.22, ey + (r() - 0.5) * rad * 0.16, 1 + r() * rad * 0.035, 0, Math.PI * 2)
      g.fill()
    }
  }
}

/** A round globe-flower bloom with inked petal arcs. */
function bloom(g: G, x: number, y: number, s: number, fill: string, ink: string, r: Rand) {
  g.save()
  g.translate(x, y)
  g.fillStyle = fill
  g.beginPath()
  g.ellipse(0, 0, s, s * 0.85, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = ink
  g.lineWidth = Math.max(0.8, s * 0.07)
  for (let i = 0; i < 4; i++) {
    const k = 1 - i * 0.24
    g.beginPath()
    g.arc((r() - 0.5) * s * 0.1, s * 0.15 * i, s * k, Math.PI * 1.1, Math.PI * 1.9)
    g.stroke()
  }
  g.beginPath()
  g.ellipse(0, 0, s, s * 0.85, 0, 0, Math.PI * 2)
  g.stroke()
  g.restore()
}

/** The running Greek key used in friezes and borders. `h` is the band height. */
function meander(g: G, x0: number, y0: number, w: number, h: number, color: string, lw: number) {
  const pad = h * 0.18
  const H = h - pad * 2
  const u = H * 1.1
  const top = y0 + pad
  g.strokeStyle = color
  g.lineWidth = lw
  g.lineCap = 'square'
  g.lineJoin = 'miter'
  g.beginPath()
  g.moveTo(x0, top + H)
  g.lineTo(x0 + w, top + H)
  g.stroke()
  for (let x = x0; x < x0 + w; x += u) {
    const X = (f: number) => x + f * u
    const Y = (f: number) => top + f * H
    g.beginPath()
    g.moveTo(X(0.8), Y(1))
    g.lineTo(X(0.8), Y(0))
    g.lineTo(X(0.05), Y(0))
    g.lineTo(X(0.05), Y(0.68))
    g.lineTo(X(0.56), Y(0.68))
    g.lineTo(X(0.56), Y(0.34))
    g.lineTo(X(0.3), Y(0.34))
    g.stroke()
  }
}

function star(g: G, x: number, y: number, s: number, points: number, color: string) {
  g.save()
  g.translate(x, y)
  g.fillStyle = color
  g.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? s * 0.38 : s
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad)
  }
  g.closePath()
  g.fill()
  g.restore()
}

/** A flame-rayed sun with a spiral heart. */
function sun(g: G, cx: number, cy: number, R: number, r: Rand, glow = true) {
  if (glow) {
    const halo = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6)
    halo.addColorStop(0, 'rgba(255, 214, 120, 0.85)')
    halo.addColorStop(0.45, 'rgba(226, 160, 60, 0.35)')
    halo.addColorStop(1, 'rgba(226, 160, 60, 0)')
    g.fillStyle = halo
    g.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2)
  }
  const rays = 30
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + r() * 0.04
    const len = R * (i % 2 ? 0.86 : 1.02) * (0.95 + r() * 0.1)
    const w = R * 0.07
    const wave = (r() - 0.5) * 0.25
    g.save()
    g.translate(cx, cy)
    g.rotate(a)
    g.beginPath()
    g.moveTo(R * 0.5, -w)
    g.bezierCurveTo(R * 0.7, -w + R * wave * 0.3, R * 0.82, w * 0.6 - R * wave * 0.3, len, 0)
    g.bezierCurveTo(R * 0.82, w * 0.4 + R * wave * 0.3, R * 0.7, w - R * wave * 0.3, R * 0.5, w)
    g.closePath()
    const grad = g.createLinearGradient(R * 0.5, 0, len, 0)
    grad.addColorStop(0, '#f2c25a')
    grad.addColorStop(1, '#d9822f')
    g.fillStyle = grad
    g.fill()
    g.strokeStyle = 'rgba(120, 60, 20, 0.55)'
    g.lineWidth = Math.max(1, R * 0.008)
    g.stroke()
    g.restore()
  }
  const disc = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55)
  disc.addColorStop(0, '#ffe2a0')
  disc.addColorStop(0.7, '#f0b445')
  disc.addColorStop(1, '#d68a2c')
  g.fillStyle = disc
  g.beginPath()
  g.arc(cx, cy, R * 0.55, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(120, 60, 20, 0.7)'
  g.lineWidth = Math.max(1.2, R * 0.012)
  g.stroke()
  const spiral: Pt[] = []
  for (let t = 0; t < Math.PI * 6; t += 0.12) {
    const rad = (t / (Math.PI * 6)) * R * 0.42
    spiral.push([cx + Math.cos(t) * rad, cy + Math.sin(t) * rad])
  }
  g.strokeStyle = 'rgba(150, 70, 20, 0.85)'
  g.lineWidth = Math.max(1.5, R * 0.02)
  sketch(g, spiral, r, 0.8)
  g.fillStyle = 'rgba(150, 70, 20, 0.7)'
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    g.beginPath()
    g.arc(cx + Math.cos(a) * R * 0.49, cy + Math.sin(a) * R * 0.49, Math.max(1, R * 0.012), 0, Math.PI * 2)
    g.fill()
  }
}

/** Draw `fn` three times shifted by the tile width so a horizontally repeating texture wraps. */
function wrapX(w: number, fn: (dx: number) => void) {
  for (const dx of [-w, 0, w]) fn(dx)
}

/* ── textures ────────────────────────────────────────────────── */

/** Pale marble slabs with veins and small inset tesserae at the joints. 1 tile = 4 m. */
function marble() {
  const S = 1024
  const [c, g] = makeCanvas(S, S)
  const r = rng(11)
  const n = 4
  const s = S / n
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = 0.94 + r() * 0.08
      g.fillStyle = `rgb(${232 * k | 0},${220 * k | 0},${196 * k | 0})`
      g.fillRect(i * s, j * s, s, s)
    }
  mottle(g, S, S, r, '#c9b28a', 40, 40, 160, 0.18)
  g.strokeStyle = 'rgba(120, 100, 80, 0.28)'
  for (let v = 0; v < 22; v++) {
    g.lineWidth = 0.6 + r() * 1.4
    const pts = stem(r() * S, r() * S, r() * Math.PI * 2, 160 + r() * 300, (r() - 0.5) * 0.6, r)
    sketch(g, pts, r, 2.5, 1)
  }
  g.strokeStyle = 'rgba(60, 45, 30, 0.55)'
  g.lineWidth = 2
  for (let i = 0; i <= n; i++) {
    line(g, i * s, 0, i * s, S, r, 1.2)
    line(g, 0, i * s, S, i * s, r, 1.2)
  }
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const x = i * s
      const y = j * s
      g.save()
      g.translate(x, y)
      g.rotate(Math.PI / 4)
      g.fillStyle = (i + j) % 2 ? P.terra : P.verdigris
      g.fillRect(-14, -14, 28, 28)
      g.strokeStyle = P.ink
      g.lineWidth = 1.5
      g.strokeRect(-14, -14, 28, 28)
      g.restore()
    }
  return c
}

/** Plaster wall: zellige dado, a meander band, faint botanical drawings. 1 tile = 6 m × 6.5 m. */
function fresco() {
  const W = 960
  const H = 1040
  const ppm = 160
  const Y = (m: number) => H - m * ppm
  const [c, g] = makeCanvas(W, H)
  const r = rng(7)
  g.fillStyle = P.parch
  g.fillRect(0, 0, W, H)
  mottle(g, W, H, r, '#d6bf90', 70, 40, 180, 0.35)
  mottle(g, W, H, r, '#b99a62', 25, 20, 90, 0.18)
  speckle(g, W, H, r, '#6b5435', 2500, 0.25)

  // botanical field, drawn faintly like a sketchbook study
  g.save()
  g.globalAlpha = 0.6
  const plant = (x: number, kind: number, rr: Rand) => {
    const base = Y(1.25)
    if (kind === 0) fern(g, x, base, -Math.PI / 2 + (rr() - 0.5) * 0.2, 360 + rr() * 140, (rr() - 0.5) * 0.25, rr, P.sage, P.sageDeep)
    else if (kind === 1) umbel(g, x, base, 300 + rr() * 160, 46, rr, P.ochre, P.sageDeep)
    else vine(g, x, base, -Math.PI / 2, 420 + rr() * 120, rr() > 0.5 ? 1 : -1, rr, { line: P.sageDeep, leaf: P.sage, ink: P.sageDeep })
  }
  const kinds = [0, 2, 1, 0, 1, 2, 0, 1]
  kinds.forEach((kind, i) => {
    const x = 60 + i * 120
    wrapX(W, (dx) => plant(x + dx, kind, rng(100 + i)))
  })
  g.restore()

  // rules above the field
  g.strokeStyle = P.ochre
  g.lineWidth = 2
  line(g, 0, Y(5.72), W, Y(5.72), r)
  g.lineWidth = 1
  line(g, 0, Y(5.66), W, Y(5.66), r)

  // dado: zellige diamonds
  const top = Y(1.0)
  g.save()
  g.beginPath()
  g.rect(0, top, W, H - top)
  g.clip()
  g.fillStyle = P.parchDeep
  g.fillRect(0, top, W, H - top)
  const dw = W / 16
  const dh = dw * 1.25
  const fills = [P.verdigris, P.parch, P.teal, P.ochre]
  for (let row = 0; row * dh * 0.5 < H - top + dh; row++)
    for (let col = -1; col <= 16; col++) {
      const cx = col * dw + (row % 2 ? dw / 2 : 0)
      const cy = top + row * dh * 0.5
      g.beginPath()
      g.moveTo(cx, cy - dh / 2 + 3)
      g.lineTo(cx + dw / 2 - 3, cy)
      g.lineTo(cx, cy + dh / 2 - 3)
      g.lineTo(cx - dw / 2 + 3, cy)
      g.closePath()
      g.fillStyle = fills[(row + (col & 1) * 2) % 4]!
      g.fill()
      g.strokeStyle = 'rgba(43, 33, 24, 0.7)'
      g.lineWidth = 1.4
      g.stroke()
      if (row % 2 === 0) star(g, cx, cy, dw * 0.12, 4, P.gold)
    }
  mottle(g, W, H, r, '#3a2a18', 20, 20, 70, 0.12)
  g.restore()

  // band: terracotta with a parchment meander
  const b0 = Y(1.2)
  const b1 = Y(1.0)
  g.fillStyle = P.terra
  g.fillRect(0, b0, W, b1 - b0)
  meander(g, 0, b0, W, b1 - b0, P.parch, 3)
  g.strokeStyle = P.ink
  g.lineWidth = 2
  line(g, 0, b0, W, b0, r)
  line(g, 0, b1, W, b1, r)
  return c
}

/** Deep patinated teal panel with gold botanicals (fills the arch niches). */
function niche() {
  const W = 800
  const H = 912
  const [c, g] = makeCanvas(W, H)
  const r = rng(23)
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#1a3532')
  grad.addColorStop(1, P.tealDeep)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  mottle(g, W, H, r, '#2f564f', 60, 30, 140, 0.4)
  mottle(g, W, H, r, '#0c1a18', 30, 20, 90, 0.3)
  speckle(g, W, H, r, '#c9a24a', 900, 0.25)

  // gold moon/sun disc near the apex
  const disc = g.createRadialGradient(W / 2, H * 0.12, 0, W / 2, H * 0.12, 54)
  disc.addColorStop(0, '#f0d27e')
  disc.addColorStop(1, '#b8892f')
  g.fillStyle = disc
  g.beginPath()
  g.arc(W / 2, H * 0.12, 50, 0, Math.PI * 2)
  g.fill()
  mottle(g, W, H * 0.25, r, '#8a6420', 6, 6, 20, 0.3)

  g.save()
  g.globalAlpha = 0.9
  const gold = { line: P.gold, leaf: '#9d8a45', ink: P.gold }
  fern(g, W / 2, H, -Math.PI / 2, H * 0.72, 0.02, r, '#8f8a4a', P.gold)
  fern(g, W * 0.22, H, -Math.PI / 2 - 0.12, H * 0.62, 0.08, r, '#7d7a40', P.gold)
  fern(g, W * 0.78, H, -Math.PI / 2 + 0.12, H * 0.62, -0.08, r, '#7d7a40', P.gold)
  umbel(g, W * 0.35, H * 0.55, H * 0.32, 52, r, '#e9d9a0', P.gold)
  umbel(g, W * 0.66, H * 0.5, H * 0.36, 58, r, '#e9d9a0', P.gold)
  vine(g, W * 0.08, H * 0.9, -Math.PI / 2, H * 0.75, 1, r, gold, 2.5)
  vine(g, W * 0.92, H * 0.9, -Math.PI / 2, H * 0.75, -1, r, gold, 2.5)
  for (let i = 0; i < 9; i++) bloom(g, W * (0.12 + r() * 0.76), H * (0.72 + r() * 0.24), 18 + r() * 14, '#d07a3e', '#7a3418', r)
  g.restore()
  for (let i = 0; i < 14; i++) star(g, r() * W, r() * H * 0.35, 3 + r() * 4, 4, '#e9d9a0')
  return c
}

/** The sun in its swirling green-gold field (east mural and ceiling medallion). */
function sunMural() {
  const S = 1024
  const [c, g] = makeCanvas(S, S)
  const r = rng(5)
  const bg = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S * 0.75)
  bg.addColorStop(0, '#c99a3c')
  bg.addColorStop(0.45, '#7d7a3a')
  bg.addColorStop(1, '#2f4532')
  g.fillStyle = bg
  g.fillRect(0, 0, S, S)
  mottle(g, S, S, r, '#a8873a', 40, 40, 160, 0.3)
  // swirling currents
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2
    const d = S * (0.28 + r() * 0.22)
    g.strokeStyle = i % 3 ? 'rgba(233, 205, 130, 0.45)' : 'rgba(80, 120, 100, 0.55)'
    g.lineWidth = 2 + r() * 5
    sketch(g, stem(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, a + Math.PI / 2, 220 + r() * 260, 0.5 + r() * 0.5, r), r, 2, 1)
  }
  // ivy and ferns around the edge
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + r() * 0.3
    const x = S / 2 + Math.cos(a) * S * 0.48
    const y = S / 2 + Math.sin(a) * S * 0.48
    vine(g, x, y, a + Math.PI * 0.7, 200 + r() * 120, r() > 0.5 ? 1 : -1, r, { line: '#2f4532', leaf: '#5b6e3a', ink: '#24321f' }, 2)
  }
  // a triskele spiral above the sun, as in the reference print
  g.strokeStyle = 'rgba(245, 225, 160, 0.85)'
  g.lineWidth = 4
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * Math.PI * 2
    const ox = S / 2 + Math.cos(a0 - Math.PI / 2) * 40
    const oy = S * 0.19 + Math.sin(a0 - Math.PI / 2) * 40
    const pts: Pt[] = []
    for (let t = 0; t < Math.PI * 4; t += 0.15) {
      const rad = 4 + t * 3.2
      pts.push([ox + Math.cos(t + a0) * rad, oy + Math.sin(t + a0) * rad])
    }
    sketch(g, pts, r, 0.6)
  }
  sun(g, S / 2, S * 0.55, S * 0.3, r)
  for (let i = 0; i < 30; i++) star(g, r() * S, r() * S, 3 + r() * 6, 4, 'rgba(255, 236, 170, 0.9)')
  // crescent moon, lower left
  g.fillStyle = '#f3e1a4'
  g.beginPath()
  g.arc(S * 0.2, S * 0.86, 30, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.arc(S * 0.2 + 12, S * 0.86 - 8, 27, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'source-over'
  return c
}

/** Coffered ceiling: deep teal squares framed in gold with a star in each. 1 tile = 2.6 m. */
function coffer() {
  const S = 512
  const [c, g] = makeCanvas(S, S)
  const r = rng(3)
  g.fillStyle = '#1b302c'
  g.fillRect(0, 0, S, S)
  mottle(g, S, S, r, '#0f1d1b', 20, 30, 120, 0.4)
  g.fillStyle = '#244540'
  g.fillRect(70, 70, S - 140, S - 140)
  mottle(g, S, S, r, '#2f5a52', 14, 20, 80, 0.3)
  g.strokeStyle = P.gold
  for (const [inset, lw] of [[18, 3], [30, 1.2], [70, 2.5], [82, 1]] as const) {
    g.lineWidth = lw
    line(g, inset, inset, S - inset, inset, r)
    line(g, S - inset, inset, S - inset, S - inset, r)
    line(g, S - inset, S - inset, inset, S - inset, r)
    line(g, inset, S - inset, inset, inset, r)
  }
  star(g, S / 2, S / 2, 46, 8, P.gold)
  star(g, S / 2, S / 2, 20, 8, '#f3e1a4')
  for (const [x, y] of [[44, 44], [S - 44, 44], [44, S - 44], [S - 44, S - 44]] as const) {
    g.fillStyle = P.terra
    g.beginPath()
    g.arc(x, y, 7, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

/** Entablature frieze: dentils over a gold Greek key on teal. 1 tile = 4.8 m. */
function frieze() {
  const W = 1024
  const H = 128
  const [c, g] = makeCanvas(W, H)
  const r = rng(9)
  g.fillStyle = P.marble
  g.fillRect(0, 0, W, H)
  for (let x = 0; x < W; x += 32) {
    g.fillStyle = 'rgba(80, 60, 40, 0.55)'
    g.fillRect(x + 6, 6, 20, 22)
  }
  g.fillStyle = P.teal
  g.fillRect(0, 36, W, 76)
  mottle(g, W, H, r, '#2f564f', 16, 10, 50, 0.4)
  meander(g, 0, 36, W, 76, P.gold, 4)
  g.strokeStyle = P.ink
  g.lineWidth = 2
  line(g, 0, 36, W, 36, r, 0.8)
  line(g, 0, 112, W, 112, r, 0.8)
  g.fillStyle = P.ochre
  g.fillRect(0, 114, W, 8)
  return c
}

/** Sandstone ashlar for the exterior. 1 tile = 2 m. */
function stone() {
  const S = 512
  const [c, g] = makeCanvas(S, S)
  const r = rng(17)
  const rows = 4
  const rh = S / rows
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? S / 4 : 0
    for (let k = -1; k < 2; k++) {
      const x = off + k * (S / 2)
      const t = 0.92 + r() * 0.1
      g.fillStyle = `rgb(${216 * t | 0},${196 * t | 0},${156 * t | 0})`
      g.fillRect(x, row * rh, S / 2, rh)
    }
  }
  mottle(g, S, S, r, '#b0925e', 30, 20, 90, 0.3)
  speckle(g, S, S, r, '#5c4a32', 1800, 0.35)
  g.strokeStyle = 'rgba(60, 45, 30, 0.7)'
  g.lineWidth = 2.5
  for (let row = 0; row <= rows; row++) line(g, 0, row * rh, S, row * rh, r, 1.5)
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? S / 4 : 0
    for (let k = 0; k < 3; k++) {
      const x = off + k * (S / 2)
      if (x > 0 && x < S) line(g, x, row * rh, x, (row + 1) * rh, r, 1.5)
    }
  }
  return c
}

/** Column flutes, wrapped once around the shaft. */
function flutes() {
  const W = 512
  const H = 64
  const [c, g] = makeCanvas(W, H)
  const n = 20
  const fw = W / n
  for (let i = 0; i < n; i++) {
    const grad = g.createLinearGradient(i * fw, 0, (i + 1) * fw, 0)
    grad.addColorStop(0, '#cbbc9f')
    grad.addColorStop(0.5, '#f4ead6')
    grad.addColorStop(1, '#b9a988')
    g.fillStyle = grad
    g.fillRect(i * fw, 0, fw, H)
    g.fillStyle = 'rgba(43, 33, 24, 0.45)'
    g.fillRect(i * fw, 0, 1.5, H)
  }
  return c
}

/** Sunburst for the door tympanum. Maps a 2.4 m × 1.25 m arch. */
function tympanum() {
  const W = 768
  const H = 400
  const [c, g] = makeCanvas(W, H)
  const r = rng(29)
  g.fillStyle = P.lapis
  g.fillRect(0, 0, W, H)
  mottle(g, W, H, r, '#4a7a96', 30, 20, 90, 0.35)
  mottle(g, W, H, r, '#1c3a52', 20, 20, 70, 0.4)
  g.strokeStyle = P.gold
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI
    g.lineWidth = i % 2 ? 1.5 : 3
    line(g, W / 2 + Math.cos(a) * 70, H + Math.sin(a) * 70, W / 2 + Math.cos(a) * W, H + Math.sin(a) * W, r, 1)
  }
  for (let i = 0; i < 16; i++) {
    const a = Math.PI + ((i + 0.5) / 16) * Math.PI
    leaf(g, W / 2 + Math.cos(a) * 78, H + Math.sin(a) * 78, a, 70, '#c99a3c', '#7a5418', r, 0.3)
  }
  g.fillStyle = '#e9c66a'
  g.beginPath()
  g.arc(W / 2, H, 72, Math.PI, 0)
  g.fill()
  g.strokeStyle = '#7a5418'
  g.lineWidth = 2
  g.stroke()
  for (let i = 0; i < 18; i++) star(g, r() * W, r() * H * 0.6, 3 + r() * 4, 4, '#e9d9a0')
  return c
}

/**
 * A floor mosaic: a design is drawn at one pixel per tessera, then rebuilt as small
 * jittered stone squares with grout between them.
 */
function tesserae(design: HTMLCanvasElement, cell: number, seed: number) {
  const w = design.width
  const h = design.height
  const data = design.getContext('2d')!.getImageData(0, 0, w, h).data
  const [c, g] = makeCanvas(w * cell, h * cell)
  const r = rng(seed)
  g.fillStyle = '#3a3128'
  g.fillRect(0, 0, c.width, c.height)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const k = 0.9 + r() * 0.18
      g.fillStyle = `rgb(${Math.min(255, data[i]! * k) | 0},${Math.min(255, data[i + 1]! * k) | 0},${Math.min(255, data[i + 2]! * k) | 0})`
      const j = r() * 0.8
      g.fillRect(x * cell + 0.6 + j, y * cell + 0.6 + (r() * 0.8), cell - 1.4, cell - 1.4)
    }
  return c
}

function rosette(g: G, x: number, y: number, R: number, petals: string, heart: string) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.fillStyle = petals
    g.beginPath()
    g.ellipse(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, R * 0.45, R * 0.22, a, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = heart
  g.beginPath()
  g.arc(x, y, R * 0.28, 0, Math.PI * 2)
  g.fill()
}

/** The long aisle runner in the hall (24.5 m × 4 m). */
function aisleRug() {
  const w = 392
  const h = 64
  const [d, g] = makeCanvas(w, h)
  g.imageSmoothingEnabled = false
  g.fillStyle = P.ochre
  g.fillRect(0, 0, w, h)
  g.fillStyle = P.parch
  g.fillRect(2, 2, w - 4, h - 4)
  g.fillStyle = P.terra
  g.fillRect(3, 3, w - 6, 9)
  g.fillRect(3, h - 12, w - 6, 9)
  meander(g, 3, 3, w - 6, 9, P.parch, 1.2)
  g.save()
  g.translate(0, h)
  g.scale(1, -1)
  meander(g, 3, 3, w - 6, 9, P.parch, 1.2)
  g.restore()
  g.fillStyle = P.teal
  g.fillRect(3, 13, w - 6, h - 26)
  // vine scroll along the field
  g.strokeStyle = P.sage
  g.lineWidth = 1.4
  g.beginPath()
  for (let x = 4; x < w - 4; x++) g.lineTo(x, h / 2 + Math.sin(x / 9) * 9)
  g.stroke()
  g.fillStyle = P.sage
  for (let x = 12; x < w - 8; x += 28) {
    g.beginPath()
    g.arc(x, h / 2 + Math.sin(x / 9) * 9 - 6, 2.5, 0, Math.PI * 2)
    g.fill()
  }
  for (let k = 0; k < 7; k++) {
    const x = w / 2 + (k - 3) * 56
    g.fillStyle = P.ochre
    g.beginPath()
    g.arc(x, h / 2, k === 3 ? 22 : 14, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = P.parch
    g.beginPath()
    g.arc(x, h / 2, k === 3 ? 20 : 12, 0, Math.PI * 2)
    g.fill()
    rosette(g, x, h / 2, k === 3 ? 18 : 11, k % 2 ? P.terra : P.verdigris, P.ochre)
  }
  return tesserae(d, 6, 41)
}

/** A round sun medallion for the study floor. */
function medallion() {
  const s = 160
  const [d, g] = makeCanvas(s, s)
  const c = s / 2
  const ring = (rad: number, color: string) => {
    g.fillStyle = color
    g.beginPath()
    g.arc(c, c, rad, 0, Math.PI * 2)
    g.fill()
  }
  ring(79, P.ochre)
  ring(76, P.terra)
  ring(68, P.parch)
  ring(66, P.teal)
  g.strokeStyle = P.parch
  g.lineWidth = 1.5
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    g.beginPath()
    g.moveTo(c + Math.cos(a) * 30, c + Math.sin(a) * 30)
    g.lineTo(c + Math.cos(a) * 62, c + Math.sin(a) * 62)
    g.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2
    g.fillStyle = P.sage
    g.beginPath()
    g.ellipse(c + Math.cos(a) * 50, c + Math.sin(a) * 50, 9, 4, a, 0, Math.PI * 2)
    g.fill()
  }
  ring(30, P.ochre)
  rosette(g, c, c, 26, P.terra, P.parch)
  return tesserae(d, 6, 43)
}

/** Glossy tile band for the fountain basin. */
function basinTile() {
  const W = 512
  const H = 128
  const [c, g] = makeCanvas(W, H)
  const r = rng(31)
  g.fillStyle = '#2a6f72'
  g.fillRect(0, 0, W, H)
  const n = 16
  const tw = W / n
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#3d8f8c' : '#1f5a61'
    g.fillRect(i * tw + 2, 22, tw - 4, H - 44)
    star(g, i * tw + tw / 2, H / 2, tw * 0.3, 8, i % 2 ? P.parch : P.gold)
  }
  g.fillStyle = P.ochre
  g.fillRect(0, 0, W, 16)
  g.fillRect(0, H - 16, W, 16)
  g.strokeStyle = P.ink
  g.lineWidth = 2
  line(g, 0, 18, W, 18, r)
  line(g, 0, H - 18, W, H - 18, r)
  return c
}

/** Crescent moon with a faint earthshine on the dark side. */
function moon() {
  const S = 512
  const [c, g] = makeCanvas(S, S)
  const r = rng(13)
  const cx = S / 2
  const R = S * 0.36
  const halo = g.createRadialGradient(cx, cx, R * 0.9, cx, cx, S / 2)
  halo.addColorStop(0, 'rgba(240, 220, 150, 0.35)')
  halo.addColorStop(1, 'rgba(240, 220, 150, 0)')
  g.fillStyle = halo
  g.fillRect(0, 0, S, S)
  g.fillStyle = 'rgba(60, 90, 80, 0.85)'
  g.beginPath()
  g.arc(cx, cx, R, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.beginPath()
  g.arc(cx, cx, R, 0, Math.PI * 2)
  g.clip()
  g.fillStyle = '#efdc9e'
  g.beginPath()
  g.arc(cx, cx, R, 0, Math.PI * 2)
  g.fill()
  mottle(g, S, S, r, '#c2a862', 18, 10, 40, 0.5)
  g.fillStyle = 'rgba(52, 82, 74, 0.94)'
  g.beginPath()
  g.arc(cx + R * 0.42, cx - R * 0.18, R * 0.92, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.strokeStyle = 'rgba(214, 178, 94, 0.9)'
  g.lineWidth = 3
  g.beginPath()
  g.arc(cx, cx, R + 10, 0, Math.PI * 2)
  g.stroke()
  return c
}

const MAKERS = {
  marble,
  fresco,
  niche,
  sun: sunMural,
  coffer,
  frieze,
  stone,
  flutes,
  tympanum,
  rug: aisleRug,
  medallion,
  basin: basinTile,
  moon,
} as const

export type TexKey = keyof typeof MAKERS

const base = new Map<TexKey, THREE.CanvasTexture>()

function baseTexture(key: TexKey): THREE.CanvasTexture {
  let t = base.get(key)
  if (!t) {
    t = new THREE.CanvasTexture(MAKERS[key]())
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    base.set(key, t)
  }
  return t
}

/** A painted texture with its own repeat / offset. The pixels are drawn once and shared. */
export function useTex(key: TexKey, rx = 1, ry = 1, ox = 0, oy = 0): THREE.Texture {
  const tex = useMemo(() => {
    const t = baseTexture(key).clone()
    t.repeat.set(rx, ry)
    t.offset.set(ox, oy)
    t.needsUpdate = true
    return t
  }, [key, rx, ry, ox, oy])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

/* ── arch geometry ───────────────────────────────────────────── */

/**
 * Outline of a pointed ogee arch, from bottom-left, up and over, to bottom-right.
 * `spring` is where the curve starts; `apex` is the tip; `base` the bottom edge.
 */
export function archOutline(w: number, spring: number, apex: number, base = 0): THREE.Vector2[] {
  const p = new THREE.Path()
  const r = apex - spring
  p.moveTo(-w / 2, base)
  if (spring > base) p.lineTo(-w / 2, spring)
  p.bezierCurveTo(-w / 2, spring + r * 0.62, -w * 0.2, spring + r * 0.55, -w * 0.055, apex - r * 0.16)
  p.quadraticCurveTo(-w * 0.012, apex - r * 0.07, 0, apex)
  p.quadraticCurveTo(w * 0.012, apex - r * 0.07, w * 0.055, apex - r * 0.16)
  p.bezierCurveTo(w * 0.2, spring + r * 0.55, w / 2, spring + r * 0.62, w / 2, spring)
  if (spring > base) p.lineTo(w / 2, base)
  const pts = p.getPoints(16)
  return pts.filter((v, i) => i === 0 || v.distanceTo(pts[i - 1]!) > 1e-5)
}

export function archShape(w: number, spring: number, apex: number, base = 0): THREE.Shape {
  return new THREE.Shape(archOutline(w, spring, apex, base))
}

/** A band of width `band` running around the outside of an arch (an open U, no hole needed). */
export function archFrame(w: number, spring: number, apex: number, band: number, base = 0): THREE.Shape {
  const outer = archOutline(w + band * 2, spring, apex + band * 1.4, base)
  const inner = archOutline(w, spring, apex, base).reverse()
  return new THREE.Shape([...outer, ...inner])
}
