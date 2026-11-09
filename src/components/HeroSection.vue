<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import HeroStage from './HeroStage.vue'
import { useResume } from '../data/resume'
import { useTheme } from '../composables/useTheme'
import { scrollToHash } from '../utils/scroll'

gsap.registerPlugin(ScrollTrigger)

const { t, profile } = useResume()
const { isLight } = useTheme()

const root = ref<HTMLElement | null>(null)
const pointerLight = ref<HTMLElement | null>(null)
let ctx: ReturnType<typeof gsap.context> | null = null
let mm: ReturnType<typeof gsap.matchMedia> | null = null
let lightX: ((value: number) => void) | null = null
let lightY: ((value: number) => void) | null = null
let reduced = false

function canHover() {
  return window.matchMedia('(pointer: fine)').matches
}

function onPointerEnter() {
  if (!lightX || !pointerLight.value) return
  pointerLight.value.classList.add('is-on')
}

function onPointerMove(event: PointerEvent) {
  if (!lightX || !lightY || !pointerLight.value || !root.value) return
  const rect = root.value.getBoundingClientRect()
  lightX(event.clientX - rect.left)
  lightY(event.clientY - rect.top)
}

function onPointerLeave() {
  pointerLight.value?.classList.remove('is-on')
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  if (pointerLight.value && canHover()) {
    gsap.set(pointerLight.value, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth * 0.72,
      y: window.innerHeight * 0.35,
    })
    lightX = gsap.quickTo(pointerLight.value, 'x', { duration: 0.55, ease: 'power3' })
    lightY = gsap.quickTo(pointerLight.value, 'y', { duration: 0.55, ease: 'power3' })
  }

  ctx = gsap.context(() => {
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .from('.hero__eyebrow', { y: 16, opacity: 0, duration: 0.55 })
      .from('.hero__title', { y: 30, opacity: 0, duration: 0.8 }, '-=0.3')
      .from('.hero__slogan', { y: 18, opacity: 0, duration: 0.55 }, '-=0.42')
      .from('.hero__desc', { y: 16, opacity: 0, duration: 0.55 }, '-=0.38')
      .from('.hero__actions', { y: 14, opacity: 0, duration: 0.5 }, '-=0.34')
      .from('.hero__stats', { y: 14, opacity: 0, duration: 0.55 }, '-=0.3')
      .from('.hero__visual', { y: 34, opacity: 0, scale: 0.96, duration: 0.9 }, 0.25)
      .from('.hero__scroll', { opacity: 0, duration: 0.5 }, '-=0.2')

    mm = gsap.matchMedia()
    mm.add('(min-width: 961px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.to('.hero__visual', {
        yPercent: 9,
        ease: 'none',
        scrollTrigger: {
          trigger: root.value,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      })
    })
  }, root.value || undefined)
})

onBeforeUnmount(() => {
  mm?.revert()
  ctx?.revert()
})
</script>

<template>
  <section
    id="top"
    ref="root"
    class="hero"
    @pointerenter="onPointerEnter"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <span ref="pointerLight" class="hero__pointer" aria-hidden="true" />
    <div class="container hero__grid">
      <!-- 左侧：自我介绍 -->
      <div class="hero__intro">
        <p class="hero__eyebrow">
          <span class="hero__eyebrow-dot" /> {{ profile.role }} · {{ profile.enName }}
        </p>
        <h1 class="hero__title">
          {{ t.heroHello }}
          <span class="hero__name">{{ profile.name }}</span>
        </h1>
        <p class="hero__slogan">{{ profile.slogan }}</p>
        <p class="hero__desc">{{ profile.intro }}</p>

        <div class="hero__actions">
          <a class="btn btn--primary" href="#/#projects" @click.prevent="scrollToHash('#projects')">{{ t.heroViewWork }}</a>
          <a class="btn btn--ghost" href="#/#about" @click.prevent="scrollToHash('#about')">{{ t.heroAboutMe }}</a>
        </div>

        <ul class="hero__stats">
          <li class="hero__stat">
            <span class="hero__stat-num">20+</span>
            <span class="hero__stat-label">{{ t.statStacks }}</span>
          </li>
          <li class="hero__stat">
            <span class="hero__stat-num">6</span>
            <span class="hero__stat-label">{{ t.statProjects }}</span>
          </li>
          <li class="hero__stat">
            <span class="hero__stat-num">3</span>
            <span class="hero__stat-label">{{ t.statDirections }}</span>
          </li>
        </ul>
      </div>

      <!-- 右侧：3D 展示卡（内含 2D 降级） -->
      <div class="hero__visual">
        <div class="hero__stage">
          <HeroStage />
        </div>
        <p class="hero__visual-caption">{{ isLight ? t.heroDayCaption : t.heroCaption }}</p>
      </div>
    </div>

    <a class="hero__scroll" href="#/#about" aria-label="向下滚动" @click.prevent="scrollToHash('#about')">
      <span class="hero__scroll-text">{{ t.heroScroll }}</span>
      <span class="hero__scroll-line" />
    </a>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  padding-block: calc(var(--nav-h) + 48px) 88px;
  overflow: hidden;
}

.hero__grid {
  position: relative;
  z-index: var(--z-float);
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 56px;
  align-items: center;
}

/* 日光：暖光跟随鼠标；黑夜：绿色扫描光 */
.hero__pointer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--z-raised);
  width: 560px;
  height: 560px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.45s ease;
  background: radial-gradient(
    circle,
    rgba(255, 214, 150, 0.28) 0%,
    rgba(255, 214, 150, 0.09) 38%,
    transparent 68%
  );
  will-change: transform;
}

.hero__pointer::after {
  content: '';
  position: absolute;
  inset: 18%;
  border: 1px solid rgba(13, 116, 144, 0.14);
  border-radius: 50%;
}

.hero__pointer.is-on {
  opacity: 1;
}

[data-theme='dark'] .hero__pointer {
  background: radial-gradient(
    circle,
    rgba(61, 220, 132, 0.13) 0%,
    rgba(61, 220, 132, 0.035) 42%,
    transparent 68%
  );
}

[data-theme='dark'] .hero__pointer::after {
  inset: 16%;
  border-color: rgba(61, 220, 132, 0.16);
  box-shadow: 0 0 26px rgba(61, 220, 132, 0.08);
}

[data-theme='dark'] .hero__pointer::before {
  content: '';
  position: absolute;
  left: 28%;
  right: 28%;
  top: 50%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(61, 220, 132, 0.4), transparent);
}

@media (hover: none), (prefers-reduced-motion: reduce) {
  .hero__pointer {
    display: none;
  }
}

/* 左侧文字 */
.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  letter-spacing: 0.1em;
  color: var(--accent);
  margin-bottom: 22px;
}

.hero__eyebrow-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: var(--glow);
  animation: pulse 2.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.hero__title {
  font-size: clamp(34px, 5.4vw, 58px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}

.hero__name {
  position: relative;
  color: var(--accent);
  text-shadow: 0 0 28px color-mix(in srgb, var(--accent) 45%, transparent);
}

.hero__name::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  height: 10px;
  background: var(--accent-soft);
  z-index: var(--z-bg-soft);
  border-radius: 2px;
}

.hero__slogan {
  font-family: var(--font-mono);
  font-size: var(--fs-xl);
  color: var(--amber);
  margin-bottom: 18px;
}

.hero__desc {
  max-width: 460px;
  margin-bottom: 34px;
}

.hero__actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 44px;
}

/* 统计条 */
.hero__stats {
  list-style: none;
  display: flex;
  gap: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-2);
  overflow: hidden;
}

.hero__stat {
  flex: 1;
  padding: 14px 20px;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero__stat:last-child {
  border-right: none;
}

.hero__stat-num {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}

.hero__stat-label {
  font-size: var(--fs-sm);
  color: var(--ink-faint);
}

/* 右侧小组件 */
.hero__visual {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* 视觉舞台：展示卡与 3D 小屋共用同一坐标系 */
.hero__stage {
  position: relative;
  width: 100%;
  max-width: 460px;
  margin-inline: auto;
}

.hero__visual-caption {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--ink-faint);
}

/* 底部滚动提示 */
.hero__scroll {
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.18em;
}

.hero__scroll-line {
  width: 1px;
  height: 42px;
  background: linear-gradient(var(--accent), transparent);
  animation: scrollHint 1.8s ease-in-out infinite;
}

@keyframes scrollHint {
  0% { transform: scaleY(0); transform-origin: top; }
  55% { transform: scaleY(1); transform-origin: top; }
  100% { transform: scaleY(1); transform-origin: bottom; }
}

/* 响应式 */
@media (max-width: 960px) {
  .hero {
    padding-block: calc(var(--nav-h) + 36px) 72px;
  }

  .hero__grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .hero__visual {
    order: -1;
  }

  .hero__stage {
    max-width: 340px;
  }
}

@media (max-width: 520px) {
  .hero__stage {
    max-width: 250px;
  }

  .hero__grid {
    gap: 24px;
  }

  .hero__scroll {
    display: none;
  }

  .hero__desc {
    margin-bottom: 28px;
  }

  .hero__stat {
    padding: 12px 14px;
  }

  .hero__stat-label {
    font-size: var(--fs-xs);
  }
}

/* 矮屏手机：收起粒子面板，长文案压成两行，优先露出标题与按钮 */
@media (max-width: 960px) and (max-height: 720px) {
  .hero__visual {
    display: none;
  }

  .hero__desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 20px;
  }

  .hero {
    padding-block: calc(var(--nav-h) + 24px) 52px;
  }

  .hero__title {
    font-size: clamp(30px, 8.2vw, 40px);
    margin-bottom: 14px;
  }

  .hero__slogan {
    margin-bottom: 12px;
  }

  .hero__actions {
    margin-bottom: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__eyebrow-dot,
  .hero__scroll-line {
    animation: none;
  }
}
</style>
