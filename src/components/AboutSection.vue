<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useResume } from '../data/resume'

const { t, advantages, education } = useResume()

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
    { threshold: 0.15 },
  )
  if (el.value) observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section id="about" ref="el" class="section about">
    <div class="container">
      <div class="section-head reveal" :class="{ 'is-visible': visible }">
        <span class="section-label">~/about</span>
        <h2 class="section-title">{{ t.aboutTitle }}</h2>
        <p class="section-sub">
          {{ t.aboutSub }}
        </p>
      </div>

      <div class="about__grid">
        <!-- 个人优势 -->
        <div class="card about__card reveal" :class="{ 'is-visible': visible }">
          <h3 class="about__card-title">
            <span class="prompt">$</span> {{ t.aboutAdvantages }}
          </h3>
          <ul class="about__list">
            <li v-for="item in advantages" :key="item" class="about__item">
              <span class="about__bullet">▸</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <!-- 教育经历 -->
        <div class="card about__card reveal" :class="{ 'is-visible': visible }" style="transition-delay: 0.1s">
          <h3 class="about__card-title">
            <span class="prompt">$</span> {{ t.aboutEducation }}
          </h3>

          <div class="edu">
            <div class="edu__school">
              <span class="edu__name">{{ education.school }}</span>
              <span class="edu__period">{{ education.period }}</span>
            </div>
            <p class="edu__meta">
              {{ education.degree }} · {{ education.major }}
            </p>
            <div class="edu__rank">
              <span class="edu__rank-badge">{{ education.rank }}</span>
              <span class="edu__rank-label">{{ t.eduRankLabel }}</span>
            </div>
          </div>

          <div class="edu__courses">
            <span class="edu__courses-label">{{ t.eduCoursesLabel }}</span>
            <div class="edu__course-tags">
              <span v-for="c in education.courses" :key="c" class="tag tag--neutral">{{ c }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about__grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 24px;
  align-items: start;
}

.about__card {
  padding: 30px 32px;
}

.about__card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  margin-bottom: 22px;
  color: var(--ink);
}

.prompt {
  color: var(--accent);
}

.about__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.about__item {
  display: flex;
  gap: 12px;
  align-items: baseline;
  color: var(--ink-dim);
  font-size: 15px;
  line-height: 1.6;
}

.about__bullet {
  color: var(--accent);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

/* 教育 */
.edu {
  border-left: 2px solid var(--line-bright);
  padding-left: 20px;
  margin-bottom: 24px;
  position: relative;
}

.edu::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: var(--glow);
}

.edu__school {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.edu__name {
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
}

.edu__period {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ink-faint);
}

.edu__meta {
  font-size: 14px;
  margin-bottom: 14px;
}

.edu__rank {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--amber-soft);
  border: 1px solid rgba(255, 180, 84, 0.3);
  border-radius: 999px;
  padding: 4px 12px;
}

.edu__rank-badge {
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--amber);
}

.edu__rank-label {
  font-size: 12px;
  color: var(--ink-dim);
}

.edu__courses-label {
  display: block;
  font-size: 12px;
  color: var(--ink-faint);
  margin-bottom: 10px;
  font-family: var(--font-mono);
}

.edu__course-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  font-family: var(--font-mono);
  font-size: 12.5px;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid var(--line);
  color: var(--ink-dim);
  background: var(--bg-1);
}

.tag--neutral:hover {
  border-color: var(--line-bright);
  color: var(--ink);
}

@media (max-width: 860px) {
  .about__grid {
    grid-template-columns: 1fr;
  }
}
</style>
