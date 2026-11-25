/**
 * 全站轻量交互（只装一次，不依赖组件生命周期）
 *
 * 1. 卡片聚光：鼠标在任意 `.card` / `[data-spotlight]` 上移动时，写入 --mx / --my，
 *    由 style.css 里的径向渐变画出跟随光斑；离开时去掉 is-lit 让光斑淡出。
 * 2. 入场延迟归零：`.reveal` 元素常用行内 transition-delay 做错峰入场，
 *    但同一个 delay 也会拖慢之后的悬停动效。入场的 opacity 过渡结束后把 delay 清零。
 */
export function installInteractions() {
  if (typeof window === 'undefined') return

  const finePointer = window.matchMedia('(pointer: fine)')
  let current: HTMLElement | null = null
  let lastEvent: PointerEvent | null = null
  let frame = 0

  function release() {
    current?.classList.remove('is-lit')
    current = null
  }

  function apply() {
    frame = 0
    const event = lastEvent
    if (!event) return
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.card, [data-spotlight]')
        : null

    if (current && current !== target) release()
    if (!target) return

    const rect = target.getBoundingClientRect()
    target.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    target.style.setProperty('--my', `${event.clientY - rect.top}px`)
    target.classList.add('is-lit')
    current = target
  }

  document.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return
      lastEvent = event
      if (!frame) frame = requestAnimationFrame(apply)
    },
    { passive: true },
  )
  document.documentElement.addEventListener('mouseleave', release)

  document.addEventListener('transitionend', (event) => {
    const el = event.target
    if (!(el instanceof HTMLElement) || event.propertyName !== 'opacity') return
    if (!el.classList.contains('reveal') || !el.classList.contains('is-visible')) return
    if (el.style.transitionDelay) el.style.transitionDelay = '0s'
    el.classList.add('is-settled')
  })
}
