<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useResume } from '../data/resume'
import CreativeTerminal from './CreativeTerminal.vue'

const { t, advantages } = useResume()

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

        <!-- 创意组件：终端会话（点击可直接跳过打字） -->
        <div class="about__term reveal" :class="{ 'is-visible': visible }" style="transition-delay: 0.1s">
          <CreativeTerminal />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: stretch;
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

/* 终端组件外壳：与左侧卡片同高 */
.about__term {
  min-width: 0;
}

@media (max-width: 860px) {
  .about__grid {
    grid-template-columns: 1fr;
  }
}
</style>
