/**
 * 轻量 i18n —— 中英文切换
 * 用 Vue 响应式 composable 实现，不引入额外依赖
 */
import { ref, computed } from 'vue'

export type Locale = 'zh' | 'en'

const STORAGE_KEY = 'blog-locale'

function detectLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'zh' || saved === 'en') return saved
  // 跟随浏览器语言，非中文一律英文
  const nav = (navigator.language || '').toLowerCase()
  return nav.startsWith('zh') ? 'zh' : 'en'
}

const locale = ref<Locale>(detectLocale())

export function useI18n() {
  const isZh = computed(() => locale.value === 'zh')
  const isEn = computed(() => locale.value === 'en')

  function setLocale(next: Locale) {
    locale.value = next
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
  }

  function toggle() {
    setLocale(locale.value === 'zh' ? 'en' : 'zh')
  }

  return { locale, isZh, isEn, setLocale, toggle }
}
