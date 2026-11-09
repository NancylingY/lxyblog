<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useTheme } from '../composables/useTheme'

const { isLight } = useTheme()
const now = ref(new Date())
let timer = 0

const time = computed(() =>
  now.value.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }),
)

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 30_000)
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <span class="status-pill" :class="isLight ? 'status-pill--day' : 'status-pill--night'">
    <i class="status-pill__dot" />
    <span class="status-pill__label">{{ isLight ? 'DAYLIGHT' : 'NIGHT SHIFT' }}</span>
    <span class="status-pill__time">{{ time }}</span>
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--ink-faint);
  background: color-mix(in srgb, var(--bg-2) 55%, transparent);
  vertical-align: middle;
  transition: color 0.35s ease, background-color 0.35s ease, border-color 0.35s ease;
}

.status-pill--day {
  border-color: color-mix(in srgb, #c47a22 22%, transparent);
  background: color-mix(in srgb, #fff7e8 74%, transparent);
}

.status-pill--night {
  border-color: color-mix(in srgb, #3ddc84 20%, transparent);
  background: color-mix(in srgb, #0d151b 74%, transparent);
}

.status-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c47a22;
  box-shadow: 0 0 8px rgba(196, 122, 34, 0.35);
}

.status-pill--night .status-pill__dot {
  background: #3ddc84;
  box-shadow: 0 0 8px rgba(61, 220, 132, 0.4);
}

.status-pill__label {
  color: var(--ink-dim);
}

.status-pill__time {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

@media (max-width: 480px) {
  .status-pill {
    font-size: var(--fs-xs);
    padding: 4px 8px;
  }
}
</style>
