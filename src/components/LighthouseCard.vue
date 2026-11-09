/**
 * 「其他」页 · 海边灯塔夜景 3D 视口
 * - 进入视口才动态 import 场景（three / 场景代码不进主包）
 * - 离屏停帧，长时间离屏销毁并释放 GPU 资源；路由离开组件卸载时彻底销毁
 * - 单 WebGL context 守卫抢不到时保持静态占位并延迟重试，不刷错误
 * - 加载期与失败时都显示静态夜景占位，不出现空白
 */
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  clearContextOwner,
  markContextOwner,
  registerContextCandidate,
  setContextCandidateRatio,
  unregisterContextCandidate,
  yieldContextTo,
} from '../three/houseKit'
import type { LighthouseHandle, LighthouseProgress } from '../three/lighthouseScene'
import LighthouseLoader from './LighthouseLoader.vue'

defineProps<{ failText: string }>()

const host = ref<HTMLElement | null>(null)
const state = ref<'loading' | 'ready' | 'failed'>('loading')
const progress = ref<LighthouseProgress | null>(null)

const MODEL_URL = `${import.meta.env.BASE_URL}models/lighthouse-v2-lite.glb`

let handle: LighthouseHandle | null = null
let observer: IntersectionObserver | null = null
let idleId = 0
let usingIdleCallback = false
let disposeTimer = 0
let retryTimer = 0
let retries = 0
let generation = 0
let alive = true

function cancelIdle() {
  if (!idleId) return
  if (usingIdleCallback) window.cancelIdleCallback(idleId)
  else clearTimeout(idleId)
  idleId = 0
}

function scheduleInit() {
  if (!alive || !host.value || handle || idleId || state.value === 'failed') return
  const gen = generation
  const run = () => {
    idleId = 0
    void init(gen)
  }
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number
  }
  if (typeof idleWindow.requestIdleCallback === 'function') {
    usingIdleCallback = true
    idleId = idleWindow.requestIdleCallback(run, { timeout: 2000 })
  } else {
    usingIdleCallback = false
    idleId = window.setTimeout(run, 320)
  }
}

async function init(gen: number) {
  if (!alive || generation !== gen || !host.value || handle) return
  // 同页多张 3D 卡：自己可见度更高时请持有者让出 context
  yieldContextTo('lighthouse-card')
  progress.value = { stage: 'engine', percent: 0 }
  try {
    const mod = await import('../three/lighthouseScene')
    if (!alive || generation !== gen || !host.value || handle) return
    const created = await mod.createLighthouseScene(host.value, {
      url: MODEL_URL,
      onReady: () => {
        if (!alive || generation !== gen) return
        state.value = 'ready'
      },
      onProgress: (next) => {
        if (!alive || generation !== gen) return
        progress.value = next
      },
      // 卡片只接双指捏合：滚轮留给页面滚动，不抢整页手势
      zoom: true,
      wheelZoom: false,
    })
    if (!alive || generation !== gen) {
      created.dispose()
      return
    }
    handle = created
    markContextOwner('lighthouse-card')
    retries = 0
  } catch (error) {
    /*
     * 抢不到 WebGL context（相邻卡片正在渲染）或创建失败：
     * 保持静态占位，间隔重试；只有真正的创建失败才标记失败。
     */
    if (!alive || generation !== gen || handle) return
    const contention = error instanceof Error && error.message.includes('another WebGL context')
    if (!contention) console.warn('[lighthouse] scene init failed', error)
    if (contention || retries < 3) {
      retries = Math.min(retries + 1, 10)
      clearTimeout(retryTimer)
      retryTimer = window.setTimeout(() => {
        retryTimer = 0
        scheduleInit()
      }, contention ? 1200 : 800 * retries)
      return
    }
    state.value = 'failed'
  }
}

function destroyScene() {
  if (!handle) return
  handle.dispose()
  handle = null
  clearContextOwner('lighthouse-card')
  retries = 0
  progress.value = null
  if (state.value === 'ready') state.value = 'loading'
}

/** 失败态重试：清掉状态重新排队初始化，不强制重新加载整个页面 */
function retry() {
  if (!alive || state.value !== 'failed') return
  retries = 0
  state.value = 'loading'
  progress.value = null
  scheduleInit()
}

function scheduleDispose() {
  clearTimeout(disposeTimer)
  disposeTimer = window.setTimeout(() => {
    disposeTimer = 0
    destroyScene()
  }, 6000)
}

onMounted(() => {
  const el = host.value
  if (!el) return
  registerContextCandidate('lighthouse-card', destroyScene)
  if (typeof IntersectionObserver === 'undefined') {
    scheduleInit()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) return
      setContextCandidateRatio('lighthouse-card', entry.intersectionRatio)
      if (entry.isIntersecting) {
        clearTimeout(disposeTimer)
        disposeTimer = 0
        if (handle) handle.setActive(true)
        else scheduleInit()
      } else {
        handle?.setActive(false)
        if (handle) scheduleDispose()
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  )
  observer.observe(el)
})

onBeforeUnmount(() => {
  alive = false
  generation += 1
  cancelIdle()
  clearTimeout(disposeTimer)
  clearTimeout(retryTimer)
  observer?.disconnect()
  observer = null
  unregisterContextCandidate('lighthouse-card')
  destroyScene()
})
</script>

<template>
  <div class="lh-preview">
    <div ref="host" class="lh-preview__gl" :class="{ 'is-ready': state === 'ready' }" />

    <div v-if="state !== 'ready'" class="lh-preview__ph" :class="{ 'is-failed': state === 'failed' }">
      <!-- 静态夜景占位：海平线、月光、灯塔剪影与扫过的光束 -->
      <svg class="lh-preview__art" viewBox="0 0 320 200" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="lhSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#04070f" />
            <stop offset="0.62" stop-color="#0a1e2d" />
            <stop offset="1" stop-color="#0d2c3a" />
          </linearGradient>
          <linearGradient id="lhBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#ffe0a8" stop-opacity="0.55" />
            <stop offset="1" stop-color="#ffe0a8" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="lhSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#0e3540" />
            <stop offset="1" stop-color="#061019" />
          </linearGradient>
          <radialGradient id="lhMoon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stop-color="#e8f1ff" stop-opacity="0.9" />
            <stop offset="1" stop-color="#e8f1ff" stop-opacity="0" />
          </radialGradient>
        </defs>

        <rect width="320" height="200" fill="url(#lhSky)" />
        <circle cx="246" cy="42" r="26" fill="url(#lhMoon)" />
        <circle cx="246" cy="42" r="6" fill="#dfeaff" opacity="0.8" />
        <g fill="#d7e6ff" opacity="0.6">
          <circle cx="58" cy="30" r="1" />
          <circle cx="104" cy="18" r="0.8" />
          <circle cx="168" cy="42" r="0.9" />
          <circle cx="212" cy="22" r="0.7" />
          <circle cx="286" cy="76" r="0.8" />
          <circle cx="24" cy="64" r="0.7" />
        </g>

        <!-- 光柱 -->
        <path d="M126 96 L248 62 L252 96 Z" fill="url(#lhBeam)" opacity="0.5" />
        <path d="M124 96 L40 74 L44 100 Z" fill="url(#lhBeam)" opacity="0.28" />

        <!-- 海面 -->
        <rect y="118" width="320" height="82" fill="url(#lhSea)" />
        <path d="M0 130 Q80 124 160 131 T320 128" stroke="#2f6b78" stroke-opacity="0.35" stroke-width="1" />
        <path d="M0 148 Q90 141 180 150 T320 146" stroke="#2f6b78" stroke-opacity="0.22" stroke-width="1" />
        <ellipse cx="246" cy="136" rx="40" ry="3" fill="#b9d4ef" opacity="0.18" />

        <!-- 岸与灯塔 -->
        <path d="M0 200 L0 132 Q46 122 92 138 Q132 150 160 200 Z" fill="#1c2830" />
        <path d="M116 138 L126 88 L134 88 L146 200 L104 200 Z" fill="#c2cdd8" opacity="0.85" />
        <path d="M122 118 L138 118 L140 128 L120 128 Z" fill="#8f3a32" opacity="0.9" />
        <rect x="124" y="80" width="12" height="10" rx="2" fill="#ffcf8a" opacity="0.9" />
        <path d="M121 80 L139 80 L130 70 Z" fill="#232c33" />
        <circle cx="130" cy="84" r="12" fill="#ffd99a" opacity="0.22" />
      </svg>

    </div>

    <LighthouseLoader
      v-if="state !== 'ready'"
      class="lh-preview__load"
      compact
      :progress="progress"
      :failed="state === 'failed'"
      :failed-text="failText"
      @retry="retry"
    />
  </div>
</template>

<style scoped>
.lh-preview {
  position: relative;
  width: 100%;
  height: 100%;
}

.lh-preview__gl {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
  /* 横向拖拽交给场景，纵向留给页面滚动 */
  touch-action: pan-y;
  overscroll-behavior: contain;
}

.lh-preview__gl.is-ready {
  opacity: 1;
}

.lh-preview__gl :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

@media (hover: hover) and (pointer: fine) {
  .lh-preview__gl {
    cursor: grab;
  }

  .lh-preview__gl.is-dragging {
    cursor: grabbing;
  }
}

.lh-preview__ph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(147, 164, 184, 0.45);
  pointer-events: none;
  transition: opacity 0.4s ease;
  overflow: hidden;
}

.lh-preview__art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lh-preview__ph.is-failed {
  color: rgba(230, 237, 243, 0.66);
}

/* 加载 / 失败：贴在拖拽提示上方，不遮住卡片的进入文案 */
.lh-preview__load {
  position: absolute;
  left: 14px;
  right: 14px;
  /* 让出右下角的「拖拽旋转」提示，百分比不会被它盖住 */
  bottom: 56px;
  z-index: 2;
  box-sizing: border-box;
  /* 占位插画始终是夜景，进度文字固定用浅色，不跟随浅色主题 */
  --ink: #eef4fb;
  --ink-dim: rgba(226, 236, 246, 0.78);
  --accent: #ffcf8f;
  --bg-2: rgba(6, 10, 16, 0.72);
  --line-bright: rgba(255, 207, 143, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  .lh-preview__gl,
  .lh-preview__ph {
    transition: none;
  }
}
</style>
