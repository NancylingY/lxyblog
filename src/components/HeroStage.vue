<script setup lang="ts">
/**
 * 首屏全幅 3D 舞台容器
 * - 零外部模型下载，首帧立即启动 GLSL 流体晶体与星轨仪
 * - 视口外自动暂停渲染并回收 WebGL 上下文，避免与其他 3D 页面冲突
 * - WebGL 不可用时优雅降级为轻盈 CSS 光环核心
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '../composables/useTheme'
import type { HeroKineticHandle, HeroKineticMode } from '../three/heroKinetic'

const props = defineProps<{
  mode: HeroKineticMode
  slotEl: HTMLElement | null
}>()

const { isLight } = useTheme()
const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const failed = ref(false)

let handle: HeroKineticHandle | null = null
let observer: IntersectionObserver | null = null
let disposeTimer = 0
let generation = 0
let alive = true

async function init(gen: number) {
  if (!alive || generation !== gen || !host.value || handle) return
  try {
    const mod = await import('../three/heroKinetic')
    if (!alive || generation !== gen || !host.value || handle) return
    const created = await mod.createHeroKineticScene(host.value, {
      light: isLight.value,
      mode: props.mode,
      slotEl: props.slotEl,
      onReady: () => {
        if (!alive || generation !== gen) return
        ready.value = true
        failed.value = false
      },
    })
    if (!alive || generation !== gen) {
      created.dispose()
      return
    }
    handle = created
  } catch {
    if (!alive || generation !== gen) return
    failed.value = true
  }
}

function destroyScene() {
  if (!handle) return
  handle.dispose()
  handle = null
  ready.value = false
}

function scheduleDispose() {
  clearTimeout(disposeTimer)
  disposeTimer = window.setTimeout(() => {
    disposeTimer = 0
    destroyScene()
  }, 4000)
}

function pulse() {
  handle?.pulse()
}

defineExpose({ pulse })

onMounted(() => {
  const el = host.value
  if (!el) return
  if (typeof IntersectionObserver === 'undefined') {
    void init(generation)
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
        else void init(generation)
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

watch(
  () => props.mode,
  (mode) => {
    handle?.setMode(mode)
  },
)

watch(
  () => props.slotEl,
  (el) => {
    handle?.setSlotEl(el)
  },
)

onBeforeUnmount(() => {
  alive = false
  generation += 1
  clearTimeout(disposeTimer)
  observer?.disconnect()
  observer = null
  destroyScene()
})
</script>

<template>
  <div class="hero-kinetic" aria-hidden="true">
    <!-- 柔光环境背晕，衬托日夜两种氛围 -->
    <div class="hero-kinetic__aura" />

    <!-- WebGL 不可用时的纯 CSS 光环降级 -->
    <div v-if="failed" class="hero-kinetic__fallback">
      <div class="fallback-orb">
        <span class="fallback-orb__core" />
        <span class="fallback-orb__ring fallback-orb__ring--a" />
        <span class="fallback-orb__ring fallback-orb__ring--b" />
      </div>
    </div>

    <div ref="host" class="hero-kinetic__gl" :class="{ 'is-ready': ready }" />
  </div>
</template>

<style scoped>
.hero-kinetic {
  position: absolute;
  inset: 0;
  z-index: var(--z-base);
  overflow: hidden;
  pointer-events: none;
}

.hero-kinetic__aura {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 52% 58% at 74% 48%, rgba(13, 116, 144, 0.14), transparent 68%),
    radial-gradient(ellipse 38% 42% at 84% 26%, rgba(245, 158, 11, 0.13), transparent 64%);
  transition: opacity 0.45s ease;
}

[data-theme='dark'] .hero-kinetic__aura {
  background:
    radial-gradient(ellipse 54% 58% at 74% 48%, rgba(61, 220, 132, 0.14), transparent 68%),
    radial-gradient(ellipse 40% 44% at 84% 28%, rgba(86, 200, 255, 0.12), transparent 64%);
}

.hero-kinetic__gl {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.65s ease;
}

.hero-kinetic__gl.is-ready {
  opacity: 1;
}

.hero-kinetic__gl :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.hero-kinetic__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.fallback-orb {
  position: relative;
  width: 240px;
  height: 240px;
  transform: translateX(22vw);
}

.fallback-orb__core {
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 32%, #fffdf8, var(--accent) 56%, var(--amber));
  box-shadow: 0 20px 60px color-mix(in srgb, var(--accent) 32%, transparent);
}

.fallback-orb__ring {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--accent) 45%, transparent);
  animation: orb-spin 16s linear infinite;
}

.fallback-orb__ring--b {
  inset: -8%;
  border-color: color-mix(in srgb, var(--amber) 40%, transparent);
  animation-direction: reverse;
  animation-duration: 24s;
}

@keyframes orb-spin {
  from { transform: rotateX(68deg) rotateZ(0deg); }
  to { transform: rotateX(68deg) rotateZ(360deg); }
}

@media (max-width: 960px) {
  .hero-kinetic__aura {
    background:
      radial-gradient(ellipse 84% 40% at 50% 24%, rgba(13, 116, 144, 0.14), transparent 72%),
      radial-gradient(ellipse 65% 32% at 64% 16%, rgba(245, 158, 11, 0.12), transparent 68%);
  }

  [data-theme='dark'] .hero-kinetic__aura {
    background:
      radial-gradient(ellipse 84% 40% at 50% 24%, rgba(61, 220, 132, 0.15), transparent 72%),
      radial-gradient(ellipse 65% 32% at 64% 16%, rgba(86, 200, 255, 0.12), transparent 68%);
  }

  .fallback-orb {
    transform: translateY(-22vh) scale(0.75);
  }
}
</style>
