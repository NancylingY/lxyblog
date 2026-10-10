<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { projects, type Project } from '../data/resume'

const activeId = ref<string | null>(null)
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
    { threshold: 0.08 },
  )
  if (el.value) observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())

function toggle(p: Project) {
  activeId.value = activeId.value === p.id ? null : p.id
}
</script>

<template>
  <section id="projects" ref="el" class="section projects">
    <div class="container">
      <div class="section-head reveal" :class="{ 'is-visible': visible }">
        <span class="section-label">~/projects</span>
        <h2 class="section-title">项目作品</h2>
        <p class="section-sub">点击卡片查看项目详情与技术栈。</p>
      </div>

      <div class="projects__grid">
        <article
          v-for="(project, pi) in projects"
          :key="project.id"
          class="card project reveal"
          :class="{ 'is-visible': visible, 'project--active': activeId === project.id }"
          :style="{ transitionDelay: `${pi * 0.12}s` }"
          @click="toggle(project)"
        >
          <!-- 卡片头部：封面 + Logo -->
          <div class="project__cover" :style="{ '--cover': project.color }">
            <span class="project__cover-index">0{{ pi + 1 }}</span>
            <div class="project__cover-mark">
              <img
                :src="project.logo"
                :alt="`${project.name} Logo`"
                class="project__cover-logo"
                loading="lazy"
              />
            </div>
          </div>

          <div class="project__main">
            <div class="project__head">
              <h3 class="project__name">
                {{ project.name }}
                <span class="project__name-en">{{ project.nameEn }}</span>
              </h3>
              <div class="project__meta">
                <span class="project__role">{{ project.role }}</span>
                <span v-if="project.period" class="project__period">{{ project.period }}</span>
              </div>
            </div>

            <p class="project__excerpt">{{ project.summary[0] }}</p>

            <div class="project__tags">
              <span v-for="t in project.tags" :key="t" class="project__tag">{{ t }}</span>
            </div>

            <button class="project__toggle" :aria-expanded="activeId === project.id">
              {{ activeId === project.id ? '收起详情' : '查看详情' }}
              <span class="project__toggle-arrow" :class="{ 'is-open': activeId === project.id }">↓</span>
            </button>

            <!-- 展开详情 -->
            <div class="project__detail" :class="{ 'is-open': activeId === project.id }">
              <div class="project__detail-inner">
                <ul class="project__points">
                  <li v-for="point in project.summary" :key="point" class="project__point">
                    <span class="project__bullet" :style="{ color: project.color }">▸</span>
                    {{ point }}
                  </li>
                </ul>

                <div class="project__stack">
                  <div v-for="group in project.stack" :key="group.group" class="project__stack-group">
                    <span class="project__stack-label">{{ group.group }}</span>
                    <div class="project__stack-items">
                      <span v-for="item in group.items" :key="item" class="chip">{{ item }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.projects__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 28px;
  align-items: start;
}

.project {
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.project--active {
  border-color: var(--line-bright);
  box-shadow: var(--shadow-card);
}

/* 封面区 */
.project__cover {
  position: relative;
  height: 168px;
  background:
    radial-gradient(ellipse 80% 90% at 20% 10%, color-mix(in srgb, var(--cover) 22%, transparent), transparent 60%),
    radial-gradient(ellipse 70% 70% at 85% 90%, color-mix(in srgb, var(--cover) 14%, transparent), transparent 55%),
    linear-gradient(150deg, var(--bg-3), var(--bg-2));
  border-bottom: 1px solid var(--line);
  overflow: hidden;
}

.project__cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--cover) 14%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--cover) 14%, transparent) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(ellipse 75% 80% at 60% 40%, #000, transparent 75%);
}

.project__cover-index {
  position: absolute;
  top: 14px;
  right: 18px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: color-mix(in srgb, var(--cover) 75%, var(--ink));
  z-index: 1;
}

.project__cover-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.project__cover-logo {
  width: 128px;
  height: 128px;
  object-fit: contain;
  border-radius: 16px;
  /* 深色底融入卡片封面，只保留发光的图形与文字 */
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 24px color-mix(in srgb, var(--cover) 40%, transparent));
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.project:hover .project__cover-logo {
  transform: scale(1.08);
}

@media (max-width: 520px) {
  .project__cover-logo {
    width: 100px;
    height: 100px;
  }
}

/* 主体 */
.project__main {
  padding: 26px 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.project__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.project__name {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
}

.project__name-en {
  margin-left: 8px;
  font-size: 13px;
  color: var(--ink-faint);
  font-weight: 500;
}

.project__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.project__role {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid rgba(61, 220, 132, 0.28);
  padding: 2px 9px;
  border-radius: 999px;
}

.project__period {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-faint);
}

.project__excerpt {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project__tag {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--amber);
  background: var(--amber-soft);
  border: 1px solid rgba(255, 180, 84, 0.28);
  padding: 3px 11px;
  border-radius: 999px;
}

.project__toggle {
  margin-top: auto;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 6px 0;
  transition: color 0.2s ease;
}

.project__toggle:hover {
  color: var(--accent);
}

.project__toggle-arrow {
  display: inline-block;
  transition: transform 0.3s ease;
}

.project__toggle-arrow.is-open {
  transform: rotate(180deg);
}

/* 展开详情 */
.project__detail {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.45s ease, opacity 0.35s ease;
}

.project__detail-inner {
  overflow: hidden;
  min-height: 0;
}

.project__detail.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.project__points {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
  margin-top: 4px;
}

.project__point {
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 14px;
  line-height: 1.65;
  color: var(--ink-dim);
}

.project__bullet {
  flex-shrink: 0;
  font-family: var(--font-mono);
}

.project__stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 16px;
}

.project__stack-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project__stack-label {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-faint);
  letter-spacing: 0.06em;
}

.project__stack-items {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chip {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-dim);
  background: var(--bg-1);
  border: 1px solid var(--line);
  padding: 4px 10px;
  border-radius: 6px;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.chip:hover {
  border-color: var(--line-bright);
  color: var(--ink);
}

@media (max-width: 900px) {
  .projects__grid {
    grid-template-columns: 1fr;
    max-width: 560px;
    margin-inline: auto;
  }
}
</style>
