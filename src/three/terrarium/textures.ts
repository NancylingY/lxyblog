/**
 * 微光之境 · 程序化贴图
 * 全部用 Canvas 现场绘制，不依赖任何外部图片资源。
 */
import * as THREE from 'three'
import { mulberry32 } from './layout'

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  return [canvas, ctx]
}

/** 柔和圆形光晕，用于精灵、萤火虫、玻璃转角高光 */
export function glowTexture(size = 128): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size)
  const half = size / 2
  const g = ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.42, 'rgba(255,255,255,0.34)')
  g.addColorStop(0.72, 'rgba(255,255,255,0.06)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 带十字星芒的亮点，用于玻璃边角折射 */
export function glintTexture(size = 128): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size)
  const half = size / 2
  const g = ctx.createRadialGradient(half, half, 0, half, half, half * 0.55)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(220,244,255,0.55)')
  g.addColorStop(1, 'rgba(180,225,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(half, half)
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2)
    const ray = ctx.createLinearGradient(0, 0, half * 0.92, 0)
    ray.addColorStop(0, 'rgba(255,255,255,0.9)')
    ray.addColorStop(0.35, 'rgba(210,240,255,0.22)')
    ray.addColorStop(1, 'rgba(180,225,255,0)')
    ctx.fillStyle = ray
    ctx.beginPath()
    ctx.moveTo(0, -1.4)
    ctx.lineTo(half * 0.92, 0)
    ctx.lineTo(0, 1.4)
    ctx.closePath()
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 边缘柔化的雾气精灵 */
export function mistTexture(size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size)
  const half = size / 2
  const g = ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0, 'rgba(255,255,255,0.42)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.24)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.07)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * 深空背景：等距柱状投影贴图。
 * 深蓝黑底色 + 冷色星云 + 远近两层星点 + 少量失焦光斑。
 */
export function buildBackgroundTexture(): THREE.CanvasTexture {
  const w = 2048
  const h = 1024
  const [canvas, ctx] = makeCanvas(w, h)
  const rng = mulberry32(90210)

  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#04070d')
  base.addColorStop(0.42, '#061120')
  base.addColorStop(0.62, '#081827')
  base.addColorStop(1, '#020408')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // 星云团块
  const nebulae: Array<[number, number, number, string, number]> = [
    [0.24, 0.4, 0.2, 'rgba(38,92,140,0.34)', 0.14],
    [0.52, 0.3, 0.27, 'rgba(32,116,124,0.26)', 0.11],
    [0.76, 0.46, 0.22, 'rgba(66,72,132,0.24)', 0.1],
    [0.9, 0.28, 0.16, 'rgba(31,84,118,0.3)', 0.12],
    [0.1, 0.62, 0.19, 'rgba(26,72,105,0.26)', 0.09],
    [0.63, 0.7, 0.24, 'rgba(24,66,92,0.2)', 0.08],
  ]
  for (const [nx, ny, nr, color, alpha] of nebulae) {
    const cx = nx * w
    const cy = ny * h
    const radius = nr * w
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    g.addColorStop(0, color)
    g.addColorStop(0.55, color.replace(/[\d.]+\)$/, `${alpha * 0.4})`))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(cx, cy, radius, radius * (0.5 + rng() * 0.35), rng() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  // 银河带：一条很淡的斜向亮带
  ctx.save()
  ctx.translate(w * 0.5, h * 0.52)
  ctx.rotate(-0.22)
  const band = ctx.createLinearGradient(0, -h * 0.18, 0, h * 0.18)
  band.addColorStop(0, 'rgba(80,140,170,0)')
  band.addColorStop(0.45, 'rgba(105,165,190,0.09)')
  band.addColorStop(0.55, 'rgba(130,190,205,0.11)')
  band.addColorStop(1, 'rgba(60,120,150,0)')
  ctx.fillStyle = band
  ctx.fillRect(-w, -h * 0.18, w * 2, h * 0.36)
  ctx.restore()

  // 远景星点
  for (let i = 0; i < 1500; i++) {
    const x = rng() * w
    const y = rng() * h
    const a = 0.15 + rng() * 0.55
    const r = 0.4 + rng() * 1.1
    ctx.fillStyle = rng() > 0.9 ? `rgba(180,220,255,${a})` : `rgba(235,245,255,${a})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 少量更亮的主星，带一点点光晕
  for (let i = 0; i < 30; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = 1.2 + rng() * 1.6
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6)
    g.addColorStop(0, 'rgba(245,251,255,0.95)')
    g.addColorStop(0.25, 'rgba(200,232,255,0.36)')
    g.addColorStop(1, 'rgba(160,210,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r * 6, 0, Math.PI * 2)
    ctx.fill()
  }

  // 失焦光斑，制造微距摄影的散景
  for (let i = 0; i < 8; i++) {
    const x = rng() * w
    const y = rng() * h
    const r = 4 + rng() * 12
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const warm = rng() > 0.6
    g.addColorStop(0, warm ? 'rgba(255,214,160,0.16)' : 'rgba(150,215,255,0.14)')
    g.addColorStop(0.6, warm ? 'rgba(255,200,140,0.06)' : 'rgba(120,195,255,0.05)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** 环境反射贴图：给玻璃、水面和黏土材质一层冷色天光 */
export function buildEnvironmentTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const [canvas, ctx] = makeCanvas(w, h)

  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#2b4d68')
  base.addColorStop(0.32, '#162c40')
  base.addColorStop(0.55, '#0a1520')
  base.addColorStop(1, '#04070b')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // 暖色主光（与场景 key light 同侧）
  const sun = ctx.createRadialGradient(w * 0.68, h * 0.26, 0, w * 0.68, h * 0.26, w * 0.16)
  sun.addColorStop(0, 'rgba(255,238,205,0.9)')
  sun.addColorStop(0.25, 'rgba(255,220,170,0.32)')
  sun.addColorStop(1, 'rgba(255,200,140,0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, w, h)

  // 冷色补光
  const cool = ctx.createRadialGradient(w * 0.16, h * 0.4, 0, w * 0.16, h * 0.4, w * 0.2)
  cool.addColorStop(0, 'rgba(130,205,255,0.4)')
  cool.addColorStop(1, 'rgba(90,170,230,0)')
  ctx.fillStyle = cool
  ctx.fillRect(0, 0, w, h)

  const tex = new THREE.CanvasTexture(canvas)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
