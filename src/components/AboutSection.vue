<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useResume } from '../data/resume'
import { useTheme } from '../composables/useTheme'
import CreativeTerminal from './CreativeTerminal.vue'
import AboutFocusCard from './AboutFocusCard.vue'

const { t, advantages } = useResume()
const { isDark } = useTheme()

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
            <li
              v-for="(item, idx) in advantages"
              :key="item"
              class="about__item"
              :style="{ '--i': idx }"
            >
              <span class="about__num">0{{ idx + 1 }}</span>
              <span class="about__text">{{ item }}</span>
            </li>
          </ul>
        </div>

        <!-- 右侧：日光模式用工作室笔记卡，黑夜模式用终端会话 -->
        <div class="about__term reveal" :class="{ 'is-visible': visible }" style="transition-delay: 0.1s">
          <AboutFocusCard v-if="!isDark" />
          <CreativeTerminal v-else />
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
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--line);
  color: var(--ink);
}

.prompt {
  color: var(--accent);
}

.about__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.about__item {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 8px 10px;
  margin-inline: -10px;
  border-radius: var(--radius-sm);
  color: var(--ink-dim);
  font-size: var(--fs-lg);
  line-height: 1.62;
  transition: background-color 0.22s ease, color 0.22s ease, transform 0.22s var(--ease-out);
}

.about__item:hover {
  background: var(--accent-soft);
  color: var(--ink);
  transform: translateX(3px);
}

.about__num {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  padding: 1px 7px;
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

@media (max-width: 520px) {
  .about__card {
    padding: 24px 20px;
  }
}
</style>
