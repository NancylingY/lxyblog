/**
 * 锚点平滑滚动（hash 路由模式下替代原生 #hash 跳转）
 * 用 GSAP 逐帧驱动滚动位置，避免 ScrollToPlugin 与 CSS smooth 互相抢控制权。
 */
import { gsap } from 'gsap'

let currentTween: ReturnType<typeof gsap.to> | null = null

export function scrollToHash(hash: string) {
  const el = document.querySelector(hash)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  const root = document.documentElement
  const prevBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'

  const restore = () => {
    root.style.scrollBehavior = prevBehavior
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, top)
    restore()
    return
  }

  currentTween?.kill()
  const proxy = { y: window.scrollY }
  currentTween = gsap.to(proxy, {
    y: top,
    duration: 0.85,
    ease: 'power3.inOut',
    overwrite: true,
    onUpdate: () => window.scrollTo(0, proxy.y),
    onComplete: restore,
    onInterrupt: restore,
  })
}
