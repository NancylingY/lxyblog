<script setup lang="ts">
import ParticleField from './ParticleField.vue'
import { profile } from '../data/resume'
import { scrollToHash } from '../utils/scroll'
</script>

<template>
  <section id="top" class="hero">
    <div class="container hero__grid">
      <!-- 左侧：自我介绍 -->
      <div class="hero__intro">
        <p class="hero__eyebrow">
          <span class="hero__eyebrow-dot" /> {{ profile.role }} · 全栈基础 · {{ profile.enName }}
        </p>
        <h1 class="hero__title">
          你好，我是
          <span class="hero__name">{{ profile.name }}</span>
        </h1>
        <p class="hero__slogan">{{ profile.slogan }}</p>
        <p class="hero__desc">{{ profile.intro }}</p>

        <div class="hero__actions">
          <router-link class="btn btn--primary" to="/projects">查看作品</router-link>
          <a class="btn btn--ghost" href="javascript:void(0)" @click="scrollToHash('#about')">关于我</a>
        </div>

        <ul class="hero__stats">
          <li class="hero__stat">
            <span class="hero__stat-num">20+</span>
            <span class="hero__stat-label">技术栈</span>
          </li>
          <li class="hero__stat">
            <span class="hero__stat-num">4</span>
            <span class="hero__stat-label">全栈项目</span>
          </li>
          <li class="hero__stat">
            <span class="hero__stat-num">3</span>
            <span class="hero__stat-label">技术方向</span>
          </li>
        </ul>
      </div>

      <!-- 右侧：创意小组件 -->
      <div class="hero__visual">
        <ParticleField />
        <p class="hero__visual-caption">// 代码之外，也有星空</p>
      </div>
    </div>

      <a class="hero__scroll" href="javascript:void(0)" aria-label="向下滚动" @click="scrollToHash('#about')">
      <span class="hero__scroll-text">scroll</span>
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
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 56px;
  align-items: center;
}

/* 左侧文字 */
.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 13px;
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
  text-shadow: 0 0 28px rgba(61, 220, 132, 0.35);
}

.hero__name::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  height: 10px;
  background: var(--accent-soft);
  z-index: -1;
  border-radius: 2px;
}

.hero__slogan {
  font-family: var(--font-mono);
  font-size: 17px;
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

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 26px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 15px;
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
  font-size: 12px;
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

.hero__visual-caption {
  font-family: var(--font-mono);
  font-size: 12.5px;
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
  font-size: 11px;
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

  .particle-field {
    max-width: 340px;
  }
}

@media (max-width: 520px) {
  .hero__stats {
    flex-direction: column;
  }

  .hero__stat {
    border-right: none;
    border-bottom: 1px solid var(--line);
  }

  .hero__stat:last-child {
    border-bottom: none;
  }
}
</style>
