<script setup lang="ts">
import NavBar from './components/NavBar.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <!-- bare 路由（3D 场景）不渲染任何界面元素 -->
  <NavBar v-if="!route.meta.bare" />
  <router-view />
</template>
