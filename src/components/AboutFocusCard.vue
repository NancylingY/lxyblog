<script setup lang="ts">
/**
 * 日光模式「关于」右侧组件：
 * 以工作室笔记 / 实践卡片替代终端窗口，内容不再出现学校信息。
 */
import { computed } from 'vue'
import { useResume } from '../data/resume'

const { locale } = useResume()

const copy = computed(() => {
  const isZh = locale.value === 'zh'
  return {
    eyebrow: 'PRACTICE / 2026',
    title: isZh ? '把复杂业务流程做成可上线的产品。' : 'Turning complex workflows into shippable products.',
    desc: isZh
      ? '从需求拆解、界面设计到前后端实现，独立完成医疗、教务、点餐与推荐系统等 6 个项目的交付。'
      : 'From problem framing and UI design to frontend and backend implementation — six shipped projects across healthcare, campus services, ordering, and recommendation.',
    items: [
      {
        index: '01',
        label: isZh ? '方向' : 'FOCUS',
        value: isZh ? '全栈产品 / 数据可视化' : 'full-stack products / data visualization',
      },
      {
        index: '02',
        label: isZh ? '方法' : 'METHOD',
        value: isZh ? '设计 → 代码 → 交付' : 'design → code → ship',
      },
      {
        index: '03',
        label: isZh ? '现在' : 'NOW',
        value: isZh ? '打磨小而精确的产品' : 'building small, precise products',
      },
    ],
    status: isZh ? '开放少量合作' : 'Open to selected collaborations',
  }
})
</script>

<template>
  <div class="focus-card">
    <header class="focus-card__head">
      <span class="focus-card__eyebrow">{{ copy.eyebrow }}</span>
      <span class="focus-card__mark">Y</span>
    </header>

    <h3 class="focus-card__title">{{ copy.title }}</h3>
    <p class="focus-card__desc">{{ copy.desc }}</p>

    <ul class="focus-card__list">
      <li v-for="item in copy.items" :key="item.index" class="focus-card__row">
        <span class="focus-card__index">{{ item.index }}</span>
        <span class="focus-card__label">{{ item.label }}</span>
        <span class="focus-card__value">{{ item.value }}</span>
      </li>
    </ul>

    <footer class="focus-card__foot">
      <i class="focus-card__dot" />
      <span>{{ copy.status }}</span>
      <span class="focus-card__note">craft / systems / patience</span>
    </footer>
  </div>
</template>

<style scoped>
.focus-card {
  position: relative;
  height: 100%;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  padding: 30px 32px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background:
    radial-gradient(circle at 92% 8%, rgba(255, 214, 154, 0.3), transparent 42%),
    radial-gradient(circle at 6% 96%, rgba(13, 116, 144, 0.09), transparent 46%),
    linear-gradient(158deg, rgba(255, 253, 248, 0.96), rgba(247, 250, 248, 0.92));
  box-shadow:
    0 18px 44px rgba(20, 58, 72, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  overflow: hidden;
}

.focus-card::before {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px dashed rgba(13, 116, 144, 0.12);
  border-radius: calc(var(--radius) - 8px);
  pointer-events: none;
}

.focus-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.focus-card__eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.focus-card__mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--accent-border);
  font-family: var(--font-serif);
  font-size: var(--fs-xl);
  color: var(--accent);
  background: var(--accent-soft);
}

.focus-card__title {
  max-width: 420px;
  margin-top: 26px;
  font-family: var(--font-serif);
  font-size: clamp(24px, 2.4vw, 30px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.focus-card__desc {
  max-width: 430px;
  margin-top: 14px;
  color: var(--ink-dim);
  font-size: var(--fs-md);
  line-height: 1.75;
}

.focus-card__list {
  list-style: none;
  margin-top: 28px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.focus-card__row {
  display: grid;
  grid-template-columns: 28px 68px 1fr;
  align-items: baseline;
  gap: 10px;
  padding: 13px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
}

.focus-card__index {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--amber);
  letter-spacing: 0.06em;
}

.focus-card__label {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.12em;
  color: var(--ink-faint);
  text-transform: uppercase;
}

.focus-card__value {
  color: var(--ink);
  font-size: var(--fs-md);
  line-height: 1.55;
}

.focus-card__foot {
  margin-top: auto;
  padding-top: 22px;
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.1em;
  color: var(--ink-dim);
}

.focus-card__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 12px rgba(196, 122, 34, 0.35);
  flex-shrink: 0;
}

.focus-card__note {
  margin-left: auto;
  color: var(--ink-faint);
  opacity: 0.7;
  letter-spacing: 0.08em;
}

@media (max-width: 860px) {
  .focus-card {
    min-height: 0;
    padding: 26px 24px;
  }

  .focus-card__row {
    grid-template-columns: 24px 62px 1fr;
    gap: 8px;
  }

  .focus-card__note {
    display: none;
  }
}
</style>
