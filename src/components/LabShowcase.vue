<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import { useI18n } from '../i18n'
import { useShowcaseCopy } from '../data/showcase'
import { usePangolinCopy } from '../data/pangolin'
import { pelicanPoster, usePelicanRideCopy } from '../data/pelicanRide'
import { brickGardenCopy } from '../data/brickGarden'
import CardThumb from './CardThumb.vue'

interface LabCardItem {
  id: string
  to: string
  title: string
  subtitle: string
  desc: string
  badge: string
  tags: readonly string[]
  poster?: string
  coverNight?: { lg: string; sm: string }
  coverDay?: { lg: string; sm: string }
  alt: string
}

const router = useRouter()
const { t } = useResume()
const { isZh } = useI18n()
const copy = useShowcaseCopy()
const pangolin = usePangolinCopy()
const pelican = usePelicanRideCopy()

const el = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const visible = ref(false)
const canPrev = ref(false)
const canNext = ref(true)

let observer: IntersectionObserver | null = null
let dragging = false
let dragged = false
let dragStartX = 0
let dragStartScroll = 0

function cover(name: string) {
  const base = `${import.meta.env.BASE_URL}thumbs/cover-${name}`
  return { lg: `${base}.webp`, sm: `${base}-sm.webp` }
}

const items = computed<LabCardItem[]>(() => [
  {
    id: 'pelican',
    to: '/pelican-express',
    title: pelican.value.title,
    subtitle: pelican.value.format,
    desc: pelican.value.summary,
    badge: 'SVG · 2D',
    tags: isZh.value ? ['海岸骑行', '手绘动画', '实时互动'] : ['Coastal Ride', 'Hand-drawn', 'Interactive'],
    poster: pelicanPoster,
    alt: pelican.value.alt,
  },
  {
    id: 'pangolin',
    to: '/pangolin',
    title: pangolin.value.title,
    subtitle: 'The balancing act',
    desc: pangolin.value.description,
    badge: '3D',
    tags: pangolin.value.tags,
    coverNight: cover('pangolin'),
    alt: isZh.value
      ? '一只穿山甲在林间小径上骑着独轮车。'
      : 'A pangolin balances on a unicycle on a woodland path.',
  },
  {
    id: 'konbini',
    to: '/konbini',
    title: t.value.konbiniTitle,
    subtitle: t.value.konbiniTitleEn,
    desc: t.value.konbiniDesc,
    badge: t.value.konbiniStatus,
    tags: t.value.konbiniTags.slice(0, 3),
    coverNight: cover('konbini'),
    alt: isZh.value ? '雨夜街角的日式便利店。' : 'A Japanese corner store on a rainy night.',
  },
  {
    id: 'terrarium',
    to: '/terrarium',
    title: t.value.terrariumTitle,
    subtitle: t.value.terrariumTitleEn,
    desc: t.value.terrariumDesc,
    badge: t.value.terrariumStatus,
    tags: t.value.terrariumTags.slice(0, 3),
    coverNight: cover('terrarium'),
    alt: isZh.value ? '悬浮在星空中的玻璃微光生态盒。' : 'A luminous glass cube ecosystem in space.',
  },
  {
    id: 'brick-garden',
    to: '/brick-garden',
    title: isZh.value ? brickGardenCopy.title : brickGardenCopy.titleEn,
    subtitle: isZh.value ? brickGardenCopy.titleEn : brickGardenCopy.title,
    desc: copy.value.brickDesc,
    badge: '3D',
    tags: copy.value.brickTags,
    coverNight: cover('brick-garden'),
    alt: isZh.value ? '奶油色底板与珊瑚色屋顶的积木花园。' : 'A coral-roofed cottage in a brick garden.',
  },
  {
    id: 'lighthouse',
    to: '/lighthouse',
    title: t.value.lighthouseTitle,
    subtitle: t.value.lighthouseTitleEn,
    desc: t.value.lighthouseDesc,
    badge: 'GLSL · 3D',
    tags: t.value.lighthouseTags.slice(0, 3),
    coverNight: cover('lighthouse'),
    alt: isZh.value ? '深夜海岸的灯塔光束。' : 'A seaside lighthouse beam over dark waves.',
  },
  {
    id: 'hospital',
    to: '/hospital',
    title: t.value.hospitalTitle,
    subtitle: t.value.hospitalTitleEn,
    desc: t.value.hospitalDesc,
    badge: t.value.hospitalStatus,
    tags: t.value.hospitalTags.slice(0, 3),
    coverNight: cover('hospital'),
    alt: isZh.value ? '日光下的现代综合医院。' : 'A sunlit modern hospital diorama.',
  },
])

function updateScrollButtons() {
  const node = scroller.value
  if (!node) return
  canPrev.value = node.scrollLeft > 8
  canNext.value = node.scrollLeft + node.clientWidth < node.scrollWidth - 8
}

function slide(dir: -1 | 1) {
  const node = scroller.value
  if (!node) return
  const card = node.querySelector<HTMLElement>('.lab__card')
  const step = card ? card.offsetWidth + 20 : 360
  node.scrollBy({ left: dir * step, behavior: 'smooth' })
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !scroller.value) return
  dragging = true
  dragged = false
  dragStartX = event.clientX
  dragStartScroll = scroller.value.scrollLeft
  scroller.value.classList.add('is-dragging')
}

function onPointerMove(event: PointerEvent) {
  if (!dragging || !scroller.value) return
  const delta = event.clientX - dragStartX
  if (Math.abs(delta) > 6) dragged = true
  scroller.value.scrollLeft = dragStartScroll - delta
}

function onPointerUp() {
  if (!dragging) return
  dragging = false
  scroller.value?.classList.remove('is-dragging')
}

function openScene(to: string) {
  if (dragged) {
    dragged = false
    return
  }
  router.push(to)
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.value = true
      })
    },
    { threshold: 0.1 },
  )
  if (el.value) observer.observe(el.value)
  updateScrollButtons()
  window.addEventListener('resize', updateScrollButtons)
  window.addEventListener('pointerup', onPointerUp)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateScrollButtons)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <section id="lab" ref="el" class="section lab">
    <div class="container">
      <div class="lab__header reveal" :class="{ 'is-visible': visible }">
        <div class="section-head" :class="{ 'is-visible': visible }">
          <span class="section-label">~/playground</span>
          <h2 class="section-title">{{ copy.labTitle }}</h2>
          <p class="section-sub">{{ copy.labSub }}</p>
        </div>

        <div class="lab__controls">
          <div class="lab__nav-btns">
            <button
              type="button"
              class="lab__arrow"
              :disabled="!canPrev"
              :aria-label="copy.labPrev"
              @click="slide(-1)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              class="lab__arrow"
              :disabled="!canNext"
              :aria-label="copy.labNext"
              @click="slide(1)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>

          <router-link class="lab__all" to="/other">
            {{ copy.labAll }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </router-link>
        </div>
      </div>

      <div
        ref="scroller"
        class="lab__scroller reveal"
        :class="{ 'is-visible': visible }"
        @scroll.passive="updateScrollButtons"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
      >
        <article
          v-for="(item, idx) in items"
          :key="item.id"
          class="card lab__card"
          role="link"
          tabindex="0"
          :aria-label="`${item.title} - ${copy.labEnter}`"
          @click="openScene(item.to)"
          @keydown.enter="openScene(item.to)"
          @keydown.space.prevent="openScene(item.to)"
        >
          <div class="lab__media">
            <img
              v-if="item.poster"
              class="lab__poster"
              :src="item.poster"
              :alt="item.alt"
              loading="lazy"
              draggable="false"
            />
            <CardThumb
              v-else-if="item.coverNight"
              :night="item.coverNight"
              :day="item.coverDay"
              :alt="item.alt"
            />
            <span class="lab__badge">
              <i class="lab__badge-dot" aria-hidden="true" />
              {{ item.badge }}
            </span>
            <span class="lab__index">0{{ idx + 1 }}</span>
            <span class="lab__cta">
              {{ copy.labEnter }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </div>

          <div class="lab__body">
            <div class="lab__head">
              <h3 class="lab__title">{{ item.title }}</h3>
              <span class="lab__subtitle">{{ item.subtitle }}</span>
            </div>
            <p class="lab__desc">{{ item.desc }}</p>
            <div class="lab__tags">
              <span v-for="tag in item.tags" :key="tag" class="lab__tag">{{ tag }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lab__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 34px;
  flex-wrap: wrap;
}

.lab__header .section-sub {
  margin-bottom: 0;
}

.lab__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.lab__nav-btns {
  display: flex;
  gap: 8px;
}

.lab__arrow {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--line-bright);
  background: var(--bg-2);
  color: var(--ink);
  display: grid;
  place-items: center;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s var(--ease-out),
    opacity 0.2s ease;
}

.lab__arrow:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-1px);
}

.lab__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.lab__all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: var(--btn-radius);
  border: 1px solid var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  font-weight: 500;
  transition: background-color 0.2s ease, transform 0.2s var(--ease-out), border-color 0.2s ease;
}

.lab__all:hover {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
  transform: translateY(-2px);
}

.lab__all svg {
  transition: transform 0.22s var(--ease-out);
}

.lab__all:hover svg {
  transform: translateX(3px);
}

.lab__scroller {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  padding: 6px 2px 18px;
  scrollbar-width: thin;
  scrollbar-color: var(--line-bright) transparent;
  cursor: grab;
  user-select: none;
}

.lab__scroller.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
}

.lab__scroller::-webkit-scrollbar {
  height: 6px;
}

.lab__scroller::-webkit-scrollbar-track {
  background: transparent;
}

.lab__scroller::-webkit-scrollbar-thumb {
  background: var(--line-bright);
  border-radius: 999px;
}

.lab__card {
  flex: 0 0 340px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}

.lab__media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--bg-1);
}

.lab__poster,
.lab__media :deep(.thumb__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.55s var(--ease-out);
}

.lab__card:hover .lab__poster,
.lab__card:hover .lab__media :deep(.thumb__img) {
  transform: scale(1.06);
}

.lab__badge,
.lab__cta {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 22%);
  background: rgb(14 22 28 / 78%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fffaf0;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  line-height: 1.4;
}

.lab__badge {
  top: 12px;
  left: 12px;
}

.lab__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.7);
}

.lab__index {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: rgba(255, 250, 240, 0.85);
  background: rgb(14 22 28 / 55%);
  padding: 2px 8px;
  border-radius: 999px;
}

.lab__cta {
  right: 12px;
  bottom: 12px;
  opacity: 0.88;
  transform: translateY(2px);
  transition: opacity 0.25s ease, transform 0.28s var(--ease-out), background-color 0.25s ease;
}

.lab__card:hover .lab__cta {
  opacity: 1;
  transform: translateY(0);
  background: var(--accent);
  border-color: transparent;
  color: var(--on-accent);
}

.lab__body {
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.lab__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.lab__title {
  font-size: 18px;
  color: var(--ink);
}

.lab__subtitle {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
}

.lab__desc {
  font-size: var(--fs-md);
  line-height: 1.62;
  color: var(--ink-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.lab__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 8px;
}

.lab__tag {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-dim);
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 3px 9px;
}

@media (max-width: 640px) {
  .lab__card {
    flex: 0 0 84vw;
    max-width: 320px;
  }

  .lab__nav-btns {
    display: none;
  }
}
</style>
