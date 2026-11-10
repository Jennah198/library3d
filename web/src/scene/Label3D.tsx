import type { ThreeElements } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Text in the 3D scene, drawn by the browser's own text engine onto a canvas texture.
 * That gives correct Arabic shaping / right-to-left layout and Ethiopic glyphs using the
 * fonts the page already loads, with no network fallback and no web workers.
 */

type Family = 'serif' | 'sans' | 'display'

const FAMILY: Record<Family, string> = {
  serif: '"Cormorant Garamond","Noto Sans Ethiopic","Noto Naskh Arabic",Georgia,serif',
  sans: '"Inter","Noto Sans Ethiopic","Noto Naskh Arabic",system-ui,sans-serif',
  display: '"Cinzel","Cormorant Garamond","Noto Sans Ethiopic","Noto Naskh Arabic",Georgia,serif',
}
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/
const WEIGHT = 600

interface Spec {
  text: string
  color: string
  family: Family
  align: 'center' | 'left'
}

function draw(canvas: HTMLCanvasElement, { text, color, family, align }: Spec) {
  const ctx = canvas.getContext('2d')!
  const { width: W, height: H } = canvas
  ctx.clearRect(0, 0, W, H)
  const pad = H * 0.12
  const maxW = W - pad * 2
  const font = (px: number) => `${WEIGHT} ${px}px ${FAMILY[family]}`

  let size = H * 0.7
  let label = text
  ctx.font = font(size)
  const natural = ctx.measureText(label).width
  if (natural > maxW) {
    const k = maxW / natural
    if (k >= 0.6) {
      size *= k
    } else {
      size *= 0.6
      ctx.font = font(size)
      const chars = [...label]
      while (chars.length > 1 && ctx.measureText(`${chars.join('')}…`).width > maxW) chars.pop()
      label = `${chars.join('')}…`
    }
  }
  ctx.font = font(size)
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.direction = RTL.test(text) ? 'rtl' : 'ltr'
  ctx.textAlign = align === 'left' ? 'left' : 'center'
  ctx.fillText(label, align === 'left' ? pad : W / 2, H / 2 + size * 0.04)
}

const cache = new Map<string, THREE.CanvasTexture>()

function labelTexture(spec: Spec, width: number, height: number): THREE.CanvasTexture {
  const ppu = Math.min(900, Math.max(260, 56 / height))
  const cw = Math.min(2048, Math.ceil(width * ppu))
  const ch = Math.min(512, Math.ceil(height * ppu))
  const key = [spec.family, spec.color, spec.align, cw, ch, spec.text].join('|')
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  cache.set(key, tex)

  const fontSpec = `${WEIGHT} ${Math.round(ch * 0.7)}px ${FAMILY[spec.family]}`
  const redraw = () => {
    draw(canvas, spec)
    tex.needsUpdate = true
  }
  // Draw straight away only if every needed font face is already loaded; otherwise wait for it.
  if (!document.fonts || document.fonts.check(fontSpec, spec.text)) redraw()
  if (document.fonts) void document.fonts.load(fontSpec, spec.text).then(redraw, () => redraw())
  return tex
}

export interface Label3DProps extends Omit<ThreeElements['mesh'], 'ref' | 'args' | 'children'> {
  text: string
  /** World-space size of the label's box. Text is shrunk (then truncated) to fit it. */
  width: number
  height: number
  color?: string
  family?: Family
  align?: 'center' | 'left'
}

export function Label3D({ text, width, height, color = '#f4ead2', family = 'sans', align = 'center', ...mesh }: Label3DProps) {
  const texture = useMemo(
    () => labelTexture({ text, color, family, align }, width, height),
    [text, color, family, align, width, height],
  )
  return (
    <mesh raycast={() => null} {...mesh}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
