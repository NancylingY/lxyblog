import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import OtherView from '../views/OtherView.vue'

const router = createRouter({
  // hash 模式：GitHub Pages 静态托管下刷新/直达子路径不会 404
  history: createWebHashHistory(),
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'auto', top: 72 }
    }
    // 显式 auto，避免继承 html 的 smooth 滚动导致换页停在半路
    return { top: 0, left: 0, behavior: 'auto' }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/other',
      name: 'other',
      component: OtherView,
    },
    {
      // 实时 Token 看板（iframe 嵌入，独立页避免拖慢首页）
      path: '/stats',
      name: 'stats',
      component: () => import('../views/StatsView.vue'),
    },
    {
      // 3D 微缩场景：全屏、无 UI，懒加载 three.js
      path: '/konbini',
      name: 'konbini',
      component: () => import('../views/KonbiniView.vue'),
      meta: { bare: true },
    },
    {
      // 3D 微缩场景：白天现代综合医院
      path: '/hospital',
      name: 'hospital',
      component: () => import('../views/HospitalView.vue'),
      meta: { bare: true },
    },
    {
      // 3D 微缩场景：玻璃立方体中的微光生态
      path: '/terrarium',
      name: 'terrarium',
      component: () => import('../views/TerrariumView.vue'),
      meta: { bare: true },
    },
    {
      // 小屋全屏 3D 详情页（高模，昼夜跟随全局主题）
      path: '/house',
      name: 'house',
      component: () => import('../views/HouseView.vue'),
      meta: { bare: true },
    },
    {
      // 灯塔全屏 3D 场景（夜景，右上角开关光束）
      path: '/lighthouse',
      name: 'lighthouse',
      component: () => import('../views/LighthouseView.vue'),
      meta: { bare: true },
    },
    {
      // 项目已合并进首页，旧路径重定向到首页项目锚点
      path: '/projects',
      redirect: '/#projects',
    },
    {
      // 未知路由：终端风格 404 彩蛋（懒加载，不影响首页体积）
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

// 全屏 3D 页会在 body 上锁滚动；万一销毁时序异常，回到普通页面时兜底解锁，
// 避免出现「页面停在半路、拉不上去」。
router.afterEach((to) => {
  if (!to.meta.bare) document.body.style.overflow = ''
})

export default router
