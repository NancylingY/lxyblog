<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import type { TerrariumControls } from '../three/terrarium/scene'

const router = useRouter()
const { t } = useResume()

const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const entered = ref(false)
const isDay = ref(true)

let controls: TerrariumControls | null = null
let enterTimer = 0
let readyTimer = 0
let pointerStart: { x: number; y: number; at: number } | null = null

function goBack() {
  router.push('/other')
}

function onPhase(day: boolean) {
  isDay.value = day
}

function toggleDayNight() {
  controls?.toggleDayNight()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') goBack()
  if (e.key === 'd' || e.key === 'D') controls?.toggleDayNight()
}

function onPointerDown(e: PointerEvent) {
  pointerStart = { x: e.clientX, y: e.clientY, at: performance.now() }
}

function onPointerUp(e: PointerEvent) {
  if (!pointerStart) return
  const dx = e.clientX - pointerStart.x
  const dy = e.clientY - pointerStart.y
  const quick = performance.now() - pointerStart.at < 450
  pointerStart = null
  if (quick && Math.hypot(dx, dy) < 6) controls?.toggleDayNight()
}

onMounted(async () => {
  document.body.style.overflow = 'hidden'
  enterTimer = window.setTimeout(() => (entered.value = true), 600)

  const el = host.value
  if (!el) return

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', onKey)

  // three.js 只在进入本页时加载
  const { createTerrariumScene } = await import('../three/terrarium/scene')
  if (!host.value) return
  controls = createTerrariumScene(host.value, onPhase)

  requestAnimationFrame(() => {
    readyTimer = window.setTimeout(() => (ready.value = true), 320)
  })
})

onBeforeUnmount(() => {
  window.clearTimeout(enterTimer)
  window.clearTimeout(readyTimer)
  window.removeEventListener('keydown', onKey)
  const el = host.value
  if (el) {
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointerup', onPointerUp)
  }
  document.body.style.overflow = ''
  controls?.dispose()
  controls = null
})
</script>

<template>
  <div
    ref="host"
    class="stage"
    role="img"
    :aria-label="`${t.terrariumTitle} · 3D`"
  />

  <div class="loader" :class="{ 'is-hidden': ready }" aria-hidden="true">
    <span class="loader__ring"><i /></span>
  </div>

  <button
    type="button"
    class="round-btn back"
    :class="{ 'is-in': entered }"
    :aria-label="t.back"
    @click="goBack"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>

  <button
    type="button"
    class="round-btn phase"
    :class="{ 'is-in': entered, 'is-night': !isDay }"
    :aria-label="isDay ? t.terrariumDay : t.terrariumNight"
    @click="toggleDayNight"
  >
    <svg v-if="isDay" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="17" height="17" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" stroke-linecap="round" />
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="17" height="17" aria-hidden="true">
      <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" stroke-linejoin="round" />
    </svg>
  </button>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  background: #050a11;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.stage:active {
  cursor: grabbing;
}

/* ============================ 按钮 ============================ */
.round-btn {
  position: fixed;
  top: 20px;
  z-index: 6;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  padding: 0;
  color: rgba(226, 244, 255, 0.82);
  background: rgba(9, 14, 21, 0.78);
  border: 1px solid rgba(160, 220, 255, 0.18);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
  transition:
    opacity 0.55s ease,
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.25s ease,
    background 0.35s ease,
    border-color 0.35s ease,
    box-shadow 0.25s ease;
}

.round-btn.is-in {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.round-btn:hover {
  color: #cdefff;
  border-color: rgba(168, 226, 255, 0.7);
  background: rgba(120, 200, 240, 0.12);
  box-shadow: 0 0 22px rgba(120, 200, 240, 0.16);
}

.round-btn:active {
  transform: scale(0.92);
}

.round-btn svg {
  display: block;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.back {
  left: 20px;
}

.back:hover svg {
  transform: translateX(-2px);
}

.phase {
  right: 20px;
  color: rgba(255, 224, 176, 0.9);
  background: rgba(42, 31, 16, 0.6);
  border-color: rgba(255, 204, 128, 0.2);
}

.phase:hover {
  color: #ffe6b8;
  background: rgba(255, 205, 130, 0.12);
  border-color: rgba(255, 214, 150, 0.6);
  box-shadow: 0 0 22px rgba(255, 205, 130, 0.14);
}

.phase.is-night {
  color: rgba(183, 209, 255, 0.92);
  background: rgba(16, 28, 50, 0.68);
  border-color: rgba(150, 190, 255, 0.24);
}

.phase.is-night:hover {
  color: #d9e7ff;
  background: rgba(150, 190, 255, 0.14);
  border-color: rgba(170, 205, 255, 0.6);
  box-shadow: 0 0 22px rgba(150, 190, 255, 0.16);
}

/* ============================ loader ============================ */
.loader {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse 60% 50% at 50% 46%, rgba(16, 38, 58, 0.55), transparent 70%),
    #04080e;
  transition: opacity 0.9s ease, visibility 0.9s ease;
}

.loader.is-hidden {
  opacity: 0;
  visibility: hidden;
}

.loader__ring {
  position: relative;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(150, 214, 250, 0.18);
  border-top-color: rgba(176, 230, 255, 0.9);
  border-radius: 50%;
  animation: loader-spin 2.6s linear infinite;
}

.loader__ring i {
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(202, 240, 255, 0.85), rgba(120, 200, 240, 0) 70%);
  animation: loader-pulse 2.2s ease-in-out infinite;
}

@keyframes loader-spin {
  to { transform: rotate(360deg); }
}

@keyframes loader-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.05); }
}

@media (max-width: 520px) {
  .round-btn {
    top: 14px;
    width: 36px;
    height: 36px;
  }

  .back {
    left: 14px;
  }

  .phase {
    right: 14px;
  }
}
</style>
