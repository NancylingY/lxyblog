/**
 * 「其他」页小屋 3D 视口
 * - 进入视口才动态 import 场景（three / 模型不进主包）
 * - 离屏停帧，长时间离屏销毁并释放 GPU 资源；路由离开组件卸载时彻底销毁
 * - WebGL 不可用或加载失败：静态占位 + 文案，不刷控制台错误
 */
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '../composables/useTheme'
import {
  clearContextOwner,
  markContextOwner,
  registerContextCandidate,
  setContextCandidateRatio,
  unregisterContextCandidate,
  yieldContextTo,
} from '../three/houseKit'
import type { HouseCardHandle } from '../three/houseCardScene'

defineProps<{ failText: string }>()

const { isLight } = useTheme()
const host = ref<HTMLElement | null>(null)
const state = ref<'loading' | 'ready' | 'failed'>('loading')

// 与首屏共用同一份 lite 模型，换模型覆盖文件后两处自动跟着更新
const MODEL_URL = `${import.meta.env.BASE_URL}models/cozy-house-lite.glb`
const GROUND_URL = `${import.meta.env.BASE_URL}models/ground-card-lite.glb`

let handle: HouseCardHandle | null = null
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
  // 同页多张 3D 卡时，如果自己更显眼就请当前持有者让出 context
  yieldContextTo('house-card')
  try {
    const mod = await import('../three/houseCardScene')
    if (!alive || generation !== gen || !host.value || handle) return
    const created = await mod.createHouseCardScene(host.value, {
      url: MODEL_URL,
      groundUrl: GROUND_URL,
      light: isLight.value,
      onReady: () => {
        if (!alive || generation !== gen) return
        state.value = 'ready'
      },
    })
    if (!alive || generation !== gen) {
      created.dispose()
      return
    }
    handle = created
    markContextOwner('house-card')
    retries = 0
  } catch {
    // WebGL 不可用 / 模型加载失败：先短延迟重试，仍失败才停在静态占位
    if (!alive || generation !== gen || handle) return
    if (retries < 2) {
      retries += 1
      state.value = 'loading'
      clearTimeout(retryTimer)
      retryTimer = window.setTimeout(() => {
        retryTimer = 0
        scheduleInit()
      }, 800 * retries)
      return
    }
    state.value = 'failed'
  }
}

function destroyScene() {
  if (!handle) return
  handle.dispose()
  handle = null
  clearContextOwner('house-card')
  retries = 0
  if (state.value === 'ready') state.value = 'loading'
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
  registerContextCandidate('house-card', destroyScene)
  if (typeof IntersectionObserver === 'undefined') {
    scheduleInit()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) return
      setContextCandidateRatio('house-card', entry.intersectionRatio)
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

watch(isLight, (light) => {
  // 只切换光照插值，不重建场景
  handle?.setLight(light)
})

onBeforeUnmount(() => {
  alive = false
  generation += 1
  cancelIdle()
  clearTimeout(disposeTimer)
  clearTimeout(retryTimer)
  observer?.disconnect()
  observer = null
  unregisterContextCandidate('house-card')
  destroyScene()
})
</script>

<template>
  <div class="house-preview">
    <div ref="host" class="house-preview__gl" :class="{ 'is-ready': state === 'ready' }" />

    <div v-if="state !== 'ready'" class="house-preview__ph" :class="{ 'is-failed': state === 'failed' }">
      <svg class="house-preview__icon" viewBox="0 0 64 52" fill="none" aria-hidden="true">
        <path
          d="M6 24 32 7l26 17"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M11 21v24h42V21M27 45V30h10v15"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="44" cy="36" r="2.6" fill="currentColor" />
      </svg>
      <p v-if="state === 'failed'" class="house-preview__fail">{{ failText }}</p>
    </div>
  </div>
</template>

<style scoped>
.house-preview {
  position: relative;
  width: 100%;
  height: 100%;
}

.house-preview__gl {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
  /* 横向拖拽交给场景，纵向留给页面滚动 */
  touch-action: pan-y;
}

.house-preview__gl.is-ready {
  opacity: 1;
}

.house-preview__gl :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

@media (hover: hover) and (pointer: fine) {
  .house-preview__gl {
    cursor: grab;
  }

  .house-preview__gl.is-dragging {
    cursor: grabbing;
  }
}

.house-preview__ph {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(147, 164, 184, 0.45);
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.house-preview__ph.is-failed {
  color: rgba(230, 237, 243, 0.66);
}

.house-preview__icon {
  width: 58px;
  height: 47px;
  opacity: 0.9;
}

.house-preview__fail {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.04em;
}

@media (prefers-reduced-motion: reduce) {
  .house-preview__gl,
  .house-preview__ph {
    transition: none;
  }
}
</style>
