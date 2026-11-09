<script setup lang="ts">
/**
 * 首屏右侧 3D 展示卡：厚板 + Canvas 文字纹理 + 小屋。
 * 场景代码动态 import，不进首屏关键路径；WebGL 不可用时保留原 2D 卡作为降级。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '../composables/useTheme'
import HeroShowcase from './HeroShowcase.vue'
import ParticleField from './ParticleField.vue'
import type { HeroStageHandle } from '../three/heroStage'

const { isLight } = useTheme()
const host = ref<HTMLElement | null>(null)
const ready = ref(false)

// 首屏用 lite 模型缩短首访等待；「其他」页卡片仍用高模
const MODEL_URL = `${import.meta.env.BASE_URL}models/cozy-house-lite.glb`
// 地面与房屋同一原点：lite 地块，晚到淡入，缺文件时只显示房屋
const GROUND_URL = `${import.meta.env.BASE_URL}models/ground-card-lite.glb`

let handle: HeroStageHandle | null = null
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
  if (!alive || !host.value || handle || idleId) return
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
  try {
    // 动态拆包：three / GLTF / 场景代码都不进首屏主包
    const mod = await import('../three/heroStage')
    if (!alive || generation !== gen || !host.value || handle) return
    const created = await mod.createHeroStageScene(host.value, {
      url: MODEL_URL,
      groundUrl: GROUND_URL,
      light: isLight.value,
      onReady: () => {
        if (!alive || generation !== gen) return
        ready.value = true
      },
    })
    if (!alive || generation !== gen) {
      created.dispose()
      return
    }
    handle = created
    retries = 0
  } catch {
    /* 暂时抢不到 WebGL context（路由切换瞬间）或加载失败：保留 2D 卡并短延迟重试 */
    if (!alive || generation !== gen || handle) return
    if (retries >= 2) return
    retries += 1
    clearTimeout(retryTimer)
    retryTimer = window.setTimeout(() => {
      retryTimer = 0
      scheduleInit()
    }, 800 * retries)
  }
}

function destroyScene() {
  if (!handle) return
  handle.dispose()
  handle = null
  ready.value = false
  retries = 0
}

function scheduleDispose() {
  clearTimeout(disposeTimer)
  disposeTimer = window.setTimeout(() => {
    disposeTimer = 0
    destroyScene()
  }, 3500)
}

onMounted(() => {
  const el = host.value
  if (!el) return
  if (typeof IntersectionObserver === 'undefined') {
    scheduleInit()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) return
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
    { threshold: 0.01 },
  )
  observer.observe(el)
})

watch(isLight, (light) => {
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
  destroyScene()
})
</script>

<template>
  <div class="hero-stage">
    <!-- 3D 未就绪 / WebGL 不可用时的降级显示 -->
    <div v-if="!ready" class="hero-stage__fallback" aria-hidden="true">
      <HeroShowcase v-if="isLight" />
      <ParticleField v-else />
    </div>

    <div ref="host" class="hero-stage__gl" :class="{ 'is-ready': ready }" />

    <!-- canvas 文字不可选、读屏不可达，这里补等价文本 -->
    <p class="hero-stage__a11y">
      展示卡内容：practice.ts 伪代码，const practice = { role: 'full-stack', flow: 'design →
      ship', shipped: 6 }；状态 OPEN TO SELECTED WORK；设计 token：ink、teal、amber；交付数量
      06。板前展示台上立着一座小屋模型，黑夜模式下窗户与门廊灯会亮起。
    </p>
  </div>
</template>

<style scoped>
.hero-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  margin-inline: auto;
}

.hero-stage__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-stage__gl {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.55s ease;
}

.hero-stage__gl.is-ready {
  opacity: 1;
}

.hero-stage__gl :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.hero-stage__a11y {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .hero-stage__gl {
    transition: none;
  }
}
</style>
