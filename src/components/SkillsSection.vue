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
          :class="{ 'is-visible': visible }"
          :style="{ transitionDelay: `${gi * 0.12}s` }"
        >
          <header class="skills__card-head">
            <span class="skills__icon" v-html="group.icon === 'server'
              ? '<svg viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.8\'><rect x=\'3\' y=\'4\' width=\'18\' height=\'7\' rx=\'2\'/><rect x=\'3\' y=\'13\' width=\'18\' height=\'7\' rx=\'2\'/><path d=\'M7 7.5h.01M7 16.5h.01\' stroke-linecap=\'round\'/></svg>'
              : group.icon === 'code'
                ? '<svg viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.8\'><path d=\'M8 6l-6 6 6 6M16 6l6 6-6 6M13 4l-2 16\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>'
                : '<svg viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'1.8\'><ellipse cx=\'12\' cy=\'5\' rx=\'8\' ry=\'3\'/><path d=\'M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7\' stroke-linecap=\'round\'/></svg>'" />
            <h3 class="skills__title">{{ group.group }}</h3>
            <span class="skills__seq">0{{ gi + 1 }}</span>
          </header>

          <ul class="skills__list">
            <li
              v-for="(item, ii) in group.items"
              :key="item"
              class="skills__item"
              :style="{ '--i': ii }"
            >
              <span class="skills__dash">›</span>
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
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.skills__card {
  padding: 28px 28px 30px;
}

.skills__card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px dashed var(--line);
}

.skills__icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
}

.skills__icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.skills__title {
  font-size: 18px;
  color: var(--ink);
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
  flex-direction: column;
  gap: 11px;
}

.skills__item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  color: var(--ink-dim);
  opacity: 0;
  transition: color 0.2s ease, transform 0.2s ease;
}

.skills__card.is-visible .skills__item {
  animation: skill-in 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--i, 0) * 45ms + 60ms);
}

@keyframes skill-in {
  from {
    opacity: 0;
    translate: -7px 0;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

.skills__item:hover {
  color: var(--accent);
  transform: translateX(3px);
}

.skills__dash {
  color: var(--amber);
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .skills__item {
    opacity: 1;
    animation: none;
  }
}

@media (max-width: 900px) {
  .skills__grid {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin-inline: auto;
  }
}
</style>
