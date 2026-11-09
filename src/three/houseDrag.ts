/**
 * 小屋拖拽旋转（首屏、/house、/lighthouse 共用，唯一实现）
 * - 鼠标与触屏统一走 pointer 事件 + setPointerCapture
 * - 触屏先判断主方向：横向才接管旋转，纵向交给页面滚动（画布 touch-action: pan-y）
 * - 偏航 / 俯仰硬夹紧，拖拽与惯性两个阶段都生效，不会冲过边界
 * - 松手后阻尼惯性，速度衰减完再缓动回默认角度；reduced-motion 不摆动、立即回中
 */
import * as THREE from 'three'

/** 偏航限位（±40°）：任何操作下都看不到房子背面 */
export const YAW_LIMIT = Math.PI * 40 / 180
/** 俯仰限位（±12°）：相机在台面上方，这个范围内看不到底面 */
export const PITCH_LIMIT = Math.PI * 12 / 180

const YAW_PER_PX = 0.0075
const PITCH_PER_PX = 0.004
/** 触屏横向手势的接管阈值：低于它不抢页面滚动 */
const TOUCH_SLOP = 8
const INERTIA_FRICTION = 6
const INERTIA_MIN = 0.04
const MAX_VELOCITY = 12
const RETURN_SPEED = 2.4

export interface HouseDragOptions {
  /** 事件宿主，通常是放 canvas 的容器 */
  host: HTMLElement
  /** 被旋转的节点 */
  object: THREE.Object3D
  baseYaw: number
  basePitch: number
  reduced: boolean
  /** 偏航不夹紧，可连续转满一圈（仅 /house 使用） */
  yawFree?: boolean
  /** 偏航限位（弧度），默认 ±40°；不传保持既有行为 */
  yawLimit?: number
  /** 俯仰限位（弧度），默认 ±12° */
  pitchLimit?: number
  /** 闲置时绕默认角度的缓慢摆幅（弧度），0 表示不摆动 */
  sway?: number
  swaySpeed?: number
  /** reduced-motion 下单帧补绘 */
  onReducedFrame?: () => void
  /** 拖拽开始 / 结束，用于 cursor 与提示 */
  onDragChange?: (dragging: boolean) => void
}

export interface HouseDragHandle {
  /** 每帧调用：应用惯性、回中与闲置摆动 */
  update(elapsed: number, dt: number): void
  dispose(): void
  /** 中止当前拖拽（双指缩放手势开始时调用），保留当前角度、不产生惯性 */
  cancel(): void
  /** 当前角度与限位（验证 / 调试用） */
  angles(): { yaw: number; pitch: number; yawLimit: number; pitchLimit: number }
}

export function createHouseDrag(opts: HouseDragOptions): HouseDragHandle {
  const { host, object, baseYaw, basePitch, reduced } = opts
  const yawFree = opts.yawFree ?? false
  const yawLimit = opts.yawLimit ?? YAW_LIMIT
  const pitchLimit = opts.pitchLimit ?? PITCH_LIMIT
  const sway = opts.sway ?? 0
  const swaySpeed = opts.swaySpeed ?? 0.2

  let yaw = baseYaw
  let pitch = basePitch
  let velocity = 0
  let dragging = false
  let pointerId: number | null = null
  let pendingTouch = false
  let disposed = false

  let originX = 0
  let originY = 0
  let startYaw = 0
  let startPitch = 0
  let lastT = 0
  let lastYaw = 0

  const TAU = Math.PI * 2
  const clampYaw = (v: number) =>
    yawFree ? v : THREE.MathUtils.clamp(v, baseYaw - yawLimit, baseYaw + yawLimit)
  /** 自由偏航下，离当前角度最近的那个「正面」等效角，回中不会绕远路 */
  const nearestBase = (v: number) => baseYaw + TAU * Math.round((v - baseYaw) / TAU)
  const clampPitch = (v: number) =>
    THREE.MathUtils.clamp(v, basePitch - pitchLimit, basePitch + pitchLimit)

  function setDragging(next: boolean) {
    if (dragging === next) return
    dragging = next
    host.classList.toggle('is-dragging', next)
    opts.onDragChange?.(next)
  }

  function activate(id: number) {
    pointerId = id
    pendingTouch = false
    velocity = 0
    setDragging(true)
    try {
      host.setPointerCapture(id)
    } catch {
      /* 个别浏览器不支持捕获，不影响拖拽 */
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (disposed || pointerId !== null) return
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return
      originX = e.clientX
      originY = e.clientY
      startYaw = yaw
      startPitch = pitch
      lastT = e.timeStamp
      lastYaw = yaw
      activate(e.pointerId)
      return
    }
    // 触屏：先等方向判定，不立刻捕获指针，纵向滑动仍归页面
    pendingTouch = true
    pointerId = e.pointerId
    originX = e.clientX
    originY = e.clientY
  }

  function onPointerMove(e: PointerEvent) {
    if (disposed || e.pointerId !== pointerId) return

    if (pendingTouch && !dragging) {
      const dx = e.clientX - originX
      const dy = e.clientY - originY
      if (Math.abs(dx) < TOUCH_SLOP && Math.abs(dy) < TOUCH_SLOP) return
      if (Math.abs(dx) <= Math.abs(dy)) {
        // 纵向为主：交还页面滚动，本次手势不再旋转
        pendingTouch = false
        pointerId = null
        return
      }
      // 横向为主：以当前位置为起点接管，避免接手瞬间跳动
      startYaw = yaw
      startPitch = pitch
      originX = e.clientX
      originY = e.clientY
      lastT = e.timeStamp
      lastYaw = yaw
      activate(e.pointerId)
    }

    if (!dragging) return

    const dt = (e.timeStamp - lastT) / 1000
    const nextYaw = clampYaw(startYaw + (e.clientX - originX) * YAW_PER_PX)
    pitch = clampPitch(startPitch - (e.clientY - originY) * PITCH_PER_PX)
    if (dt > 0) {
      const instant = (nextYaw - lastYaw) / dt
      velocity = THREE.MathUtils.clamp(
        velocity * 0.6 + instant * 0.4,
        -MAX_VELOCITY,
        MAX_VELOCITY,
      )
    }
    yaw = nextYaw
    lastYaw = yaw
    lastT = e.timeStamp
    if (reduced) {
      object.rotation.set(pitch, yaw, 0)
      opts.onReducedFrame?.()
    }
  }

  function end(e: PointerEvent) {
    if (disposed || e.pointerId !== pointerId) return
    pointerId = null
    pendingTouch = false
    if (!dragging) return
    setDragging(false)
    try {
      host.releasePointerCapture(e.pointerId)
    } catch {
      /* 已自动释放 */
    }
    if (reduced) {
      // 不做惯性：直接回中并补一帧
      yaw = baseYaw
      pitch = basePitch
      velocity = 0
      object.rotation.set(pitch, yaw, 0)
      opts.onReducedFrame?.()
      return
    }
    // 惯性阶段仍受夹紧约束：起步就贴着边界且朝外时不放行
    if (Math.abs(velocity) > INERTIA_MIN) {
      yaw = clampYaw(yaw)
      velocity = 0
    }
    lastYaw = yaw
  }

  function cancel() {
    if (pointerId !== null) {
      try {
        host.releasePointerCapture(pointerId)
      } catch {
        /* 已自动释放 */
      }
    }
    pointerId = null
    pendingTouch = false
    velocity = 0
    setDragging(false)
  }

  function update(elapsed: number, dt: number) {
    if (disposed) return
    if (!dragging) {
      if (Math.abs(velocity) > INERTIA_MIN && dt > 0) {
        let next = yaw + velocity * dt
        const clamped = clampYaw(next)
        if (clamped !== next) {
          // 撞到限位：停在边界并清掉速度，不靠惯性冲出去
          next = clamped
          velocity = 0
        } else {
          velocity *= Math.exp(-dt * INERTIA_FRICTION)
        }
        yaw = next
      } else {
        velocity = 0
        if (!reduced) {
          const center = yawFree ? nearestBase(yaw) : baseYaw
          const target = sway ? center + Math.sin(elapsed * swaySpeed) * sway : center
          const ease = dt > 0 ? 1 - Math.exp(-dt * RETURN_SPEED) : 1
          yaw += (clampYaw(target) - yaw) * ease
          pitch += (basePitch - pitch) * ease
        }
      }
    }
    object.rotation.set(pitch, yaw, 0)
  }

  host.addEventListener('pointerdown', onPointerDown)
  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerup', end)
  host.addEventListener('pointercancel', end)

  return {
    update,
    cancel,
    dispose() {
      disposed = true
      host.removeEventListener('pointerdown', onPointerDown)
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerup', end)
      host.removeEventListener('pointercancel', end)
      host.classList.remove('is-dragging')
    },
    angles() {
      return { yaw, pitch, yawLimit, pitchLimit }
    },
  }
}
