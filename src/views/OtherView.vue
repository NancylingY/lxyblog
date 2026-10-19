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
            <div class="terr__float">
              <svg class="terr__art" viewBox="84 28 274 272" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <radialGradient id="terrHalo" cx="50%" cy="50%" r="50%">
                    <stop offset="0" stop-color="#8fdcff" stop-opacity=".22" />
                    <stop offset=".55" stop-color="#3f9fd0" stop-opacity=".08" />
                    <stop offset="1" stop-color="#2b6f92" stop-opacity="0" />
                  </radialGradient>
                  <linearGradient id="terrGlass" x1="104" y1="92" x2="276" y2="286" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#dff5ff" stop-opacity=".22" />
                    <stop offset=".45" stop-color="#a8dfff" stop-opacity=".07" />
                    <stop offset="1" stop-color="#c7edff" stop-opacity=".17" />
                  </linearGradient>
                  <linearGradient id="terrGlassTop" x1="166" y1="46" x2="338" y2="92" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#eafaff" stop-opacity=".36" />
                    <stop offset="1" stop-color="#8fd4ff" stop-opacity=".06" />
                  </linearGradient>
                  <linearGradient id="terrGrass" x1="126" y1="226" x2="266" y2="250" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#78b660" />
                    <stop offset=".55" stop-color="#4f9150" />
                    <stop offset="1" stop-color="#336c3d" />
                  </linearGradient>
                  <linearGradient id="terrRock" x1="140" y1="248" x2="250" y2="282" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#554936" />
                    <stop offset=".5" stop-color="#3b3731" />
                    <stop offset="1" stop-color="#21282b" />
                  </linearGradient>
                  <linearGradient id="terrMountain" x1="196" y1="110" x2="196" y2="238" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#a9becf" />
                    <stop offset=".3" stop-color="#8399a9" />
                    <stop offset=".65" stop-color="#566d7f" />
                    <stop offset="1" stop-color="#384e5f" />
                  </linearGradient>
                  <linearGradient id="terrSnow" x1="196" y1="110" x2="196" y2="180" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ffffff" />
                    <stop offset=".55" stop-color="#e8f5ff" />
                    <stop offset="1" stop-color="#b8d6ea" stop-opacity=".92" />
                  </linearGradient>
                  <linearGradient id="terrWater" x1="196" y1="172" x2="214" y2="258" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#f2feff" />
                    <stop offset=".4" stop-color="#9fe7f4" />
                    <stop offset="1" stop-color="#46b4cb" />
                  </linearGradient>
                  <filter id="terrBlur" x="-70%" y="-70%" width="240%" height="240%">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                  <filter id="terrSoft" x="-70%" y="-70%" width="240%" height="240%">
                    <feGaussianBlur stdDeviation="1.6" />
                  </filter>
                  <g id="terrTree">
                    <rect x="-1" y="-10" width="2.2" height="10" fill="#4b3524" />
                    <path d="M0 -25 L8 -8 L-8 -8Z" fill="currentColor" />
                    <path d="M0 -17 L10 -1 L-10 -1Z" fill="currentColor" opacity=".85" />
                  </g>
                  <g id="terrDeer">
                    <path d="M-7 0 L-6 -14 L5 -14 L7 -2Z" fill="#b9855a" />
                    <circle cx="7" cy="-16" r="3.2" fill="#b9855a" />
                    <path d="M5 -18 L4 -25 M6.5 -18 L9.5 -25" stroke="#dccaa8" stroke-width=".9" stroke-linecap="round" />
                    <path d="M-6 -2 L-6 2 M-2 -2 L-2 2 M3 -2 L3 2 M6 -2 L6 2" stroke="#6b4a30" stroke-width="1.2" stroke-linecap="round" />
                  </g>
                </defs>

                <ellipse cx="196" cy="214" rx="152" ry="132" fill="url(#terrHalo)" />

                <!-- 云隙间的光 -->
                <g opacity=".55">
                  <path d="M176 46 L196 46 L224 238 L164 238Z" fill="#dff6ff" opacity=".03" />
                  <path d="M214 46 L226 46 L244 238 L206 238Z" fill="#dff6ff" opacity=".02" />
                </g>
                <ellipse cx="156" cy="126" rx="72" ry="58" fill="#ffd9a6" opacity=".045" filter="url(#terrBlur)" />

                <!-- 玻璃立方体 -->
                <polygon points="104,92 166,46 338,46 276,92" fill="url(#terrGlassTop)" />
                <polygon points="276,92 338,46 338,240 276,286" fill="url(#terrGlass)" />
                <polygon points="104,92 276,92 276,286 104,286" fill="url(#terrGlass)" />
                <ellipse cx="248" cy="66" rx="48" ry="10" fill="#ffffff" opacity=".05" />

                <!-- 浮岛 -->
                <path d="M114 236 C124 260 152 280 196 282 C240 280 270 258 278 236Z" fill="url(#terrRock)" />
                <path d="M114 236 C144 250 248 250 278 236 L278 244 C248 258 144 258 114 244Z" fill="#493826" opacity=".92" />
                <ellipse cx="196" cy="236" rx="82" ry="17" fill="url(#terrGrass)" />
                <ellipse cx="196" cy="236" rx="82" ry="17" fill="none" stroke="#2c5a35" stroke-opacity=".55" />
                <ellipse cx="180" cy="230" rx="48" ry="9" fill="#a4d383" opacity=".18" />

                <!-- 雪山 -->
                <path d="M196 110 L212 156 L224 172 L236 236 L156 236 L168 180 L182 158Z" fill="url(#terrMountain)" />
                <path d="M196 110 L188 160 L179 156 L168 180 L156 236 L196 236Z" fill="#374d60" opacity=".38" />
                <path d="M224 172 L236 236 L208 236 L218 188Z" fill="#3d5264" opacity=".34" />
                <path d="M196 110 L204 136 L213 148 L219 158 L208 154 L201 147 L196 142 L188 151 L179 147 L185 136Z" fill="url(#terrSnow)" />
                <path d="M190 150 L186 178 M199 146 L201 172 M206 152 L208 170" stroke="#ecf7ff" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round" />
                <path d="M196 110 L188 155 L179 151 L168 180 L160 222 L196 206Z" fill="#ffffff" opacity=".12" />
                <path d="M168 180 L156 236 L188 236Z" fill="#71879a" />
                <path d="M168 180 L173 193 L163 189Z" fill="#e7f4ff" opacity=".9" />
                <path d="M224 172 L236 236 L208 236Z" fill="#8196a8" />
                <path d="M224 172 L228 186 L218 182Z" fill="#e7f4ff" opacity=".8" />
                <path d="M186 206 L180 230 M206 196 L212 228 M196 178 L194 214 M216 192 L220 220" stroke="#33495b" stroke-opacity=".5" stroke-width="1" stroke-linecap="round" />
                <path d="M174 200 L170 224 M202 190 L204 214" stroke="#dcecf7" stroke-opacity=".28" stroke-width="1.2" stroke-linecap="round" />

                <!-- 瀑布与溪流 -->
                <path d="M194 168 C196 194 195 216 196 238 L206 238 C205 216 206 194 204 168Z" fill="url(#terrWater)" opacity=".98" />
                <path d="M199 172 C200 196 199 218 200 236" stroke="#ffffff" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round" />
                <ellipse cx="199" cy="239" rx="14" ry="4" fill="#dffaff" opacity=".6" filter="url(#terrSoft)" />
                <path d="M197 240 C208 247 190 253 205 258 C218 262 231 259 240 253" stroke="url(#terrWater)" stroke-width="9" stroke-linecap="round" fill="none" />
                <path d="M197 240 C208 247 190 253 205 258 C218 262 231 259 240 253" stroke="#e7fdff" stroke-opacity=".6" stroke-width="1.8" stroke-linecap="round" fill="none" />
                <ellipse cx="242" cy="253" rx="18" ry="6.5" fill="#4dc2d6" />
                <ellipse cx="242" cy="253" rx="18" ry="6.5" fill="none" stroke="#c8f3ff" stroke-opacity=".45" />
                <ellipse cx="237" cy="251" rx="7" ry="1.8" fill="#e8fdff" opacity=".55" />

                <!-- 树与草 -->
                <use href="#terrTree" transform="translate(126 232) scale(.74)" color="#2b6742" />
                <use href="#terrTree" transform="translate(140 238) scale(.9)" color="#356f47" />
                <use href="#terrTree" transform="translate(154 231) scale(.66)" color="#2f6a55" />
                <use href="#terrTree" transform="translate(162 240) scale(.8)" color="#3a7449" />
                <use href="#terrTree" transform="translate(232 237) scale(.86)" color="#2f6c4a" />
                <use href="#terrTree" transform="translate(248 232) scale(.98)" color="#356f50" />
                <use href="#terrTree" transform="translate(262 240) scale(.72)" color="#2c6448" />
                <use href="#terrTree" transform="translate(222 243) scale(.6)" color="#3a7851" />
                <use href="#terrTree" transform="translate(118 242) scale(.62)" color="#3b7854" />
                <use href="#terrTree" transform="translate(268 246) scale(.58)" color="#2f6a45" />
                <use href="#terrTree" transform="translate(210 244) scale(.54)" color="#3a7550" />
                <use href="#terrTree" transform="translate(146 245) scale(.56)" color="#2e6644" />
                <path d="M120 247 C138 253 166 254 186 252 M214 254 C234 256 252 252 268 246" stroke="#7ab466" stroke-opacity=".55" stroke-width="1" stroke-linecap="round" />
                <path d="M132 244 l2 -6 M136 246 l2 -5 M144 250 l2 -6 M252 246 l2 -6 M258 250 l2 -5" stroke="#6ca95d" stroke-width="1.2" stroke-linecap="round" />

                <!-- 小鹿 -->
                <use href="#terrDeer" transform="translate(172 249) scale(.76)" />
                <use href="#terrDeer" transform="translate(184 254) scale(.54) rotate(-8)" />

                <!-- 云与雾 -->
                <g filter="url(#terrBlur)" opacity=".7">
                  <ellipse cx="148" cy="124" rx="28" ry="12" fill="#fff3e2" opacity=".7" />
                  <ellipse cx="166" cy="118" rx="20" ry="10" fill="#ffffff" opacity=".6" />
                  <ellipse cx="132" cy="130" rx="16" ry="7" fill="#eef6ff" opacity=".5" />
                </g>
                <g filter="url(#terrBlur)" opacity=".62">
                  <ellipse cx="246" cy="104" rx="28" ry="11" fill="#fff4e4" opacity=".62" />
                  <ellipse cx="262" cy="110" rx="15" ry="7" fill="#ffffff" opacity=".45" />
                </g>
                <g filter="url(#terrBlur)" opacity=".4">
                  <ellipse cx="128" cy="150" rx="20" ry="7" fill="#eef7ff" opacity=".4" />
                </g>
                <ellipse cx="196" cy="246" rx="84" ry="11" fill="#dff3ff" opacity=".12" filter="url(#terrBlur)" />
                <ellipse cx="236" cy="258" rx="34" ry="7" fill="#d6f0ff" opacity=".14" filter="url(#terrBlur)" />

                <!-- 玻璃里的星尘 -->
                <g fill="#ffffff">
                  <circle cx="120" cy="72" r="1.1" opacity=".65" />
                  <circle cx="250" cy="62" r=".9" opacity=".5" />
                  <circle cx="300" cy="118" r="1.2" opacity=".6" />
                  <circle cx="146" cy="160" r=".7" opacity=".4" />
                  <circle cx="268" cy="184" r=".8" opacity=".45" />
                </g>

                <!-- 玻璃反光 -->
                <path d="M126 286 L158 92 L190 92 L158 286Z" fill="#eafaff" opacity=".035" />
                <path d="M212 92 L230 92 L198 286 L180 286Z" fill="#eafaff" opacity=".025" />
                <path d="M276 92 L338 46 L338 90 L276 138Z" fill="#ffffff" opacity=".045" />

                <!-- 立方体棱边 -->
                <g fill="none" stroke-linejoin="round">
                  <g stroke="#9fdcff" stroke-opacity=".16" stroke-width="4">
                    <path d="M104 92H276V286H104Z" />
                    <path d="M104 92 166 46H338L276 92" />
                    <path d="M338 46V240L276 286" />
                  </g>
                  <g stroke="#d6f1ff" stroke-opacity=".62" stroke-width="1">
                    <path d="M104 92H276V286H104Z" />
                    <path d="M104 92 166 46H338L276 92" />
                    <path d="M338 46V240L276 286" />
                  </g>
                </g>

                <!-- 转角微光 -->
                <g fill="#ffffff">
                  <circle cx="104" cy="92" r="1.7" opacity=".9" />
                  <circle cx="276" cy="92" r="1.5" opacity=".8" />
                  <circle cx="166" cy="46" r="1.8" opacity=".85" />
                  <circle cx="338" cy="46" r="1.4" opacity=".7" />
                  <circle cx="276" cy="286" r="1.3" opacity=".7" />
                  <circle cx="104" cy="286" r="1.2" opacity=".6" />
                  <circle cx="338" cy="240" r="1.2" opacity=".6" />
                </g>
                <g fill="#bfeaff" opacity=".18">
                  <circle cx="104" cy="92" r="5" />
                  <circle cx="338" cy="46" r="5" />
                  <circle cx="276" cy="286" r="4" />
                </g>
              </svg>
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

.terr__float {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: terr-float 9s ease-in-out infinite;
}

.terr__art {
  width: min(94%, 300px);
  height: auto;
  margin-bottom: 14px;
  filter:
    drop-shadow(0 18px 26px rgba(0, 0, 0, 0.48))
    drop-shadow(0 0 20px rgba(110, 205, 255, 0.13));
  transition: filter 0.4s ease;
}

.konbini:hover .terr__art {
  filter:
    drop-shadow(0 20px 28px rgba(0, 0, 0, 0.5))
    drop-shadow(0 0 28px rgba(130, 218, 255, 0.22));
}

@keyframes terr-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

@media (min-width: 1181px) {
  .terr__art {
    width: min(96%, 296px);
  }
}

@media (min-width: 901px) and (max-width: 1180px) {
  .terr__art {
    width: min(82%, 342px);
  }
}

@media (max-width: 720px) {
  .terr__art {
    width: min(82%, 248px);
    margin-bottom: 8px;
  }
}

</style>
