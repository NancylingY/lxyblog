<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { scrollToHash } from '../utils/scroll'
import { useResume } from '../data/resume'
import { useScrollProgress } from '../composables/useScrollProgress'

const { t } = useResume()
const { progress } = useScrollProgress()

const items = [
  { id: 'about', num: '01', label: 'ABOUT' },
  { id: 'process', num: '02', label: 'PROCESS' },
  { id: 'skills', num: '03', label: 'SKILLS' },
  { id: 'projects', num: '04', label: 'PROJECTS' },
  { id: 'lab', num: '05', label: 'LAB' },
  { id: 'contact', num: '06', label: 'CONTACT' },
]

const active = ref(-1)
let observer: IntersectionObserver | null = null

function go(id: string) {
  scrollToHash(`#${id}`)
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        if (entry.target.id === 'top') {
          active.value = -1
          return
        }
        const index = items.findIndex((item) => item.id === entry.target.id)
        if (index >= 0) active.value = index
      })
    },
    { rootMargin: '-42% 0px -52% 0px', threshold: 0 },
  )

  const hero = document.getElementById('top')
  if (hero) observer.observe(hero)

  items.forEach((item) => {
    const section = document.getElementById(item.id)
    if (section) observer?.observe(section)
  })
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav class="rail" :aria-label="t.ariaSectionNav">
    <span class="rail__line" aria-hidden="true">
      <span class="rail__line-fill" :style="{ transform: `scaleY(${progress})` }" />
    </span>
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
  right: 24px;
  top: 50%;
  z-index: var(--z-popover);
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 98px;
  pointer-events: none;
}

.rail__line {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: color-mix(in srgb, var(--ink) 16%, transparent);
  overflow: hidden;
}

.rail__line-fill {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, var(--accent), var(--amber));
  transform-origin: top center;
  will-change: transform;
}

[data-theme='dark'] .rail__line-fill {
  background: linear-gradient(180deg, var(--accent), var(--cyan));
}

.rail__item {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 0 7px 15px;
  background: none;
  border: 0;
  text-align: left;
  pointer-events: auto;
  color: var(--ink-faint);
  transition: color 0.25s ease, transform 0.25s var(--ease-out);
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

.rail__item:hover {
  color: var(--accent);
  transform: translateX(-2px);
}

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
  font-size: var(--fs-lg);
  color: var(--ink-faint);
  transition: color 0.28s ease;
}

.rail__item.is-active .rail__num,
.rail__item:hover .rail__num {
  color: var(--accent);
}

.rail__label {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  font-weight: 500;
  letter-spacing: 0.1em;
  opacity: 0.52;
  transition: opacity 0.25s ease;
}

.rail__item.is-active .rail__label,
.rail__item:hover .rail__label {
  opacity: 1;
}

[data-theme='dark'] .rail__num {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
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

@media (max-width: 1280px) {
  .rail {
    display: none;
  }
}
</style>
