<script setup lang="ts">
import { computed } from 'vue'
import { useResume } from '../data/resume'
import { useShowcaseCopy } from '../data/showcase'
import { scrollToHash } from '../utils/scroll'

const { skills } = useResume()
const copy = useShowcaseCopy()

const flatItems = computed(() =>
  skills.value.flatMap((group) =>
    group.items.map((name) => ({
      name,
      kind: group.icon,
    })),
  ),
)

function goSkills() {
  scrollToHash('#skills')
}
</script>

<template>
  <aside class="marquee" :aria-label="copy.marqueeLabel">
    <div class="marquee__viewport">
      <div class="marquee__track">
        <div v-for="dup in 2" :key="dup" class="marquee__group" :aria-hidden="dup === 2 || undefined">
          <button
            v-for="item in flatItems"
            :key="`${dup}-${item.name}`"
            type="button"
            class="marquee__pill"
            :class="`marquee__pill--${item.kind}`"
            :tabindex="dup === 2 ? -1 : 0"
            @click="goSkills"
          >
            <span class="marquee__dot" aria-hidden="true" />
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.marquee {
  position: relative;
  z-index: var(--z-raised);
  padding-block: 18px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg-1) 72%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.marquee__viewport {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
}

.marquee__track {
  display: flex;
  width: max-content;
  animation: marquee-scroll 46s linear infinite;
}

.marquee:hover .marquee__track,
.marquee:focus-within .marquee__track {
  animation-play-state: paused;
}

.marquee__group {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 10px;
}

.marquee__pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--bg-3);
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  white-space: nowrap;
  transition:
    border-color 0.22s ease,
    color 0.22s ease,
    background-color 0.22s ease,
    transform 0.22s var(--ease-out);
}

.marquee__pill:hover {
  border-color: var(--accent-border);
  background: var(--accent-soft);
  color: var(--accent);
  transform: translateY(-2px);
}

.marquee__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.marquee__pill--code .marquee__dot {
  background: var(--cyan);
}

.marquee__pill--database .marquee__dot {
  background: var(--amber);
}

@keyframes marquee-scroll {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-50%, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee__viewport {
    mask-image: none;
    -webkit-mask-image: none;
  }

  .marquee__track {
    animation: none;
    width: auto;
    justify-content: center;
  }

  .marquee__group {
    flex-wrap: wrap;
    justify-content: center;
    padding: 0 20px;
  }

  .marquee__group:nth-child(2) {
    display: none;
  }
}
</style>
