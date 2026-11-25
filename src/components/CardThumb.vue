<script setup lang="ts">
import { useTheme } from '../composables/useTheme'

interface ThumbSource {
  lg: string
  sm: string
}

defineProps<{
  /** 深夜主题使用的一版 */
  night: ThumbSource
  /** 日光主题使用的一版；不传则日夜共用同一版 */
  day?: ThumbSource
  alt: string
}>()

const { isLight } = useTheme()

</script>

<template>
  <div class="thumb">
    <picture class="thumb__layer" :class="{ 'is-on': !day || !isLight }" :aria-hidden="day && isLight ? true : undefined">
      <source media="(max-width: 720px)" :srcset="night.sm" type="image/webp" />
      <img class="thumb__img" :src="night.lg" :alt="alt" width="1280" height="720" loading="lazy" decoding="async" />
    </picture>

    <picture v-if="day" class="thumb__layer" :class="{ 'is-on': isLight }" :aria-hidden="!isLight">
      <source media="(max-width: 720px)" :srcset="day.sm" type="image/webp" />
      <img class="thumb__img" :src="day.lg" :alt="alt" width="1280" height="720" loading="lazy" decoding="async" />
    </picture>
  </div>
</template>

<style scoped>
.thumb {
  position: absolute;
  inset: 0;
  overflow: hidden;
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
