<script setup lang="ts">
/**
 * 创意小组件：粒子星空
 * canvas 粒子漂移 + 邻近连线 + 鼠标牵引，取代原终端代码框。
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: number
}

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let particles: Particle[] = []
let w = 0
let h = 0
const dpr = Math.min(window.devicePixelRatio || 1, 2)
const mouse = { x: -9999, y: -9999 }
let reducedMotion = false

const LINK_DIST = 130
const COUNT = 72

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.parentElement?.getBoundingClientRect()
  if (!rect) return
  w = rect.width
  h = rect.height
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  spawn()
}

function spawn() {
  particles = Array.from({ length: COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    r: Math.random() * 1.8 + 0.8,
    hue: 140 + Math.random() * 40,
  }))
}

function step() {
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)

  // 更新位置 + 鼠标牵引
  for (const p of particles) {
    const dx = p.x - mouse.x
    const dy = p.y - mouse.y
    const dist = Math.hypot(dx, dy)
    if (dist < 140 && dist > 0.01) {
      const force = (140 - dist) / 140
      p.vx += (dx / dist) * force * 0.12
      p.vy += (dy / dist) * force * 0.12
    }
    p.vx *= 0.985
    p.vy *= 0.985
    p.x += p.vx
    p.y += p.vy

    if (p.x < -20) p.x = w + 20
    if (p.x > w + 20) p.x = -20
    if (p.y < -20) p.y = h + 20
    if (p.y > h + 20) p.y = -20
  }

  // 连线
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i]
      const b = particles[j]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d < LINK_DIST) {
        const alpha = (1 - d / LINK_DIST) * 0.28
        ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 80%, 62%, ${alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }

  // 粒子
  for (const p of particles) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, 0.9)`
    ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, 0.8)`
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function loop() {
  step()
  raf = requestAnimationFrame(loop)
}

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
}

function onMouseLeave() {
  mouse.x = -9999
  mouse.y = -9999
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  resize()
  window.addEventListener('resize', resize)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseleave', onMouseLeave)

  if (reducedMotion) {
    step()
  } else {
    loop()
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  canvasRef.value?.removeEventListener('mousemove', onMouseMove)
  canvasRef.value?.removeEventListener('mouseleave', onMouseLeave)
})
</script>

<template>
  <div class="particle-field" role="img" aria-label="动态粒子星空装饰">
    <canvas ref="canvasRef" class="particle-field__canvas" />
    <div class="particle-field__glow" />
    <div class="particle-field__core">
      <span class="particle-field__core-ring" />
      <span class="particle-field__core-dot" />
    </div>
  </div>
</template>

<style scoped>
.particle-field {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 460px;
  border-radius: 20px;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 60% at 50% 45%, rgba(61, 220, 132, 0.07), transparent 65%),
    linear-gradient(160deg, var(--bg-2), var(--bg-1));
  border: 1px solid var(--line);
  box-shadow:
    0 30px 70px rgba(0, 0, 0, 0.5),
    inset 0 0 80px rgba(0, 0, 0, 0.35);
}

.particle-field__canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.particle-field__glow {
  position: absolute;
  inset: -30%;
  z-index: 0;
  background: radial-gradient(circle at 50% 50%, rgba(61, 220, 132, 0.16), transparent 55%);
  animation: breathe 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes breathe {
  0%, 100% {
    transform: scale(0.92);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

/* 中心发光核心 */
.particle-field__core {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.particle-field__core-ring {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 1px solid rgba(61, 220, 132, 0.35);
  border-top-color: rgba(61, 220, 132, 0.9);
  animation: spin 9s linear infinite;
  box-shadow: 0 0 40px rgba(61, 220, 132, 0.18);
}

.particle-field__core-ring::after {
  content: '';
  position: absolute;
  inset: 22px;
  border-radius: 50%;
  border: 1px dashed rgba(61, 220, 132, 0.22);
  animation: spin 14s linear infinite reverse;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.particle-field__core-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow:
    0 0 22px rgba(61, 220, 132, 0.9),
    0 0 60px rgba(61, 220, 132, 0.4);
}

@media (prefers-reduced-motion: reduce) {
  .particle-field__core-ring,
  .particle-field__core-ring::after,
  .particle-field__glow {
    animation: none;
  }
}
</style>
