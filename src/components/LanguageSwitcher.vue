<script setup lang="ts">
import { useI18n } from '../i18n'

const { locale, toggle } = useI18n()
</script>

<template>
  <button
    class="lang"
    type="button"
    :aria-label="locale === 'zh' ? 'Switch to English' : '切换为中文'"
    @click="toggle"
  >
    <span class="lang__globe" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke-linecap="round" />
      </svg>
    </span>
    <span class="lang__label" :key="locale">{{ locale === 'zh' ? 'EN' : '中文' }}</span>
  </button>
</template>

<style scoped>
.lang {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-dim);
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.lang:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 18px rgba(61, 220, 132, 0.18);
}

/* 点击轻微缩小再回弹 */
.lang:active {
  transform: scale(0.92);
}

.lang__globe {
  display: inline-flex;
  color: var(--accent);
}

/* 切换文字时的过渡动画 */
.lang__label {
  display: inline-block;
  animation: label-in 0.28s ease;
}

@keyframes label-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
