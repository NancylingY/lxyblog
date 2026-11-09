<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useResume } from '../data/resume'

const { locale } = useResume()

type LineType = 'cmd' | 'out' | 'dim' | 'ok' | 'blank'

interface TermLine {
  type: LineType
  text: string
}

const el = ref<HTMLElement | null>(null)
const started = ref(false)
const done = ref(false)
const rendered = ref<TermLine[]>([])
const typing = ref('')

let observer: IntersectionObserver | null = null
let runId = 0

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 终端会话脚本：用工作方式代替学校/工具清单 */
const script = computed<TermLine[]>(() => {
  const isZh = locale.value === 'zh'

  return [
    { type: 'cmd', text: 'whoami' },
    { type: 'out', text: isZh ? '独立产品工程师' : 'independent product engineer' },
    { type: 'dim', text: isZh ? '医疗 / 教务 / 推荐系统 · 全栈交付' : 'healthcare / campus / recommendation systems · end-to-end delivery' },
    { type: 'blank', text: '' },
    { type: 'cmd', text: 'focus' },
    { type: 'out', text: isZh ? '把复杂问题变成清晰、可用的系统' : 'turning complex problems into clear, usable systems' },
    { type: 'blank', text: '' },
    { type: 'cmd', text: 'now' },
    { type: 'ok', text: isZh ? '打磨小而精确的产品' : 'building small, precise products' },
    { type: 'blank', text: '' },
    { type: 'cmd', text: 'status' },
    { type: 'ok', text: isZh ? '● 开放少量合作' : '● open to selected collaborations' },
  ]
})

async function play() {
  const id = ++runId
  rendered.value = []
  typing.value = ''
  done.value = false

  for (const line of script.value) {
    if (id !== runId) return

    if (line.type === 'blank') {
      rendered.value.push(line)
      await sleep(90)
      continue
    }

    // 命令行敲得慢一点，输出快一点，模拟真实节奏
    const speed = line.type === 'cmd' ? 42 : 9
    for (let i = 1; i <= line.text.length; i++) {
      if (id !== runId) return
      typing.value = line.text.slice(0, i)
      await sleep(speed)
    }

    rendered.value.push({ type: line.type, text: line.text })
    typing.value = ''
    await sleep(line.type === 'cmd' ? 160 : 70)
  }

  if (id === runId) done.value = true
}

function skip() {
  // 点击可直接跳到结果，避免用户等太久
  if (!started.value || done.value) return
  runId++
  rendered.value = script.value.map((l) => ({ ...l }))
  typing.value = ''
  done.value = true
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started.value) {
          started.value = true
          play()
        }
      })
    },
    { threshold: 0.25 },
  )
  if (el.value) observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())

// 切换语言后重放
watch(locale, () => {
  if (started.value) play()
})
</script>

<template>
  <div ref="el" class="term" :class="{ 'is-done': done }" @click="skip">
    <header class="term__bar">
      <span class="term__dots">
        <i class="term__dot term__dot--r" />
        <i class="term__dot term__dot--y" />
        <i class="term__dot term__dot--g" />
      </span>
      <span class="term__path">guest@studio: ~/practice</span>
      <span class="term__size">zsh · 80×24</span>
    </header>

    <div class="term__body">
      <div v-for="(line, i) in rendered" :key="i" class="term__line" :class="`term__line--${line.type}`">
        <template v-if="line.type === 'cmd'">
          <span class="term__prompt">$</span>
          <span>{{ line.text }}</span>
        </template>
        <template v-else-if="line.type === 'blank'">
          <span class="term__nbsp">&nbsp;</span>
        </template>
        <template v-else>{{ line.text }}</template>
      </div>

      <!-- 正在输入的那一行 -->
      <div v-if="typing" class="term__line term__line--cmd">
        <span class="term__prompt">$</span>
        <span>{{ typing }}</span>
        <span class="term__caret" />
      </div>

      <!-- 结束后的空闲光标 -->
      <div v-if="done" class="term__line term__line--cmd">
        <span class="term__prompt">$</span>
        <span class="term__caret term__caret--idle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 终端在两种主题下都保持深色，作为页面里的"代码窗口"锚点 */
.term {
  border: 1px solid var(--term-line);
  border-radius: var(--radius);
  background: linear-gradient(180deg, var(--term-bg-a), var(--term-bg-b));
  overflow: hidden;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 16px 40px rgba(0, 0, 0, 0.28);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.term:hover {
  border-color: var(--term-line-bright);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 18px 46px rgba(0, 0, 0, 0.38);
}

/* 标题栏 */
.term__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid var(--term-line);
  flex-shrink: 0;
}

.term__dots {
  display: inline-flex;
  gap: 6px;
}

.term__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: block;
}

.term__dot--r {
  background: #ff5f57;
}
.term__dot--y {
  background: #febc2e;
}
.term__dot--g {
  background: #28c840;
}

.term__path {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--term-faint);
}

.term__size {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--term-faint);
  opacity: 0.7;
}

/* 主体 */
.term__body {
  padding: 18px 18px 22px;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  line-height: 1.85;
  flex: 1;
  overflow: hidden;
}

.term__line {
  white-space: pre-wrap;
  word-break: break-word;
  animation: line-in 0.22s ease both;
}

@keyframes line-in {
  from {
    opacity: 0;
    transform: translateX(-3px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.term__line--cmd {
  color: var(--term-ink);
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.term__prompt {
  color: var(--term-accent);
  flex-shrink: 0;
  font-weight: 700;
}

.term__line--out {
  color: var(--term-ink);
  padding-left: 16px;
  font-weight: 600;
}

.term__line--dim {
  color: var(--term-faint);
  padding-left: 16px;
  font-size: var(--fs-sm);
}

.term__line--ok {
  color: var(--term-accent);
  padding-left: 16px;
}

.term__line--blank {
  line-height: 1;
  height: 10px;
}

/* 光标 */
.term__caret {
  display: inline-block;
  width: 7px;
  height: 14px;
  background: var(--term-accent);
  margin-left: 2px;
  vertical-align: -2px;
  animation: caret 1s steps(1) infinite;
  box-shadow: 0 0 10px var(--term-glow);
}

.term__caret--idle {
  animation: caret 1.1s steps(1) infinite;
  opacity: 0.55;
  box-shadow: none;
}

@keyframes caret {
  50% {
    opacity: 0;
  }
}

/* 完成态：整体轻微提亮 */
.term.is-done {
  border-color: color-mix(in srgb, var(--term-accent) 26%, transparent);
}
</style>
