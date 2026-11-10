/**
 * /lighthouse 灯塔全屏页
 * - 结构沿用 /house：懒加载 three、单 context、左上返回、Esc 退出、离开即销毁
 * - 右上角场景控件：开关灯塔光束（水面高光带、耀斑一起淡出）
 * - 相机沿用 houseDrag，限位与 /house 一致；加载期显示静态占位
 */
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import type { LighthouseHandle, LighthouseProgress } from '../three/lighthouseScene'
import LighthouseLoader from '../components/LighthouseLoader.vue'

const router = useRouter()
const { t } = useResume()

const host = ref<HTMLElement | null>(null)
const ready = ref(false)
const failed = ref(false)
const progress = ref<LighthouseProgress | null>(null)
const entered = ref(false)
const beamOn = ref(true)

// 移动端（触屏）与低端机（内存 ≤4GB）加载 lite 模型缩短下载等待，桌面保持高模
const coarse = window.matchMedia('(pointer: coarse)').matches
const memoryGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
const MODEL_URL = `${import.meta.env.BASE_URL}models/lighthouse-v2${
  coarse || memoryGB <= 4 ? '-lite' : ''
}.glb`

let handle: LighthouseHandle | null = null
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

function toggleBeam() {
  beamOn.value = !beamOn.value
  handle?.setBeam(beamOn.value)
}

/** 失败态重试：只重跑场景初始化，不刷新页面 */
function retry() {
  if (!alive || !failed.value) return
  failed.value = false
  retries = 0
  progress.value = null
  void start()
}

async function start() {
  const el = host.value
  if (!alive || !el) return
  progress.value = { stage: 'engine', percent: 0 }
  try {
    // three.js 与场景代码只在进入本页时加载
    const { createLighthouseScene } = await import('../three/lighthouseScene')
    if (!alive) return
    const created = await createLighthouseScene(el, {
      url: MODEL_URL,
      onReady: () => {
        if (alive) ready.value = true
      },
      onProgress: (next) => {
        if (alive) progress.value = next
      },
      // 全屏页：滚轮 + 双指都可以缩放，页面本身不滚动
      zoom: true,
      wheelZoom: true,
    })
    // 加载途中就离开页面：立刻销毁，避免 context 与显存泄漏
    if (!alive) {
      created.dispose()
      return
    }
    handle = created
    created.setBeam(beamOn.value)
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
    console.error('[lighthouse] 3D 场景加载失败', error)
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  enterTimer = window.setTimeout(() => (entered.value = true), 450)
  window.addEventListener('keydown', onKey)
  void start()
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
  <div ref="host" class="stage" role="img" :aria-label="`${t.lighthouseTitle} · 3D`" />

  <Transition name="loader-fade">
    <div v-if="!ready" class="placeholder">
      <LighthouseLoader
        :progress="progress"
        :failed="failed"
        :failed-text="t.sceneFail"
        @retry="retry"
      />
    </div>
  </Transition>

  <button type="button" class="round-btn back" :class="{ 'is-in': entered }" :aria-label="t.back" @click="goBack">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>

  <button
    type="button"
    class="round-btn beam-btn"
    :class="{ 'is-in': entered, 'is-off': !beamOn }"
    :aria-label="beamOn ? t.lighthouseBeamOff : t.lighthouseBeamOn"
    :aria-pressed="beamOn"
    @click="toggleBeam"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="2.6" />
      <path
        d="M4 12h2.4M17.6 12H20M12 4v2.4M12 17.6V20M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(ellipse 74% 62% at 50% 48%, #0a1c26, #04070f 76%),
    #04070f;
  cursor: grab;
  touch-action: none;
  overscroll-behavior: none;
  user-select: none;
}

.stage:active {
  cursor: grabbing;
}

/* 运行时只改绘制缓冲，CSS 尺寸必须由这里给，否则 DPR>1 时画布会撑成视口两倍 */
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
}

/* 加载完成淡出，失败态保持可见直到用户重试 */
.loader-fade-leave-active {
  transition: opacity 0.45s ease;
}

.loader-fade-leave-to {
  opacity: 0;
}

.loader-fade-enter-active {
  transition: opacity 0.3s ease;
}

.loader-fade-enter-from {
  opacity: 0;
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

.beam-btn {
  left: auto;
  right: 20px;
}

.round-btn.is-in {
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

/* 光束关闭：控件压暗，图标不再发光 */
.beam-btn.is-off {
  color: var(--ink-faint);
  border-color: var(--line);
}

.beam-btn.is-off svg {
  opacity: 0.45;
}

@media (prefers-reduced-motion: reduce) {
  .round-btn,
  .loader-fade-leave-active,
  .loader-fade-enter-active {
    transition: none;
  }
}

@media (max-width: 520px) {
  .round-btn {
    top: 14px;
    left: 14px;
    width: 36px;
    height: 36px;
  }

  .beam-btn {
    left: auto;
    right: 14px;
  }
}
</style>
