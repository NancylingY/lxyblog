/**
 * 「其他」页卡片的静态 2D 缩略图
 * - 图片来自原 3D 场景的真实截图，按卡片显示尺寸的 2 倍出图（webp）
 * - 日/夜两版同时挂载、用透明度切换，主题切换时不出现空白或闪白
 * - 图片解码前先铺一层低分辨率 LQIP，避免卡片出现空洞
 */
<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

interface ThumbSource {
  lg: string
  sm: string
}

const props = defineProps<{
  /** 深夜主题使用的一版 */
  night: ThumbSource
  /** 日光主题使用的一版；不传则日夜共用同一版 */
  day?: ThumbSource
  nightLqip: string
  dayLqip?: string
}>()

const { isLight } = useTheme()

const activeLqip = computed(() => (isLight.value && props.dayLqip ? props.dayLqip : props.nightLqip))
</script>

<template>
  <div class="thumb">
    <div class="thumb__lqip" :style="{ backgroundImage: `url(${activeLqip})` }" />

    <picture class="thumb__layer" :class="{ 'is-on': !day || !isLight }">
      <source media="(max-width: 720px)" :srcset="night.sm" type="image/webp" />
      <img class="thumb__img" :src="night.lg" alt="" decoding="async" />
    </picture>

    <picture v-if="day" class="thumb__layer" :class="{ 'is-on': isLight }">
      <source media="(max-width: 720px)" :srcset="day.sm" type="image/webp" />
      <img class="thumb__img" :src="day.lg" alt="" decoding="async" />
    </picture>
  </div>
</template>

<style scoped>
.thumb {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* LQIP：24px 宽的模糊底图，图片解码完成前先顶上 */
.thumb__lqip {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(14px);
  transform: scale(1.08);
  opacity: 0.9;
}

.thumb__layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.28s ease;
}

.thumb__layer.is-on {
  opacity: 1;
}

.thumb__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (prefers-reduced-motion: reduce) {
  .thumb__layer {
    transition: none;
  }
}
</style>
