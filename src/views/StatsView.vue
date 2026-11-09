<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useResume } from '../data/resume'
import { dashboard } from '../data/dashboard'
import { useTheme } from '../composables/useTheme'

const { t } = useResume()
const { theme } = useTheme()
const loading = ref(true)
const failed = ref(false)
const reloadKey = ref(0)
const frameHeight = ref(0)
const frameEl = ref<HTMLIFrameElement | null>(null)
let startedAt = 0
let fallbackTimer = 0

/** 看板同源时，手机上用它上报的内容高度撑满，避免 iframe 内再套一层滚动 */
let frameOrigin = ''
try {
  frameOrigin = new URL(dashboard.url || 'http://localhost').origin
} catch {
  frameOrigin = ''
}

function onMessage(e: MessageEvent) {
  if (e.origin !== frameOrigin) return
  const d = e.data as { type?: string; height?: unknown } | null
  if (!d || d.type !== 'td-height' || typeof d.height !== 'number') return
  frameHeight.value = Math.max(600, Math.min(20000, Math.round(d.height)))
}

/** 主题与底色发给看板，让它就地换肤，避免重载 iframe 出现空白页 */
function syncTheme() {
  const bg = pageBg()
  frameEl.value?.contentWindow?.postMessage(
    { type: 'td-theme', theme: theme.value, bg },
    frameOrigin,
  )
}

/** 至少让加载动画完整播一遍，避免一闪而过；加载失败也有兜底 */
function finishLoading() {
  // 即使超时后 iframe 才加载完，也自动恢复
  failed.value = false
  if (!loading.value) return
  window.clearTimeout(fallbackTimer)
  syncTheme()
  const wait = Math.max(0, 720 - (performance.now() - startedAt))
  window.setTimeout(() => {
    loading.value = false
  }, wait)
}

function markFailed() {
  window.clearTimeout(fallbackTimer)
  failed.value = true
  loading.value = false
}

function retry() {
  failed.value = false
  loading.value = true
  frameHeight.value = 0
  startedAt = performance.now()
  reloadKey.value += 1
  fallbackTimer = window.setTimeout(markFailed, 15000)
}

onMounted(() => {
  startedAt = performance.now()
  fallbackTimer = window.setTimeout(markFailed, 15000)
  window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  window.clearTimeout(fallbackTimer)
  window.removeEventListener('message', onMessage)
})

watch(theme, async () => {
  await nextTick()
  syncTheme()
})


/** 当前主题的页面底色（#rrggbb）；传给看板当不透明底色，避免 iframe 重绘间隙闪白 */
function pageBg(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--bg-0').trim()
  const m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return ''
  let hex = m[1]
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
  return hex
}

/** 拼出看板地址；embed=1 去掉看板自带的大标题，theme 只用于首屏，之后靠 postMessage 就地切换 */
function buildUrl(mode: string): string {
  if (!dashboard.url) return ''
  try {
    const u = new URL(dashboard.url)
    // 补尾斜杠：/token 会被 nginx 301 到 /token/，查询串会丢，口令就没了
    if (!u.pathname.endsWith('/')) u.pathname += '/'
    if (dashboard.token) u.searchParams.set('t', dashboard.token)
    u.searchParams.set('embed', '1')
    const bg = pageBg()
    if (bg) u.searchParams.set('bg', bg)
    u.searchParams.set('theme', mode)
    return u.toString()
  } catch {
    return ''
  }
}

// 嵌入地址固定在进入页面时的主题：切主题只发消息，不重载 iframe，避免闪出空白页
const embedSrc = buildUrl(theme.value)
</script>

<template>
  <section class="section stats">
    <div class="container">
      <div class="section-head">
        <span class="section-label">~/token</span>
        <h2 class="section-title">{{ t.statsTitle }}</h2>
        <p class="section-sub">{{ t.statsSub }}</p>
      </div>

      <div v-if="embedSrc" class="stats__embed" :class="{ 'is-ready': !loading && !failed }">
        <iframe
          :key="reloadKey"
          ref="frameEl"
          :src="embedSrc"
          class="stats__iframe"
          :style="{ height: frameHeight ? `${frameHeight}px` : 'clamp(420px, 68vh, 760px)' }"
          :title="t.statsTitle"
          loading="lazy"
          referrerpolicy="no-referrer"
          @load="finishLoading"
          @error="markFailed"
        />

        <Transition name="tdl">
          <div v-if="loading" class="stats__loading" role="status" aria-live="polite">
            <div class="tdl">
              <div class="tdl-signal" aria-hidden="true">
                <svg viewBox="0 0 208 52" preserveAspectRatio="none">
                  <path
                    class="tdl-spark"
                    d="M4 44 L24 36 L40 41 L56 27 L72 33 L90 16 L106 28 L124 20 L144 25 L204 6"
                  />
                </svg>
                <span class="tdl-beacon" />
                <span class="tdl-scan" />
              </div>
              <p class="tdl-text">
                ~/token
                <em>{{ t.statsLoading }}</em>
                <b class="tdl-cursor" />
              </p>
            </div>
          </div>
        </Transition>

        <div v-if="failed" class="stats__error" role="alert">
          <span class="stats__error-icon" aria-hidden="true">⌁</span>
          <h3>{{ t.statsFailTitle }}</h3>
          <p>{{ t.statsFailTip }}</p>
          <button class="btn btn--ghost" type="button" @click="retry">{{ t.statsRetry }}</button>
        </div>
      </div>

      <div v-else class="card stats__empty">
        <span class="stats__empty-icon">⌁</span>
        <h3>{{ t.statsEmptyTitle }}</h3>
        <p>{{ t.statsEmptyTip }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats {
  padding-top: calc(var(--nav-h) + 64px);
  padding-bottom: 100px;
}

.stats__embed {
  position: relative;
  margin-top: 28px;
}

.stats__embed:not(.is-ready) {
  height: clamp(420px, 68vh, 760px);
}

/* 载入中：iframe 仍在视口内正常加载，但不可见，也不撑开版面 */
.stats__embed:not(.is-ready) .stats__iframe {
  position: absolute;
  inset: 0;
  height: 100% !important;
  opacity: 0;
}

.stats__iframe {
  display: block;
  width: 100%;
  height: clamp(420px, 68vh, 760px);
  border: 0;
  /* 不透明底色兜底：内容透明时，重绘间隙不会闪出白底 */
  background: var(--bg-0);
  opacity: 0;
  transition: opacity 0.55s ease;
}

.stats__embed.is-ready .stats__iframe {
  opacity: 1;
}

/* ---------- 载入动画 ---------- */
.stats__loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: clamp(420px, 68vh, 760px);
  display: grid;
  place-items: center;
  background: var(--bg-0);
  z-index: var(--z-float);
  overflow: hidden;
}

/* ---------- 加载失败 ---------- */
.stats__error {
  position: absolute;
  inset: 0;
  z-index: var(--z-float);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  text-align: center;
  background: var(--bg-0);
}

.stats__error-icon {
  font-size: 30px;
  color: var(--ink-faint);
}

.stats__error h3 {
  font-size: 18px;
  color: var(--ink);
}

.stats__error p {
  font-size: var(--fs-base);
  max-width: 420px;
  margin-bottom: 8px;
}

.tdl {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

/* 迷你实时曲线：描画 → 停一拍 → 淡出，循环 */
.tdl-signal {
  position: relative;
  width: 208px;
  height: 52px;
}

.tdl-signal svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.tdl-signal::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 7px;
  height: 1px;
  background: var(--line);
}

.tdl-spark {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 240;
  stroke-dashoffset: 240;
  filter: drop-shadow(0 0 5px var(--accent));
  animation: tdl-draw 2.2s cubic-bezier(0.5, 0, 0.25, 1) infinite;
}

@keyframes tdl-draw {
  0% {
    stroke-dashoffset: 240;
    opacity: 0.25;
  }
  62%,
  84% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 0;
  }
}

/* 沿曲线移动的光点 */
.tdl-beacon {
  position: absolute;
  left: 0;
  top: 0;
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px 2px var(--accent);
  offset-path: path('M4 44 L24 36 L40 41 L56 27 L72 33 L90 16 L106 28 L124 20 L144 25 L204 6');
  offset-rotate: 0deg;
  animation: tdl-travel 2.2s cubic-bezier(0.5, 0, 0.25, 1) infinite;
}

@keyframes tdl-travel {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  62%,
  84% {
    offset-distance: 100%;
    opacity: 1;
  }
  100% {
    offset-distance: 100%;
    opacity: 0;
  }
}

/* 横向扫描光 */
.tdl-scan {
  position: absolute;
  top: -2px;
  bottom: -2px;
  left: -18%;
  width: 16%;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0;
  animation: tdl-scan 2.2s cubic-bezier(0.5, 0, 0.25, 1) infinite;
}

@keyframes tdl-scan {
  0% {
    left: -18%;
    opacity: 0;
  }
  10% {
    opacity: 0.16;
  }
  62% {
    left: 102%;
    opacity: 0.16;
  }
  100% {
    left: 102%;
    opacity: 0;
  }
}

.tdl-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.tdl-text em {
  font-style: normal;
  color: var(--ink-dim);
}

.tdl-cursor {
  width: 6px;
  height: 12px;
  border-radius: 1px;
  background: var(--accent);
  animation: tdl-cursor 1s steps(1, end) infinite;
}

@keyframes tdl-cursor {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

.tdl-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.tdl-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.stats__empty {
  padding: 64px 32px;
  text-align: center;
}

.stats__empty-icon {
  display: block;
  font-size: 30px;
  color: var(--ink-faint);
  margin-bottom: 10px;
}

.stats__empty h3 {
  font-size: 18px;
  color: var(--ink);
  margin-bottom: 8px;
}

.stats__empty p {
  font-size: var(--fs-base);
}

@media (max-width: 720px) {
  .stats {
    padding-top: calc(var(--nav-h) + 34px);
    padding-bottom: 72px;
  }

  .stats__embed {
    margin-top: 20px;
  }
}
</style>
