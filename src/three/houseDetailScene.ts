/**
 * /house 全屏小屋场景
 * - 与首屏共用 houseKit：渲染器、KTX2、glb 归一化、日夜光照、停帧、销毁
 * - 拖拽与首屏共用 houseDrag；详情页偏航 360° 不夹紧、支持滚轮与双指缩放
 * - 地面晚到：先按房屋取景，地块到位后重算包围盒并平滑拉远，把房子和地块都框进来
 * - 与首屏共用同一份 lite 模型；加载期间由页面显示静态占位，不出现空白
 */
import * as THREE from 'three'
import {
  acquireWebGLContext,
  createHouseLights,
  createKtx2Loader,
  createStageRenderer,
  createStageRuntime,
  detectStageEnv,
  disposeSceneGraph,
  frameDistance,
  loadGround,
  loadHouse,
  logGroundInfo,
  logHouseInfo,
  makeCameraFrame,
  releaseRenderer,
  releaseWebGLContext,
  setGroundOpacity,
  type CameraFrame,
  type LoadedGround,
  type LoadedHouse,
} from './houseKit'
import { PITCH_LIMIT, createHouseDrag } from './houseDrag'

const DEFAULT_YAW = -0.55
const DEFAULT_PITCH = -0.07
const SWAY = 0.04
const SWAY_SPEED = 0.16
const VIEW_DIR = new THREE.Vector3(0.1, 0.2, 1)

export interface HouseDetailOptions {
  /** 与首屏 / 卡片共用的 lite 模型 */
  url: string
  /** 地面模型地址；加载失败时只显示小屋 */
  groundUrl: string
  light: boolean
  onReady?: () => void
}

export interface HouseDetailHandle {
  setLight(light: boolean): void
  setActive(active: boolean): void
  dispose(): void
}

export async function createHouseDetailScene(
  host: HTMLElement,
  opts: HouseDetailOptions,
): Promise<HouseDetailHandle> {
  const env = detectStageEnv()

  const contextToken = await acquireWebGLContext()
  let renderer: THREE.WebGLRenderer
  try {
    renderer = createStageRenderer(env)
  } catch (error) {
    releaseWebGLContext(contextToken)
    throw error
  }

  const ktx2 = createKtx2Loader(renderer)
  let loaded: LoadedHouse
  try {
    loaded = await loadHouse(opts.url, ktx2)
  } catch (error) {
    ktx2.dispose()
    releaseRenderer(renderer)
    releaseWebGLContext(contextToken)
    throw error
  }

  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const display = new THREE.Group()
  display.rotation.set(DEFAULT_PITCH, DEFAULT_YAW, 0)
  scene.add(display)

  /* ================= 小屋 ================= */
  const { model, materials } = loaded
  const house = new THREE.Group()
  house.add(model)
  display.add(house)

  logHouseInfo('[houseDetail]', loaded, 1)

  /* ================= 灯光 ================= */
  const groundMaterials: THREE.MeshStandardMaterial[] = []
  const lights = createHouseLights({
    scene,
    renderer,
    materials,
    lampParent: house,
    lampAnchor: loaded.lampAnchor,
    groundMaterials,
  })

  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  for (const mat of materials.all) {
    if (mat.map) mat.map.anisotropy = maxAniso
    if (mat.metalnessMap) mat.metalnessMap.anisotropy = maxAniso
    if (mat.roughnessMap) mat.roughnessMap.anisotropy = maxAniso
  }

  /* ================= 取景与缩放 ================= */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
  let aspect = 1
  let frame: CameraFrame | null = null
  // 默认取景距离（包围盒刚好框住）；缩放以它为基准乘系数
  let baseDist = 1
  let distScale = 1
  let minDist = 1
  let maxDist = 1
  let curDist = 1
  let goalDist = 1
  const camTarget = new THREE.Vector3()

  // 房屋包围球：最近距离必须停在球外，任何角度都穿不进房子
  const houseSphere = new THREE.Box3()
    .setFromObject(house)
    .getBoundingSphere(new THREE.Sphere())

  /** 偏航不限位，按 45° 采样所有朝向的包围盒并集，转到任意角度都不裁切 */
  function computeBounds(): THREE.Box3 {
    const saved = display.rotation.clone()
    display.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(display)
    for (let i = 0; i < 8; i++) {
      display.rotation.set(DEFAULT_PITCH, DEFAULT_YAW + (Math.PI / 4) * i, 0)
      display.updateMatrixWorld(true)
      box.expandByObject(display)
    }
    for (const pitch of [DEFAULT_PITCH - PITCH_LIMIT, DEFAULT_PITCH + PITCH_LIMIT]) {
      display.rotation.set(pitch, DEFAULT_YAW, 0)
      display.updateMatrixWorld(true)
      box.expandByObject(display)
    }
    display.rotation.copy(saved)
    display.updateMatrixWorld(true)
    return box
  }

  function updateCamera() {
    if (!frame) return
    camera.position.copy(frame.viewDir).multiplyScalar(curDist).add(camTarget)
    camera.lookAt(camTarget)
  }

  function refit(immediate: boolean) {
    frame = makeCameraFrame(computeBounds(), VIEW_DIR)
    baseDist = frameDistance(frame, camera, aspect, 1.06)
    // 最近：相机停在房屋包围球外；最远：默认取景再拉远不到一倍，不会缩成一小团
    minDist = houseSphere.center.distanceTo(frame.target) + houseSphere.radius * 1.1
    maxDist = Math.max(baseDist * 1.7, minDist * 1.02)
    goalDist = THREE.MathUtils.clamp(baseDist * distScale, minDist, maxDist)
    distScale = goalDist / baseDist
    if (immediate) {
      curDist = goalDist
      camTarget.copy(frame.target)
      updateCamera()
    }
  }

  /** 缩放系数由滚轮 / 双指给出；越界直接夹死，没有回弹 */
  function setZoom(nextScale: number) {
    distScale = THREE.MathUtils.clamp(nextScale, minDist / baseDist, maxDist / baseDist)
    goalDist = baseDist * distScale
    if (env.reduced) {
      curDist = goalDist
      if (frame) camTarget.copy(frame.target)
      updateCamera()
      runtime.renderNow()
    }
  }

  refit(true)

  /* ================= 地面：晚到淡入 ================= */
  let ground: LoadedGround | null = null
  let groundFade = 1
  let disposed = false
  void loadGround(opts.groundUrl, ktx2)
    .then((g) => {
      if (disposed) {
        disposeSceneGraph(g.model)
        return
      }
      // 与房屋共用同一原点：详情页按真实比例展示，不再缩到台面内
      g.model.position.add(loaded.originShift)
      display.add(g.model)
      for (const mat of g.materials) {
        if (mat.map) mat.map.anisotropy = maxAniso
        if (mat.normalMap) mat.normalMap.anisotropy = maxAniso
        groundMaterials.push(mat)
      }
      ground = g
      groundFade = env.reduced ? 1 : 0
      setGroundOpacity(g, groundFade)
      logGroundInfo('[houseDetail]', g, 1)
      // 地块进来后重新取景，房子与地块一起框住
      refit(env.reduced)
      if (env.reduced) runtime.renderNow()
    })
    .catch(() => console.info('[houseDetail] ground unavailable, house only'))

  /* ================= 拖拽 ================= */
  const drag = createHouseDrag({
    host,
    object: display,
    baseYaw: DEFAULT_YAW,
    basePitch: DEFAULT_PITCH,
    reduced: env.reduced,
    // 详情页开放 360° 偏航；俯仰仍限位，任何角度都看不到底面
    yawFree: true,
    sway: SWAY,
    swaySpeed: SWAY_SPEED,
    onReducedFrame: () => runtime.renderNow(),
  })

  /* ================= 缩放：滚轮 + 双指 ================= */
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchSpread = 0
  let pinchScale = 1

  function currentSpread() {
    const [a, b] = [...pointers.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  function onZoomDown(e: PointerEvent) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 2) {
      // 双指开始：先停掉单指旋转，避免边转边缩
      drag.cancel()
      pinchSpread = currentSpread()
      pinchScale = distScale
    }
  }

  function onZoomMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size < 2 || pinchSpread <= 0) return
    const spread = currentSpread()
    if (spread <= 0) return
    // 两指张开 = 拉近
    setZoom(pinchScale * (pinchSpread / spread))
  }

  function onZoomUp(e: PointerEvent) {
    pointers.delete(e.pointerId)
    if (pointers.size < 2) pinchSpread = 0
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
    setZoom(distScale * Math.exp(e.deltaY * unit * 0.0012))
  }

  host.addEventListener('pointerdown', onZoomDown)
  host.addEventListener('pointermove', onZoomMove)
  host.addEventListener('pointerup', onZoomUp)
  host.addEventListener('pointercancel', onZoomUp)
  host.addEventListener('wheel', onWheel, { passive: false })

  /* ================= 运行时 ================= */
  let mix = opts.light ? 0 : 1
  let targetMix = mix

  const runtime = createStageRuntime({
    host,
    renderer,
    camera,
    env,
    onResize: (_width: number, _h: number, nextAspect: number) => {
      aspect = nextAspect
      refit(true)
    },
    onRender: (elapsed, dt) => {
      drag.update(elapsed, dt)

      // 相机平滑过渡（地面到位 / resize / 缩放后），距离始终限制在 min/max 内
      if (dt > 0) {
        const k = 1 - Math.exp(-dt * 6)
        curDist += (goalDist - curDist) * k
        if (frame) camTarget.lerp(frame.target, k)
      }
      updateCamera()

      const delta = targetMix - mix
      if (Math.abs(delta) <= 0.001) mix = targetMix
      else if (dt > 0) mix += delta * (1 - Math.exp(-dt * 7))

      lights.apply(mix)
      if (ground && groundFade < 1 && dt > 0) {
        groundFade = Math.min(1, groundFade + dt / 0.45)
        setGroundOpacity(ground, groundFade)
      }
      renderer.render(scene, camera)
    },
  })

  /* ================= 对外接口 ================= */
  function setLight(light: boolean) {
    targetMix = light ? 0 : 1
    opts.light = light
    if (env.reduced) {
      mix = targetMix
      runtime.renderNow()
    }
  }

  function setActive(active: boolean) {
    runtime.setActive(active)
  }

  function disposeScene() {
    disposed = true
    drag.dispose()
    host.removeEventListener('pointerdown', onZoomDown)
    host.removeEventListener('pointermove', onZoomMove)
    host.removeEventListener('pointerup', onZoomUp)
    host.removeEventListener('pointercancel', onZoomUp)
    host.removeEventListener('wheel', onWheel)
    pointers.clear()
    runtime.dispose()
    disposeSceneGraph(scene)
    ktx2.dispose()
    releaseRenderer(renderer)
    releaseWebGLContext(contextToken)
  }

  runtime.renderNow()
  runtime.setActive(true)
  opts.onReady?.()

  // 本地验证用：访问时带 ?debug3d 才暴露相机距离与角度
  const debug = new URLSearchParams(window.location.search).has('debug3d')
  if (debug) {
    ;(window as unknown as { __houseDebug?: () => unknown }).__houseDebug = () => ({
      dist: curDist,
      goal: goalDist,
      min: minDist,
      max: maxDist,
      ...drag.angles(),
    })
  }

  return {
    setLight,
    setActive,
    dispose() {
      if (debug) delete (window as unknown as { __houseDebug?: () => unknown }).__houseDebug
      disposeScene()
    },
  }
}
