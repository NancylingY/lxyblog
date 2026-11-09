import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// 关掉浏览器的滚动还原：hash 路由下 iOS/微信会把上一页的偏移强加给新页面，
// 表现为「回到首页停在半路、拉不回顶部」，滚动位置统一交给 router.scrollBehavior。
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

createApp(App).use(router).mount('#app')
