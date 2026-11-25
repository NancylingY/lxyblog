<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { createPelicanScene } from './pelicanRideDrawing'

const props = withDefaults(defineProps<{ playing?: boolean }>(), { playing: true })
const canvas = ref<HTMLCanvasElement>()
let scene: ReturnType<typeof createPelicanScene> | undefined

onMounted(() => {
  if (canvas.value) {
    scene = createPelicanScene(canvas.value)
    scene.setPlaying(props.playing)
  }
})
watch(() => props.playing, value => scene?.setPlaying(value))
onBeforeUnmount(() => scene?.dispose())
</script>

<template>
  <canvas ref="canvas" class="pelican-ride-scene" />
</template>

<style scoped>
.pelican-ride-scene {
  display: block;
  width: 100%;
  height: 100%;
  background: #ecdfb5;
}
</style>
