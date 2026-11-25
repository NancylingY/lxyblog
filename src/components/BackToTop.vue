<script setup lang="ts">
import { computed } from 'vue'
import { useScrollProgress } from '../composables/useScrollProgress'
import { useShowcaseCopy } from '../data/showcase'
import { scrollToTop } from '../utils/scroll'

const { progress, scrollY } = useScrollProgress()
const copy = useShowcaseCopy()

const visible = computed(() => scrollY.value > 380)

const RADIUS = 20
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value))
</script>

<template>
  <button
    type="button"
    class="btt"
    :class="{ 'is-visible': visible }"
    :aria-label="copy.backToTop"
    :title="copy.backToTop"
    :tabindex="visible ? 0 : -1"
    @click="scrollToTop"
  >
    <svg class="btt__ring" viewBox="0 0 46 46" aria-hidden="true">
      <circle class="btt__track" cx="23" cy="23" :r="RADIUS" />
      <circle
        class="btt__progress"
        cx="23"
        cy="23"
        :r="RADIUS"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <svg
      class="btt__arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      width="17"
      height="17"
      aria-hidden="true"
    >
      <path d="M12 19V5M6 11l6-6 6 6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
</template>

<style scoped>
.btt {
  position: fixed;
  right: 26px;
  bottom: calc(26px + env(safe-area-inset-bottom));
  z-index: var(--z-loader);
  width: 46px;
  height: 46px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--ink);
  box-shadow: var(--shadow-card);
  display: grid;
  place-items: center;
  opacity: 0;
  transform: translateY(16px) scale(0.9);
  pointer-events: none;
  transition:
    opacity 0.3s ease,
    transform 0.35s var(--ease-out),
    color 0.2s ease,
    box-shadow 0.25s ease;
}

.btt.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.btt:hover {
  color: var(--accent);
  transform: translateY(-3px) scale(1.04);
  box-shadow: var(--shadow-card-hover);
}

.btt:active {
  transform: translateY(0) scale(0.95);
}

.btt__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.btt__track {
  fill: none;
  stroke: var(--line);
  stroke-width: 2;
}

.btt__progress {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.2;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}

[data-theme='dark'] .btt__progress {
  filter: drop-shadow(0 0 6px var(--accent));
}

.btt__arrow {
  position: relative;
  z-index: 1;
  transition: transform 0.25s var(--ease-out);
}

.btt:hover .btt__arrow {
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .btt {
    right: 16px;
    bottom: calc(18px + env(safe-area-inset-bottom));
    width: 42px;
    height: 42px;
  }
}
</style>
