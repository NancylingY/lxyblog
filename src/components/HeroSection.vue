<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import HeroStage from './HeroStage.vue'
import { useResume } from '../data/resume'
import { useShowcaseCopy } from '../data/showcase'
import { scrollToHash } from '../utils/scroll'
import type { HeroKineticMode } from '../three/heroKinetic'

const { t, profile } = useResume()
const copy = useShowcaseCopy()

const root = ref<HTMLElement | null>(null)
const stageSlot = ref<HTMLElement | null>(null)
const stageRef = ref<InstanceType<typeof HeroStage> | null>(null)
const activeMode = ref<HeroKineticMode>(0)
const pulsing = ref(false)

const statStacks = ref(20)
const statProjects = ref(6)
const statDirections = ref(3)

let ctx: ReturnType<typeof gsap.context> | null = null
let pulseTimer = 0

function selectMode(idx: number) {
  activeMode.value = idx as HeroKineticMode
  flashPulseUi()
}

function firePulse() {
  stageRef.value?.pulse()
  flashPulseUi()
}

function flashPulseUi() {
  pulsing.value = true
  clearTimeout(pulseTimer)
  pulseTimer = window.setTimeout(() => {
    pulsing.value = false
  }, 520)
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  ctx = gsap.context(() => {
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .from('.hero__eyebrow', { y: 16, opacity: 0, duration: 0.55 })
      .from('.hero__title', { y: 28, opacity: 0, duration: 0.78 }, '-=0.32')
      .from('.hero__slogan', { y: 18, opacity: 0, duration: 0.55 }, '-=0.45')
      .from('.hero__desc', { y: 16, opacity: 0, duration: 0.55 }, '-=0.38')
      .from('.hero__actions', { y: 14, opacity: 0, duration: 0.5 }, '-=0.34')
      .from('.hero__stats', { y: 14, opacity: 0, duration: 0.55 }, '-=0.3')
      .from('.hero__hud', { y: 18, opacity: 0, duration: 0.6 }, '-=0.4')
      .from('.hero__scroll', { opacity: 0, duration: 0.5 }, '-=0.2')

    const counters = { stacks: 0, projects: 0, directions: 0 }
    gsap.to(counters, {
      stacks: 20,
      projects: 6,
      directions: 3,
      duration: 1.15,
      delay: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        statStacks.value = Math.round(counters.stacks)
        statProjects.value = Math.round(counters.projects)
        statDirections.value = Math.round(counters.directions)
      },
    })
  }, root.value || undefined)
})

onBeforeUnmount(() => {
  clearTimeout(pulseTimer)
  ctx?.revert()
})
</script>

<template>
  <section id="top" ref="root" class="hero">
    <!-- 全幅 3D 流体晶体与星轨仪画布 -->
    <HeroStage ref="stageRef" :mode="activeMode" :slot-el="stageSlot" />

    <!-- 文字侧柔光护目层：保证日夜双主题下文案清晰锐利 -->
    <div class="hero__scrim" aria-hidden="true" />

    <div class="container hero__grid">
      <!-- 左侧：自我介绍与核心入口 -->
      <div class="hero__intro">
        <p class="hero__eyebrow">
          <span class="hero__eyebrow-dot" />
          <span>{{ profile.role }} · {{ profile.enName }}</span>
        </p>

        <h1 class="hero__title">
          {{ t.heroHello }}
          <span class="hero__name">{{ profile.name }}</span>
        </h1>

        <p class="hero__slogan">{{ profile.slogan }}</p>
        <p class="hero__desc">{{ profile.intro }}</p>

        <div class="hero__actions">
          <a class="btn btn--primary hero__cta" href="#/#projects" @click.prevent="scrollToHash('#projects')">
            <span>{{ t.heroViewWork }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
          <a class="btn btn--ghost hero__ghost" href="#/#about" @click.prevent="scrollToHash('#about')">
            {{ t.heroAboutMe }}
          </a>
          <router-link class="hero__lab-link" to="/other">
            <span>{{ copy.hero3dLabBtn }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true">
              <path d="M7 17 17 7M8 7h9v9" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </router-link>
        </div>

        <ul class="hero__stats">
          <li class="hero__stat">
            <a class="hero__stat-link" href="#/#skills" @click.prevent="scrollToHash('#skills')">
              <span class="hero__stat-num">{{ statStacks }}+</span>
              <span class="hero__stat-label">{{ t.statStacks }}</span>
            </a>
          </li>
          <li class="hero__stat">
            <a class="hero__stat-link" href="#/#projects" @click.prevent="scrollToHash('#projects')">
              <span class="hero__stat-num">{{ statProjects }}</span>
              <span class="hero__stat-label">{{ t.statProjects }}</span>
            </a>
          </li>
          <li class="hero__stat">
            <a class="hero__stat-link" href="#/#process" @click.prevent="scrollToHash('#process')">
              <span class="hero__stat-num">{{ statDirections }}</span>
              <span class="hero__stat-label">{{ t.statDirections }}</span>
            </a>
          </li>
        </ul>
      </div>

      <!-- 右侧（手机端上方）：透明交互槽位 + 3D 形态切换控制栏 -->
      <div class="hero__stage-col">
        <div
          ref="stageSlot"
          class="hero__stage-slot"
          role="img"
          :aria-label="copy.hero3dAria"
          :class="{ 'is-pulsing': pulsing }"
        >
          <span class="hero__reticle" aria-hidden="true" />
        </div>

        <div class="hero__hud">
          <div class="hero__modes" role="group" :aria-label="copy.hero3dAria">
            <button
              v-for="(m, idx) in copy.hero3dModes"
              :key="m.id"
              type="button"
              class="hero__mode"
              :class="{ 'is-active': activeMode === idx }"
              :aria-pressed="activeMode === idx"
              @click="selectMode(idx)"
            >
              <span class="hero__mode-idx">0{{ idx + 1 }}</span>
              <span>{{ m.label }}</span>
            </button>
            <button
              type="button"
              class="hero__pulse-btn"
              :class="{ 'is-firing': pulsing }"
              @click="firePulse"
            >
              <span class="hero__pulse-dot" aria-hidden="true" />
              <span>{{ copy.hero3dPulse }}</span>
            </button>
          </div>
          <p class="hero__hint">{{ copy.hero3dHint }}</p>
        </div>
      </div>
    </div>

    <a class="hero__scroll" href="#/#about" :aria-label="t.heroScroll" @click.prevent="scrollToHash('#about')">
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
  padding-block: calc(var(--nav-h) + 34px) 78px;
  overflow: hidden;
}

/* 左侧轻度渐变遮罩，让全幅 3D 粒子和波浪不干扰文字可读性 */
.hero__scrim {
  position: absolute;
  inset: 0;
  z-index: var(--z-raised);
  pointer-events: none;
  background: radial-gradient(
    ellipse 64% 88% at 22% 50%,
    color-mix(in srgb, var(--bg-0) 76%, transparent) 0%,
    color-mix(in srgb, var(--bg-0) 34%, transparent) 58%,
    transparent 100%
  );
}

.hero__grid {
  position: relative;
  z-index: var(--z-float);
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
  gap: 36px;
  align-items: center;
}

/* 左侧文字 */
.hero__intro {
  position: relative;
}

.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  letter-spacing: 0.08em;
  color: var(--accent);
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--accent-border);
  padding: 6px 15px;
  border-radius: 999px;
  margin-bottom: 22px;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 10%, transparent);
}

.hero__eyebrow-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  animation: pulse 2.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.hero__title {
  font-size: clamp(36px, 5.4vw, 62px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.025em;
  margin-bottom: 18px;
  color: var(--ink);
}

[data-theme='light'] .hero__title {
  font-family: var(--font-serif);
}

.hero__name {
  position: relative;
  display: inline-block;
  background: linear-gradient(120deg, var(--accent) 0%, var(--cyan) 54%, var(--amber) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

[data-theme='dark'] .hero__name {
  background: linear-gradient(120deg, #3ddc84 0%, #56c8ff 58%, #ffb454 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 0 24px rgba(61, 220, 132, 0.35));
}

.hero__slogan {
  font-family: var(--font-mono);
  font-size: clamp(15px, 1.8vw, 18px);
  color: var(--amber);
  margin-bottom: 16px;
}

.hero__desc {
  max-width: 480px;
  font-size: var(--fs-lg);
  line-height: 1.75;
  color: var(--ink-dim);
  margin-bottom: 30px;
}

.hero__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 36px;
}

.hero__cta svg {
  transition: transform 0.25s var(--ease-out);
}

.hero__cta:hover svg {
  transform: translateX(4px);
}

.hero__ghost {
  background: var(--surface-glass);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.hero__lab-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  color: var(--ink-dim);
  border-radius: var(--btn-radius);
  transition: color 0.2s ease, background-color 0.2s ease;
}

.hero__lab-link:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.hero__lab-link svg {
  transition: transform 0.22s var(--ease-out);
}

.hero__lab-link:hover svg {
  transform: translate(2px, -2px);
}

/* 统计条（磨砂玻璃质感） */
.hero__stats {
  list-style: none;
  display: flex;
  gap: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 var(--card-top-sheen), var(--shadow-card);
  overflow: hidden;
  max-width: 470px;
}

.hero__stat {
  flex: 1;
  border-right: 1px solid var(--line);
}

.hero__stat:last-child {
  border-right: none;
}

.hero__stat-link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 18px;
  color: inherit;
  transition: background-color 0.22s ease;
}

.hero__stat-link:hover {
  background: var(--accent-soft);
}

.hero__stat-num {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  transition: transform 0.25s var(--ease-out);
}

.hero__stat-link:hover .hero__stat-num {
  transform: translateX(2px);
}

.hero__stat-label {
  font-size: var(--fs-sm);
  color: var(--ink-faint);
}

/* 右侧 3D 交互槽位与悬浮控制坞 */
.hero__stage-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.hero__stage-slot {
  position: relative;
  width: 100%;
  height: clamp(360px, 52svh, 500px);
  border-radius: 28px;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.hero__stage-slot:active {
  cursor: grabbing;
}

/* 脉冲触发时的极淡扩散波环 */
.hero__reticle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 1.5px solid var(--accent);
  transform: translate(-50%, -50%) scale(0.4);
  opacity: 0;
  pointer-events: none;
}

.hero__stage-slot.is-pulsing .hero__reticle {
  animation: reticle-burst 0.55s var(--ease-out) forwards;
}

@keyframes reticle-burst {
  0% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.4);
  }
}

.hero__hud {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.hero__modes {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  padding: 5px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface-glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 var(--card-top-sheen), var(--shadow-card);
}

.hero__mode,
.hero__pulse-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  white-space: nowrap;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s var(--ease-out);
}

.hero__mode:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.hero__mode.is-active {
  background: var(--accent);
  color: var(--on-accent);
  box-shadow: var(--glow);
}

.hero__mode-idx {
  opacity: 0.68;
  font-size: var(--fs-2xs);
}

.hero__pulse-btn {
  border-color: var(--amber-border);
  background: var(--amber-soft);
  color: var(--amber);
}

.hero__pulse-btn:hover {
  background: var(--amber);
  color: #ffffff;
  transform: scale(1.03);
}

.hero__pulse-btn.is-firing {
  transform: scale(0.94);
}

.hero__pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.hero__hint {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
  letter-spacing: 0.04em;
}

/* 底部滚动提示 */
.hero__scroll {
  position: absolute;
  left: 50%;
  bottom: 20px;
  z-index: var(--z-float);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.18em;
}

.hero__scroll-line {
  width: 1px;
  height: 36px;
  background: linear-gradient(var(--accent), transparent);
  animation: scrollHint 1.8s ease-in-out infinite;
}

@keyframes scrollHint {
  0% { transform: scaleY(0); transform-origin: top; }
  55% { transform: scaleY(1); transform-origin: top; }
  100% { transform: scaleY(1); transform-origin: bottom; }
}

/* ================= 平板与手机端深度适配 ================= */
@media (max-width: 960px) {
  .hero {
    min-height: auto;
    padding-block: calc(var(--nav-h) + 18px) 58px;
  }

  .hero__scrim {
    background: linear-gradient(
      180deg,
      transparent 0%,
      color-mix(in srgb, var(--bg-0) 46%, transparent) 38%,
      color-mix(in srgb, var(--bg-0) 86%, transparent) 66%,
      color-mix(in srgb, var(--bg-0) 92%, transparent) 100%
    );
  }

  .hero__grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .hero__stage-col {
    order: -1;
    gap: 10px;
  }

  .hero__stage-slot {
    height: clamp(235px, 34svh, 310px);
  }

  .hero__stats {
    max-width: none;
  }

  .hero__scroll {
    display: none;
  }
}

@media (max-width: 520px) {
  .hero {
    padding-block: calc(var(--nav-h) + 12px) 48px;
  }

  .hero__stage-slot {
    height: clamp(210px, 31svh, 265px);
  }

  .hero__modes {
    padding: 4px;
    gap: 4px;
  }

  .hero__mode,
  .hero__pulse-btn {
    padding: 5px 10px;
    font-size: var(--fs-xs);
  }

  .hero__mode-idx {
    display: none;
  }

  .hero__eyebrow {
    font-size: var(--fs-sm);
    margin-bottom: 14px;
  }

  .hero__title {
    font-size: clamp(32px, 9.2vw, 44px);
    margin-bottom: 12px;
  }

  .hero__slogan {
    font-size: var(--fs-md);
    margin-bottom: 12px;
  }

  .hero__desc {
    font-size: var(--fs-md);
    line-height: 1.68;
    margin-bottom: 22px;
  }

  .hero__actions {
    gap: 10px;
    margin-bottom: 24px;
  }

  .hero__actions .btn {
    padding: 10px 18px;
    font-size: var(--fs-md);
  }

  .hero__stat-link {
    padding: 12px 12px;
  }

  .hero__stat-num {
    font-size: 20px;
  }

  .hero__stat-label {
    font-size: var(--fs-xs);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__eyebrow-dot,
  .hero__scroll-line,
  .hero__reticle {
    animation: none;
  }
}
</style>
