<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'

const { t } = useResume()
const router = useRouter()

const mounted = ref(false)

/** 鼠标视差：绕 X/Y 轴轻微转动 */
const rx = ref(-14)
const ry = ref(-34)

const sceneStyle = computed(() => ({
  '--rx': `${rx.value}deg`,
  '--ry': `${ry.value}deg`,
}))

function onMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width - 0.5
  const py = (e.clientY - r.top) / r.height - 0.5
  rx.value = -14 - py * 16
  ry.value = -34 + px * 28
}

function onLeave() {
  rx.value = -14
  ry.value = -34
}

/** 进入全屏 3D 微缩场景 */
function enter() {
  router.push('/konbini')
}

onMounted(() => {
  requestAnimationFrame(() => (mounted.value = true))
})
</script>

<template>
  <section class="section other" :class="{ 'is-ready': mounted }">
    <div class="container">
      <div class="section-head">
        <span class="section-label">~/other</span>
        <h2 class="section-title">{{ t.otherTitle }}</h2>
        <p class="section-sub">{{ t.otherSub }}</p>
      </div>

      <!-- 日式便利店 · 3D 卡片 -->
      <article
        class="card konbini"
        role="link"
        tabindex="0"
        :aria-label="t.konbiniEnter"
        @click="enter"
        @keydown.enter="enter"
        @keydown.space.prevent="enter"
      >
        <div
          class="konbini__stage"
          @mousemove="onMove"
          @mouseleave="onLeave"
        >
          <span class="konbini__badge">
            <i class="konbini__badge-dot" />
            {{ t.konbiniStatus }}
          </span>

          <!-- CSS 3D 便利店：作为 3D 场景的静态预览 -->
          <div class="konbini__scene" :style="sceneStyle">
            <div class="konbini__floor" />

            <div class="konbini__box">
              <!-- 正面：招牌 + 玻璃窗 + 门 -->
              <div class="face face--front">
                <div class="front__sign">
                  <span class="front__sign-text">KONBINI</span>
                  <span class="front__sign-sub">24H</span>
                </div>

                <div class="front__window">
                  <span class="front__shelf front__shelf--a" />
                  <span class="front__shelf front__shelf--b" />
                  <span class="front__shelf front__shelf--c" />
                </div>

                <div class="front__door">
                  <span class="front__door-line" />
                </div>

                <div class="front__base" />
              </div>

              <!-- 右侧墙 -->
              <div class="face face--right">
                <div class="right__strip" />
                <div class="right__win" />
              </div>

              <!-- 顶面 -->
              <div class="face face--top">
                <span class="top__edge" />
                <span class="top__vent" />
              </div>
            </div>

            <div class="konbini__shadow" />
          </div>

          <span class="konbini__enter">
            {{ t.konbiniEnter }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>

        <div class="konbini__info">
          <div class="konbini__head">
            <h3 class="konbini__title">
              {{ t.konbiniTitle }}
              <span class="konbini__title-en">{{ t.konbiniTitleEn }}</span>
            </h3>
            <span class="konbini__eta">3D</span>
          </div>

          <p class="konbini__desc">{{ t.konbiniDesc }}</p>

          <div class="konbini__tags">
            <span v-for="tag in t.konbiniTags" :key="tag" class="konbini__tag">{{ tag }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.other {
  padding-top: calc(var(--nav-h) + 64px);
  padding-bottom: 120px;
}

.section-head {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.is-ready .section-head {
  opacity: 1;
  transform: translateY(0);
}

/* ================= 卡片 ================= */
.konbini {
  max-width: 720px;
  margin-inline: auto;
  overflow: hidden;
  cursor: pointer;
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
    transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.is-ready .konbini {
  opacity: 1;
  transform: translateY(0);
}

.konbini:hover {
  transform: translateY(-4px);
  border-color: rgba(61, 220, 132, 0.4);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.5), 0 0 30px rgba(61, 220, 132, 0.1);
}

.konbini:active {
  transform: translateY(-1px) scale(0.994);
}

/* 进入 3D 场景的提示 */
.konbini__enter {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--accent);
  background: rgba(10, 16, 23, 0.72);
  border: 1px solid rgba(61, 220, 132, 0.32);
  border-radius: 999px;
  padding: 5px 13px;
  white-space: nowrap;
  backdrop-filter: blur(6px);
  transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.konbini:hover .konbini__enter {
  background: rgba(61, 220, 132, 0.14);
  border-color: var(--accent);
}

.konbini:hover .konbini__enter svg {
  transform: translateX(3px);
}

.konbini__enter svg {
  transition: transform 0.25s ease;
}

/* ================= 3D 舞台 ================= */
.konbini__stage {
  position: relative;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 60% at 50% 62%, rgba(61, 220, 132, 0.1), transparent 70%),
    radial-gradient(ellipse 90% 70% at 50% 0%, rgba(86, 200, 255, 0.06), transparent 65%),
    linear-gradient(180deg, #0a1017, #070b10);
  border-bottom: 1px solid var(--line);
  perspective: 1000px;
}

/* 深夜氛围：细密星点 */
.konbini__stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 12% 22%, rgba(255, 255, 255, 0.28) 0.6px, transparent 1px),
    radial-gradient(circle at 78% 16%, rgba(255, 255, 255, 0.22) 0.6px, transparent 1px),
    radial-gradient(circle at 62% 34%, rgba(255, 255, 255, 0.18) 0.6px, transparent 1px),
    radial-gradient(circle at 32% 12%, rgba(255, 255, 255, 0.2) 0.6px, transparent 1px),
    radial-gradient(circle at 88% 40%, rgba(255, 255, 255, 0.14) 0.6px, transparent 1px);
  pointer-events: none;
}

.konbini__badge {
  position: absolute;
  top: 16px;
  left: 18px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--amber);
  background: var(--amber-soft);
  border: 1px solid rgba(255, 180, 84, 0.3);
  border-radius: 999px;
  padding: 4px 11px;
}

.konbini__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--amber);
  animation: blink 1.6s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

.konbini__hint {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-faint);
  white-space: nowrap;
  z-index: 3;
}

/* ================= CSS 3D 场景 ================= */
.konbini__scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 地面网格 */
.konbini__floor {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 520px;
  height: 520px;
  margin: -260px 0 0 -260px;
  transform: rotateX(90deg) translateZ(-66px);
  background-image:
    linear-gradient(rgba(61, 220, 132, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(61, 220, 132, 0.1) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at 50% 50%, #000 4%, transparent 58%);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 4%, transparent 58%);
}

.konbini__box {
  position: relative;
  width: 200px;
  height: 132px;
  transform-style: preserve-3d;
  animation: hover-float 7s ease-in-out infinite;
}

@keyframes hover-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* 面通用：用负 margin 把面中心对齐盒子中心 */
.face {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

/* 正面 200×132 */
.face--front {
  width: 200px;
  height: 132px;
  margin-left: -100px;
  margin-top: -66px;
  transform: translateZ(75px);
  background: linear-gradient(180deg, #c9d6e4 0%, #a8b9cb 62%, #8b9db0 100%);
  border-radius: 3px 3px 0 0;
  box-shadow: inset 0 0 40px rgba(255, 255, 255, 0.18);
  overflow: hidden;
}

/* 右侧 150×132 */
.face--right {
  width: 150px;
  height: 132px;
  margin-left: -75px;
  margin-top: -66px;
  transform: rotateY(90deg) translateZ(100px);
  background: linear-gradient(180deg, #8fa3b8 0%, #6e8299 60%, #55697f 100%);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

/* 顶面 200×150 */
.face--top {
  width: 200px;
  height: 150px;
  margin-left: -100px;
  margin-top: -75px;
  transform: rotateX(90deg) translateZ(66px);
  background: linear-gradient(135deg, #d8e4ef 0%, #aebfd0 55%, #93a6ba 100%);
  border-radius: 3px;
  overflow: hidden;
}

/* —— 正面细节 —— */
/* 招牌 */
.front__sign {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: linear-gradient(180deg, #4ae894 0%, #23c471 55%, #127f4b 100%);
  box-shadow:
    0 0 22px rgba(61, 220, 132, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.front__sign-text {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: #04150c;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.front__sign-sub {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #04150c;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 3px;
  padding: 1px 5px;
}

/* 玻璃窗：店内灯光 + 货架剪影 */
.front__window {
  position: absolute;
  top: 40px;
  left: 12px;
  right: 12px;
  height: 62px;
  border-radius: 2px;
  background: linear-gradient(180deg, #eaf9ff 0%, #c6ebff 55%, #9fd4f0 100%);
  box-shadow:
    0 0 26px rgba(190, 235, 255, 0.6),
    inset 0 0 12px rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

/* 货架横条（店内陈设剪影） */
.front__shelf {
  position: absolute;
  left: 6px;
  right: 6px;
  height: 3px;
  background: rgba(90, 130, 160, 0.35);
  border-radius: 1px;
}

.front__shelf--a {
  top: 16px;
}
.front__shelf--b {
  top: 32px;
}
.front__shelf--c {
  top: 48px;
}

/* 玻璃反光 */
.front__window::after {
  content: '';
  position: absolute;
  top: -20%;
  left: -30%;
  width: 55%;
  height: 150%;
  background: linear-gradient(
    100deg,
    transparent,
    rgba(255, 255, 255, 0.65),
    transparent
  );
  transform: rotate(12deg);
}

/* 门 */
.front__door {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 72px;
  height: 30px;
  background: linear-gradient(180deg, #a9d5ea, #6f9fbb);
  border-top: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 0 10px rgba(220, 245, 255, 0.7);
}

.front__door-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(40, 70, 90, 0.4);
}

/* 墙裙 */
.front__base {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  background: linear-gradient(180deg, #5f7488, #445769);
}

/* —— 右侧墙细节 —— */
.right__strip {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 26px;
  background: linear-gradient(180deg, rgba(74, 232, 148, 0.85), rgba(18, 127, 75, 0.9));
  box-shadow: 0 0 16px rgba(61, 220, 132, 0.4);
}

.right__win {
  position: absolute;
  top: 42px;
  left: 24px;
  width: 62px;
  height: 46px;
  background: linear-gradient(180deg, #bfe4f5, #7ba9c4);
  border-radius: 2px;
  box-shadow: 0 0 18px rgba(180, 225, 250, 0.45);
}

/* —— 顶面细节 —— */
.top__edge {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
}

.top__vent {
  position: absolute;
  top: 24px;
  right: 26px;
  width: 40px;
  height: 22px;
  border-radius: 3px;
  background: repeating-linear-gradient(
    90deg,
    rgba(90, 110, 130, 0.5) 0 3px,
    transparent 3px 6px
  );
}

/* 落地阴影 */
.konbini__shadow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 300px;
  height: 60px;
  margin-left: -150px;
  margin-top: 28px;
  transform: translateZ(-66px);
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.62), transparent 70%);
  filter: blur(10px);
  pointer-events: none;
}

/* ================= model-viewer ================= */
.konbini__model {
  width: 100%;
  height: 100%;
}

.konbini__model model-viewer {
  width: 100%;
  height: 100%;
  background: transparent;
}

/* ================= 信息区 ================= */
.konbini__info {
  padding: 28px 32px 32px;
}

.konbini__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.konbini__title {
  font-size: 21px;
  color: var(--ink);
}

.konbini__title-en {
  margin-left: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-faint);
}

.konbini__eta {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--amber);
  background: var(--amber-soft);
  border: 1px solid rgba(255, 180, 84, 0.3);
  border-radius: 999px;
  padding: 2px 9px;
}

.konbini__desc {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--ink-dim);
  margin-bottom: 18px;
}

.konbini__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.konbini__tag {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--ink-dim);
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 10px;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.konbini__tag:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ================= 响应式 ================= */
@media (max-width: 720px) {
  .konbini__stage {
    height: 330px;
    perspective: 800px;
  }

  .konbini__box {
    width: 158px;
    height: 104px;
  }

  .face--front {
    width: 158px;
    height: 104px;
    margin-left: -79px;
    margin-top: -52px;
    transform: translateZ(59px);
  }

  .face--right {
    width: 118px;
    height: 104px;
    margin-left: -59px;
    margin-top: -52px;
    transform: rotateY(90deg) translateZ(79px);
  }

  .face--top {
    width: 158px;
    height: 118px;
    margin-left: -79px;
    margin-top: -59px;
    transform: rotateX(90deg) translateZ(52px);
  }

  .front__sign {
    height: 27px;
    padding: 0 10px;
  }

  .front__sign-text {
    font-size: 9.5px;
    letter-spacing: 0.16em;
  }

  .front__window {
    top: 32px;
    height: 48px;
  }

  .front__door {
    width: 56px;
    height: 24px;
  }

  .konbini__info {
    padding: 24px 22px 26px;
  }

  .konbini__floor {
    width: 400px;
    height: 400px;
    margin: -200px 0 0 -200px;
    background-size: 26px 26px;
  }
}
</style>
