<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useResume } from '../data/resume'

const { t, skills } = useResume()

const el = ref<HTMLElement | null>(null)
const visible = ref(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.value = true
      })
    },
    { threshold: 0.12 },
  )
  if (el.value) observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section id="skills" ref="el" class="section skills">
    <div class="container">
      <div class="section-head reveal" :class="{ 'is-visible': visible }">
        <span class="section-label">~/skills</span>
        <h2 class="section-title">{{ t.skillsTitle }}</h2>
        <p class="section-sub">{{ t.skillsSub }}</p>
      </div>

      <div class="skills__grid">
        <article
          v-for="(group, gi) in skills"
          :key="group.group"
          class="card skills__card reveal"
          :class="[`skills__card--${group.icon}`, { 'is-visible': visible }]"
          :style="{ transitionDelay: `${gi * 0.1}s` }"
        >
          <header class="skills__card-head">
            <span class="skills__icon" aria-hidden="true">
              <svg v-if="group.icon === 'server'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="4" width="18" height="7" rx="2" />
                <rect x="3" y="13" width="18" height="7" rx="2" />
                <path d="M7 7.5h.01M7 16.5h.01" stroke-linecap="round" />
              </svg>
              <svg v-else-if="group.icon === 'code'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M8 6l-6 6 6 6M16 6l6 6-6 6M13 4l-2 16" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <ellipse cx="12" cy="5" rx="8" ry="3" />
                <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" stroke-linecap="round" />
              </svg>
            </span>
            <div class="skills__head-meta">
              <h3 class="skills__title">{{ group.group }}</h3>
              <span class="skills__count">{{ group.items.length }} items</span>
            </div>
            <span class="skills__seq">0{{ gi + 1 }}</span>
          </header>

          <ul class="skills__list">
            <li
              v-for="(item, ii) in group.items"
              :key="item"
              class="skills__item"
              :style="{ '--i': ii }"
            >
              <span class="skills__dot" aria-hidden="true" />
              {{ item }}
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.skills__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.skills__card {
  --cat: var(--accent);
  padding: 28px 26px 30px;
  display: flex;
  flex-direction: column;
}

.skills__card--code {
  --cat: var(--cyan);
}

.skills__card--database {
  --cat: var(--amber);
}

.skills__card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px dashed var(--line);
}

.skills__icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--cat) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--cat) 28%, transparent);
  color: var(--cat);
  flex-shrink: 0;
  transition: transform 0.3s var(--ease-out);
}

.skills__card:hover .skills__icon {
  transform: scale(1.06);
}

.skills__icon svg {
  width: 22px;
  height: 22px;
}

.skills__head-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.skills__title {
  font-size: 18px;
  color: var(--ink);
}

.skills__count {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
}

.skills__seq {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  color: var(--ink-faint);
}

.skills__list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.skills__item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  background: var(--bg-1);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--ink-dim);
  opacity: 0;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.22s var(--ease-out);
}

.skills__card.is-visible .skills__item {
  animation: skill-in 0.48s var(--ease-out) forwards;
  animation-delay: calc(var(--i, 0) * 38ms + 60ms);
}

@keyframes skill-in {
  from {
    opacity: 0;
    translate: 0 6px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

.skills__item:hover {
  color: var(--cat);
  border-color: color-mix(in srgb, var(--cat) 45%, transparent);
  background: color-mix(in srgb, var(--cat) 10%, transparent);
  transform: translateY(-2px);
}

.skills__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--cat);
  opacity: 0.8;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .skills__item {
    opacity: 1;
    animation: none;
  }
}

@media (max-width: 960px) {
  .skills__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .skills__grid {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin-inline: auto;
  }

  .skills__card {
    padding: 22px 20px 24px;
  }
}
</style>
