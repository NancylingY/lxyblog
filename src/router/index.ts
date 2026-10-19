import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import OtherView from '../views/OtherView.vue'

const router = createRouter({
  // hash 模式：GitHub Pages 静态托管下刷新/直达子路径不会 404
  history: createWebHashHistory(),
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth', top: 72 }
    }
    return { top: 0 }
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
      // 项目已合并进首页，旧路径重定向到首页项目锚点
      path: '/projects',
      redirect: '/#projects',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router
