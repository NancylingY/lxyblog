<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePangolinCopy } from '../data/pangolin'
import type { PangolinScene } from '../three/pangolinScene'

const copy = usePangolinCopy()
const router = useRouter()
const host = ref<HTMLElement>()
const ready = ref(false)
const failed = ref(false)
const speed = ref(1)
const paused = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const cameraIndex = ref(0)
let handle: PangolinScene | undefined
let alive = true
function fail() { failed.value = true; ready.value = false }
async function start() {
  failed.value = false
  ready.value = false
  handle?.dispose()
  handle = undefined
  try {
    const { createPangolinScene } = await import('../three/pangolinScene')
    if (!alive || !host.value) return
    handle = createPangolinScene(host.value, fail)
    handle.setPaused(paused.value)
    handle.setSpeed(speed.value)
    handle.setCamera(cameraIndex.value)
    ready.value = true
  } catch (error) {
    if (alive) fail()
    console.error('[pangolin]', error)
  }
}
function togglePause() { paused.value = !paused.value; handle?.setPaused(paused.value) }
function changeSpeed(event: Event) {
  speed.value = Number((event.target as HTMLInputElement).value)
  handle?.setSpeed(speed.value)
}
function selectCamera(index: number) { cameraIndex.value = index; handle?.setCamera(index) }
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') void router.push('/other')
  if (event.code === 'Space' && event.target === document.body) { event.preventDefault(); togglePause() }
}
onMounted(() => { document.body.style.overflow = 'hidden'; window.addEventListener('keydown', onKey); void start() })
onBeforeUnmount(() => { alive = false; handle?.dispose(); window.removeEventListener('keydown', onKey); document.body.style.overflow = '' })
</script>

<template>
  <main class="balancing">
    <div ref="host" class="balancing__canvas" />
    <header class="balancing__top">
      <RouterLink class="balancing__back" to="/other">← <span>{{ copy.back }}</span></RouterLink>
      <span class="balancing__edition">FIELD NOTES <i /> 006</span>
    </header>
    <div class="balancing__intro">
      <p class="balancing__eyebrow">{{ copy.subtitle }}</p>
      <h1>{{ copy.title }}<span>。</span></h1>
      <p class="balancing__note">{{ copy.note }}</p>
    </div>
    <div v-if="!ready" class="balancing__status" role="status">
      <span v-if="!failed" class="balancing__spinner" />
      <p>{{ failed ? copy.failed : copy.loading }}</p>
      <button v-if="failed" @click="start">{{ copy.retry }}</button>
    </div>
    <div class="balancing__bottom">
      <div class="balancing__caption"><span class="balancing__live" />{{ copy.motion }}</div>
      <section class="balancing__controls" :aria-label="copy.title">
        <button class="balancing__pause" :aria-label="paused ? copy.play : copy.pause" :title="paused ? copy.play : copy.pause" :aria-pressed="paused" @click="togglePause">{{ paused ? '▶' : 'Ⅱ' }}</button>
        <div class="balancing__speed">
          <label for="riding-speed">{{ copy.speed }} <output for="riding-speed">{{ speed.toFixed(1) }}×</output></label>
          <input id="riding-speed" :value="speed" type="range" min="0" max="2.5" step="0.1" @input="changeSpeed">
        </div>
        <div class="balancing__cameras">
          <button v-for="(label, index) in copy.cameras" :key="index" :class="{ active: cameraIndex === index }" :aria-pressed="cameraIndex === index" @click="selectCamera(index)">{{ label }}</button>
        </div>
        <button class="balancing__reset" :aria-label="copy.reset" :title="copy.reset" @click="selectCamera(0)">↺</button>
      </section>
      <p class="balancing__hint">{{ copy.hint }}</p>
    </div>
  </main>
</template>

<style scoped>
.balancing{position:fixed;inset:0;overflow:hidden;background:#e7e9db;color:#344a3d;font-family:var(--font-sans, sans-serif)}
.balancing__canvas{position:absolute;inset:0;touch-action:none}
.balancing__canvas :deep(canvas){display:block;width:100%;height:100%}
.balancing__top{position:absolute;z-index:3;top:max(26px,env(safe-area-inset-top));left:4%;right:4%;display:flex;align-items:center;justify-content:space-between;pointer-events:none}
.balancing__back{pointer-events:auto;display:flex;gap:10px;align-items:center;color:#344a3d;text-decoration:none;font-size:13px;padding:10px 16px;border:1px solid #526b4830;border-radius:24px;background:#f9f9ed99;backdrop-filter:blur(12px)}
.balancing__edition{font-size:10px;letter-spacing:3px;display:flex;gap:14px;align-items:center}.balancing__edition i{width:32px;height:1px;background:#81907a}
.balancing__intro{position:absolute;top:17%;left:7%;pointer-events:none;max-width:34%}
.balancing__eyebrow{font-size:10px;letter-spacing:3px;color:#63735c;margin:0 0 18px}
.balancing__intro h1{font-size:clamp(28px,4.1vw,64px);font-weight:500;letter-spacing:-2px;line-height:1.2;margin:0;font-family:Georgia,'Noto Serif SC',serif}.balancing__intro h1 span{color:#a68a4d}
.balancing__note{font-size:12px;color:#73816a;margin-top:18px;line-height:1.8;max-width:220px}
.balancing__bottom{position:absolute;bottom:max(22px,env(safe-area-inset-bottom));left:20px;right:20px;display:flex;flex-direction:column;align-items:center;pointer-events:none}
.balancing__caption{font-size:9px;letter-spacing:2px;color:#607359;display:flex;align-items:center;gap:8px;margin-bottom:18px}.balancing__live{width:5px;height:5px;background:#618e64;border-radius:50%}
.balancing__controls{pointer-events:auto;display:flex;align-items:center;gap:20px;background:#fcfcf0db;border:1px solid #ffffffc9;box-shadow:0 12px 40px #3e51371a;backdrop-filter:blur(18px);padding:15px 20px;border-radius:20px}
.balancing button{font:inherit;color:inherit;cursor:pointer;border:0}.balancing button:focus-visible,.balancing a:focus-visible,.balancing input:focus-visible{outline:3px solid #7b9c69;outline-offset:4px}
.balancing__pause{background:#3e5c48;color:#fff!important;border-radius:50%;height:38px;width:38px;font-size:16px!important;flex-shrink:0}
.balancing__speed{width:154px}.balancing__speed label{display:flex;justify-content:space-between;font-size:10px;letter-spacing:0.5px;margin-bottom:8px}.balancing__speed output{font-variant-numeric:tabular-nums;color:#7c885b}.balancing__speed input{display:block;width:100%;accent-color:#577d5c;height:4px;cursor:pointer}
.balancing__cameras{display:flex;gap:4px;border-left:1px solid #536b4426;padding-left:18px}.balancing__cameras button{border-radius:8px;background:transparent;padding:10px 12px;font-size:11px;white-space:nowrap}.balancing__cameras button.active{background:#e1e8d6;color:#456143}.balancing__reset{font-size:23px!important;background:transparent}
.balancing__hint{font-size:10px;letter-spacing:1px;color:#6d7d66;margin:15px 0 0}
.balancing__status{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:15px;background:#e7e9dbed;z-index:2;text-align:center;padding:30px}.balancing__status p{font-size:14px;max-width:380px}.balancing__status button{background:#d1ddc7;border-radius:20px;padding:10px 22px}.balancing__spinner{width:25px;height:25px;border:2px solid #a6b69b;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:700px){.balancing__intro{top:13%;left:7%;max-width:85%}.balancing__intro h1{font-size:34px}.balancing__eyebrow{font-size:8px;letter-spacing:2px;margin-bottom:10px}.balancing__note{margin-top:10px;font-size:11px;max-width:100%}.balancing__edition{font-size:8px;letter-spacing:1.5px}.balancing__edition i{width:16px}.balancing__controls{gap:12px;flex-wrap:wrap;max-width:340px;justify-content:center;padding:13px 16px;border-radius:18px}.balancing__speed{width:190px}.balancing__cameras{border:0;padding:0}.balancing__cameras button{padding:8px 11px}.balancing__reset{width:32px}.balancing__caption{font-size:8px;margin-bottom:10px}.balancing__hint{font-size:9px;margin-top:10px}.balancing__bottom{bottom:max(16px,env(safe-area-inset-bottom))}}
@media(prefers-reduced-motion:reduce){.balancing__spinner{animation:none}}
</style>
