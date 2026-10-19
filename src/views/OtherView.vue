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

/* 医院卡片：独立的视差状态 */
const hrx = ref(-12)
const hry = ref(-30)

const hosStyle = computed(() => ({
  '--hrx': `${hrx.value}deg`,
  '--hry': `${hry.value}deg`,
}))

function onHosMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width - 0.5
  const py = (e.clientY - r.top) / r.height - 0.5
  hrx.value = -12 - py * 14
  hry.value = -30 + px * 24
}

function onHosLeave() {
  hrx.value = -12
  hry.value = -30
}

function enterHospital() {
  router.push('/hospital')
}

/* 微光之境卡片：独立的视差状态 */
const terRx = ref(-10)
const terRy = ref(-28)

const terrStyle = computed(() => ({
  '--trx': `${terRx.value}deg`,
  '--try': `${terRy.value}deg`,
}))

function onTerMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width - 0.5
  const py = (e.clientY - r.top) / r.height - 0.5
  terRx.value = -10 - py * 12
  terRy.value = -28 + px * 22
}

function onTerLeave() {
  terRx.value = -10
  terRy.value = -28
}

function enterTerrarium() {
  router.push('/terrarium')
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

      <div class="other__grid">
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

      <!-- 现代综合医院 · 3D 卡片 -->
      <article
        class="card konbini konbini--hos"
        role="link"
        tabindex="0"
        :aria-label="t.hospitalEnter"
        @click="enterHospital"
        @keydown.enter="enterHospital"
        @keydown.space.prevent="enterHospital"
      >
        <div class="konbini__stage konbini__stage--day" @mousemove="onHosMove" @mouseleave="onHosLeave">
          <span class="konbini__badge konbini__badge--day">
            <i class="konbini__badge-dot konbini__badge-dot--day" />
            {{ t.hospitalStatus }}
          </span>

          <div class="hos" :style="hosStyle">
            <div class="hos__base" />
            <div class="hos__box">
              <div class="hos__f hos__f--front">
                <div class="hos__cross">
                  <i />
                  <i />
                </div>
                <span v-for="n in 3" :key="n" class="hos__band" :style="{ top: `${52 + (n - 1) * 21}px` }" />
                <span class="hos__door" />
                <span class="hos__awning" />
              </div>
              <div class="hos__f hos__f--side">
                <span v-for="n in 3" :key="n" class="hos__band hos__band--side" :style="{ top: `${52 + (n - 1) * 21}px` }" />
              </div>
              <div class="hos__f hos__f--top">
                <span class="hos__roofbox" />
              </div>
            </div>
            <span class="hos__tree hos__tree--l" />
            <span class="hos__tree hos__tree--r" />
          </div>

          <span class="konbini__enter konbini__enter--day">
            {{ t.hospitalEnter }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>

        <div class="konbini__info">
          <div class="konbini__head">
            <h3 class="konbini__title">
              {{ t.hospitalTitle }}
              <span class="konbini__title-en">{{ t.hospitalTitleEn }}</span>
            </h3>
            <span class="konbini__eta">3D</span>
          </div>

          <p class="konbini__desc">{{ t.hospitalDesc }}</p>

          <div class="konbini__tags">
            <span v-for="tag in t.hospitalTags" :key="tag" class="konbini__tag">{{ tag }}</span>
          </div>
        </div>
      </article>

      <!-- 微光之境 · 3D 生态卡片 -->
      <article
        class="card konbini konbini--terr"
        role="link"
        tabindex="0"
        :aria-label="t.terrariumEnter"
        @click="enterTerrarium"
        @keydown.enter="enterTerrarium"
        @keydown.space.prevent="enterTerrarium"
      >
        <div
          class="konbini__stage konbini__stage--terr"
          @mousemove="onTerMove"
          @mouseleave="onTerLeave"
        >
          <span class="konbini__badge konbini__badge--terr">
            <i class="konbini__badge-dot konbini__badge-dot--terr" />
            {{ t.terrariumStatus }}
          </span>

          <div class="terr" :style="terrStyle">
            <!-- 盒底流光 -->
            <div class="terr__floor" />

            <div class="terr__float">
              <div class="terr__case">
                <!-- 玻璃背面 -->
                <div class="terr__pane terr__pane--back" />

                <!-- 盆景：岩石岛 / 山 / 水 / 林 / 微光 -->
                <div class="terr__diorama">
                  <div class="terr__rock" />
                  <div class="terr__island" />

                  <!-- 远山分层：越远越暗，制造空气透视 -->
                  <span class="terr__peak terr__peak--far" />
                  <span class="terr__peak terr__peak--mid" />
                  <span class="terr__peak terr__peak--main">
                    <i class="terr__peak-face" />
                    <i class="terr__snow" />
                    <i class="terr__falls" />
                  </span>
                  <span class="terr__peak terr__peak--shoulder" />

                  <!-- 瀑布下的水潭 -->
                  <div class="terr__pool" />

                  <!-- 针叶林 -->
                  <span class="terr__tree" style="--x: -56px; --z: 22px; --s: 1.06" />
                  <span class="terr__tree" style="--x: -36px; --z: 8px; --s: 0.84" />
                  <span class="terr__tree" style="--x: 42px; --z: 24px; --s: 0.92" />
                  <span class="terr__tree" style="--x: 60px; --z: -4px; --s: 0.76" />

                  <!-- 微光尘埃 -->
                  <span class="terr__mote" style="--x: -48px; --y: -32px; --z: 20px; --d: 0s" />
                  <span class="terr__mote" style="--x: 26px; --y: -50px; --z: 8px; --d: -1.3s" />
                  <span class="terr__mote" style="--x: 64px; --y: -16px; --z: -12px; --d: -2.5s" />
                  <span class="terr__mote" style="--x: -14px; --y: -64px; --z: -28px; --d: -3.7s" />
                  <span class="terr__mote" style="--x: -70px; --y: 2px; --z: -6px; --d: -4.9s" />
                </div>

                <!-- 玻璃右面 / 顶面 / 正面 -->
                <div class="terr__pane terr__pane--right" />
                <div class="terr__pane terr__pane--top" />
                <div class="terr__pane terr__pane--front">
                  <i class="terr__shine" />
                  <i class="terr__glint terr__glint--a" />
                  <i class="terr__glint terr__glint--b" />
                  <i class="terr__glint terr__glint--c" />
                  <i class="terr__glint terr__glint--d" />
                </div>

                <!-- 石台底面 -->
                <div class="terr__pane terr__pane--base" />
              </div>
            </div>
          </div>

          <span class="konbini__enter konbini__enter--terr">
            {{ t.terrariumEnter }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>

        <div class="konbini__info">
          <div class="konbini__head">
            <h3 class="konbini__title">
              {{ t.terrariumTitle }}
              <span class="konbini__title-en">{{ t.terrariumTitleEn }}</span>
            </h3>
            <span class="konbini__eta konbini__eta--terr">3D</span>
          </div>

          <p class="konbini__desc">{{ t.terrariumDesc }}</p>

          <div class="konbini__tags">
            <span v-for="tag in t.terrariumTags" :key="tag" class="konbini__tag">{{ tag }}</span>
          </div>
        </div>
      </article>
      </div>
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

/* ================= 三卡片布局 ================= */
.other__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  align-items: stretch;
}

.konbini {
  max-width: none;
  margin-inline: 0;
  display: flex;
  flex-direction: column;
}

.other__grid > .konbini .konbini__info {
  flex: 1;
}

.other__grid > .konbini:nth-child(2) {
  transition-delay: 0.28s, 0.28s, 0s, 0s;
}

.other__grid > .konbini:nth-child(3) {
  transition-delay: 0.44s, 0.44s, 0s, 0s;
}

@media (min-width: 1181px) {
  .other__grid .konbini__stage {
    height: 360px;
  }

  .other__grid .konbini__info {
    padding: 24px 24px 26px;
  }

  .other__grid .konbini__title {
    font-size: 19px;
  }
}

@media (max-width: 1180px) {
  .other__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 901px) and (max-width: 1180px) {
  .other__grid > .konbini--terr {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
  }

  .other__grid > .konbini--terr .konbini__stage {
    height: 100%;
    min-height: 380px;
    border-bottom: 0;
    border-right: 1px solid var(--line);
  }

  .other__grid > .konbini--terr .konbini__info {
    align-self: center;
    padding: 34px 34px 36px;
  }
}

@media (max-width: 900px) {
  .other__grid {
    grid-template-columns: 1fr;
    max-width: 620px;
    margin-inline: auto;
  }
}


/* ================= 医院卡片：白天舞台 ================= */
.konbini__stage--day {
  background:
    radial-gradient(ellipse 78% 62% at 50% 66%, rgba(150, 200, 232, 0.4), transparent 72%),
    linear-gradient(180deg, #c9e3f6 0%, #e6f3fc 52%, #f2f9fe 100%);
}

.konbini__stage--day::before {
  display: none;
}

.konbini__badge--day {
  color: #2f7fc4;
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(47, 127, 196, 0.35);
}

/* 静态圆点，不做闪烁 */
.konbini__badge-dot--day {
  background: #2f7fc4;
  animation: none;
}

.konbini__enter--day {
  color: #2f7fc4;
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(47, 127, 196, 0.35);
}

.konbini:hover .konbini__enter--day {
  background: rgba(47, 127, 196, 0.14);
  border-color: #2f7fc4;
}

/* ================= 医院微缩预览 ================= */
.hos {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  transform: rotateX(var(--hrx)) rotateY(var(--hry));
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.hos__base {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 360px;
  height: 360px;
  margin: -180px 0 0 -180px;
  transform: rotateX(90deg) translateZ(-52px);
  background-image:
    linear-gradient(rgba(110, 150, 185, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(110, 150, 185, 0.16) 1px, transparent 1px);
  background-size: 24px 24px;
  border-radius: 6px;
  mask-image: radial-gradient(circle at 50% 50%, #000 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 30%, transparent 70%);
}

.hos__box {
  position: relative;
  width: 210px;
  height: 150px;
  transform-style: preserve-3d;
  animation: hos-float 8s ease-in-out infinite;
}

@keyframes hos-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.hos__f {
  position: absolute;
  left: 50%;
  top: 50%;
  overflow: hidden;
}

.hos__f--front {
  width: 210px;
  height: 150px;
  margin-left: -105px;
  margin-top: -75px;
  transform: translateZ(60px);
  background: linear-gradient(180deg, #f7fafd 0%, #e6eef6 62%, #d5e0ea 100%);
  border-radius: 3px 3px 0 0;
  box-shadow: inset 0 0 30px rgba(150, 185, 215, 0.25);
}

.hos__f--side {
  width: 120px;
  height: 150px;
  margin-left: -60px;
  margin-top: -75px;
  transform: rotateY(90deg) translateZ(105px);
  background: linear-gradient(180deg, #dbe5ee 0%, #c3d0dc 65%, #b0bfcd 100%);
}

.hos__f--top {
  width: 210px;
  height: 120px;
  margin-left: -105px;
  margin-top: -60px;
  transform: rotateX(90deg) translateZ(75px);
  background: linear-gradient(135deg, #f2f6fa 0%, #dde6ef 55%, #c9d5e0 100%);
  border-radius: 3px;
}

/* 蓝玻璃窗带 */
.hos__band {
  position: absolute;
  left: 9px;
  right: 9px;
  height: 12px;
  border-radius: 2px;
  background: linear-gradient(180deg, #b2d6f1 0%, #7fb3d9 55%, #6ba2cb 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.hos__band--side {
  left: 7px;
  right: 7px;
  height: 10px;
  background: linear-gradient(180deg, #9bc2de 0%, #6f9dbc 100%);
}

/* 入口门 */
.hos__door {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 36px;
  background: linear-gradient(180deg, #cbe8f8, #93bdd7);
  box-shadow: 0 0 16px rgba(190, 225, 250, 0.9);
}

/* 雨棚 */
.hos__awning {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 9px;
  border-radius: 2px;
  background: linear-gradient(180deg, #ffffff, #dce7f1);
  box-shadow: 0 2px 6px rgba(80, 110, 140, 0.22);
}

/* 医疗十字 */
.hos__cross {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 26px;
  height: 26px;
}

.hos__cross i {
  position: absolute;
  background: #2f7fc4;
  border-radius: 2px;
}

.hos__cross i:first-child {
  left: 9px;
  top: 0;
  width: 8px;
  height: 26px;
}

.hos__cross i:last-child {
  left: 0;
  top: 9px;
  width: 26px;
  height: 8px;
}

/* 屋顶机房 */
.hos__roofbox {
  position: absolute;
  left: 26px;
  top: 30px;
  width: 54px;
  height: 40px;
  border-radius: 2px;
  background: linear-gradient(135deg, #e7eef5, #cbd7e2);
  box-shadow: 0 2px 6px rgba(90, 120, 150, 0.18);
}

/* 门前绿化 */
.hos__tree {
  position: absolute;
  left: 50%;
  top: 50%;
  margin-top: 54px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #a6da86, #5f9e4c);
  box-shadow: 0 4px 10px rgba(60, 110, 60, 0.22);
}

.hos__tree--l {
  margin-left: -136px;
}

.hos__tree--r {
  margin-left: 108px;
}

/* ================= 微光之境：深空舞台 ================= */
.konbini--terr {
  border-color: rgba(120, 185, 220, 0.16);
}

.konbini--terr:hover {
  border-color: rgba(150, 220, 255, 0.46);
  box-shadow:
    0 18px 46px rgba(0, 0, 0, 0.52),
    0 0 34px rgba(120, 205, 255, 0.13);
}

.konbini__stage--terr {
  background:
    radial-gradient(ellipse 62% 52% at 50% 48%, rgba(90, 190, 230, 0.17), transparent 70%),
    radial-gradient(ellipse 95% 74% at 50% 0%, rgba(70, 150, 210, 0.09), transparent 66%),
    linear-gradient(180deg, #071019, #04090f);
}

.konbini__stage--terr::before {
  background-image:
    radial-gradient(circle at 12% 18%, rgba(220, 242, 255, 0.6) 0.6px, transparent 1px),
    radial-gradient(circle at 82% 12%, rgba(200, 232, 255, 0.5) 0.7px, transparent 1.1px),
    radial-gradient(circle at 68% 30%, rgba(255, 244, 220, 0.42) 0.6px, transparent 1px),
    radial-gradient(circle at 28% 36%, rgba(210, 236, 255, 0.4) 0.6px, transparent 1px),
    radial-gradient(circle at 90% 44%, rgba(180, 225, 255, 0.36) 0.6px, transparent 1px),
    radial-gradient(circle at 44% 8%, rgba(255, 255, 255, 0.4) 0.5px, transparent 1px),
    radial-gradient(circle at 6% 58%, rgba(190, 228, 255, 0.3) 0.5px, transparent 1px);
}

.konbini__badge--terr {
  color: #9fe2ff;
  background: rgba(18, 44, 62, 0.6);
  border-color: rgba(143, 216, 255, 0.28);
}

.konbini__badge-dot--terr {
  background: #9fe2ff;
  animation-duration: 2.4s;
  box-shadow: 0 0 8px rgba(159, 226, 255, 0.8);
}

.konbini__enter--terr {
  color: #a8e2ff;
  background: rgba(10, 22, 32, 0.72);
  border-color: rgba(143, 216, 255, 0.3);
}

.konbini:hover .konbini__enter--terr {
  background: rgba(143, 216, 255, 0.14);
  border-color: #a8e2ff;
}

.konbini__eta--terr {
  color: #9fe2ff;
  background: rgba(143, 216, 255, 0.1);
  border-color: rgba(143, 216, 255, 0.3);
}

/* ================= 微光之境：CSS 3D 生态箱 ================= */
.terr {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  transform: rotateX(var(--trx)) rotateY(var(--try));
  transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 盒底流光（不随箱体浮动） */
.terr__floor {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 320px;
  height: 320px;
  margin: -160px 0 0 -160px;
  transform: rotateX(90deg) translateZ(-96px);
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(126, 214, 255, 0.2) 0%,
    rgba(74, 158, 208, 0.08) 38%,
    rgba(40, 90, 130, 0) 64%
  );
  transition: opacity 0.5s ease;
}

.terr__float {
  position: relative;
  width: 190px;
  height: 150px;
  transform-style: preserve-3d;
  animation: terr-float 9s ease-in-out infinite;
}

@keyframes terr-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

.terr__case {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: scale(1.06);
}

/* —— 玻璃面 —— */
.terr__pane {
  position: absolute;
  left: 50%;
  top: 50%;
  border: 1px solid rgba(191, 232, 255, 0.3);
  background: linear-gradient(
    152deg,
    rgba(214, 241, 255, 0.1) 0%,
    rgba(126, 196, 232, 0.028) 46%,
    rgba(178, 228, 255, 0.08) 100%
  );
  transition: border-color 0.4s ease;
}

.terr__pane--back {
  width: 190px;
  height: 150px;
  margin: -75px 0 0 -95px;
  transform: translateZ(-85px);
}

.terr__pane--front {
  width: 190px;
  height: 150px;
  margin: -75px 0 0 -95px;
  transform: translateZ(85px);
  border-color: rgba(207, 238, 255, 0.4);
  background: linear-gradient(
    152deg,
    rgba(220, 244, 255, 0.06) 0%,
    rgba(140, 205, 240, 0.016) 50%,
    rgba(190, 232, 255, 0.05) 100%
  );
}

.terr__pane--right {
  width: 170px;
  height: 150px;
  margin: -75px 0 0 -85px;
  transform: rotateY(90deg) translateZ(95px);
}

.terr__pane--top {
  width: 190px;
  height: 170px;
  margin: -85px 0 0 -95px;
  transform: rotateX(90deg) translateZ(75px);
  border-color: rgba(214, 242, 255, 0.38);
  background: linear-gradient(
    136deg,
    rgba(226, 246, 255, 0.15) 0%,
    rgba(148, 212, 245, 0.045) 54%,
    rgba(200, 238, 255, 0.1) 100%
  );
}

.terr__pane--base {
  width: 190px;
  height: 170px;
  margin: -85px 0 0 -95px;
  transform: rotateX(-90deg) translateZ(75px);
  border-color: rgba(120, 170, 200, 0.2);
  background: linear-gradient(180deg, #2b333b 0%, #171c22 100%);
}

/* 正面斜向高光 */
.terr__shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    112deg,
    transparent 24%,
    rgba(255, 255, 255, 0.14) 31%,
    rgba(255, 255, 255, 0.03) 39%,
    transparent 46%
  );
}

/* 四角镜面微光 */
.terr__glint {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #f2fdff;
  box-shadow: 0 0 7px 2px rgba(190, 238, 255, 0.7);
}

.terr__glint--a { left: -1px; top: -1px; }
.terr__glint--b { right: -1px; top: -1px; }
.terr__glint--c { left: -1px; bottom: -1px; }
.terr__glint--d { right: -1px; bottom: -1px; }

/* —— 盆景 —— */
.terr__diorama {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

/* 岩石底座 */
.terr__rock {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 168px;
  height: 148px;
  margin: -74px 0 0 -84px;
  border-radius: 50%;
  transform: translate3d(0, 66px, 0) rotateX(90deg);
  background: radial-gradient(
    ellipse at 50% 44%,
    #4b4339 0%,
    #38342d 52%,
    #22262b 100%
  );
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.55);
}

/* 草地岛面 */
.terr__island {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 156px;
  height: 138px;
  margin: -69px 0 0 -78px;
  border-radius: 50%;
  transform: translate3d(0, 58px, 0) rotateX(90deg);
  background: radial-gradient(
    ellipse at 46% 38%,
    #7cba67 0%,
    #578f4e 40%,
    #38663c 72%,
    #25492d 100%
  );
  box-shadow:
    inset 0 0 26px rgba(16, 38, 24, 0.55),
    0 0 0 1px rgba(154, 214, 154, 0.16);
}

/* —— 山体分层 —— */
.terr__peak {
  position: absolute;
  left: 50%;
  top: 50%;
}

.terr__peak--far {
  width: 124px;
  height: 50px;
  margin: -50px 0 0 -62px;
  transform: translate3d(-14px, 58px, -52px);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, #2b3c4c 0%, #22303c 60%, #18222b 100%);
}

.terr__peak--mid {
  width: 96px;
  height: 62px;
  margin: -62px 0 0 -48px;
  transform: translate3d(-34px, 58px, -38px);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, #40596b 0%, #2d4152 58%, #1e2b35 100%);
}

/* 右侧肩峰：与主峰构成双峰山脊 */
.terr__peak--shoulder {
  width: 70px;
  height: 58px;
  margin: -58px 0 0 -35px;
  transform: translate3d(40px, 58px, -6px);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, #5d7689 0%, #3b5062 52%, #22303b 100%);
}

.terr__peak--main {
  width: 100px;
  height: 96px;
  margin: -96px 0 0 -50px;
  transform: translate3d(-10px, 58px, -22px);
}

.terr__peak-face {
  position: absolute;
  inset: 0;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background:
    linear-gradient(100deg, transparent 58%, rgba(255, 214, 160, 0.26) 94%),
    linear-gradient(
      180deg,
      #889eb0 0%,
      #5c7484 22%,
      #3a4c5c 54%,
      #1c2831 100%
    );
  box-shadow: inset -12px -6px 22px rgba(8, 16, 24, 0.4);
}

/* 雪冠 */
.terr__snow {
  position: absolute;
  left: 50%;
  top: 0;
  width: 34px;
  height: 21px;
  margin-left: -17px;
  clip-path: polygon(50% 0, 100% 100%, 74% 76%, 54% 94%, 26% 70%, 0 100%);
  background: linear-gradient(180deg, #f4fbff 0%, #d7ecfb 58%, rgba(168, 208, 232, 0.3) 100%);
}

/* 瀑布 */
.terr__falls {
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 7px;
  height: 74px;
  margin-left: -3.5px;
  border-radius: 4px;
  background: linear-gradient(
    180deg,
    rgba(226, 249, 255, 0.85) 0%,
    rgba(150, 226, 242, 0.68) 45%,
    rgba(80, 184, 218, 0.44) 100%
  );
  background-size: 100% 200%;
  clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%);
  animation: terr-falls 2.8s linear infinite;
}

@keyframes terr-falls {
  0% { background-position: 0 -74px; }
  100% { background-position: 0 74px; }
}

/* 水潭 */
.terr__pool {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 92px;
  height: 46px;
  margin: -23px 0 0 -46px;
  border-radius: 50%;
  transform: translate3d(2px, 55.5px, 10px) rotateX(90deg);
  background: radial-gradient(
    ellipse at 50% 46%,
    rgba(232, 253, 255, 0.95) 0%,
    rgba(132, 226, 244, 0.8) 32%,
    rgba(62, 162, 200, 0.6) 68%,
    rgba(38, 110, 146, 0.3) 100%
  );
  box-shadow:
    0 0 22px 6px rgba(110, 214, 242, 0.3),
    0 0 0 1px rgba(170, 240, 255, 0.25);
  animation: terr-pool 5.5s ease-in-out infinite;
}

@keyframes terr-pool {
  0%, 100% { box-shadow: 0 0 18px 4px rgba(110, 214, 242, 0.22); }
  50% { box-shadow: 0 0 26px 8px rgba(126, 226, 250, 0.36); }
}

/* 针叶树 */
.terr__tree {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(19px * var(--s, 1));
  height: calc(29px * var(--s, 1));
  margin-left: calc(-9.5px * var(--s, 1));
  margin-top: calc(-29px * var(--s, 1));
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background: linear-gradient(180deg, #8ccc74 0%, #478250 50%, #20402b 100%);
  transform: translate3d(var(--x, 0), 58px, var(--z, 0));
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.45));
}

/* 微光尘埃 */
.terr__mote {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 3px;
  margin: -1.5px 0 0 -1.5px;
  border-radius: 50%;
  background: #e8faff;
  box-shadow:
    0 0 6px 2px rgba(159, 226, 255, 0.75),
    0 0 14px 5px rgba(110, 200, 250, 0.28);
  transform: translate3d(var(--x, 0), var(--y, 0), var(--z, 0));
  animation: terr-mote 6.5s ease-in-out infinite;
  animation-delay: var(--d, 0s);
}

@keyframes terr-mote {
  0%, 100% {
    opacity: 0.2;
    transform: translate3d(var(--x, 0), var(--y, 0), var(--z, 0)) scale(0.7);
  }
  50% {
    opacity: 1;
    transform: translate3d(var(--x, 0), calc(var(--y, 0px) - 9px), var(--z, 0)) scale(1.1);
  }
}

/* 悬停：玻璃与地面流光同时提亮 */
.konbini:hover .terr__pane {
  border-color: rgba(214, 244, 255, 0.52);
}

.konbini:hover .terr__floor {
  filter: brightness(1.35);
}


</style>
