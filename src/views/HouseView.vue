/**
 * /house 小屋全屏页
 * - 与首屏 / 「其他」页共用加载、KTX2、光照、单 context 与销毁逻辑
 * - 默认跟随网站主题；右上角昼夜控件直接切全局主题，返回后保持一致
 * - 拖拽沿用共用交互：偏航 360° 不夹紧、俯仰 ±12° 不翻面，支持滚轮与双指缩放
 * - 与首屏、「其他」页共用同一份 lite 模型；加载期间显示静态占位，不留空白
 */
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import { useTheme } from '../composables/useTheme'
import ThemeToggle from '../components/ThemeToggle.vue'
import type { HouseDetailHandle } from '../three/houseDetailScene'

const router = useRouter()
const { t } = useResume()
const { isLight } = useTheme()

const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const failed = ref(false)
const entered = ref(false)

// 与首屏、「其他」页共用同一份 lite 模型（高模留在 public/models，当前不加载）
const MODEL_URL = `${import.meta.env.BASE_URL}models/cozy-house-lite.glb`
const GROUND_URL = `${import.meta.env.BASE_URL}models/ground-card-lite.glb`

let handle: HouseDetailHandle | null = null
let enterTimer = 0
let retryTimer = 0
let retries = 0
let alive = true

function goBack() {
  router.push('/other')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') goBack()
}

async function start() {
  const el = host.value
  if (!alive || !el) return
  try {
    // three.js 与场景代码只在进入本页时加载
    const { createHouseDetailScene } = await import('../three/houseDetailScene')
    if (!alive) return
    const created = await createHouseDetailScene(el, {
      url: MODEL_URL,
      groundUrl: GROUND_URL,
      light: isLight.value,
      onReady: () => {
        if (alive) ready.value = true
      },
    })
    // 加载途中就离开页面：立刻销毁，避免 context 与显存泄漏
    if (!alive) {
      created.dispose()
      return
    }
    handle = created
  } catch (error) {
    if (!alive) return
    // 路由切换瞬间偶尔抢不到 context：短延迟重试，仍失败才显示失败态
    if (retries < 2) {
      retries += 1
      retryTimer = window.setTimeout(() => {
        retryTimer = 0
        void start()
      }, 800 * retries)
      return
    }
    failed.value = true
    console.error('[house] 3D 场景加载失败', error)
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  enterTimer = window.setTimeout(() => (entered.value = true), 450)
  window.addEventListener('keydown', onKey)
  void start()
})

watch(isLight, (light) => {
  handle?.setLight(light)
})

onBeforeUnmount(() => {
  alive = false
  window.clearTimeout(enterTimer)
  window.clearTimeout(retryTimer)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  handle?.dispose()
  handle = null
})
</script>

<template>
  <div ref="host" class="stage" :class="{ 'is-day': isLight }" role="img" :aria-label="`${t.houseTitle} · 3D`" />

  <div v-if="!ready" class="placeholder" role="status" aria-live="polite">
    <svg class="placeholder__icon" viewBox="0 0 64 52" fill="none" aria-hidden="true">
      <path d="M6 24 32 7l26 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M11 21v24h42V21M27 45V30h10v15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="44" cy="36" r="2.6" fill="currentColor" />
    </svg>
    <span v-if="!failed" class="placeholder__spinner" aria-hidden="true" />
    <p class="placeholder__text">{{ failed ? t.sceneFail : t.sceneLoading }}</p>
  </div>

  <button type="button" class="round-btn back" :class="{ 'is-in': entered }" :aria-label="t.back" @click="goBack">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>

  <div class="theme-wrap" :class="{ 'is-in': entered }">
    <ThemeToggle />
  </div>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse 74% 62% at 50% 44%, #121e29, #04080e 74%),
    #04080e;
  cursor: grab;
  /* 全屏页没有可滚动内容：接管全部手势，双指捏合才不会被浏览器页面缩放吃掉 */
  touch-action: none;
  overscroll-behavior: none;
  user-select: none;
  transition: background-color 0.4s ease;
}

.stage:active {
  cursor: grabbing;
}

.stage.is-day {
  background:
    radial-gradient(ellipse 74% 62% at 50% 44%, #fbf7ee, #e8e2d5 78%),
    #e8e2d5;
}

/* 运行时用 setSize(w, h, false) 只改绘制缓冲，CSS 尺寸必须由这里给，
   否则 DPR>1 时 canvas 会按像素尺寸撑成视口的两倍 */
.stage :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* ============================ 静态占位 ============================ */
.placeholder {
  position: fixed;
  inset: 0;
  z-index: var(--z-loader);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--bg-2);
  color: var(--ink-mute, var(--ink-dim));
  transition: background-color 0.4s ease;
}

.placeholder__icon {
  width: 64px;
  height: 52px;
  opacity: 0.72;
}

.placeholder__spinner {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-top-color: var(--accent);
  animation: placeholder-spin 1.1s linear infinite;
}

.placeholder__text {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.04em;
}

@keyframes placeholder-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============================ 控件 ============================ */
.round-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: var(--z-popover);
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--ink-dim);
  background: color-mix(in srgb, var(--bg-2) 78%, transparent);
  border: 1px solid var(--line);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
  transition:
    opacity 0.55s ease,
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.25s ease,
    border-color 0.25s ease,
    background-color 0.35s ease;
}

.round-btn.is-in,
.theme-wrap.is-in {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.round-btn:hover {
  color: var(--ink);
  border-color: var(--line-bright);
}

.round-btn:active {
  transform: scale(0.92);
}

.round-btn svg {
  display: block;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.round-btn:hover svg {
  transform: translateX(-2px);
}

.theme-wrap {
  position: fixed;
  top: 22px;
  right: 20px;
  z-index: var(--z-popover);
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
  transition:
    opacity 0.55s ease,
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .round-btn,
  .theme-wrap {
    transition: none;
  }

  .placeholder__spinner {
    animation: none;
  }
}

@media (max-width: 520px) {
  .round-btn {
    top: 14px;
    left: 14px;
    width: 36px;
    height: 36px;
  }

  .theme-wrap {
    top: 16px;
    right: 14px;
  }
}
</style>
