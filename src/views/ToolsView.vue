<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useI18n } from '../i18n'

const { isZh } = useI18n()
const tr = (zh: string, en: string) => (isZh.value ? zh : en)

const mounted = ref(false)
const activeCard = ref<string | null>(null)

interface ToolCardItem {
  id: 'enhancer' | 'stats'
  index: string
  to: string
  routeHint: string
  themeClass: string
  eyebrow: string
  title: string
  status: string
  desc: string
  tags: readonly string[]
  cta: string
}

const tools = computed<ToolCardItem[]>(() => [
  {
    id: 'enhancer',
    index: '01',
    to: '/prompt-enhancer',
    routeHint: '#/prompt-enhancer',
    themeClass: 'tool-card--enhancer',
    eyebrow: 'PROMPT ENHANCER',
    title: tr('提示词增强', 'Prompt Enhancer'),
    status: tr('本地 + AI 双引擎', 'Local + AI'),
    desc: tr(
      '围绕意图识别、表达精简、信息与约束补全、结构重组及六维质量自检，将口语草稿直接提炼为高可执行度指令。',
      'Refine rough ideas into high-signal executable prompts with intent recognition, streamlining, guardrails, restructuring, and 6-point quality checks.',
    ),
    tags: isZh.value
      ? ['六步增强流水线', '标准直发 / 分节', '质量自检']
      : ['6-Step Pipeline', 'Direct & Layered', 'Quality Check'],
    cta: tr('进入工具', 'Open Tool'),
  },
  {
    id: 'stats',
    index: '02',
    to: '/stats',
    routeHint: '#/stats',
    themeClass: 'tool-card--stats',
    eyebrow: 'TOKEN TELEMETRY',
    title: tr('Token 统计', 'Token Statistics'),
    status: tr('实时数据看板', 'Live Telemetry'),
    desc: tr(
      '实时追踪多模型 Token 消耗走势、调用分布与采集链路健康状态，支持昼夜主题无缝同步。',
      'Monitor real-time model token consumption, usage distribution, and collector health with seamless light/dark theme sync.',
    ),
    tags: isZh.value
      ? ['实时增量同步', '多维度走势', '链路监测']
      : ['Live Sync', 'Usage Trends', 'Health Watch'],
    cta: tr('查看看板', 'View Board'),
  },
])

const tiltCache = new WeakMap<
  HTMLElement,
  { rx: ReturnType<typeof gsap.quickTo>; ry: ReturnType<typeof gsap.quickTo> }
>()

function canTilt(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function getTilt(el: HTMLElement) {
  let entry = tiltCache.get(el)
  if (!entry) {
    gsap.set(el, { transformPerspective: 1100 })
    entry = {
      rx: gsap.quickTo(el, 'rotationX', { duration: 0.38, ease: 'power2.out' }),
      ry: gsap.quickTo(el, 'rotationY', { duration: 0.38, ease: 'power2.out' }),
    }
    tiltCache.set(el, entry)
  }
  return entry
}

function onPointerMove(event: PointerEvent) {
  if (!canTilt()) return
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  const tilt = getTilt(el)
  tilt.rx((0.5 - py) * 4.5)
  tilt.ry((px - 0.5) * 4.5)
  el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`)
  el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`)
  el.classList.add('is-hovering')
}

function onPointerLeave(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  el.classList.remove('is-hovering')
  if (!canTilt()) return
  gsap.to(el, {
    rotationX: 0,
    rotationY: 0,
    duration: 0.45,
    ease: 'power2.out',
    overwrite: true,
    onComplete: () => {
      gsap.set(el, { clearProps: 'transform' })
    },
  })
}

function onSelectStart(id: string) {
  activeCard.value = id
}

function onSelectEnd() {
  activeCard.value = null
}

onMounted(() => {
  requestAnimationFrame(() => {
    mounted.value = true
  })
})
</script>

<template>
  <section class="section tools-page">
    <div class="tools-ambient" aria-hidden="true" />
    <div class="container">
      <header class="tools-head section-head is-visible">
        <div class="tools-head__top">
          <span class="section-label tools-head__label">~/tools</span>
          <span class="tools-head__pill">
            <span class="tools-head__dot" aria-hidden="true" />
            {{ tr(`${tools.length} 项在线工具 · 就绪`, `${tools.length} LIVE UTILITIES`) }}
          </span>
        </div>
        <h1 class="section-title">{{ tr('工具', 'Tools') }}</h1>
        <p class="section-sub tools-head__sub">
          {{
            tr(
              '面向日常工程与 AI 协作打磨的轻量工具集，打开即用、细节克制。',
              'Crafted utilities for daily engineering and AI workflows — fast, focused, and ready out of the box.',
            )
          }}
        </p>
      </header>

      <div class="tools-grid">
        <RouterLink
          v-for="(item, idx) in tools"
          :key="item.id"
          :to="item.to"
          class="tool-card card"
          :class="[
            item.themeClass,
            { 'is-ready': mounted, 'is-selected': activeCard === item.id },
          ]"
          :style="{ '--stagger': `${idx * 90}ms` }"
          @pointermove="onPointerMove"
          @pointerleave="onPointerLeave"
          @pointerdown="onSelectStart(item.id)"
          @pointerup="onSelectEnd"
          @pointercancel="onSelectEnd"
          @blur="onSelectEnd"
        >
          <!-- 纹理、动态聚光与光晕边框层 -->
          <span class="tool-card__mesh" aria-hidden="true" />
          <span class="tool-card__noise" aria-hidden="true" />
          <span class="tool-card__rim" aria-hidden="true" />
          <span class="tool-card__glare" aria-hidden="true" />
          <span class="tool-card__beam" aria-hidden="true" />

          <!-- 右上角装饰性功能微缩线图 -->
          <div class="tool-card__art" aria-hidden="true">
            <svg
              v-if="item.id === 'enhancer'"
              class="tool-art tool-art--enhancer"
              viewBox="0 0 220 112"
              fill="none"
            >
              <path
                class="art-line art-line--base"
                d="M16 74 C 54 74, 62 34, 108 34 C 148 34, 156 62, 202 26"
              />
              <path
                class="art-line art-line--pulse"
                d="M16 74 C 54 74, 62 34, 108 34 C 148 34, 156 62, 202 26"
              />
              <path
                class="art-line art-line--sub"
                d="M28 92 C 74 92, 92 58, 134 58 C 168 58, 180 78, 208 54"
              />
              <circle class="art-node" cx="16" cy="74" r="3.5" />
              <circle class="art-node art-node--mid" cx="108" cy="34" r="4.5" />
              <circle class="art-node art-node--end" cx="202" cy="26" r="5" />
              <circle class="art-ring" cx="202" cy="26" r="11" />
            </svg>

            <svg
              v-else
              class="tool-art tool-art--stats"
              viewBox="0 0 220 112"
              fill="none"
            >
              <g class="art-bars">
                <rect x="26" y="74" width="12" height="24" rx="4" />
                <rect x="48" y="60" width="12" height="38" rx="4" />
                <rect x="70" y="68" width="12" height="30" rx="4" />
                <rect x="92" y="46" width="12" height="52" rx="4" />
                <rect x="114" y="54" width="12" height="44" rx="4" />
                <rect x="136" y="34" width="12" height="64" rx="4" />
                <rect x="158" y="42" width="12" height="56" rx="4" />
                <rect x="180" y="22" width="12" height="76" rx="4" />
              </g>
              <path
                class="art-line art-line--base"
                d="M20 72 L 54 52 L 82 62 L 106 38 L 136 46 L 164 26 L 194 16"
              />
              <path
                class="art-line art-line--pulse"
                d="M20 72 L 54 52 L 82 62 L 106 38 L 136 46 L 164 26 L 194 16"
              />
              <circle class="art-node art-node--end" cx="194" cy="16" r="4.5" />
            </svg>
          </div>

          <!-- 卡片主体内容 -->
          <div class="tool-card__inner">
            <div class="tool-card__top">
              <div class="tool-icon" aria-hidden="true">
                <span class="tool-icon__glow" />
                <svg
                  v-if="item.id === 'enhancer'"
                  class="tool-icon__svg"
                  viewBox="0 0 28 28"
                  fill="none"
                >
                  <path
                    d="M14 3.5L16.35 10.65L23.5 13L16.35 15.35L14 22.5L11.65 15.35L4.5 13L11.65 10.65L14 3.5Z"
                    fill="currentColor"
                    fill-opacity="0.18"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M21.5 4.5L22.25 6.75L24.5 7.5L22.25 8.25L21.5 10.5L20.75 8.25L18.5 7.5L20.75 6.75L21.5 4.5Z"
                    fill="currentColor"
                  />
                  <circle cx="6.5" cy="21" r="1.4" fill="currentColor" opacity="0.8" />
                </svg>
                <svg
                  v-else
                  class="tool-icon__svg"
                  viewBox="0 0 28 28"
                  fill="none"
                >
                  <rect x="4.5" y="15.5" width="4" height="7.5" rx="1.6" fill="currentColor" opacity="0.55" />
                  <rect x="11.5" y="10.5" width="4" height="12.5" rx="1.6" fill="currentColor" opacity="0.8" />
                  <rect x="18.5" y="5.5" width="4" height="17.5" rx="1.6" fill="currentColor" />
                  <path
                    d="M5.5 11.5L12 7.5L16.5 9.5L22 4.5"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    opacity="0.7"
                  />
                </svg>
              </div>

              <div class="tool-card__meta">
                <span class="tool-status">
                  <span class="tool-status__dot" aria-hidden="true" />
                  {{ item.status }}
                </span>
                <span class="tool-index" aria-hidden="true">{{ item.index }}</span>
              </div>
            </div>

            <div class="tool-card__body">
              <span class="tool-eyebrow">{{ item.eyebrow }}</span>
              <h2 class="tool-title">{{ item.title }}</h2>
              <p class="tool-desc">{{ item.desc }}</p>
            </div>

            <div class="tool-tags" :aria-label="tr('核心特性', 'Key capabilities')">
              <span v-for="tag in item.tags" :key="tag" class="tool-tag">{{ tag }}</span>
            </div>

            <div class="tool-foot">
              <span class="tool-route">{{ item.routeHint }}</span>
              <span class="tool-cta">
                <span>{{ item.cta }}</span>
                <span class="tool-cta__arrow" aria-hidden="true">↗</span>
              </span>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tools-page {
  position: relative;
  padding-top: calc(var(--nav-h) + 52px);
  padding-bottom: 104px;
  overflow: clip;
}

/* 页面氛围柔光：极低透明度，衬托双卡色彩层次 */
.tools-ambient {
  position: absolute;
  inset: -40px 0 auto;
  height: 460px;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(420px 260px at 22% 38%, color-mix(in srgb, var(--accent) 11%, transparent), transparent 72%),
    radial-gradient(420px 260px at 78% 42%, color-mix(in srgb, var(--amber) 10%, transparent), transparent 72%);
}

[data-theme='dark'] .tools-ambient {
  background:
    radial-gradient(460px 280px at 22% 36%, rgba(61, 220, 132, 0.08), transparent 72%),
    radial-gradient(460px 280px at 78% 42%, rgba(255, 180, 84, 0.07), transparent 72%);
}

.tools-page .container {
  position: relative;
  z-index: 1;
}

/* ---------- 头部排版 ---------- */
.tools-head {
  margin-bottom: 36px;
}

.tools-head__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.tools-head__label {
  margin-bottom: 0;
}

.tools-head__pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-3) 82%, transparent);
  backdrop-filter: blur(8px);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.05em;
  color: var(--ink-dim);
}

.tools-head__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse-soft 2.6s ease-in-out infinite;
}

.tools-head__sub {
  margin-bottom: 0;
  max-width: 600px;
}

/* ---------- 工具卡片网格 ---------- */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: stretch;
}

/* ---------- 高质感工具卡片 ---------- */
.tool-card {
  --tool-color: var(--accent);
  --tool-color-2: var(--cyan);
  --gx: 50%;
  --gy: 20%;

  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 318px;
  border-radius: 22px;
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  isolation: isolate;
  cursor: pointer;
  transform-style: preserve-3d;
  will-change: transform, box-shadow;

  border: 1px solid color-mix(in srgb, var(--line-bright) 72%, var(--tool-color) 14%);
  background:
    radial-gradient(110% 85% at 0% 0%, color-mix(in srgb, var(--tool-color) 14%, transparent), transparent 62%),
    radial-gradient(85% 75% at 100% 100%, color-mix(in srgb, var(--tool-color-2) 10%, transparent), transparent 64%),
    linear-gradient(155deg, var(--bg-3) 0%, var(--bg-1) 52%, var(--bg-2) 100%);
  box-shadow:
    inset 0 1px 0 var(--card-top-sheen),
    inset 0 -1px 0 color-mix(in srgb, var(--line) 60%, transparent),
    0 14px 32px -12px rgba(13, 43, 62, 0.14),
    0 2px 6px rgba(13, 43, 62, 0.05);

  /* 入场动效 */
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.55s var(--ease-out) var(--stagger, 0ms),
    transform 0.42s var(--ease-out),
    border-color 0.28s ease,
    box-shadow 0.35s var(--ease-out);
}

.tool-card.is-ready {
  opacity: 1;
  transform: translateY(0);
}

/* 卡片独立双色调色板 */
.tool-card--enhancer {
  --tool-color: var(--accent);
  --tool-color-2: var(--cyan);
}

.tool-card--stats {
  --tool-color: var(--amber);
  --tool-color-2: #ea580c;
}

[data-theme='dark'] .tool-card {
  border-color: color-mix(in srgb, var(--line-bright) 78%, var(--tool-color) 18%);
  background:
    radial-gradient(105% 85% at 0% 0%, color-mix(in srgb, var(--tool-color) 15%, transparent), transparent 60%),
    radial-gradient(85% 75% at 100% 100%, color-mix(in srgb, var(--tool-color-2) 10%, transparent), transparent 62%),
    linear-gradient(155deg, rgba(22, 34, 47, 0.92) 0%, rgba(12, 17, 24, 0.96) 58%, rgba(9, 13, 19, 0.99) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45),
    0 20px 44px -16px rgba(0, 0, 0, 0.65),
    0 2px 10px rgba(0, 0, 0, 0.35);
}

[data-theme='dark'] .tool-card--stats {
  --tool-color: var(--amber);
  --tool-color-2: #fb923c;
}

/* 覆盖全局 .card::before 避免双重光斑冲突 */
.tool-card::before {
  display: none;
}

/* 纹理层 1：精密点阵网格 */
.tool-card__mesh {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: radial-gradient(
    color-mix(in srgb, var(--tool-color) 24%, var(--ink-faint)) 1px,
    transparent 1px
  );
  background-size: 18px 18px;
  opacity: 0.24;
  mask-image: radial-gradient(ellipse 85% 78% at 82% 18%, #000 10%, transparent 74%);
  transition: opacity 0.35s ease;
}

[data-theme='dark'] .tool-card__mesh {
  opacity: 0.28;
}

/* 纹理层 2：微妙磨砂噪点质感 */
.tool-card__noise {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.032;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}

/* 光影层 3：跟随指针的流光边框 */
.tool-card__rim {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  padding: 1.5px;
  pointer-events: none;
  background: radial-gradient(
    260px circle at var(--gx) var(--gy),
    color-mix(in srgb, var(--tool-color) 90%, #fff 10%),
    color-mix(in srgb, var(--tool-color-2) 45%, transparent) 46%,
    transparent 74%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* 光影层 4：跟随指针的玻璃表面高光 */
.tool-card__glare {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(
    340px circle at var(--gx) var(--gy),
    color-mix(in srgb, var(--tool-color) 16%, transparent),
    transparent 65%
  );
  opacity: 0;
  transition: opacity 0.35s ease;
}

[data-theme='dark'] .tool-card__glare {
  background: radial-gradient(
    360px circle at var(--gx) var(--gy),
    color-mix(in srgb, var(--tool-color) 20%, transparent),
    transparent 65%
  );
}

/* 顶部极细高光线束 */
.tool-card__beam {
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 2px;
  z-index: 3;
  pointer-events: none;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--tool-color) 75%, transparent) 28%,
    color-mix(in srgb, var(--tool-color-2) 85%, #fff 15%) 52%,
    transparent
  );
  opacity: 0.48;
  transition: opacity 0.3s ease, left 0.35s var(--ease-out), right 0.35s var(--ease-out);
}

/* ---------- 悬停 / 聚焦 / 选中按压状态 ---------- */
.tool-card:hover,
.tool-card:focus-visible {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--tool-color) 62%, var(--line-bright));
  box-shadow:
    inset 0 1px 0 var(--card-top-sheen),
    0 24px 52px -18px color-mix(in srgb, var(--tool-color) 32%, rgba(10, 28, 40, 0.22)),
    0 0 0 1px color-mix(in srgb, var(--tool-color) 24%, transparent);
}

[data-theme='dark'] .tool-card:hover,
[data-theme='dark'] .tool-card:focus-visible {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 28px 60px -18px rgba(0, 0, 0, 0.8),
    0 0 36px -6px color-mix(in srgb, var(--tool-color) 36%, transparent);
}

.tool-card:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-0),
    0 0 0 4px var(--tool-color),
    0 24px 48px -16px color-mix(in srgb, var(--tool-color) 32%, rgba(0, 0, 0, 0.25));
}

.tool-card.is-hovering .tool-card__rim,
.tool-card:focus-visible .tool-card__rim,
.tool-card.is-selected .tool-card__rim {
  opacity: 1;
}

.tool-card.is-hovering .tool-card__glare,
.tool-card:focus-visible .tool-card__glare {
  opacity: 1;
}

.tool-card:hover .tool-card__mesh,
.tool-card:focus-visible .tool-card__mesh {
  opacity: 0.42;
}

.tool-card:hover .tool-card__beam,
.tool-card:focus-visible .tool-card__beam {
  opacity: 1;
  left: 14px;
  right: 14px;
}

/* 选中/按压瞬间反馈 */
.tool-card:active,
.tool-card.is-selected {
  transform: translateY(-2px) scale(0.986);
  border-color: var(--tool-color);
  box-shadow:
    inset 0 1px 0 var(--card-top-sheen),
    0 0 0 2px color-mix(in srgb, var(--tool-color) 34%, transparent),
    0 12px 26px -10px color-mix(in srgb, var(--tool-color) 38%, rgba(0, 0, 0, 0.25));
}

/* ---------- 右侧中上部微缩装饰线图（避开顶部状态栏与编号） ---------- */
.tool-card__art {
  position: absolute;
  top: 72px;
  right: 18px;
  width: 210px;
  height: 102px;
  z-index: 1;
  pointer-events: none;
  opacity: 0.48;
  mask-image: linear-gradient(235deg, #000 30%, rgba(0, 0, 0, 0.55) 62%, transparent 94%);
  transition: opacity 0.35s ease, transform 0.45s var(--ease-out);
}

.tool-card:hover .tool-card__art,
.tool-card:focus-visible .tool-card__art {
  opacity: 0.92;
  transform: translate(-3px, -2px) scale(1.03);
}

.tool-art {
  width: 100%;
  height: 100%;
}

.art-line {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.art-line--base {
  stroke: color-mix(in srgb, var(--tool-color) 42%, transparent);
  stroke-width: 1.8;
}

.art-line--sub {
  stroke: color-mix(in srgb, var(--tool-color-2) 28%, transparent);
  stroke-width: 1.2;
  stroke-dasharray: 4 5;
}

.art-line--pulse {
  stroke: var(--tool-color);
  stroke-width: 2.2;
  stroke-dasharray: 42 220;
  stroke-dashoffset: 262;
  filter: drop-shadow(0 0 5px var(--tool-color));
  opacity: 0.72;
  transition: opacity 0.3s ease;
}

.tool-card:hover .art-line--pulse,
.tool-card:focus-visible .art-line--pulse {
  opacity: 1;
  animation: art-flow 2.4s linear infinite;
}

.art-node {
  fill: var(--bg-3);
  stroke: var(--tool-color);
  stroke-width: 1.8;
}

.art-node--end {
  fill: var(--tool-color);
  filter: drop-shadow(0 0 6px var(--tool-color));
}

.art-ring {
  stroke: color-mix(in srgb, var(--tool-color) 35%, transparent);
  stroke-width: 1.2;
}

.art-bars rect {
  fill: color-mix(in srgb, var(--tool-color) 18%, transparent);
  stroke: color-mix(in srgb, var(--tool-color) 32%, transparent);
  stroke-width: 1;
  transform-box: fill-box;
  transform-origin: bottom center;
  transition: fill 0.3s ease, transform 0.35s var(--ease-out);
}

.tool-card:hover .art-bars rect:nth-child(odd) {
  fill: color-mix(in srgb, var(--tool-color) 28%, transparent);
  transform: scaleY(1.06);
}

.tool-card:hover .art-bars rect:nth-child(even) {
  fill: color-mix(in srgb, var(--tool-color-2) 26%, transparent);
  transform: scaleY(1.1);
}

/* ---------- 卡片内容排版层 ---------- */
.tool-card__inner {
  position: relative;
  z-index: 3;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: clamp(22px, 3vw, 30px);
}

.tool-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

/* 雕塑感玻璃金属图标座 */
.tool-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex: none;
  border-radius: 16px;
  color: var(--tool-color);
  border: 1px solid color-mix(in srgb, var(--tool-color) 34%, var(--line));
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--tool-color) 18%, var(--bg-3)),
    color-mix(in srgb, var(--tool-color) 7%, var(--bg-2))
  );
  box-shadow:
    inset 0 1px 0 var(--card-top-sheen),
    0 10px 22px -10px color-mix(in srgb, var(--tool-color) 42%, transparent);
  transition: transform 0.32s var(--ease-out), box-shadow 0.32s ease, border-color 0.25s ease;
}

[data-theme='dark'] .tool-icon {
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--tool-color) 22%, rgba(22, 34, 47, 0.9)),
    color-mix(in srgb, var(--tool-color) 8%, rgba(12, 17, 24, 0.95))
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 10px 24px -8px color-mix(in srgb, var(--tool-color) 46%, transparent);
}

.tool-icon__glow {
  position: absolute;
  inset: -6px;
  border-radius: 20px;
  background: radial-gradient(circle, color-mix(in srgb, var(--tool-color) 32%, transparent), transparent 70%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.32s ease;
}

.tool-icon__svg {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  transition: transform 0.32s var(--ease-out);
}

.tool-card:hover .tool-icon,
.tool-card:focus-visible .tool-icon {
  transform: translateY(-2px) scale(1.05);
  border-color: color-mix(in srgb, var(--tool-color) 68%, transparent);
  box-shadow:
    inset 0 1px 0 var(--card-top-sheen),
    0 14px 28px -8px color-mix(in srgb, var(--tool-color) 55%, transparent);
}

.tool-card:hover .tool-icon__glow,
.tool-card:focus-visible .tool-icon__glow {
  opacity: 1;
}

.tool-card:hover .tool-icon__svg,
.tool-card:focus-visible .tool-icon__svg {
  transform: scale(1.06);
}

/* 右上角元信息 */
.tool-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.tool-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tool-color) 28%, var(--line));
  background: color-mix(in srgb, var(--bg-3) 82%, transparent);
  backdrop-filter: blur(8px);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-dim);
  white-space: nowrap;
}

.tool-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tool-color);
  box-shadow: 0 0 8px var(--tool-color);
}

.tool-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 7px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--line-bright) 75%, transparent);
  background: color-mix(in srgb, var(--bg-2) 86%, transparent);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--ink-dim);
  transition: border-color 0.25s ease, color 0.25s ease, background-color 0.25s ease;
}

.tool-card:hover .tool-index,
.tool-card:focus-visible .tool-index {
  border-color: color-mix(in srgb, var(--tool-color) 42%, var(--line));
  background: color-mix(in srgb, var(--tool-color) 12%, var(--bg-3));
  color: var(--tool-color);
}

/* 标题与描述层级 */
.tool-card__body {
  display: grid;
  gap: 8px;
}

.tool-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--tool-color);
}

.tool-title {
  margin: 0;
  font-size: clamp(1.32rem, 2.2vw, 1.56rem);
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--ink);
  transition: color 0.22s ease;
}

[data-theme='light'] .tool-title {
  font-family: var(--font-serif);
}

.tool-card:hover .tool-title,
.tool-card:focus-visible .tool-title {
  color: color-mix(in srgb, var(--ink) 80%, var(--tool-color));
}

.tool-desc {
  margin: 0;
  font-size: var(--fs-md);
  line-height: 1.72;
  color: var(--ink-dim);
  max-width: 48ch;
}

/* 能力标签组 */
.tool-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 2px;
}

.tool-tag {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--line) 85%, var(--tool-color) 15%);
  background: color-mix(in srgb, var(--bg-2) 80%, transparent);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-dim);
  transition: border-color 0.25s ease, color 0.25s ease, background-color 0.25s ease;
}

.tool-card:hover .tool-tag,
.tool-card:focus-visible .tool-tag {
  border-color: color-mix(in srgb, var(--tool-color) 32%, var(--line));
  background: color-mix(in srgb, var(--tool-color) 9%, var(--bg-2));
  color: var(--ink);
}

/* 底部操作条 */
.tool-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px dashed color-mix(in srgb, var(--line-bright) 75%, transparent);
}

.tool-route {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tool-color) 32%, var(--line));
  background: color-mix(in srgb, var(--tool-color) 10%, var(--bg-3));
  color: var(--tool-color);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: 600;
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    color 0.25s ease,
    box-shadow 0.25s ease;
}

.tool-cta__arrow {
  display: inline-block;
  transition: transform 0.28s var(--ease-out);
}

.tool-card:hover .tool-cta,
.tool-card:focus-visible .tool-cta {
  background: var(--tool-color);
  border-color: var(--tool-color);
  color: var(--on-accent);
  box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--tool-color) 65%, transparent);
}

[data-theme='light'] .tool-card--stats:hover .tool-cta,
[data-theme='light'] .tool-card--stats:focus-visible .tool-cta {
  color: #ffffff;
}

[data-theme='dark'] .tool-card--stats:hover .tool-cta,
[data-theme='dark'] .tool-card--stats:focus-visible .tool-cta {
  color: #1a1104;
}

.tool-card:hover .tool-cta__arrow,
.tool-card:focus-visible .tool-cta__arrow {
  transform: translate(3px, -3px);
}

/* ---------- 动效关键帧 ---------- */
@keyframes art-flow {
  0% {
    stroke-dashoffset: 262;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes pulse-soft {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.88);
  }
}

/* ---------- 响应式适配 ---------- */
@media (max-width: 860px) {
  .tools-page {
    padding-top: calc(var(--nav-h) + 36px);
    padding-bottom: 76px;
  }

  .tools-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .tool-card {
    min-height: 276px;
  }
}

@media (max-width: 520px) {
  .tools-head {
    margin-bottom: 24px;
  }

  .tool-card {
    border-radius: 18px;
    min-height: 0;
  }

  .tool-card__inner {
    gap: 16px;
    padding: 20px;
  }

  .tool-card__art {
    top: 66px;
    right: 12px;
    width: 142px;
    height: 70px;
    opacity: 0.36;
  }

  .tool-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
  }

  .tool-icon__svg {
    width: 24px;
    height: 24px;
  }

  .tool-foot {
    padding-top: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool-card,
  .tool-card__mesh,
  .tool-card__rim,
  .tool-card__glare,
  .tool-card__beam,
  .tool-card__art,
  .tool-icon,
  .tool-icon__svg,
  .tool-cta,
  .tool-cta__arrow {
    transition: none;
    animation: none;
  }

  .tool-card {
    opacity: 1;
    transform: none;
  }
}
</style>
