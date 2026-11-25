/**
 * 页面滚动进度（0~1）与滚动距离
 * 全站共享一个 scroll 监听，用 rAF 合并到每帧一次；导航进度条与回到顶部按钮共用。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const progress = ref(0)
const scrollY = ref(0)

let users = 0
let frame = 0

function measure() {
  frame = 0
  const max = document.documentElement.scrollHeight - window.innerHeight
  scrollY.value = window.scrollY
  progress.value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure)
}

export function useScrollProgress() {
  onMounted(() => {
    if (users++ === 0) {
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule)
    }
    measure()
  })

  onBeforeUnmount(() => {
    if (--users > 0) return
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  })

  return { progress, scrollY, refresh: schedule }
}
