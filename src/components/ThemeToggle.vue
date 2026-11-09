<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import { useResume } from '../data/resume'

const { isLight, toggleTheme } = useTheme()
const { t } = useResume()

const label = () => (isLight.value ? t.value.themeToDark : t.value.themeToLight)

function onToggle(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement | null
  const rect = el?.getBoundingClientRect()
  const hasPointer = event.clientX !== 0 || event.clientY !== 0
  const x = hasPointer ? event.clientX : (rect?.left ?? 0) + (rect?.width ?? 0) / 2
  const y = hasPointer ? event.clientY : (rect?.top ?? 0) + (rect?.height ?? 0) / 2
  toggleTheme({ x, y })
}
</script>

<template>
  <button
    class="theme-toggle"
    :class="{ 'theme-toggle--light': isLight, 'theme-toggle--dark': !isLight }"
    type="button"
    :aria-label="label()"
    :title="label()"
    :aria-pressed="!isLight"
    @click="onToggle"
  >
    <span class="theme-toggle__thumb" aria-hidden="true" />

    <span class="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15">
        <circle cx="12" cy="12" r="4.2" />
        <path
          d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"
          stroke-linecap="round"
        />
      </svg>
    </span>

    <span class="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15">
        <path d="M20.2 14.4A8.4 8.4 0 1 1 9.6 3.8a6.8 6.8 0 0 0 10.6 10.6Z" stroke-linejoin="round" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: relative;
  width: 62px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-2) 62%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    transform 0.18s ease;
}

.theme-toggle:active {
  transform: scale(0.94);
}

.theme-toggle:hover {
  border-color: var(--line-bright);
}

.theme-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-3);
  border: 1px solid var(--line);
  box-shadow: 0 2px 6px rgba(8, 30, 45, 0.12);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s ease;
}

.theme-toggle--dark .theme-toggle__thumb {
  transform: translateX(32px);
}

.theme-toggle__icon {
  position: absolute;
  top: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease, opacity 0.3s ease;
}

.theme-toggle__icon--sun {
  left: 0;
}

.theme-toggle__icon--moon {
  right: 0;
}

/* 日光：太阳点亮 */
.theme-toggle--light .theme-toggle__icon--sun {
  color: #b45309;
  opacity: 1;
}

.theme-toggle--light .theme-toggle__icon--moon {
  color: #8296a3;
  opacity: 0.55;
}

/* 深夜：月亮点亮 */
.theme-toggle--dark .theme-toggle__icon--sun {
  color: #ffb454;
  opacity: 0.5;
}

.theme-toggle--dark .theme-toggle__icon--moon {
  color: #9fd8ff;
  opacity: 1;
}

/* 移动端：悬浮层 blur 开销大，改为实色背景 */
@media (max-width: 860px) {
  .theme-toggle {
    background: var(--bg-2);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (max-width: 420px) {
  .theme-toggle {
    width: 56px;
  }

  .theme-toggle--dark .theme-toggle__thumb {
    transform: translateX(26px);
  }
}
</style>
