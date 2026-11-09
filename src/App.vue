<script setup lang="ts">
import NavBar from './components/NavBar.vue'
import { useRoute } from 'vue-router'
import { useResume } from './data/resume'

const route = useRoute()
const { t } = useResume()
</script>

<template>
  <!-- bare 路由（3D 场景）不渲染任何界面元素 -->
  <a v-if="!route.meta.bare" class="skip-link" href="#content">{{ t.skipToContent }}</a>
  <NavBar v-if="!route.meta.bare" />
  <main id="content" tabindex="-1">
    <router-view />
  </main>
</template>
