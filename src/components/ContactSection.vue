<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useResume } from '../data/resume'
import { copyText } from '../utils/clipboard'
import ContactKeycap from './ContactKeycap.vue'

const { t, profile } = useResume()

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
  const ok = await copyText(profile.value.email)
  if (!ok) return
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}

function callPhone() {
  window.location.href = `tel:${profile.value.phone}`
}

function mailTo() {
  window.location.href = `mailto:${profile.value.email}`
}
</script>

<template>
  <section id="contact" ref="el" class="section contact">
    <div class="container">
      <div class="section-head reveal" :class="{ 'is-visible': visible }">
        <span class="section-label">~/contact</span>
        <h2 class="section-title">{{ t.contactTitle }}</h2>
        <p class="section-sub">{{ t.contactSub }}</p>
      </div>

      <div class="contact__panel card reveal" :class="{ 'is-visible': visible }">
        <!-- 左侧：一句话 + 行动按钮 -->
        <div class="contact__intro">
          <p class="contact__line contact__line--prompt">
            <span class="prompt">guest@dev:~$</span>
            <span class="contact__cmd">{{ t.contactCmd }}</span>
          </p>
          <p class="contact__big">
            {{ t.contactBig1 }}<br />
            <span class="contact__accent">{{ t.contactBig2 }}</span>
          </p>
          <p class="contact__desc">
            {{ t.contactDesc }}
          </p>

          <div class="contact__actions">
            <button class="btn btn--primary" @click="mailTo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              {{ t.contactMail }}
            </button>
            <button class="btn btn--ghost" @click="callPhone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke-linejoin="round" /></svg>
              {{ t.contactCall }}
            </button>
          </div>

          <ContactKeycap />
        </div>

        <!-- 右侧：信息卡 -->
        <div class="contact__info">
          <div class="contact__row">
            <a class="contact__row-link" :href="`mailto:${profile.email}`" @click.prevent="mailTo">
              <span class="contact__row-icon">@</span>
              <span class="contact__row-body">
                <span class="contact__row-label">{{ t.contactEmail }}</span>
                <span class="contact__row-value">{{ profile.email }}</span>
              </span>
            </a>
            <button class="contact__copy" :title="copied ? t.contactCopied : t.contactCopy" @click="copyEmail">
              {{ copied ? '✓' : t.contactCopy }}
            </button>
          </div>

          <a class="contact__row" :href="`tel:${profile.phone}`" @click.prevent="callPhone">
            <span class="contact__row-icon">#</span>
            <span class="contact__row-body">
              <span class="contact__row-label">{{ t.contactPhone }}</span>
              <span class="contact__row-value">{{ profile.phone }}</span>
            </span>
          </a>

          <div class="contact__row">
            <span class="contact__row-icon">◎</span>
            <span class="contact__row-body">
              <span class="contact__row-label">{{ t.contactLocation }}</span>
              <span class="contact__row-value">{{ t.contactLocationValue }}</span>
            </span>
          </div>

          <div class="contact__row">
            <span class="contact__row-icon">♪</span>
            <span class="contact__row-body">
              <span class="contact__row-label">{{ t.contactStatus }}</span>
              <span class="contact__row-value contact__row-value--live">{{ t.contactStatusValue }}</span>
            </span>
            <span class="contact__live-dot" />
          </div>
        </div>
      </div>
    </div>
  </section>
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
  font-size: var(--fs-base);
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
  text-shadow: 0 0 24px color-mix(in srgb, var(--accent) 30%, transparent);
}

.contact__desc {
  font-size: var(--fs-lg);
  max-width: 380px;
  margin-bottom: 30px;
}

.contact__actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
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

/* 行内可点击区域与复制按钮拆开，避免交互控件嵌套 */
.contact__row-link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
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
  font-size: var(--fs-xl);
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
}

.contact__row-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.contact__row-label {
  font-size: var(--fs-sm);
  color: var(--ink-faint);
}

.contact__row-value {
  font-family: var(--font-mono);
  font-size: var(--fs-lg);
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
  font-size: var(--fs-sm);
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

@media (max-width: 860px) {
  .contact__panel {
    grid-template-columns: 1fr;
    padding: 30px 26px;
    gap: 32px;
  }
}
</style>
