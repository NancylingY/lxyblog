/**
 * 「其他」页 · 小屋 3D 预览卡场景
 * 与首屏 heroStage 共用 houseKit：渲染器 / DPR / KTX2 / glb 装载与归一化 /
 * 材质识别 / 日夜光照 / 停帧 / 资源释放 全部走同一套代码，这里只负责
 * 展示台、取景、缓慢自转与拖拽回弹。
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {
  LIGHT_DAY,
  LIGHT_NIGHT,
  acquireWebGLContext,
  applyCameraFrame,
  createHouseLights,
  createKtx2Loader,
  createStageRenderer,
  createStageRuntime,
  detectStageEnv,
  disposeSceneGraph,
  fitGroundScale,
  lerp,
  loadGround,
  loadHouse,
  logGroundInfo,
  logHouseInfo,
  makeCameraFrame,
  makeShadowTexture,
  releaseRenderer,
  releaseWebGLContext,
  setGroundOpacity,
  type LoadedGround,
  type LoadedHouse,
} from './houseKit'
import { createHouseDrag, YAW_LIMIT } from './houseDrag'

// 展示台与首屏同一套材质，但改成方形，避免小屋在宽台面上显小
const PLINTH_W = 1.5
const PLINTH_D = 1.5
const PLINTH_H = 0.16
const HOUSE_FIT_W = 1.36
const HOUSE_FIT_D = 1.36

// 默认取景角度与自转参数
const DEFAULT_YAW = -0.62
const DEFAULT_PITCH = -0.04
const SWAY = 0.24
const SWAY_SPEED = 0.22

export interface HouseCardOptions {
  /** 与首屏同一个 glb，换模型只替换文件 */
  url: string
  /** 地面模型地址；加载失败时只显示小屋 */
  groundUrl: string
  light: boolean
  onReady?: () => void
}

export interface HouseCardHandle {
  setLight(light: boolean): void
  setActive(active: boolean): void
  dispose(): void
}

export async function createHouseCardScene(
  host: HTMLElement,
  opts: HouseCardOptions,
): Promise<HouseCardHandle> {
  const env = detectStageEnv()

  // 与首屏共享「同时只允许一个 WebGL 上下文」的约束
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
    // 只等房屋：地面晚到不阻塞首帧，到了再挂上并淡入
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
  scene.add(display)

  /* ================= 展示台 ================= */
  const plinthMat = new THREE.MeshStandardMaterial({
    color: LIGHT_DAY.surface.clone(),
    roughness: 0.72,
    metalness: 0.04,
  })
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(PLINTH_W, PLINTH_H, PLINTH_D, 3, 0.06), plinthMat)
  plinth.position.y = PLINTH_H / 2
  display.add(plinth)

  /* ================= 小屋 ================= */
  const { model, materials } = loaded
  const house = new THREE.Group()
  house.add(model)
  const fitScale = Math.min(
    HOUSE_FIT_W / Math.max(loaded.size.x, 0.001),
    HOUSE_FIT_D / Math.max(loaded.size.z, 0.001),
  )
  house.scale.setScalar(fitScale)
  house.position.y = PLINTH_H
  display.add(house)

  logHouseInfo('[houseCard]', loaded, fitScale)

  // 接触阴影落在台面上
  const shadowTexture = makeShadowTexture()
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture ?? undefined,
    transparent: true,
    opacity: LIGHT_DAY.shadowOpacity,
    depthWrite: false,
  })
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), shadowMat)
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.y = PLINTH_H + 0.012
  display.add(contactShadow)

  /* ================= 灯光 ================= */
  // 地面材质晚到，先交出一个可变数组，加载完成后再填进去
  const groundMaterials: THREE.MeshStandardMaterial[] = []
  const lights = createHouseLights({
    scene,
    renderer,
    materials,
    lampParent: house,
    lampAnchor: loaded.lampAnchor,
    groundMaterials,
  })

  /* ================= 贴图采样 ================= */
  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  if (shadowTexture) shadowTexture.anisotropy = maxAniso
  for (const mat of materials.all) {
    if (mat.map) mat.map.anisotropy = maxAniso
    if (mat.metalnessMap) mat.metalnessMap.anisotropy = maxAniso
    if (mat.roughnessMap) mat.roughnessMap.anisotropy = maxAniso
  }

  /* ================= 取景 ================= */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)

  // 卡片会绕 Y 轴自转：取默认角度与两侧极限角度的包围盒并集，旋转到边也不被裁掉
  display.rotation.set(0, 0, 0)
  display.updateMatrixWorld(true)
  const fitBox = new THREE.Box3().setFromObject(display)
  for (const yaw of [DEFAULT_YAW - YAW_LIMIT, DEFAULT_YAW + YAW_LIMIT]) {
    display.rotation.y = yaw
    display.updateMatrixWorld(true)
    fitBox.expandByObject(display)
  }
  display.rotation.set(DEFAULT_PITCH, DEFAULT_YAW, 0)
  // 取景只算展示台与房屋：地面晚到，且只该占画面下半部分
  const frame = makeCameraFrame(fitBox, new THREE.Vector3(0.06, 0.14, 1))

  /* ================= 地面：晚到淡入 ================= */
  // 与房屋共用同一原点与比例，跟随房屋缩放落点，一起上转台
  let ground: LoadedGround | null = null
  let groundFade = 1
  let disposed = false
  void loadGround(opts.groundUrl, ktx2)
    .then((g) => {
      if (disposed) {
        disposeSceneGraph(g.model)
        return
      }
      g.model.position.add(loaded.originShift)
      const wrap = new THREE.Group()
      wrap.add(g.model)
      // 地面单独等比缩放到台面内，房屋尺寸不动
      const groundScale = fitGroundScale(g, PLINTH_W, PLINTH_D)
      wrap.scale.setScalar(groundScale)
      wrap.position.copy(house.position)
      display.add(wrap)
      for (const mat of g.materials) {
        if (mat.map) mat.map.anisotropy = maxAniso
        if (mat.normalMap) mat.normalMap.anisotropy = maxAniso
        groundMaterials.push(mat)
      }
      ground = g
      groundFade = env.reduced ? 1 : 0
      setGroundOpacity(g, groundFade)
      logGroundInfo('[houseCard]', g, groundScale)
    })
    .catch(() => console.info('[houseCard] ground unavailable, house only'))

  /* ================= 自转与拖拽（与首屏共用 houseDrag） ================= */
  let mix = opts.light ? 0 : 1
  let targetMix = mix

  const drag = createHouseDrag({
    host,
    object: display,
    baseYaw: DEFAULT_YAW,
    basePitch: DEFAULT_PITCH,
    reduced: env.reduced,
    sway: SWAY,
    swaySpeed: SWAY_SPEED,
    onReducedFrame: () => runtime.renderNow(),
  })

  const runtime = createStageRuntime({
    host,
    renderer,
    camera,
    env,
    onResize: (_width, _height, aspect) => {
      applyCameraFrame(camera, frame, aspect, 0.94)
    },
    onRender: (elapsed, dt) => {
      drag.update(elapsed, dt)

      const delta = targetMix - mix
      if (Math.abs(delta) <= 0.001) mix = targetMix
      else if (dt > 0) mix += delta * (1 - Math.exp(-dt * 7))

      lights.apply(mix)
      plinthMat.color.lerpColors(LIGHT_DAY.surface, LIGHT_NIGHT.surface, mix)
      shadowMat.opacity = lerp(LIGHT_DAY.shadowOpacity, LIGHT_NIGHT.shadowOpacity, mix)
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

  function dispose() {
    disposed = true
    drag.dispose()
    runtime.dispose()
    disposeSceneGraph(scene)
    shadowTexture?.dispose()
    ktx2.dispose()
    releaseRenderer(renderer)
    releaseWebGLContext(contextToken)
  }

  // 先补一帧，避免 onReady 淡入时出现空白
  runtime.renderNow()
  runtime.setActive(true)
  opts.onReady?.()

  return { setLight, setActive, dispose }
}
