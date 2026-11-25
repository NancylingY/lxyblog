<script setup lang="ts">
import { pelicanPoster, usePelicanRideCopy } from '../data/pelicanRide'

const copy = usePelicanRideCopy()
</script>

<template>
  <RouterLink id="pelican-card" class="card pelican-card" to="/pelican-express">
    <img class="pelican-card__poster" :src="pelicanPoster" :alt="copy.alt" width="1672" height="941" />
    <div class="pelican-card__body">
      <span class="pelican-card__format">{{ copy.format }}</span>
      <h3>{{ copy.title }}</h3>
      <p>{{ copy.summary }}</p>
      <span class="pelican-card__enter"><i aria-hidden="true">▶</i>{{ copy.enter }}</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.pelican-card {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1.85fr 1fr;
  overflow: hidden;
  color: var(--ink);
  text-decoration: none;
  scroll-margin-top: calc(var(--nav-h) + 16px);
}
.pelican-card__poster {
  display: block;
  align-self: center;
  width: 100%;
  height: auto;
}
.pelican-card__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(22px, 3.3vw, 44px);
}
.pelican-card__format { color: var(--amber); font: 600 12px var(--font-mono); }
.pelican-card h3 {
  margin: 12px 0 10px;
  font: 700 clamp(25px, 2.5vw, 36px)/1.25 var(--font-serif);
}
.pelican-card p { margin: 0; font-size: 15px; line-height: 1.85; color: var(--ink-dim); }
.pelican-card__enter {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  font-size: 14px;
  font-weight: 600;
}
.pelican-card__enter i {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: var(--amber-soft);
  color: var(--amber);
  font: normal 11px/1 var(--font-sans);
}
.pelican-card:hover .pelican-card__enter { color: var(--amber); }
.pelican-card:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
@media (max-width: 900px) {
  .pelican-card { grid-template-columns: 1fr; }
  .pelican-card__body { padding: 22px 24px 26px; }
}
</style>
