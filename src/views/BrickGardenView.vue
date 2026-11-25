<script setup lang="ts">
/**
 * /brick-garden 积木花园详情页
 * - three.js 与场景代码仅在进入本页时动态加载
 * - 指针拖动旋转、自动旋转开关、重置视角；reduced-motion 下默认不自动旋转
 * - 离开页面立即停止动画、移除监听并释放几何体 / 材质 / 贴图 / WebGL 上下文
 * - WebGL 不可用时显示中文降级提示，顶部返回按钮始终可用
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { brickGardenCopy as copy } from '../data/brickGarden'
import type { BrickGardenHandle } from '../three/brickGarden'

const router = useRouter()

const host = ref<HTMLElement | null>(null)
const renderState = ref<'ready' | 'fallback' | ''>('')
const viewRevision = ref(0)

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const autoRotate = ref(!prefersReduced)

let handle: BrickGardenHandle | null = null
let alive = true
let starting = false

function goBack() {
  void router.push('/other')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') goBack()
}

function onViewChange(revision: number) {
  viewRevision.value = revision
}

function fail() {
  if (!alive) return
  renderState.value = 'fallback'
  handle?.dispose()
  handle = null
}

async function start() {
  if (!alive || starting) return
  const el = host.value
  if (!el) return
  starting = true
  renderState.value = ''
  try {
    // three.js 只在进入本页时加载
    const { createBrickGardenScene } = await import('../three/brickGarden')
    if (!alive || !host.value) return
    handle = createBrickGardenScene(host.value, {
      reducedMotion: prefersReduced,
      autoRotate: autoRotate.value,
      onViewChange,
      onFailure: fail,
    })
    renderState.value = 'ready'
  } catch (error) {
    console.error('[brick-garden] 3D 场景初始化失败', error)
    if (alive) renderState.value = 'fallback'
  } finally {
    starting = false
  }
}

function retry() {
  if (starting) return
  handle?.dispose()
  handle = null
  autoRotate.value = !prefersReduced
  void start()
}

function toggleAutoRotate() {
  autoRotate.value = !autoRotate.value
  handle?.setAutoRotate(autoRotate.value)
}

function resetView() {
  handle?.resetView()
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)
  void start()
})

onBeforeUnmount(() => {
  alive = false
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  handle?.dispose()
  handle = null
})
</script>

<template>
  <main class="garden">
    <div class="garden__inner">
      <header class="garden__bar">
        <button type="button" class="back" aria-label="返回其他" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" width="15" height="15" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>返回其他</span>
        </button>
        <span class="garden__edition">{{ copy.eyebrow }}</span>
      </header>

      <div class="garden__intro">
        <p class="garden__eyebrow">MICRO GARDEN / 007</p>
        <h1 class="garden__title">
          积木花园
          <span class="garden__title-en">Brick Garden</span>
        </h1>
        <p class="garden__desc">{{ copy.intro }}</p>
      </div>

      <div class="garden__stage">
        <div
          ref="host"
          class="garden__canvas"
          data-testid="brick-garden-scene"
          :data-render-state="renderState || undefined"
          :data-view-revision="viewRevision"
          role="img"
          :aria-label="copy.sceneAria"
        />

        <div v-if="!renderState" class="state" role="status" aria-live="polite">
          <span class="state__spinner" aria-hidden="true" />
          <p class="state__text">{{ copy.loading }}</p>
        </div>

        <div v-else-if="renderState === 'fallback'" class="state state--fallback" role="status" aria-live="polite">
          <svg class="state__mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <rect x="8" y="38" width="48" height="16" rx="4" fill="#f0dcc2" />
            <g fill="#fdf8ec" stroke="#e0cdb2" stroke-width="1">
              <ellipse cx="18" cy="38" rx="4" ry="2" />
              <ellipse cx="30" cy="38" rx="4" ry="2" />
              <ellipse cx="42" cy="38" rx="4" ry="2" />
            </g>
            <path d="M32 38V23" stroke="#86a86f" stroke-width="3" stroke-linecap="round" />
            <path d="M32 27c-8-1-11-5-11-9 6 0 10 3 11 9Z" fill="#9cb98a" />
            <path d="M32 31c7-1 10-5 10-8-6 0-9 3-10 8Z" fill="#b7cda4" />
          </svg>
          <h2 class="state__title">{{ copy.fallbackTitle }}</h2>
          <p class="state__text">{{ copy.fallback }}</p>
          <button type="button" class="state__retry" aria-label="重新加载" @click="retry">
            {{ copy.retry }}
          </button>
        </div>
      </div>

      <footer class="garden__controls">
        <div class="controls">
          <button
            type="button"
            class="ctrl"
            :class="{ 'is-on': autoRotate }"
            :aria-pressed="autoRotate ? 'true' : 'false'"
            aria-label="自动旋转"
            :disabled="renderState !== 'ready'"
            @click="toggleAutoRotate"
          >
            <span class="ctrl__dot" aria-hidden="true" />
            <span>自动旋转</span>
          </button>
          <button
            type="button"
            class="ctrl"
            aria-label="重置视角"
            :disabled="renderState !== 'ready'"
            @click="resetView"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="14" height="14" aria-hidden="true">
              <path d="M4 10a8 8 0 1 1 2 6" stroke-linecap="round" />
              <path d="M4 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>重置视角</span>
          </button>
        </div>
        <p class="garden__tip">{{ copy.hint }}</p>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.garden {
  position: fixed;
  inset: 0;
  display: flex;
  overflow-x: hidden;
  overflow-y: auto;
  color: #40372a;
  background:
    radial-gradient(ellipse 76% 62% at 50% 8%, #fffaf1 0%, rgba(255, 250, 241, 0) 62%),
    radial-gradient(ellipse 60% 50% at 84% 88%, #f7e3cd 0%, rgba(247, 227, 205, 0) 70%),
    linear-gradient(180deg, #f7eddc 0%, #f1e3cf 58%, #ebdcc5 100%);
}

.garden__inner {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.3vh, 16px);
  width: min(1240px, 100%);
  min-height: 100%;
  margin-inline: auto;
  padding: clamp(14px, 2.2vw, 28px) clamp(14px, 3vw, 38px) clamp(14px, 2.2vw, 26px);
}

/* ============================ 顶部 ============================ */
.garden__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 15px 0 11px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  letter-spacing: 0.02em;
  color: #5a4a35;
  background: rgba(255, 252, 245, 0.78);
  border: 1px solid rgba(126, 96, 62, 0.22);
  border-radius: 999px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: color 0.22s ease, border-color 0.22s ease, background 0.22s ease, transform 0.22s ease;
}

.back:hover {
  color: #a9502f;
  border-color: rgba(196, 106, 74, 0.55);
  background: rgba(255, 247, 236, 0.95);
}

.back:active {
  transform: scale(0.95);
}

.back svg {
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.back:hover svg {
  transform: translateX(-2px);
}

.garden__edition {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.24em;
  color: #9a866c;
  white-space: nowrap;
}

/* ============================ 标题 ============================ */
.garden__intro {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.garden__eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.26em;
  color: #a8704f;
}

.garden__title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 14px;
  font-family: var(--font-serif);
  font-size: clamp(30px, 4.4vw, 52px);
  font-weight: 500;
  line-height: 1.14;
  letter-spacing: -0.02em;
  color: #3b3226;
}

.garden__title-en {
  font-family: var(--font-mono);
  font-size: clamp(11px, 1.1vw, 14px);
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #b06a48;
}

.garden__desc {
  max-width: 620px;
  font-size: var(--fs-md);
  line-height: 1.75;
  color: #7c6a52;
}

/* ============================ 3D 舞台 ============================ */
.garden__stage {
  position: relative;
  flex: 1 1 0;
  min-height: clamp(260px, 44vh, 620px);
  overflow: hidden;
  border: 1px solid rgba(140, 105, 70, 0.18);
  border-radius: clamp(16px, 2vw, 24px);
  background:
    radial-gradient(ellipse 72% 62% at 50% 34%, #fffbf3 0%, #f8eddb 54%, #efdfc7 100%);
  box-shadow:
    0 26px 64px rgba(120, 82, 44, 0.15),
    inset 0 1px 0 #fffdf8;
}

.garden__canvas {
  position: absolute;
  inset: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.garden__canvas.is-dragging {
  cursor: grabbing;
}

.garden__canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

/* ============================ 加载 / 降级 ============================ */
.state {
  position: absolute;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 26px;
  text-align: center;
  background:
    radial-gradient(ellipse 66% 56% at 50% 42%, #fffaf1 0%, rgba(255, 250, 241, 0.92) 62%, rgba(244, 232, 214, 0.96) 100%);
}

.state__spinner {
  width: 26px;
  height: 26px;
  border: 2px solid rgba(190, 138, 102, 0.24);
  border-top-color: #c9714c;
  border-radius: 50%;
  animation: garden-spin 0.95s linear infinite;
}

@keyframes garden-spin {
  to { transform: rotate(360deg); }
}

.state__mark {
  width: 68px;
  height: 68px;
}

.state__title {
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  font-weight: 600;
  color: #4a3b2a;
}

.state__text {
  max-width: 430px;
  font-size: var(--fs-base);
  line-height: 1.8;
  color: #84725a;
}

.state__retry {
  margin-top: 2px;
  padding: 8px 20px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: #a9502f;
  background: rgba(255, 246, 235, 0.92);
  border: 1px solid rgba(196, 116, 84, 0.42);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.22s ease, border-color 0.22s ease;
}

.state__retry:hover {
  background: #ffeadd;
  border-color: #c9714c;
}

/* ============================ 控件 ============================ */
.garden__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 18px;
  flex-wrap: wrap;
  padding-bottom: env(safe-area-inset-bottom);
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ctrl {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  letter-spacing: 0.02em;
  color: #584833;
  background: rgba(255, 252, 245, 0.82);
  border: 1px solid rgba(126, 96, 62, 0.2);
  border-radius: 999px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: color 0.22s ease, background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.ctrl:hover:not(:disabled) {
  color: #a9502f;
  border-color: rgba(196, 116, 84, 0.5);
  background: rgba(255, 247, 237, 0.95);
}

.ctrl[aria-pressed='true'] {
  color: #a9502f;
  background: #ffe9dc;
  border-color: rgba(199, 113, 76, 0.55);
  box-shadow: 0 0 0 3px rgba(224, 122, 85, 0.1);
}

.ctrl:disabled,
.state__retry:disabled {
  opacity: 0.45;
  cursor: default;
}

.ctrl__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c8b89e;
  transition: background 0.22s ease, box-shadow 0.22s ease;
}

.ctrl[aria-pressed='true'] .ctrl__dot {
  background: #e07a55;
  box-shadow: 0 0 0 3px rgba(224, 122, 85, 0.18);
}

.garden__tip {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.05em;
  color: #8e7b60;
}

/* 键盘焦点：落在暖色背景上也足够清晰 */
.garden button:focus-visible {
  outline: 2px solid #b06a48;
  outline-offset: 3px;
}

.back:focus-visible {
  outline: 2px solid #b06a48;
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .garden__inner {
    gap: 10px;
  }

  .garden__edition {
    display: none;
  }

  .garden__desc {
    font-size: var(--fs-base);
  }

  .garden__stage {
    min-height: clamp(240px, 42vh, 460px);
  }

  .garden__tip {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .state__spinner {
    animation: none;
  }

  .back,
  .back svg,
  .ctrl,
  .state__retry {
    transition: none;
  }
}
</style>
