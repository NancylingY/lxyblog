/**
 * 灯塔加载进度：百分比 + 当前阶段 + 进度条 / 失败重试
 * - 百分比全部来自场景真实事件：GLTFLoader onProgress 的 loaded/total 字节，
 *   以及解码器 / 着色器阶段的开始与完成；不用定时器凑进度
 */
<script setup lang="ts">
import { computed } from 'vue'
import { useResume } from '../data/resume'
import type { LighthouseProgress } from '../three/lighthouseScene'

const props = defineProps<{
  progress: LighthouseProgress | null
  failed: boolean
  failedText: string
}>()
const emit = defineEmits<{ retry: [] }>()
const { t } = useResume()

const percent = computed(() => Math.round(props.progress?.percent ?? 0))

/** 模块导入 / 解码器 / 着色器编译没有字节级进度：用不确定态提示，不伪造百分比 */
const indeterminate = computed(() => {
  const stage = props.progress?.stage
  return stage === 'engine' || stage === 'scene' || stage === 'decoder' || stage === 'shader'
})

const stageText = computed(() => {
  const p = props.progress
  if (!p) return t.value.lighthouseLoadingEngine
  switch (p.stage) {
    case 'engine':
      return t.value.lighthouseLoadingEngine
    case 'scene':
      return t.value.lighthouseLoadingScene
    case 'decoder':
      return t.value.lighthouseLoadingDecoder
    case 'model': {
      const total = p.totalBytes ?? 0
      if (total <= 0) return t.value.lighthouseLoadingModel
      // 体积取自 GLTFLoader 的真实字节数：小文件用 kB，大文件用 MB
      const size = (v: number) =>
        v >= 1048576 ? `${(v / 1048576).toFixed(1)} MB` : `${Math.round(v / 1000)} kB`
      return `${t.value.lighthouseLoadingModel} ${size(p.loadedBytes ?? 0)} / ${size(total)}`
    }
    case 'shader':
      return t.value.lighthouseLoadingShader
    default:
      return t.value.lighthouseLoadingReady
  }
})
</script>

<template>
  <div class="lh-load" :class="{ 'is-failed': failed }" role="status" aria-live="polite">
    <template v-if="!failed">
      <svg class="lh-load__icon" viewBox="0 0 64 52" fill="none" aria-hidden="true">
        <path d="M23 46h18M27 46l2-26h8l2 26" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M25 20h14M28 14h8v6h-8z" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M14 8l8 3M50 8l-8 3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
      </svg>

      <p class="lh-load__row">
        <span class="lh-load__stage">{{ stageText }}</span>
        <span class="lh-load__percent">{{ percent }}%</span>
      </p>

      <div class="lh-load__bar" :class="{ 'is-indeterminate': indeterminate }">
        <i class="lh-load__fill" :style="{ width: `${percent}%` }" />
      </div>
    </template>

    <template v-else>
      <p class="lh-load__row">
        <span class="lh-load__stage">{{ failedText }}</span>
      </p>
      <button type="button" class="lh-load__retry" @click.stop="emit('retry')">{{ t.lighthouseRetry }}</button>
    </template>
  </div>
</template>

<style scoped>
.lh-load {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: min(78vw, 360px);
  color: var(--ink-dim);
  font-family: var(--font-mono);
  pointer-events: none;
}

.lh-load__icon {
  width: 64px;
  height: 52px;
  opacity: 0.72;
}

.lh-load__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin: 0;
  font-size: var(--fs-xs);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.lh-load__stage {
  overflow: hidden;
  text-overflow: ellipsis;
}

.lh-load__percent {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  flex: none;
}

.lh-load__bar {
  position: relative;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  overflow: hidden;
}

.lh-load__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 0.25s ease;
}

/* 没有字节进度的阶段：细条来回扫，只表示仍在工作，不推高百分比 */
.lh-load__bar.is-indeterminate .lh-load__fill {
  position: relative;
  background: color-mix(in srgb, var(--accent) 70%, transparent);
}

.lh-load__bar.is-indeterminate .lh-load__fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 90%, #fff 10%), transparent);
  animation: lh-load-sweep 1.3s ease-in-out infinite;
}

.lh-load__retry {
  pointer-events: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.04em;
  color: var(--ink);
  background: color-mix(in srgb, var(--bg-2) 72%, transparent);
  border: 1px solid var(--line-bright, var(--line));
  border-radius: 999px;
  padding: 4px 14px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.lh-load__retry:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.lh-load__retry:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@keyframes lh-load-sweep {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lh-load__bar.is-indeterminate .lh-load__fill::after {
    animation: none;
  }

  .lh-load__fill {
    transition: none;
  }
}
</style>
