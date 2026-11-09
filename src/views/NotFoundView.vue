<script setup lang="ts">
/**
 * 404 彩蛋：终端风格的「未找到」页面。
 * 纯 CSS，无额外依赖；未知路由懒加载进入，不影响首页性能。
 */
import { computed } from 'vue'
import { useResume } from '../data/resume'

const { locale } = useResume()

const copy = computed(() =>
  locale.value === 'zh'
    ? {
        cmd: 'open /unknown',
        message: '没有找到这个页面。它可能还没被构建，或者从未存在过。',
        hint: '路由已返回 404 · 光标仍在闪烁',
        back: '回到首页',
        label: '404 / NOT FOUND',
      }
    : {
        cmd: 'open /unknown',
        message: "This page doesn't exist yet—or perhaps it never did.",
        hint: 'route returned 404 · the cursor is still blinking',
        back: 'Back home',
        label: '404 / NOT FOUND',
      },
)
</script>

<template>
  <section class="not-found">
    <div class="not-found__inner">
      <span class="not-found__eyebrow">{{ copy.label }}</span>
      <h1 class="not-found__code">404</h1>

      <div class="not-found__term">
        <div class="not-found__bar">
          <span class="not-found__dots"><i /><i /><i /></span>
          <span class="not-found__path">guest@studio: ~/lost</span>
          <span class="not-found__shell">zsh</span>
        </div>
        <div class="not-found__body">
          <p class="not-found__line">
            <span class="not-found__prompt">$</span>
            {{ copy.cmd }}
          </p>
          <p class="not-found__message">{{ copy.message }}</p>
          <p class="not-found__hint">{{ copy.hint }}<span class="not-found__cursor" /></p>

          <RouterLink class="btn btn--primary not-found__btn" to="/">
            {{ copy.back }}
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.not-found {
  /* svh 跟随移动浏览器可视区域，避免地址栏收起时 404 页被顶出屏幕 */
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: calc(var(--nav-h) + 40px) 24px 80px;
  background:
    radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--amber) 12%, transparent), transparent 42%),
    radial-gradient(circle at 12% 88%, var(--accent-soft), transparent 46%);
}

.not-found__inner {
  width: min(560px, 100%);
}

.not-found__eyebrow {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.2em;
  color: var(--ink-faint);
  margin-bottom: 14px;
}

.not-found__code {
  font-family: var(--font-serif);
  font-size: clamp(72px, 16vw, 132px);
  line-height: 0.9;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin-bottom: 30px;
  text-shadow: 0 18px 50px color-mix(in srgb, var(--accent) 16%, transparent);
}

.not-found__term {
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--bg-1);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.not-found__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-2);
}

.not-found__dots {
  display: inline-flex;
  gap: 6px;
}

.not-found__dots i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--line-bright);
}

.not-found__dots i:first-child {
  background: color-mix(in srgb, var(--amber) 62%, var(--line));
}

.not-found__dots i:nth-child(2) {
  background: color-mix(in srgb, var(--accent) 52%, var(--line));
}

.not-found__path {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-dim);
}

.not-found__shell {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--ink-faint);
}

.not-found__body {
  padding: 26px 26px 30px;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
}

.not-found__line {
  color: var(--ink-dim);
}

.not-found__prompt {
  color: var(--accent);
}

.not-found__message {
  margin-top: 16px;
  font-family: var(--font-sans);
  font-size: var(--fs-lg);
  line-height: 1.8;
  color: var(--ink);
}

.not-found__hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: var(--fs-xs);
  color: var(--ink-faint);
}

.not-found__cursor {
  width: 7px;
  height: 14px;
  background: var(--accent);
  opacity: 0.75;
  animation: blink 1.15s steps(2, start) infinite;
}

@keyframes blink {
  0%, 49% { opacity: 0.75; }
  50%, 100% { opacity: 0; }
}

.not-found__btn {
  margin-top: 26px;
}

@media (prefers-reduced-motion: reduce) {
  .not-found__cursor {
    animation: none;
  }
}

@media (max-width: 520px) {
  .not-found {
    padding: calc(var(--nav-h) + 28px) 18px 60px;
  }

  .not-found__code {
    margin-bottom: 22px;
  }

  .not-found__body {
    padding: 22px 20px 26px;
  }

  .not-found__shell {
    display: none;
  }
}
</style>
