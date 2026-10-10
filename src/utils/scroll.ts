/**
 * 锚点平滑滚动（hash 路由模式下替代原生 #hash 跳转）
 * 不使用 scrollIntoView，改为 window.scrollTo 计算偏移
 */
export function scrollToHash(hash: string) {
  const el = document.querySelector(hash)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: 'smooth' })
}
