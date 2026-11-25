<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import PelicanRideScene from '../components/PelicanRideScene.vue'
import { pelicanPoster, usePelicanRideCopy } from '../data/pelicanRide'

const copy = usePelicanRideCopy()
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const playing = ref(!motionPreference.matches)
const showCover = ref(false)

function followMotionPreference(e: MediaQueryListEvent) {
  playing.value = !e.matches
}

motionPreference.addEventListener('change', followMotionPreference)
onUnmounted(() => motionPreference.removeEventListener('change', followMotionPreference))
</script>

<template>
  <article class="ride container">
    <RouterLink class="ride__back" :to="{ name: 'other', hash: '#pelican-card' }">
      <span aria-hidden="true">←</span> {{ copy.back }}
    </RouterLink>
    <h1>{{ copy.title }}</h1>
    <div class="ride__player">
      <div class="ride__screen">
        <img v-if="showCover" :src="pelicanPoster" :alt="copy.alt" />
        <PelicanRideScene v-show="!showCover" :playing="playing && !showCover" role="img" :aria-label="copy.alt" />
      </div>
      <div class="ride__controls">
        <button v-if="!showCover" type="button" @click="playing = !playing">
          <span aria-hidden="true">{{ playing ? 'Ⅱ' : '▶' }}</span>
          {{ playing ? copy.pause : copy.play }}
        </button>
        <button type="button" @click="showCover = !showCover">
          {{ showCover ? copy.animate : copy.still }}
        </button>
      </div>
    </div>
    <div class="ride__notes">
      <section v-for="note in copy.notes" :key="note.title">
        <h2>{{ note.title }}</h2>
        <p>{{ note.text }}</p>
      </section>
    </div>
  </article>
</template>

<style scoped>
.ride { padding-top: calc(var(--nav-h) + 36px); padding-bottom: 80px; }
.ride__back { color: var(--ink-dim); text-decoration: none; font-size: 14px; }
.ride__back:hover { color: var(--accent); }
.ride h1 { margin: 12px 0 22px; font: 700 clamp(30px, 4vw, 50px)/1.2 var(--font-serif); }
.ride__player {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-1);
  box-shadow: var(--shadow-card);
}
.ride__screen { position: relative; aspect-ratio: 16 / 9; background: #e3c88e; overflow: hidden; }
.ride__screen > img { display: block; width: 100%; height: 100%; object-fit: contain; }
.ride__controls { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 8px 14px; }
.ride__controls button {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 42px; padding: 6px 14px;
  border: 1px solid var(--line); border-radius: var(--btn-radius);
  background: var(--bg-3); color: var(--ink); font: inherit; font-size: 14px; cursor: pointer;
}
.ride__controls button:hover { border-color: var(--amber); color: var(--amber); }
.ride__controls button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ride__notes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; margin-top: 32px; }
.ride__notes section { border-top: 1px solid var(--line-bright); padding-top: 16px; }
.ride__notes h2 { margin: 0 0 8px; font: 650 20px/1.4 var(--font-serif); }
.ride__notes p { margin: 0; color: var(--ink-dim); font-size: 15px; line-height: 1.85; }
@media (max-width: 720px) {
  .ride { padding-top: calc(var(--nav-h) + 24px); }
  .ride__notes { grid-template-columns: 1fr; gap: 20px; margin-top: 22px; }
}
</style>
