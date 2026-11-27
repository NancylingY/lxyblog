<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useResume } from '../data/resume'
import CardThumb from '../components/CardThumb.vue'
import { useI18n } from '../i18n'
import PelicanRideCard from '../components/PelicanRideCard.vue'
import { usePangolinCopy } from '../data/pangolin'
import { brickGardenCopy as brick } from '../data/brickGarden'
import { useChongqingCopy } from '../data/chongqing'

const pangolin = usePangolinCopy()
const chongqing = useChongqingCopy()

const { t } = useResume()
const router = useRouter()

const { isZh } = useI18n()
const mounted = ref(false)

function cover(name: string) {
  const base = `${import.meta.env.BASE_URL}thumbs/cover-${name}`
  return { lg: `${base}.webp`, sm: `${base}-sm.webp` }
}

/** 进入全屏 3D 微缩场景 */
function enter() {
  router.push('/konbini')
}

function enterHospital() {
  router.push('/hospital')
}

function enterTerrarium() {
  router.push('/terrarium')
}

/* 积木花园卡片：整卡进入 3D 详情页 */
function enterBrickGarden() {
  router.push('/brick-garden')
}

/* 小屋卡片：整卡进入详情页 */
function enterHouse() {
  router.push('/house')
}

/* 灯塔卡片：整卡进入全屏场景 */
function enterLighthouse() {
  router.push('/lighthouse')
}

/* 重庆雨城：整卡进入 1:150 三层立体剖面沙盘 */
function enterChongqing() {
  router.push('/chongqing')
}

onMounted(() => {
  requestAnimationFrame(() => (mounted.value = true))
})
</script>

<template>
  <section class="section other">
    <div class="container">
      <div class="section-head reveal" :class="{ 'is-visible': mounted }">
        <span class="section-label">~/other</span>
        <h2 class="section-title">{{ t.otherTitle }}</h2>
        <p class="section-sub">{{ t.otherSub }}</p>
      </div>

      <div class="other__grid">
      <!-- 重庆雨城 · 1:150 三层立体剖面 3D 沙盘卡片 -->
      <article
        class="card konbini konbini--chongqing reveal"
        :class="{ 'is-visible': mounted }"
        role="link"
        tabindex="0"
        :aria-label="chongqing.enter"
        @click="enterChongqing"
        @keydown.enter="enterChongqing"
        @keydown.space.prevent="enterChongqing"
      >
        <div class="konbini__stage">
          <CardThumb :night="cover('chongqing')" :alt="chongqing.alt" />
          <span class="konbini__badge">
            <i class="konbini__badge-dot" />
            {{ chongqing.status }}
          </span>
          <span class="konbini__enter">
            {{ chongqing.enter }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <div class="konbini__info">
          <div class="konbini__head">
            <h3 class="konbini__title">
              {{ chongqing.title }}
              <span class="konbini__title-en">{{ chongqing.titleEn }}</span>
            </h3>
            <span class="konbini__eta">3D</span>
          </div>
          <p class="konbini__desc">{{ chongqing.description }}</p>
          <div class="konbini__tags">
            <span v-for="tag in chongqing.tags" :key="tag" class="konbini__tag">{{ tag }}</span>
          </div>
        </div>
      </article>
      <PelicanRideCard />
      <article class="card konbini konbini--pangolin reveal" :class="{ 'is-visible': mounted }" role="link" tabindex="0" :aria-label="pangolin.enter" @click="router.push('/pangolin')" @keydown.enter="router.push('/pangolin')" @keydown.space.prevent="router.push('/pangolin')">
        <div class="konbini__stage">
          <CardThumb :night="cover('pangolin')"
            :alt="isZh ? '一只穿山甲在林间小径上骑着独轮车。' : 'A pangolin balances on a unicycle on a woodland path.'"
          />
          <span class="konbini__badge pangolin-preview__badge">● &nbsp; {{ pangolin.subtitle }}</span>
          <span class="konbini__enter pangolin-preview__enter">{{ pangolin.enter }} ↗</span>
        </div>
        <div class="konbini__info">
          <div class="konbini__head"><h3 class="konbini__title">{{ pangolin.title }}<span class="konbini__title-en">The balancing act</span></h3><span class="konbini__eta">3D</span></div>
          <p class="konbini__desc">{{ pangolin.description }}</p>
          <div class="konbini__tags"><span v-for="tag in pangolin.tags" :key="tag" class="konbini__tag">{{ tag }}</span></div>
        </div>
      </article>
      <!-- 日式便利店 · 3D 卡片 -->
      <article
        class="card konbini reveal"
        :class="{ 'is-visible': mounted }"
        role="link"
        tabindex="0"
        :aria-label="t.konbiniEnter"
        @click="enter"
        @keydown.enter="enter"
        @keydown.space.prevent="enter"
      >
        <div class="konbini__stage">
          <CardThumb :night="cover('konbini')"
            :alt="isZh ? '雨夜街角的日式便利店，橱窗灯光映在湿漉漉的路面上。' : 'A Japanese corner store casts warm reflections across the rain-soaked street.'"
          />
          <span class="konbini__badge">
            <i class="konbini__badge-dot" />
            {{ t.konbiniStatus }}
          </span>
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
        class="card konbini konbini--hos reveal"
        :class="{ 'is-visible': mounted }"
        role="link"
        tabindex="0"
        :aria-label="t.hospitalEnter"
        @click="enterHospital"
        @keydown.enter="enterHospital"
        @keydown.space.prevent="enterHospital"
      >
        <div class="konbini__stage">
          <CardThumb :night="cover('hospital')"
            :alt="isZh ? '日光下的综合医院，蓝玻璃幕墙前是一片花园。' : 'A sunlit garden fronts the blue glass facade of a modern hospital.'"
          />
          <span class="konbini__badge konbini__badge--day">
            <i class="konbini__badge-dot konbini__badge-dot--day" />
            {{ t.hospitalStatus }}
          </span>
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
        class="card konbini konbini--terr reveal"
        :class="{ 'is-visible': mounted }"
        role="link"
        tabindex="0"
        :aria-label="t.terrariumEnter"
        @click="enterTerrarium"
        @keydown.enter="enterTerrarium"
        @keydown.space.prevent="enterTerrarium"
      >
        <div class="konbini__stage">
          <CardThumb :night="cover('terrarium')"
            :alt="isZh ? '悬浮在星空中的玻璃立方体，里面有雪峰、瀑布和鹿。' : 'Snowy peaks, a waterfall and deer fill a glass cube suspended in space.'"
          />
          <span class="konbini__badge konbini__badge--terr">
            <i class="konbini__badge-dot konbini__badge-dot--terr" />
            {{ t.terrariumStatus }}
          </span>
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

      <!-- 积木花园 · 3D 积木场景卡片 -->
      <article
        class="card konbini konbini--brick reveal"
        :class="{ 'is-visible': mounted }"
        role="link"
        tabindex="0"
        data-testid="brick-garden-card"
        :aria-label="brick.enter"
        @click="enterBrickGarden"
        @keydown.enter="enterBrickGarden"
        @keydown.space.prevent="enterBrickGarden"
      >
        <div class="konbini__stage">
          <CardThumb :night="cover('brick-garden')"
            :alt="isZh ? '奶油色积木底板上，石径穿过花园通向珊瑚色屋顶的小屋。' : 'A tiled path leads through a brick garden to a coral-roofed cottage.'"
          />
          <span class="konbini__badge konbini__badge--brick">
            <i class="konbini__badge-dot konbini__badge-dot--brick" />
            {{ brick.status }}
          </span>
          <span class="konbini__enter konbini__enter--brick">
            {{ brick.enter }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <div class="konbini__info">
          <div class="konbini__head">
            <h3 class="konbini__title">
              {{ brick.title }}
              <span class="konbini__title-en">{{ brick.titleEn }}</span>
            </h3>
            <span class="konbini__eta">3D</span>
          </div>

          <p class="konbini__desc">{{ brick.description }}</p>

          <div class="konbini__tags">
            <span v-for="tag in brick.tags" :key="tag" class="konbini__tag">{{ tag }}</span>
          </div>
        </div>
      </article>

      <!-- 小屋 · 首屏同款 3D 实例（共用加载/光照/生命周期） -->
      <article
        class="card konbini konbini--house reveal"
        :class="{ 'is-visible': mounted }"
        role="link"
        tabindex="0"
        :aria-label="t.houseEnter"
        @click="enterHouse"
        @keydown.enter="enterHouse"
        @keydown.space.prevent="enterHouse"
      >
        <div class="konbini__stage">
          <CardThumb :night="cover('house-night')" :day="cover('house-day')"
            :alt="isZh ? '带门廊的小屋，屋顶和窗框在光影中清晰可见。' : 'A cottage with a sheltered porch, a pitched roof and framed windows.'"
          />
          <span class="konbini__badge konbini__badge--house">
            <i class="konbini__badge-dot konbini__badge-dot--house" />
            {{ t.houseStatus }}
          </span>
          <span class="konbini__enter konbini__enter--house">
            {{ t.houseEnter }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <div class="konbini__info">
          <div class="konbini__head">
            <h3 class="konbini__title">
              {{ t.houseTitle }}
              <span class="konbini__title-en">{{ t.houseTitleEn }}</span>
            </h3>
            <span class="konbini__eta">3D</span>
          </div>

          <p class="konbini__desc">{{ t.houseDesc }}</p>

          <div class="konbini__tags">
            <span v-for="tag in t.houseTags" :key="tag" class="konbini__tag">{{ tag }}</span>
          </div>
        </div>
      </article>

      <!-- 海边灯塔夜景 · 实时 3D 卡片 -->
      <article
        class="card konbini konbini--sea reveal"
        :class="{ 'is-visible': mounted }"
        role="link"
        tabindex="0"
        :aria-label="t.lighthouseEnter"
        @click="enterLighthouse"
        @keydown.enter="enterLighthouse"
        @keydown.space.prevent="enterLighthouse"
      >
        <div class="konbini__stage">
          <CardThumb :night="cover('lighthouse')"
            :alt="isZh ? '深夜海岸的灯塔，光束穿过海雾，照向浪尖。' : 'A lighthouse beam cuts through the sea mist above the breaking waves.'"
          />
          <span class="konbini__badge konbini__badge--sea">
            <i class="konbini__badge-dot konbini__badge-dot--sea" />
            {{ t.lighthouseStatus }}
          </span>
          <span class="konbini__enter konbini__enter--sea">
            {{ t.lighthouseEnter }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <div class="konbini__info">
          <div class="konbini__head">
            <h3 class="konbini__title">
              {{ t.lighthouseTitle }}
              <span class="konbini__title-en">{{ t.lighthouseTitleEn }}</span>
            </h3>
            <span class="konbini__eta">3D</span>
          </div>

          <p class="konbini__desc">{{ t.lighthouseDesc }}</p>

          <div class="konbini__tags">
            <span v-for="tag in t.lighthouseTags" :key="tag" class="konbini__tag">{{ tag }}</span>
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
.other__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.konbini {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}
.konbini:hover { transform: translateY(-4px); }
.konbini:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.konbini__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--bg-2);
}
.konbini__stage :deep(.thumb__img) {
  transition: transform 0.55s var(--ease-out);
}
.konbini:hover .konbini__stage :deep(.thumb__img) {
  transform: scale(1.05);
}
.konbini__badge, .konbini__enter {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 999px;
  background: rgb(18 25 27 / 82%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fffaf0;
  font: 500 11px/1.45 var(--font-mono);
  transition: background-color 0.25s ease, border-color 0.25s ease, transform 0.25s var(--ease-out);
}
.konbini__badge { top: 12px; left: 12px; }
.konbini__badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #efd08d; }
.konbini__enter { right: 12px; bottom: 12px; }
.konbini:hover .konbini__enter {
  background: var(--accent);
  border-color: transparent;
  color: var(--on-accent);
  transform: translateY(-1px);
}
.konbini__enter svg { flex: none; transition: transform 0.25s var(--ease-out); }
.konbini:hover .konbini__enter svg { transform: translateX(3px); }
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
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--ink-faint);
}

.konbini__eta {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--amber);
  background: var(--amber-soft);
  border: 1px solid var(--amber-border);
  border-radius: 999px;
  padding: 2px 9px;
}

.konbini__desc {
  font-size: var(--fs-md);
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
  font-size: var(--fs-xs);
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


@media (min-width: 901px) {
  .konbini:is(.konbini--chongqing, .konbini--pangolin, .konbini--brick, .konbini--house, .konbini--sea) {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    align-items: center;
  }
}
@media (min-width: 1181px) {
  .konbini__info { padding: 24px; }
  .konbini__title { font-size: 19px; }
}
@media (min-width: 901px) and (max-width: 1180px) {
  .other__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .konbini--terr {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    align-items: center;
  }
}
@media (max-width: 900px) {
  .other__grid { grid-template-columns: 1fr; max-width: 620px; margin-inline: auto; }
  .konbini__info { padding: 24px 22px 26px; }
}
</style>
