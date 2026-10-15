<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { profile } from '../data/resume'

const el = ref<HTMLElement | null>(null)
const visible = ref(false)
const copied = ref(false)

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

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(profile.email)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    /* 剪贴板不可用时静默失败 */
  }
}

function callPhone() {
  window.location.href = `tel:${profile.phone}`
}

function mailTo() {
  window.location.href = `mailto:${profile.email}`
}
</script>

<template>
  <section id="contact" ref="el" class="section contact">
    <div class="container">
      <div class="section-head reveal" :class="{ 'is-visible': visible }">
        <span class="section-label">~/contact</span>
        <h2 class="section-title">保持联系</h2>
        <p class="section-sub">欢迎交流技术、项目合作，或任何有趣的想法。</p>
      </div>

      <div class="contact__panel card reveal" :class="{ 'is-visible': visible }">
        <!-- 左侧：一句话 + 行动按钮 -->
        <div class="contact__intro">
          <p class="contact__line contact__line--prompt">
            <span class="prompt">guest@dev:~$</span>
            <span class="contact__cmd">open contact --now</span>
          </p>
          <p class="contact__big">
            期待与你一起<br />
            <span class="contact__accent">把想法变成产品</span>
          </p>
          <p class="contact__desc">
            无论是技术交流、项目合作还是单纯的闲聊，都欢迎随时找我，回复通常在当天。
          </p>

          <div class="contact__actions">
            <button class="btn btn--primary" @click="mailTo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              发送邮件
            </button>
            <button class="btn btn--ghost" @click="callPhone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke-linejoin="round" /></svg>
              拨打电话
            </button>
          </div>
        </div>

        <!-- 右侧：信息卡 -->
        <div class="contact__info">
          <a class="contact__row" :href="`mailto:${profile.email}`" @click.prevent="mailTo">
            <span class="contact__row-icon">@</span>
            <span class="contact__row-body">
              <span class="contact__row-label">邮箱</span>
              <span class="contact__row-value">{{ profile.email }}</span>
            </span>
            <button class="contact__copy" :title="copied ? '已复制' : '复制'" @click.stop="copyEmail">
              {{ copied ? '✓' : '复制' }}
            </button>
          </a>

          <a class="contact__row" :href="`tel:${profile.phone}`" @click.prevent="callPhone">
            <span class="contact__row-icon">#</span>
            <span class="contact__row-body">
              <span class="contact__row-label">电话</span>
              <span class="contact__row-value">{{ profile.phone }}</span>
            </span>
          </a>

          <div class="contact__row">
            <span class="contact__row-icon">◎</span>
            <span class="contact__row-body">
              <span class="contact__row-label">坐标</span>
              <span class="contact__row-value">广东 · 广州</span>
            </span>
          </div>

          <div class="contact__row">
            <span class="contact__row-icon">♪</span>
            <span class="contact__row-body">
              <span class="contact__row-label">状态</span>
              <span class="contact__row-value contact__row-value--live">在线 · 乐于交流</span>
            </span>
            <span class="contact__live-dot" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container footer__inner">
      <p class="footer__brand">
        <span class="prompt">~</span> {{ profile.name }} · {{ profile.role }}
      </p>
      <p class="footer__meta">
        © {{ new Date().getFullYear() }} {{ profile.enName }} · Built with Vue 3 + Vite
      </p>
    </div>
  </footer>
</template>

<style scoped>
.contact__panel {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 44px;
  padding: 44px 48px;
  border-color: var(--line-bright);
}

.contact__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.contact__line--prompt {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--ink-faint);
  margin-bottom: 20px;
}

.contact__cmd {
  margin-left: 10px;
  color: var(--ink-dim);
}

.contact__big {
  font-family: var(--font-mono);
  font-size: clamp(24px, 3.2vw, 32px);
  font-weight: 700;
  line-height: 1.3;
  color: var(--ink);
  margin-bottom: 16px;
}

.contact__accent {
  color: var(--accent);
  text-shadow: 0 0 24px rgba(61, 220, 132, 0.3);
}

.contact__desc {
  font-size: 15px;
  max-width: 380px;
  margin-bottom: 30px;
}

.contact__actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 14.5px;
  font-weight: 500;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn--primary {
  background: var(--accent);
  color: #04140b;
  box-shadow: var(--glow);
}

.btn--primary:hover {
  background: #56e79a;
  box-shadow: 0 0 34px rgba(61, 220, 132, 0.4);
}

.btn--ghost {
  border-color: var(--line-bright);
  color: var(--ink);
  background: transparent;
}

.btn--ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

/* 信息列表 */
.contact__info {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.contact__row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  transition: border-color 0.25s ease, background 0.25s ease;
  cursor: pointer;
}

.contact__row:hover {
  border-color: var(--line-bright);
  background: var(--bg-3);
}

.contact__row-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 17px;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid rgba(61, 220, 132, 0.25);
}

.contact__row-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.contact__row-label {
  font-size: 12px;
  color: var(--ink-faint);
}

.contact__row-value {
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--ink);
  word-break: break-all;
}

.contact__row-value--live {
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.contact__copy {
  margin-left: auto;
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-dim);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 5px 12px;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.contact__copy:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.contact__live-dot {
  margin-left: auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: var(--glow);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 页脚 */
.footer {
  border-top: 1px solid var(--line);
  background: rgba(7, 9, 13, 0.6);
  padding: 30px 0;
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer__brand {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--ink-dim);
}

.footer__meta {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--ink-faint);
}

@media (max-width: 860px) {
  .contact__panel {
    grid-template-columns: 1fr;
    padding: 30px 26px;
    gap: 32px;
  }
}
</style>
