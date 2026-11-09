<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { scrollToHash } from '../utils/scroll'
import { useResume } from '../data/resume'

const { t } = useResume()

const items = [
  { id: 'about', num: '01', label: 'ABOUT' },
  { id: 'skills', num: '02', label: 'SKILLS' },
  { id: 'projects', num: '03', label: 'PROJECTS' },
  { id: 'contact', num: '04', label: 'CONTACT' },
]

const active = ref(0)
let observer: IntersectionObserver | null = null

function go(id: string) {
  scrollToHash(`#${id}`)
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = items.findIndex((item) => item.id === entry.target.id)
          if (index >= 0) active.value = index
        }
      })
    },
    { rootMargin: '-44% 0px -52% 0px', threshold: 0 },
  )

  items.forEach((item) => {
    const section = document.getElementById(item.id)
    if (section) observer?.observe(section)
  })
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav class="rail" :aria-label="t.ariaSectionNav">
    <span class="rail__line" aria-hidden="true" />
    <button
      v-for="(item, i) in items"
      :key="item.id"
      type="button"
      class="rail__item"
      :class="{ 'is-active': active === i }"
      :aria-current="active === i ? 'true' : undefined"
      :aria-label="`${t.railJump} ${item.label}`"
      @click="go(item.id)"
    >
      <span class="rail__num">{{ item.num }}</span>
      <span class="rail__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.rail {
  position: fixed;
  right: 28px;
  top: 50%;
  z-index: var(--z-popover);
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 92px;
  pointer-events: none;
}

.rail__line {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    color-mix(in srgb, var(--ink) 22%, transparent) 18%,
    color-mix(in srgb, var(--ink) 22%, transparent) 82%,
    transparent
  );
}

.rail__item {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 0 8px 16px;
  background: none;
  border: 0;
  text-align: left;
  pointer-events: auto;
  color: var(--ink-faint);
  transition: color 0.28s ease;
}

.rail__item::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 50%;
  width: 5px;
  height: 5px;
  margin-top: -2.5px;
  border-radius: 50%;
  background: var(--ink-faint);
  opacity: 0.4;
  transition: opacity 0.28s ease, transform 0.28s ease, background-color 0.28s ease;
}

.rail__item:hover,
.rail__item.is-active {
  color: var(--accent);
}

.rail__item.is-active::before {
  opacity: 1;
  background: var(--accent);
  transform: scale(1.6);
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
}

.rail__num {
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  color: var(--ink-faint);
  transition: color 0.28s ease;
}

.rail__item.is-active .rail__num,
.rail__item:hover .rail__num {
  color: var(--accent);
}

.rail__label {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 500;
  letter-spacing: 0.1em;
  opacity: 0.55;
}

.rail__item.is-active .rail__label {
  opacity: 1;
}

[data-theme='dark'] .rail__num {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  letter-spacing: 0.08em;
}

[data-theme='dark'] .rail__num::before {
  content: '[';
  color: var(--accent);
  opacity: 0.6;
}

[data-theme='dark'] .rail__num::after {
  content: ']';
  color: var(--accent);
  opacity: 0.6;
}

[data-theme='dark'] .rail__label {
  font-size: var(--fs-xs);
}

@media (max-width: 1200px) {
  .rail {
    display: none;
  }
}
</style>
