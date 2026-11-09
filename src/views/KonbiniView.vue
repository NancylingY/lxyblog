<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'

const router = useRouter()
const { t } = useResume()

const host = ref<HTMLElement | null>(null)
/** 按钮延迟淡入，避免打断开场镜头推进 */
const entered = ref(false)
/** 场景 chunk 加载中 / 加载失败 */
const loading = ref(true)
const failed = ref(false)

let dispose: (() => void) | null = null
let enterTimer = 0
let alive = true

function goBack() {
  router.push('/other')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') goBack()
}

onMounted(async () => {
  document.body.style.overflow = 'hidden'

  enterTimer = window.setTimeout(() => (entered.value = true), 450)

  const el = host.value
  if (!el) {
    loading.value = false
    return
  }

  // 代码分割：three.js 只在进入本页时加载；失败时给出可见兜底，避免停留在黑屏
  try {
    const { createKonbiniScene } = await import('../three/konbini')
    if (!alive) return
    dispose = createKonbiniScene(el)
  } catch (err) {
    if (!alive) return
    failed.value = true
    console.error('[konbini] 3D 场景加载失败', err)
  } finally {
    if (alive) loading.value = false
  }

  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  alive = false
  window.clearTimeout(enterTimer)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  dispose?.()
  dispose = null
})
</script>

<template>
  <div ref="host" class="stage">
    <div v-if="loading || failed" class="state" role="status" aria-live="polite">
      <span v-if="loading" class="state__spinner" aria-hidden="true" />
      <p class="state__text">{{ loading ? t.sceneLoading : t.sceneFail }}</p>
    </div>
  </div>

  <button
    type="button"
    class="back"
    :class="{ 'is-in': entered }"
    :aria-label="t.back"
    @click="goBack"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span class="back__label">{{ t.back }}</span>
  </button>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  background: #0a0f18;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.stage:active {
  cursor: grabbing;
}

/* 极淡暗角，把注意力收到模型中心 */
.stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 72% 68% at 50% 46%, transparent 42%, rgba(4, 7, 12, 0.62) 100%);
}

/* 加载 / 失败兜底：覆盖在 canvas 之上 */
.state {
  position: absolute;
  inset: 0;
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  background: #0a0f18;
  text-align: center;
}

.state__spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(110, 231, 216, 0.18);
  border-top-color: rgba(110, 231, 216, 0.85);
  animation: state-spin 0.9s linear infinite;
}

@keyframes state-spin {
  to { transform: rotate(360deg); }
}

.state__text {
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  letter-spacing: 0.04em;
  color: rgba(219, 236, 245, 0.72);
}

@media (prefers-reduced-motion: reduce) {
  .state__spinner {
    animation: none;
  }
}

/* ============ 返回按钮 ============ */
.back {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: var(--z-popover);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 15px 0 11px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  letter-spacing: 0.03em;
  color: rgba(219, 236, 245, 0.8);
  background: rgba(9, 14, 21, 0.58);
  border: 1px solid rgba(110, 231, 216, 0.22);
  border-radius: 999px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;

  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 0.55s ease,
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.25s ease,
    background 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.back.is-in {
  opacity: 1;
  transform: translateY(0);
}

.back:hover {
  color: #6ee7d8;
  border-color: #6ee7d8;
  background: rgba(110, 231, 216, 0.12);
  box-shadow: 0 0 22px rgba(110, 231, 216, 0.16);
}

/* 点击轻微缩小回弹 */
.back:active {
  transform: translateY(0) scale(0.93);
}

.back svg {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.back:hover svg {
  transform: translateX(-2px);
}

.back__label {
  transition: opacity 0.2s ease;
}

@media (max-width: 520px) {
  .back {
    top: 14px;
    left: 14px;
    height: 34px;
    padding: 0 12px 0 9px;
    font-size: var(--fs-sm);
  }
}
</style>
