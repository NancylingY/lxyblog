/**
 * 全站主题：日光（light）/ 深夜（dark）
 * - 首屏加载前由 index.html 的内联脚本写入 data-theme，避免闪白/闪黑
 * - 切换后写入 localStorage，并在根节点同步 color-scheme
 * - 支持 View Transitions 的浏览器用从按钮扩散的圆形擦除；
 *   不支持时用 GSAP 做一次柔和的整页淡出淡入
 */
import { computed, nextTick, ref } from 'vue'
import { gsap } from 'gsap'

export type Theme = 'light' | 'dark'

type ThemeViewTransition = {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition: () => void
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ThemeViewTransition
}

const STORAGE_KEY = 'blog-theme'
let switching = false

function readInitialTheme(): Theme {
  const attr = document.documentElement.dataset.theme
  if (attr === 'dark' || attr === 'light') return attr
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const theme = ref<Theme>(readInitialTheme())

function apply(next: Theme) {
  const root = document.documentElement
  root.dataset.theme = next
  root.style.colorScheme = next
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'light' ? '#f5f2ea' : '#07090d')
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* 隐私模式下 localStorage 不可用时静默忽略 */
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useTheme() {
  const isLight = computed(() => theme.value === 'light')
  const isDark = computed(() => theme.value === 'dark')

  function setTheme(next: Theme) {
    if (theme.value === next) return
    theme.value = next
    apply(next)
  }

  function fallbackSwitch(next: Theme) {
    const app = document.getElementById('app')
    if (!app) {
      setTheme(next)
      return
    }
    switching = true
    gsap.to(app, {
      opacity: 0.48,
      duration: 0.16,
      ease: 'power1.out',
      onComplete: () => {
        setTheme(next)
        gsap.to(app, {
          opacity: 1,
          duration: 0.28,
          ease: 'power2.out',
          onComplete: () => {
            switching = false
          },
        })
      },
    })
  }

  function toggleTheme(origin?: { x: number; y: number }) {
    const next: Theme = theme.value === 'light' ? 'dark' : 'light'
    if (theme.value === next || switching) return

    if (prefersReducedMotion()) {
      setTheme(next)
      return
    }

    const doc = document as DocumentWithViewTransition
    if (!doc.startViewTransition) {
      fallbackSwitch(next)
      return
    }

    switching = true
    const root = document.documentElement
    const x = origin?.x ?? window.innerWidth / 2
    const y = origin?.y ?? window.innerHeight / 2
    root.style.setProperty('--theme-origin-x', `${x}px`)
    root.style.setProperty('--theme-origin-y', `${y}px`)

    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    const vt = doc.startViewTransition(async () => {
      apply(next)
      theme.value = next
      // 等 Vue 把切换按钮/组件状态更新完，新快照才不会停留在旧图标
      await nextTick()
    })

    vt.ready
      .then(() => {
        const options: KeyframeAnimationOptions & { pseudoElement?: string } = {
          duration: 720,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          fill: 'forwards',
          pseudoElement: '::view-transition-new(root)',
        }
        root.animate(
          [
            { clipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
          ],
          options,
        )
      })
      .catch(() => {
        /* 浏览器跳过过渡时直接结束 */
      })

    vt.finished.finally(() => {
      switching = false
    })
  }

  return { theme, isLight, isDark, setTheme, toggleTheme }
}
