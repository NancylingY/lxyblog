<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useResume } from '../data/resume'

const { locale, education } = useResume()

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

/** 终端会话脚本：教育经历以命令行形式输出 */
const script = computed<TermLine[]>(() => {
  const edu = education.value
  const isZh = locale.value === 'zh'

  return [
    { type: 'cmd', text: 'whoami' },
    { type: 'out', text: `${isZh ? edu.school : 'Yi Lee'}` },
    { type: 'dim', text: `${edu.degree} · ${edu.major} · ${edu.period}` },
    { type: 'blank', text: '' },
    { type: 'cmd', text: 'cat /edu/rank' },
    { type: 'ok', text: isZh ? `专业排名 ${edu.rank}` : `Major rank ${edu.rank}` },
    { type: 'blank', text: '' },
    { type: 'cmd', text: 'ls /edu/courses' },
    { type: 'dim', text: edu.courses.join('   ') },
    { type: 'blank', text: '' },
    { type: 'cmd', text: './me --status' },
    { type: 'ok', text: isZh ? '● 在线 · 正在造点新东西' : '● Online · Building something new' },
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
      <span class="term__path">guest@dev: ~/edu</span>
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
.term {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: linear-gradient(180deg, #0b1016, #080c11);
  overflow: hidden;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), var(--shadow-card);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.term:hover {
  border-color: var(--line-bright);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 16px 40px rgba(0, 0, 0, 0.45);
}

/* 标题栏 */
.term__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid var(--line);
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
  font-size: 11.5px;
  color: var(--ink-faint);
}

.term__size {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-faint);
  opacity: 0.7;
}

/* 主体 */
.term__body {
  padding: 18px 18px 22px;
  font-family: var(--font-mono);
  font-size: 12.8px;
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
  color: var(--ink);
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.term__prompt {
  color: var(--accent);
  flex-shrink: 0;
  font-weight: 700;
}

.term__line--out {
  color: var(--ink);
  padding-left: 16px;
  font-weight: 600;
}

.term__line--dim {
  color: var(--ink-faint);
  padding-left: 16px;
  font-size: 12px;
}

.term__line--ok {
  color: var(--accent);
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
  background: var(--accent);
  margin-left: 2px;
  vertical-align: -2px;
  animation: caret 1s steps(1) infinite;
  box-shadow: 0 0 10px rgba(61, 220, 132, 0.5);
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
  border-color: rgba(61, 220, 132, 0.22);
}
</style>
