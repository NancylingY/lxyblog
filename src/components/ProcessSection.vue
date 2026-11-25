<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useShowcaseCopy } from '../data/showcase'

const copy = useShowcaseCopy()

const el = ref<HTMLElement | null>(null)
const visible = ref(false)
const activeStep = ref(0)

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.value = true
      })
    },
    { threshold: 0.14 },
  )
  if (el.value) observer.observe(el.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section id="process" ref="el" class="section process">
    <div class="container">
      <div class="section-head reveal" :class="{ 'is-visible': visible }">
        <span class="section-label">~/workflow</span>
        <h2 class="section-title">{{ copy.processTitle }}</h2>
        <p class="section-sub">{{ copy.processSub }}</p>
      </div>

      <div class="process__wrap">
        <!-- 桌面端贯穿四步的进度连线 -->
        <div class="process__rail" aria-hidden="true">
          <span
            class="process__rail-fill"
            :style="{ transform: `scaleX(${(activeStep + 1) / copy.processSteps.length})` }"
          />
        </div>

        <ol class="process__grid">
          <li
            v-for="(step, idx) in copy.processSteps"
            :key="step.sub"
            class="card process__card reveal"
            :class="{ 'is-visible': visible, 'is-active': activeStep === idx }"
            :style="{ transitionDelay: `${idx * 0.1}s` }"
            tabindex="0"
            @mouseenter="activeStep = idx"
            @focus="activeStep = idx"
            @click="activeStep = idx"
          >
            <div class="process__top">
              <span class="process__num">0{{ idx + 1 }}</span>
              <span class="process__icon" aria-hidden="true">
                <!-- 01 Define: 目标定位 -->
                <svg v-if="idx === 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round" />
                </svg>
                <!-- 02 Design: 布局原型 -->
                <svg v-else-if="idx === 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="3" y="4" width="18" height="16" rx="2.5" />
                  <path d="M3 9h18M9 9v11" stroke-linecap="round" />
                </svg>
                <!-- 03 Build: 工程构建 -->
                <svg v-else-if="idx === 2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M8 7 3 12l5 5M16 7l5 5-5 5M13.5 5l-3 14" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <!-- 04 Ship: 发布迭代 -->
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M4 19h16" stroke-linecap="round" opacity="0.5" />
                </svg>
              </span>
            </div>

            <div class="process__head">
              <h3 class="process__title">{{ step.title }}</h3>
              <span class="process__sub">{{ step.sub }}</span>
            </div>

            <p class="process__desc">{{ step.desc }}</p>

            <div class="process__tags">
              <span v-for="tag in step.tags" :key="tag" class="process__tag">{{ tag }}</span>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<style scoped>
.process__wrap {
  position: relative;
}

.process__rail {
  position: relative;
  height: 2px;
  margin-bottom: 24px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.process__rail-fill {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--amber));
  transform-origin: left center;
  transition: transform 0.55s var(--ease-out);
}

[data-theme='dark'] .process__rail-fill {
  background: linear-gradient(90deg, var(--accent), var(--cyan));
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
}

.process__grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.process__card {
  padding: 24px 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  cursor: pointer;
}

.process__card.is-active {
  border-color: var(--accent-border);
  box-shadow: inset 0 1px 0 var(--card-top-sheen), var(--shadow-card);
}

.process__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.process__num {
  font-family: var(--font-serif);
  font-size: 28px;
  line-height: 1;
  color: var(--ink-faint);
  transition: color 0.25s ease, transform 0.25s var(--ease-out);
}

[data-theme='dark'] .process__num {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
}

.process__card.is-active .process__num,
.process__card:hover .process__num {
  color: var(--accent);
}

.process__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: var(--ink-dim);
  background: var(--bg-1);
  border: 1px solid var(--line);
  transition:
    color 0.25s ease,
    background-color 0.25s ease,
    border-color 0.25s ease,
    transform 0.28s var(--ease-out);
}

.process__icon svg {
  width: 19px;
  height: 19px;
}

.process__card.is-active .process__icon,
.process__card:hover .process__icon {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--accent-border);
  transform: scale(1.06);
}

.process__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.process__title {
  font-size: 18px;
  color: var(--ink);
}

.process__sub {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.06em;
  color: var(--ink-faint);
}

.process__desc {
  font-size: var(--fs-md);
  line-height: 1.68;
  color: var(--ink-dim);
  flex: 1;
}

.process__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}

.process__tag {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--ink-dim);
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 9px;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.process__card.is-active .process__tag {
  border-color: var(--accent-border);
  color: var(--ink);
}

@media (max-width: 1020px) {
  .process__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .process__rail {
    display: none;
  }

  .process__grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .process__card {
    padding: 20px;
  }
}
</style>
