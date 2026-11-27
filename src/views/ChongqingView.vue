<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type {
  CalloutScreenItem,
  DioramaController,
  DioramaView,
  DioramaWeather,
} from '../three/chongqing/types'

const router = useRouter()
const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const failed = ref(false)

const currentView = ref<DioramaView>('hero')
const currentWeather = ref<DioramaWeather>('rain')
const exploded = ref(false)
const convergence = ref(false)
const audioOn = ref(false)
const tierStatus = ref({
  sky: '+16m 单轨穿楼',
  street: '0m 梯坎老街',
  underground: '-10m 穿山地铁',
})
const callouts = ref<CalloutScreenItem[]>([])

let controller: DioramaController | null = null
let alive = true

function goBack() {
  void router.push('/other')
}

function selectView(view: DioramaView) {
  controller?.setView(view)
}

function selectWeather(weather: DioramaWeather) {
  controller?.setWeather(weather)
}

function triggerConvergence() {
  controller?.triggerConvergence()
}

function toggleAudio() {
  controller?.toggleAudio()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (e.key === 'Escape') {
    goBack()
  } else if (e.key === '1') {
    selectView('hero')
  } else if (e.key === '2') {
    selectView('street')
  } else if (e.key === '3') {
    controller?.cycleWeather()
  } else if (e.key === '4') {
    controller?.toggleExplode()
  } else if (e.code === 'Space') {
    e.preventDefault()
    triggerConvergence()
  } else if (e.key === 'm' || e.key === 'M') {
    toggleAudio()
  }
}

async function initScene() {
  failed.value = false
  ready.value = false
  controller?.dispose()
  controller = null

  try {
    const { createChongqingDiorama } = await import('../three/chongqing/scene')
    if (!alive || !host.value) return
    controller = createChongqingDiorama(host.value, {
      onStateChange: (s) => {
        currentView.value = s.view
        currentWeather.value = s.weather
        exploded.value = s.exploded
        convergence.value = s.convergence
        audioOn.value = s.audioOn
        tierStatus.value = s.tierStatus
      },
      onCalloutsUpdate: (items) => {
        callouts.value = items
      },
    })
    requestAnimationFrame(() => {
      if (alive) ready.value = true
    })
  } catch (err) {
    console.error('[chongqing-diorama]', err)
    if (alive) failed.value = true
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeyDown)
  void initScene()
})

onBeforeUnmount(() => {
  alive = false
  window.removeEventListener('keydown', onKeyDown)
  controller?.dispose()
  controller = null
  document.body.style.overflow = ''
})
</script>

<template>
  <main class="cq-stage" :class="`cq-stage--${currentWeather}`">
    <div ref="host" class="cq-canvas" role="img" aria-label="重庆 8D 山城雨夜 1:150 立体剖面沙盘" />

    <!-- SVG CAD Leader Lines & 8 Dynamic Collision-Free Chinese CAD Callout Cards (Key 4 Explode) -->
    <svg v-if="callouts.length > 0" class="cq-cad-svg" aria-hidden="true">
      <g v-for="c in callouts" :key="`line-${c.id}`">
        <line
          :x1="c.anchorX"
          :y1="c.anchorY"
          :x2="c.side === 'left' ? c.cardX + 216 : c.cardX"
          :y2="c.cardY + 29"
          stroke="rgba(122, 232, 214, 0.72)"
          stroke-width="1.25"
          stroke-dasharray="3 3"
        />
        <circle :cx="c.anchorX" :cy="c.anchorY" r="3.6" fill="#f0c874" stroke="#0d1724" stroke-width="1.4" />
      </g>
    </svg>

    <div v-if="callouts.length > 0" class="cq-cad-layer" aria-label="三层剖面建筑标注">
      <div
        v-for="c in callouts"
        :key="c.id"
        class="cq-cad-card"
        :class="`cq-cad-card--${c.tier === '+1' ? 'sky' : c.tier === '0' ? 'street' : 'sub'}`"
        :style="{ left: `${c.cardX}px`, top: `${c.cardY}px` }"
      >
        <div class="cq-cad-card__top">
          <span class="cq-cad-card__elev">{{ c.elevation }}</span>
          <strong class="cq-cad-card__title">{{ c.title }}</strong>
        </div>
        <p class="cq-cad-card__sub">{{ c.subtitle }}</p>
      </div>
    </div>

    <!-- Top-Left Minimal Museum Header + Back Button -->
    <header class="cq-header">
      <button type="button" class="cq-back" aria-label="返回其他页面" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" width="15" height="15">
          <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>返回</span>
      </button>
      <div class="cq-title-block">
        <p class="cq-eyebrow">CHONGQING 8D RAIN BOX · 1:150 ARCHITECTURAL DIORAMA</p>
        <h1 class="cq-title">重庆 8D 山城雨夜沙盘</h1>
        <div class="cq-tier-line">
          <span>{{ tierStatus.sky }}</span>
          <i>·</i>
          <span>{{ tierStatus.street }}</span>
          <i>·</i>
          <span>{{ tierStatus.underground }}</span>
        </div>
      </div>
    </header>

    <!-- Top-Right Climate Pills (Key 3) + [M] Soundscape Toggle -->
    <aside class="cq-pills" aria-label="气候与音效切换">
      <div class="cq-pill-group" role="group" aria-label="三气候模式">
        <button
          type="button"
          class="cq-pill"
          :class="{ 'is-active': currentWeather === 'rain' }"
          @click="selectWeather('rain')"
        >
          <i class="cq-dot cq-dot--rain" />巴山夜雨
        </button>
        <button
          type="button"
          class="cq-pill"
          :class="{ 'is-active': currentWeather === 'sun' }"
          @click="selectWeather('sun')"
        >
          <i class="cq-dot cq-dot--sun" />江城晴午
        </button>
        <button
          type="button"
          class="cq-pill"
          :class="{ 'is-active': currentWeather === 'snow' }"
          @click="selectWeather('snow')"
        >
          <i class="cq-dot cq-dot--snow" />山城初雪
        </button>
      </div>
      <button
        type="button"
        class="cq-pill cq-pill--audio"
        :class="{ 'is-active': audioOn }"
        :aria-pressed="audioOn"
        @click="toggleAudio"
      >
        <kbd>M</kbd>
        <span>{{ audioOn ? '山城原声 · 开' : '山城原声' }}</span>
      </button>
    </aside>

    <!-- Bottom Museum Control Dock -->
    <nav class="cq-dock" aria-label="视角与剖面控制">
      <button
        type="button"
        class="cq-dock-btn"
        :class="{ 'is-active': currentView === 'hero' && !exploded }"
        @click="selectView('hero')"
      >
        <kbd>1</kbd> 微缩全景沙盘
      </button>
      <button
        type="button"
        class="cq-dock-btn"
        :class="{ 'is-active': currentView === 'street' && !exploded }"
        @click="selectView('street')"
      >
        <kbd>2</kbd> 梯坎街景追踪
      </button>
      <button
        type="button"
        class="cq-dock-btn"
        :class="{ 'is-active': exploded }"
        @click="selectView(exploded ? 'hero' : 'explode')"
      >
        <kbd>4</kbd> 三层剖面拆解
      </button>
      <button
        type="button"
        class="cq-dock-btn cq-dock-btn--accent"
        :class="{ 'is-active': convergence }"
        @click="triggerConvergence"
      >
        <kbd>Space</kbd> 魔幻三层交汇
      </button>
    </nav>

    <!-- Loading / WebGL Fallback Overlay -->
    <div v-if="!ready" class="cq-overlay" role="status">
      <span v-if="!failed" class="cq-spinner" />
      <p>{{ failed ? 'WebGL 场景初始化失败，请确认浏览器支持硬件加速。' : '正在构建 1:150 重庆 8D 山城立体剖面…' }}</p>
      <button v-if="failed" type="button" class="cq-retry" @click="initScene">重新加载</button>
    </div>
  </main>
</template>

<style scoped>
.cq-stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #080f1a;
  color: #f4ece0;
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  user-select: none;
}

.cq-canvas {
  position: absolute;
  inset: 0;
  touch-action: none;
  cursor: grab;
}

.cq-canvas:active {
  cursor: grabbing;
}

.cq-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

/* ==================== TOP-LEFT MUSEUM HEADER ==================== */
.cq-header {
  position: fixed;
  top: 18px;
  left: 20px;
  z-index: 12;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  pointer-events: none;
}

.cq-back {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(226, 194, 128, 0.28);
  background: rgba(11, 17, 27, 0.72);
  backdrop-filter: blur(12px);
  color: #efe2c8;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.cq-back:hover {
  background: rgba(34, 46, 62, 0.85);
  border-color: rgba(242, 206, 134, 0.65);
}

.cq-title-block {
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(10, 16, 26, 0.62);
  border: 1px solid rgba(226, 194, 128, 0.2);
  backdrop-filter: blur(12px);
}

.cq-eyebrow {
  margin: 0 0 2px;
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: #d6b26c;
}

.cq-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #fff6e6;
  line-height: 1.3;
}

.cq-tier-line {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(232, 224, 210, 0.82);
  font-family: 'SF Mono', 'PingFang SC', monospace;
}

.cq-tier-line i {
  font-style: normal;
  color: #c9a156;
}

/* ==================== TOP-RIGHT CLIMATE & AUDIO PILLS ==================== */
.cq-pills {
  position: fixed;
  top: 18px;
  right: 20px;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.cq-pill-group {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(10, 16, 26, 0.72);
  border: 1px solid rgba(226, 194, 128, 0.24);
  backdrop-filter: blur(12px);
  gap: 2px;
}

.cq-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(242, 234, 220, 0.82);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.cq-pill:hover {
  color: #fff8ea;
  background: rgba(255, 255, 255, 0.08);
}

.cq-pill.is-active {
  background: rgba(224, 178, 92, 0.24);
  color: #ffe8b8;
  box-shadow: inset 0 0 0 1px rgba(236, 196, 114, 0.48);
}

.cq-pill--audio {
  background: rgba(10, 16, 26, 0.72);
  border: 1px solid rgba(226, 194, 128, 0.24);
  backdrop-filter: blur(12px);
}

.cq-pill--audio kbd,
.cq-dock-btn kbd {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #f3d28e;
}

.cq-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.cq-dot--rain {
  background: #4bc5e6;
}
.cq-dot--sun {
  background: #f5b352;
}
.cq-dot--snow {
  background: #dbe8f8;
}

/* ==================== BOTTOM CONTROL DOCK ==================== */
.cq-dock {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(10, 16, 26, 0.78);
  border: 1px solid rgba(226, 194, 128, 0.28);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.42);
}

.cq-dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(242, 234, 220, 0.85);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.cq-dock-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
}

.cq-dock-btn.is-active {
  background: rgba(224, 178, 92, 0.25);
  color: #ffebbf;
  box-shadow: inset 0 0 0 1px rgba(238, 198, 118, 0.55);
}

.cq-dock-btn--accent.is-active {
  background: rgba(214, 68, 44, 0.34);
  color: #ffe3d4;
  box-shadow: inset 0 0 0 1px rgba(255, 118, 86, 0.65);
}

/* ==================== KEY 4 CAD CALLOUT CARDS ==================== */
.cq-cad-svg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 8;
}

.cq-cad-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9;
}

.cq-cad-card {
  position: absolute;
  width: 216px;
  height: 58px;
  box-sizing: border-box;
  padding: 8px 11px;
  border-radius: 9px;
  background: rgba(9, 16, 26, 0.84);
  border: 1px solid rgba(116, 224, 208, 0.36);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.36);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.cq-cad-card--sky {
  border-left: 3px solid #4bd69c;
}
.cq-cad-card--street {
  border-left: 3px solid #f0b24a;
}
.cq-cad-card--sub {
  border-left: 3px solid #e65846;
}

.cq-cad-card__top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.cq-cad-card__elev {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(235, 198, 122, 0.18);
  color: #f2cc80;
}

.cq-cad-card__title {
  font-size: 12.5px;
  font-weight: 600;
  color: #fff6e6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cq-cad-card__sub {
  margin: 0;
  font-size: 10.5px;
  color: rgba(216, 224, 234, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==================== LOADING OVERLAY ==================== */
.cq-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #080f1a;
  color: #efe2c8;
  font-size: 13px;
}

.cq-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(224, 184, 104, 0.24);
  border-top-color: #ecc26c;
  border-radius: 50%;
  animation: cq-spin 1s linear infinite;
}

.cq-retry {
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid #d6b26c;
  background: rgba(214, 178, 108, 0.2);
  color: #fff4df;
  cursor: pointer;
}

@keyframes cq-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 820px) {
  .cq-tier-line {
    display: none;
  }
  .cq-dock {
    max-width: calc(100vw - 24px);
    overflow-x: auto;
  }
  .cq-cad-card {
    display: none;
  }
}
</style>
