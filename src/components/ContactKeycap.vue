<script setup lang="ts">
/**
 * 轻量 3D 键帽：SVG + CSS 材质 + GSAP 倾斜/按压。
 * 不引入 WebGL，弱性能设备也能完整显示；日光陶瓷 / 黑夜烟熏玻璃。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useResume } from '../data/resume'
import { useTheme } from '../composables/useTheme'
import { copyText } from '../utils/clipboard'

const { profile, locale } = useResume()
const { isDark } = useTheme()

const button = ref<HTMLButtonElement | null>(null)
const object = ref<HTMLElement | null>(null)
const copied = ref(false)
let copyTimer = 0
let rx: ((value: number) => void) | null = null
let ry: ((value: number) => void) | null = null

const hint = computed(() => {
  const zh = locale.value === 'zh'
  if (copied.value) return zh ? '已复制到剪贴板' : 'COPIED TO CLIPBOARD'
  return zh ? '按下键帽复制邮箱' : 'PRESS THE KEY TO COPY EMAIL'
})

const ariaLabel = computed(() =>
  locale.value === 'zh' ? '复制邮箱地址' : 'Copy email address',
)

function canHover() {
  return window.matchMedia('(pointer: fine)').matches
}

onMounted(() => {
  if (!object.value || !canHover()) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.set(object.value, { transformPerspective: 900 })
  rx = gsap.quickTo(object.value, 'rotationX', { duration: 0.45, ease: 'power2.out' })
  ry = gsap.quickTo(object.value, 'rotationY', { duration: 0.45, ease: 'power2.out' })
})

function onMove(event: PointerEvent) {
  if (!rx || !ry || !button.value) return
  const rect = button.value.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width - 0.5
  const py = (event.clientY - rect.top) / rect.height - 0.5
  rx(-py * 7)
  ry(px * 7)
}

function onLeave() {
  rx?.(0)
  ry?.(0)
}

async function copyEmail() {
  const ok = await copyText(profile.value.email)
  if (!ok) return

  copied.value = true
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
  }, 1800)

  if (object.value) {
    gsap
      .timeline()
      .to(object.value, { y: 12, scale: 0.97, duration: 0.1, ease: 'power2.in' })
      .to(object.value, { y: 0, scale: 1, duration: 0.38, ease: 'back.out(2.2)' })
  }
}

onBeforeUnmount(() => window.clearTimeout(copyTimer))
</script>

<template>
  <div class="keycap-block" :class="{ 'keycap-block--night': isDark }">
    <button
      ref="button"
      type="button"
      class="keycap"
      :aria-label="ariaLabel"
      @pointermove="onMove"
      @pointerleave="onLeave"
      @click="copyEmail"
    >
      <span class="keycap__glow" aria-hidden="true" />
      <span ref="object" class="keycap__object">
        <svg class="keycap__svg" viewBox="0 0 240 200" aria-hidden="true">
          <defs>
            <linearGradient id="kc-top" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" style="stop-color: var(--kc-top-a)" />
              <stop offset="1" style="stop-color: var(--kc-top-b)" />
            </linearGradient>
            <linearGradient id="kc-base" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0" style="stop-color: var(--kc-base-a)" />
              <stop offset="1" style="stop-color: var(--kc-base-b)" />
            </linearGradient>
            <linearGradient id="kc-dish" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" style="stop-color: var(--kc-dish-a)" />
              <stop offset="1" style="stop-color: var(--kc-dish-b)" />
            </linearGradient>
          </defs>

          <ellipse class="keycap__shadow" cx="120" cy="178" rx="80" ry="13" />
          <rect class="keycap__base" x="34" y="48" width="172" height="126" rx="30" />
          <rect class="keycap__side" x="40" y="42" width="160" height="122" rx="28" />
          <rect class="keycap__top" x="46" y="24" width="148" height="116" rx="26" />
          <rect class="keycap__dish" x="61" y="39" width="118" height="86" rx="18" />
          <text class="keycap__legend" x="120" y="84" text-anchor="middle">Y</text>
          <text class="keycap__micro" x="120" y="103" text-anchor="middle">STUDIO</text>
          <rect class="keycap__scan" x="58" y="56" width="124" height="1.5" rx="0.75" />
        </svg>
      </span>
    </button>
    <p class="keycap__hint" :class="{ 'is-copied': copied }">
      <span class="keycap__hint-dot" />
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>
.keycap-block {
  --kc-top-a: #fffdf8;
  --kc-top-b: #e8ddce;
  --kc-base-a: #d8c9b8;
  --kc-base-b: #a99784;
  --kc-side: #c2b19e;
  --kc-dish-a: #fbf4e9;
  --kc-dish-b: #e8dccb;
  --kc-rim: rgba(85, 64, 43, 0.16);
  --kc-rim-soft: rgba(85, 64, 43, 0.1);
  --kc-legend: #0d7490;
  --kc-micro: rgba(13, 116, 144, 0.55);
  --kc-shadow: rgba(74, 54, 30, 0.2);
  --kc-glow: rgba(255, 196, 107, 0.22);
  --kc-scan: transparent;
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.keycap-block--night {
  --kc-top-a: #23333b;
  --kc-top-b: #0b151a;
  --kc-base-a: #0a161c;
  --kc-base-b: #020709;
  --kc-side: #0d1b22;
  --kc-dish-a: #14232a;
  --kc-dish-b: #091419;
  --kc-rim: rgba(130, 220, 255, 0.16);
  --kc-rim-soft: rgba(130, 220, 255, 0.08);
  --kc-legend: #9feaff;
  --kc-micro: rgba(159, 234, 255, 0.5);
  --kc-shadow: rgba(0, 0, 0, 0.55);
  --kc-glow: rgba(61, 220, 132, 0.16);
  --kc-scan: rgba(61, 220, 132, 0.38);
}

.keycap {
  position: relative;
  width: 210px;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.keycap__glow {
  position: absolute;
  inset: 14% 8% 4%;
  border-radius: 50%;
  background: radial-gradient(circle, var(--kc-glow), transparent 68%);
  filter: blur(18px);
  pointer-events: none;
}

.keycap__object {
  position: relative;
  display: block;
  transform: rotateX(11deg) rotateZ(-4deg);
  transform-style: preserve-3d;
  will-change: transform;
}

.keycap__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  filter: drop-shadow(0 20px 26px var(--kc-shadow));
}

.keycap__shadow {
  fill: var(--kc-shadow);
}

.keycap__base {
  fill: url(#kc-base);
}

.keycap__side {
  fill: var(--kc-side);
}

.keycap__top {
  fill: url(#kc-top);
  stroke: var(--kc-rim);
  stroke-width: 1;
}

.keycap__dish {
  fill: url(#kc-dish);
  stroke: var(--kc-rim-soft);
  stroke-width: 1;
}

.keycap__legend {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  fill: var(--kc-legend);
  letter-spacing: -0.02em;
}

.keycap__micro {
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.26em;
  fill: var(--kc-micro);
}

.keycap__scan {
  fill: var(--kc-scan);
}

.keycap__hint {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 500;
  letter-spacing: 0.08em;
  line-height: 1.5;
  text-align: center;
  color: var(--ink-faint);
  text-transform: uppercase;
  transition: color 0.25s ease;
}

.keycap__hint-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 8px color-mix(in srgb, var(--amber) 40%, transparent);
}

.keycap__hint.is-copied {
  color: var(--accent);
}

.keycap__hint.is-copied .keycap__hint-dot {
  background: var(--accent);
}

.keycap:hover .keycap__hint {
  color: var(--ink-dim);
}

@media (max-width: 520px) {
  .keycap {
    width: 180px;
  }

  .keycap__hint {
    font-size: var(--fs-xs);
    letter-spacing: 0.04em;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
