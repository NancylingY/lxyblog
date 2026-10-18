<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'

const router = useRouter()
const { t } = useResume()

const host = ref<HTMLElement | null>(null)
/** 按钮延迟淡入，避免打断开场镜头推进 */
const entered = ref(false)

let dispose: (() => void) | null = null
let enterTimer = 0

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
  if (!el) return

  // 代码分割：three.js 场景只在进入本页时加载
  const { createHospitalScene } = await import('../three/hospital/scene')
  if (host.value) dispose = createHospitalScene(host.value)

  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.clearTimeout(enterTimer)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  dispose?.()
  dispose = null
})
</script>

<template>
  <div ref="host" class="stage" />

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

/* 白天场景：极淡的冷色暗角，只压一点点边缘 */
.stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 78% 72% at 50% 44%, transparent 58%, rgba(120, 150, 175, 0.16) 100%);
}

/* ============ 返回按钮 ============ */
.back {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 15px 0 11px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  letter-spacing: 0.03em;
  color: var(--ink-dim);
  background: rgba(9, 14, 21, 0.58);
  border: 1px solid rgba(61, 220, 132, 0.22);
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
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(61, 220, 132, 0.12);
  box-shadow: 0 0 22px rgba(61, 220, 132, 0.16);
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
    font-size: 12px;
  }
}
</style>
