<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useResume, type Project } from '../data/resume'
import { useShowcaseCopy } from '../data/showcase'

const { t, projects } = useResume()
const copy = useShowcaseCopy()

const activeId = ref<string | null>(null)
const selectedRole = ref<string>('ALL')
const el = ref<HTMLElement | null>(null)
const visible = ref(false)

let observer: IntersectionObserver | null = null

const roleFilters = computed(() => {
  const counts = new Map<string, number>()
  for (const p of projects.value) {
    counts.set(p.role, (counts.get(p.role) ?? 0) + 1)
  }
  return [
    { key: 'ALL', label: copy.value.filterAll, count: projects.value.length },
    ...Array.from(counts.entries()).map(([role, count]) => ({
      key: role,
      label: role,
      count,
    })),
  ]
})

const filteredProjects = computed(() =>
  selectedRole.value === 'ALL'
    ? projects.value
    : projects.value.filter((p) => p.role === selectedRole.value),
)

// 语言切换导致角色名称变化时，安全重置筛选为全部
watch(projects, () => {
  if (
    selectedRole.value !== 'ALL' &&
    !projects.value.some((p) => p.role === selectedRole.value)
  ) {
    selectedRole.value = 'ALL'
  }
})

function selectRole(role: string) {
  selectedRole.value = role
  if (activeId.value && !filteredProjects.value.some((p) => p.id === activeId.value)) {
    activeId.value = null
  }
}

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

const tiltCache = new WeakMap<
  HTMLElement,
  { rx: ReturnType<typeof gsap.quickTo>; ry: ReturnType<typeof gsap.quickTo> }
>()

function canTilt() {
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function getTilt(el: HTMLElement) {
  let t = tiltCache.get(el)
  if (!t) {
    gsap.set(el, { transformPerspective: 1000 })
    t = {
      rx: gsap.quickTo(el, 'rotationX', { duration: 0.4, ease: 'power2.out' }),
      ry: gsap.quickTo(el, 'rotationY', { duration: 0.4, ease: 'power2.out' }),
    }
    tiltCache.set(el, t)
  }
  return t
}

function onTilt(event: PointerEvent) {
  if (!canTilt()) return
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  const t = getTilt(el)
  t.rx((0.5 - py) * 4)
  t.ry((px - 0.5) * 4)
  el.classList.add('is-tilting')
  el.style.setProperty('--gx', `${px * 100}%`)
  el.style.setProperty('--gy', `${py * 100}%`)
}

function resetTilt(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  gsap.to(el, {
    rotationX: 0,
    rotationY: 0,
    duration: 0.42,
    ease: 'power2.out',
    overwrite: true,
    onComplete: () => {
      el.classList.remove('is-tilting')
      gsap.set(el, { clearProps: 'transform' })
    },
  })
}

async function toggle(p: Project, event: MouseEvent) {
  // 允许用户复制展开后的文字而不误触收起
  if (window.getSelection()?.toString()) return

  const card = (event.currentTarget as HTMLElement).closest('.project') as HTMLElement | null
  const opening = activeId.value !== p.id
  activeId.value = opening ? p.id : null
  if (!opening || !card) return

  await nextTick()
  const points = card.querySelectorAll(
    '.project__point, .project__stack-group, .project__stack-label, .chip',
  )
  if (points.length) {
    gsap.fromTo(
      points,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        stagger: 0.03,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform',
      },
    )
  }

  const video = card.querySelector('.project__cover-video video') as HTMLVideoElement | null
  if (video) {
    gsap.fromTo(
      video,
      { opacity: 0, scale: 1.03 },
      { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' },
    )
  }
}

/** 数据就绪后确保自动播放（慢网下 autoplay 可能静默失败） */
function ensurePlay(e: Event) {
  const v = e.target as HTMLVideoElement
  v.play().catch(() => {
    /* 静音自动播放被策略阻止时静默忽略 */
  })
}
</script>

<template>
  <section id="projects" ref="el" class="section projects">
    <div class="container">
      <div class="projects__header reveal" :class="{ 'is-visible': visible }">
        <div class="section-head" :class="{ 'is-visible': visible }">
          <span class="section-label">~/projects</span>
          <h2 class="section-title">{{ t.projectsTitle }}</h2>
          <p class="section-sub">{{ t.projectsSub }}</p>
        </div>

        <div class="projects__filters" role="tablist" :aria-label="copy.filterLabel">
          <button
            v-for="item in roleFilters"
            :key="item.key"
            type="button"
            role="tab"
            class="projects__filter"
            :class="{ 'is-active': selectedRole === item.key }"
            :aria-selected="selectedRole === item.key"
            @click="selectRole(item.key)"
          >
            <span>{{ item.label }}</span>
            <span class="projects__filter-count">{{ item.count }}</span>
          </button>
        </div>
      </div>

      <TransitionGroup name="project-list" tag="div" class="projects__grid">
        <article
          v-for="(project, pi) in filteredProjects"
          :key="project.id"
          class="card project reveal"
          :class="{ 'is-visible': visible, 'project--active': activeId === project.id }"
          :style="{ '--cover': project.color, transitionDelay: `${pi * 0.08}s` }"
          @click="toggle(project, $event)"
          @pointermove="onTilt"
          @pointerleave="resetTilt"
        >
          <span class="project__glare" aria-hidden="true" />
          <!-- 卡片头部：封面 + Logo / 展开后展示视频 -->
          <div class="project__cover" :style="{ '--cover': project.color }">
            <span v-if="project.video && activeId !== project.id" class="project__demo-badge">
              <span class="project__demo-dot" aria-hidden="true" />
              {{ copy.hasDemo }}
            </span>
            <span class="project__cover-index">0{{ pi + 1 }}</span>

            <!-- 展开且配置了展示视频：自动播放 -->
            <div v-if="activeId === project.id && project.video" class="project__cover-video">
              <video
                :src="project.video"
                autoplay
                muted
                loop
                playsinline
                preload="auto"
                @loadeddata="ensurePlay"
                @canplay="ensurePlay"
                :aria-label="`${project.name} 演示视频`"
              />
            </div>

            <!-- 收起：静态 Logo -->
            <div v-else class="project__cover-mark">
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
              <span v-for="tag in project.tags" :key="tag" class="project__tag">{{ tag }}</span>
            </div>

            <button
              type="button"
              class="project__toggle"
              :aria-expanded="activeId === project.id"
              @click.stop="toggle(project, $event)"
            >
              <span>{{ activeId === project.id ? t.projectCollapse : t.projectDetail }}</span>
              <span class="project__toggle-arrow" :class="{ 'is-open': activeId === project.id }">↓</span>
            </button>

            <!-- 展开详情 -->
            <div
              class="project__detail"
              :class="{ 'is-open': activeId === project.id }"
              :aria-hidden="activeId !== project.id"
              :inert="activeId !== project.id"
            >
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
      </TransitionGroup>
    </div>
  </section>
</template>

<style scoped>
.projects__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 36px;
  flex-wrap: wrap;
}

.projects__header .section-sub {
  margin-bottom: 0;
}

.projects__filters {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.projects__filter {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--bg-2);
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s var(--ease-out);
}

.projects__filter:hover {
  color: var(--accent);
  border-color: var(--accent-border);
  transform: translateY(-1px);
}

.projects__filter.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
  box-shadow: var(--glow);
}

.projects__filter-count {
  font-size: var(--fs-xs);
  opacity: 0.78;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, transparent);
}

.projects__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
  align-items: start;
}

.project-list-enter-active,
.project-list-leave-active {
  transition: opacity 0.3s ease, transform 0.35s var(--ease-out);
}

.project-list-enter-from,
.project-list-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.project-list-move {
  transition: transform 0.35s var(--ease-out);
}

.project {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

/* 项目卡自带 .project__glare，避免和全局 .card::before 叠加双层光斑 */
.project.card::before {
  display: none;
}

/* 倾斜时关掉 transform 的 CSS transition，避免和 GSAP 抢帧 */
.project.is-tilting {
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  z-index: var(--z-float);
}

.project__glare {
  position: absolute;
  inset: 0;
  z-index: var(--z-popover);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: radial-gradient(
    220px circle at var(--gx, 50%) var(--gy, 50%),
    rgba(255, 246, 224, 0.3),
    transparent 62%
  );
  mix-blend-mode: soft-light;
}

.project.is-tilting .project__glare {
  opacity: 1;
}

[data-theme='dark'] .project__glare {
  background: radial-gradient(
    220px circle at var(--gx, 50%) var(--gy, 50%),
    rgba(61, 220, 132, 0.16),
    transparent 62%
  );
  mix-blend-mode: screen;
}

.project--active {
  border-color: color-mix(in srgb, var(--cover, var(--accent)) 52%, var(--line-bright));
  box-shadow: var(--shadow-card-hover);
}

/* 封面区 */
.project__cover {
  position: relative;
  height: 172px;
  background:
    radial-gradient(ellipse 80% 90% at 20% 10%, color-mix(in srgb, var(--cover) 24%, transparent), transparent 60%),
    radial-gradient(ellipse 70% 70% at 85% 90%, color-mix(in srgb, var(--cover) 16%, transparent), transparent 55%),
    linear-gradient(150deg, #10293a, #07151f);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
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

.project__demo-badge {
  position: absolute;
  top: 13px;
  left: 14px;
  z-index: var(--z-float);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(7, 21, 31, 0.72);
  backdrop-filter: blur(6px);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: #f4f7f9;
}

.project__demo-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cover, #4ade80);
  box-shadow: 0 0 8px var(--cover, #4ade80);
}

.project__cover-index {
  position: absolute;
  top: 14px;
  right: 18px;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  color: color-mix(in srgb, var(--cover) 72%, #ffffff);
  z-index: var(--z-raised);
}

.project__cover-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-raised);
}

/* 展开后的演示视频：撑满封面区 */
.project__cover-video {
  position: absolute;
  inset: 0;
  z-index: var(--z-raised);
  overflow: hidden;
}

.project__cover-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.project__cover-logo {
  width: 124px;
  height: 124px;
  object-fit: contain;
  border-radius: 16px;
  /* 深色底融入卡片封面，只保留发光的图形与文字 */
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 24px color-mix(in srgb, var(--cover) 40%, transparent));
  transition: transform 0.45s var(--ease-out);
}

.project:hover .project__cover-logo {
  transform: scale(1.09);
}

@media (max-width: 520px) {
  .project__cover-logo {
    width: 98px;
    height: 98px;
  }
}

/* 主体 */
.project__main {
  padding: 24px 26px 26px;
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
  font-size: 21px;
  font-weight: 700;
  color: var(--ink);
}

.project__name-en {
  margin-left: 8px;
  font-size: var(--fs-base);
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
  font-size: var(--fs-sm);
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  padding: 2px 9px;
  border-radius: 999px;
}

.project__period {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--ink-faint);
}

.project__excerpt {
  font-size: var(--fs-md);
  line-height: 1.65;
  color: var(--ink-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.project__tag {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--amber);
  background: var(--amber-soft);
  border: 1px solid var(--amber-border);
  padding: 3px 10px;
  border-radius: 999px;
}

.project__toggle {
  margin-top: auto;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  padding: 6px 14px;
  transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.project:hover .project__toggle,
.project__toggle:hover {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.project__toggle-arrow {
  display: inline-block;
  transition: transform 0.3s var(--ease-out);
}

.project__toggle-arrow.is-open {
  transform: rotate(180deg);
}

/* 展开详情 */
.project__detail {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.45s var(--ease-out), opacity 0.35s ease;
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
  font-size: var(--fs-md);
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
  font-size: var(--fs-sm);
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
  font-size: var(--fs-sm);
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

@media (max-width: 520px) {
  .project__main {
    padding: 20px 20px 22px;
  }
}
</style>
