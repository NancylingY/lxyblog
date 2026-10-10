import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径，适配 GitHub Pages 根路径或子路径部署
  base: './',
  plugins: [vue()],
})
