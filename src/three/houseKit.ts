/**
 * 小屋 3D 共用层
 * 首屏展示卡与「其他」页预览卡共用同一套实现：
 * - 渲染器、DPR 封顶、KTX2 转码
 * - glb 装载、包围盒归一化、材质识别（M_Glass / M_Lamp）
 * - 日夜光照参数与插值
 * - 包围盒 8 角取景拟合
 * - 可见性停帧、页面隐藏停帧、资源释放
 * - 同一时间只允许一个 WebGL 上下文存活（claim / release 约束）
 * 换模型只替换 glb 文件，这两处调用都不用改。
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

export const lerp = THREE.MathUtils.lerp

/* ================= 日夜光照参数 ================= */
export interface LightPreset {
  hemiSky: THREE.Color
  hemiGround: THREE.Color
  hemiIntensity: number
  keyColor: THREE.Color
  keyIntensity: number
  keyPos: THREE.Vector3
  lampIntensity: number
  glassEmissive: number
  lampEmissive: number
  exposure: number
  /** 台面 / 底板等中性面的颜色 */
  surface: THREE.Color
  shadowOpacity: number
}

export const LIGHT_DAY: LightPreset = {
  hemiSky: new THREE.Color(0xf1f7ff),
  hemiGround: new THREE.Color(0xe6d9bf),
  hemiIntensity: 1.12,
  keyColor: new THREE.Color(0xfff3e0),
  keyIntensity: 2.32,
  keyPos: new THREE.Vector3(4.5, 7, 6),
  lampIntensity: 0.16,
  glassEmissive: 0.06,
  lampEmissive: 0.2,
  exposure: 1.06,
  surface: new THREE.Color(0xe9e1d3),
  shadowOpacity: 0.42,
}

export const LIGHT_NIGHT: LightPreset = {
  hemiSky: new THREE.Color(0x1b2a46),
  hemiGround: new THREE.Color(0x0a0f18),
  hemiIntensity: 0.52,
  keyColor: new THREE.Color(0x8fb4ff),
  keyIntensity: 0.88,
  keyPos: new THREE.Vector3(-4.5, 7.5, 4),
  lampIntensity: 1.15,
  // 曝光提到 1.52 后，自发光按同一比例回压，避免灯窗与门廊灯糊成白块
  glassEmissive: 0.66,
  lampEmissive: 1.04,
  exposure: 1.52,
  surface: new THREE.Color(0x1a2833),
  shadowOpacity: 0.62,
}

/**
 * 地面是带 albedo 的中性材质，只靠灯光压暗不够稳：
 * 夜里再叠一层颜色乘子，保证地面不比白天亮。
 */
const GROUND_TINT_DAY = new THREE.Color(0xffffff)
const GROUND_TINT_NIGHT = new THREE.Color(0x565b61)

/* ================= 运行环境 ================= */
export interface StageEnv {
  coarse: boolean
  fine: boolean
  /** 低配触屏机：关抗锯齿、DPR 封顶 1.5 */
  lowPower: boolean
  reduced: boolean
}

export function detectStageEnv(): StageEnv {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const fine = window.matchMedia('(pointer: fine)').matches
  const lowPower =
    coarse && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return { coarse, fine, lowPower, reduced }
}

/** 画布像素比上限：低配触屏 1.5，其余 2 */
export function clampDpr(env: StageEnv): number {
  return Math.min(window.devicePixelRatio || 1, env.lowPower ? 1.5 : 2)
}

export function createStageRenderer(env: StageEnv): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !env.lowPower,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = LIGHT_DAY.exposure
  // 竖向滑动交给页面滚动，横向手势才由拖拽旋转接管（触屏与平板）
  renderer.domElement.style.touchAction = 'pan-y'
  return renderer
}

/** 转码器放在 public/basis/，只在用到 KTX2 时下载，不进主包 */
export function createKtx2Loader(renderer: THREE.WebGLRenderer): KTX2Loader {
  const ktx2 = new KTX2Loader()
  ktx2.setTranscoderPath(`${import.meta.env.BASE_URL}basis/`)
  ktx2.detectSupport(renderer)
  // 提前发起 js/wasm 下载，与 glb 下载并行；真正的解析仍会等它就绪
  ktx2.init().catch(() => {})
  return ktx2
}

/* ================= 模型装载 / 归一化 / 材质识别 ================= */
export interface HouseMaterials {
  all: THREE.MeshStandardMaterial[]
  glass: THREE.MeshStandardMaterial[]
  lamp: THREE.MeshStandardMaterial[]
  lampMeshes: THREE.Mesh[]
}

export interface LoadedHouse {
  /** 底面贴 y=0、水平居中的模型根节点 */
  model: THREE.Group
  materials: HouseMaterials
  /** 归一化前的原始包围盒尺寸 */
  size: THREE.Vector3
  /** 归一化时施加的偏移；地面与房屋共用同一原点，需要套用同一个偏移 */
  originShift: THREE.Vector3
  /** 模型根节点局部坐标里的灯罩中心；没有灯具时为按尺寸估算的兜底位置 */
  lampAnchor: THREE.Vector3
  triangles: number
  hasNormals: boolean
  textureInfo: { albedo: string; orm: string }
}

function texSize(tex: THREE.Texture | null | undefined): string {
  const img = tex?.image as { width?: number; height?: number } | undefined
  const size = img?.width && img?.height ? `${img.width}x${img.height}` : 'none'
  return tex instanceof THREE.CompressedTexture ? `${size}(compressed)` : size
}

/**
 * 装载 glb（KTX2 已挂在 loader 上），并做两件与呈现无关的归一化：
 * 1. 模型底面贴 y=0、水平居中——换模型（v4 / v5）不用改调用方代码
 * 2. 缺 NORMAL 时补平面法线（源文件未导出法线的版本会整体发黑）
 * 同时识别窗户玻璃与灯具材质，供日夜插值共用。
 */
export async function loadHouse(url: string, ktx2: KTX2Loader): Promise<LoadedHouse> {
  const gltfLoader = new GLTFLoader()
  gltfLoader.setKTX2Loader(ktx2)
  const gltf = await gltfLoader.loadAsync(url)

  const model = gltf.scene
  const rawBox = new THREE.Box3().setFromObject(model)
  const rawCenter = rawBox.getCenter(new THREE.Vector3())
  const size = rawBox.getSize(new THREE.Vector3())
  const originShift = new THREE.Vector3(-rawCenter.x, -rawBox.min.y, -rawCenter.z)
  model.position.copy(originShift)

  // 源文件是否导出过 NORMAL；没有就必须补平面法线
  type Prim = { attributes?: Record<string, number> }
  const gltfJson = gltf.parser.json as { meshes?: Array<{ primitives?: Prim[] }> }
  const hasNormals = (gltfJson.meshes ?? []).some((m) =>
    (m.primitives ?? []).some((p) => p.attributes?.NORMAL !== undefined),
  )

  // 材质名不保证稳定：先按名字匹配，再按材质属性兜底
  const GLASS_RE = /glass|window|glazing|pane/i
  const LAMP_RE = /lamp|lantern|light|bulb|porch/i
  const materials: HouseMaterials = { all: [], glass: [], lamp: [], lampMeshes: [] }
  const seenMats = new Set<string>()
  let triangles = 0

  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return

    const geo = mesh.geometry as THREE.BufferGeometry
    const index = geo.getIndex()
    triangles += (index ? index.count : geo.getAttribute('position').count) / 3
    if (!hasNormals) {
      if (index) {
        // 非索引化后逐面求法线 = 平面法线
        const flat = geo.toNonIndexed()
        flat.computeVertexNormals()
        mesh.geometry = flat
        geo.dispose()
      } else if (!geo.getAttribute('normal')) {
        geo.computeVertexNormals()
      }
    }

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if (!mat || seenMats.has(mat.uuid)) continue
      seenMats.add(mat.uuid)
      const std = mat as THREE.MeshStandardMaterial
      if (!std.emissive) continue
      materials.all.push(std)
      const name = `${mat.name} ${mesh.name}`
      if (GLASS_RE.test(name)) {
        std.emissive.setHex(0xffc27a)
        std.emissiveIntensity = LIGHT_DAY.glassEmissive
        materials.glass.push(std)
      } else if (LAMP_RE.test(name) || std.emissive.getHex() !== 0x000000) {
        std.emissive.setHex(0xffb45a)
        std.emissiveIntensity = LIGHT_DAY.lampEmissive
        materials.lamp.push(std)
        materials.lampMeshes.push(mesh)
      }
    }
  })

  // 兜底 1：玻璃 = 高金属度 + 低粗糙度
  if (!materials.glass.length) {
    for (const mat of materials.all) {
      if ((mat.metalness ?? 0) >= 0.2 && (mat.roughness ?? 1) <= 0.3) {
        mat.emissive.setHex(0xffc27a)
        mat.emissiveIntensity = LIGHT_DAY.glassEmissive
        materials.glass.push(mat)
      }
    }
  }
  // 兜底 2：灯 = 自带非黑 emissive 的材质
  if (!materials.lamp.length) {
    for (const mat of materials.all) {
      if (mat.emissive.getHex() !== 0x000000) {
        mat.emissive.setHex(0xffb45a)
        mat.emissiveIntensity = LIGHT_DAY.lampEmissive
        materials.lamp.push(mat)
      }
    }
  }

  // 灯源位置：优先取灯罩网格的真实中心，找不到再按包围盒估算
  model.updateMatrixWorld(true)
  let lampAnchor: THREE.Vector3
  if (materials.lampMeshes.length) {
    const lampBox = new THREE.Box3()
    for (const mesh of materials.lampMeshes) lampBox.expandByObject(mesh)
    lampAnchor = lampBox.isEmpty()
      ? new THREE.Vector3(0, size.y * 0.55, size.z * 0.46)
      : lampBox.getCenter(new THREE.Vector3())
  } else {
    lampAnchor = new THREE.Vector3(0, size.y * 0.55, size.z * 0.46)
  }

  const textureInfo = {
    albedo: texSize(materials.all.find((m) => m.map)?.map),
    orm: texSize(materials.all.find((m) => m.aoMap)?.aoMap),
  }

  return { model, materials, size, originShift, lampAnchor, triangles, hasNormals, textureInfo }
}

/* ================= 地面 ================= */
export interface LoadedGround {
  /** 与房屋同一原点、同一比例的模型根节点（未做归一化缩放） */
  model: THREE.Group
  materials: THREE.MeshStandardMaterial[]
  /** 可见地块尺寸，用于核对与房屋的贴合关系 */
  size: THREE.Vector3
  triangles: number
}

/**
 * 装载地面 glb。与房屋共用同一个 KTX2 解码器与同一个 WebGL 上下文；
 * 原点偏移由调用方套用房屋的 originShift，不做额外补偿。
 * 失败由调用方吞掉——地面缺位时房屋照常显示。
 */
export async function loadGround(url: string, ktx2: KTX2Loader): Promise<LoadedGround> {
  const gltfLoader = new GLTFLoader()
  gltfLoader.setKTX2Loader(ktx2)
  const gltf = await gltfLoader.loadAsync(url)

  const model = gltf.scene
  const materials: THREE.MeshStandardMaterial[] = []
  const seen = new Set<string>()
  let triangles = 0

  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return
    const geo = mesh.geometry as THREE.BufferGeometry
    const index = geo.getIndex()
    triangles += (index ? index.count : geo.getAttribute('position').count) / 3
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial
      if (!std || seen.has(std.uuid)) continue
      seen.add(std.uuid)
      // 记下原始色，主题插值时以它为基准，不覆盖材质本身的颜色因子
      std.userData.baseColor = std.color.clone()
      materials.push(std)
    }
  })

  const size = new THREE.Box3()
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return
    size.union(new THREE.Box3().setFromObject(mesh))
  })
  const sizeVec = size.isEmpty() ? new THREE.Vector3() : size.getSize(new THREE.Vector3())

  applyGroundEdgeFade({ model, materials, size: sizeVec, triangles })

  return { model, materials, size: sizeVec, triangles }
}

export function logGroundInfo(label: string, ground: LoadedGround, scale: number) {
  console.info(
    `${label} ground: mats=${ground.materials.map((m) => m.name).join(', ') || 'none'} | ` +
      `tris=${Math.round(ground.triangles)} | size=${ground.size.x.toFixed(2)}x${ground.size.z.toFixed(2)} | ` +
      `scale=${scale.toFixed(3)} -> ${(ground.size.x * scale).toFixed(2)}x${(ground.size.z * scale).toFixed(2)}`,
  )
}

/**
 * 让地块贴到展示台尺寸：地面单独等比缩放，房屋不动。
 * 取台面较短边作为约束，并在四周留边距，保证可见外轮廓完全落在台面内。
 */
export function fitGroundScale(
  ground: LoadedGround,
  platformWidth: number,
  platformDepth: number,
  margin = 0.92,
): number {
  return Math.min(platformWidth / ground.size.x, platformDepth / ground.size.z) * margin
}

/**
 * 地块外缘径向淡出：
 * - 按每个顶点到地块中心的距离算 alpha，外圈 20% 平滑过渡到 0，边界没有硬切边
 * - 顶点属性在加载时烘焙，运行时缩放/旋转都不影响淡出半径
 * - 材质转为半透明才能混合，淡入直接复用 opacity
 */
export function applyGroundEdgeFade(ground: LoadedGround): void {
  const model = ground.model
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5)
  const outer = Math.min(half.x, half.z)
  const inner = outer * 0.8

  const point = new THREE.Vector3()
  const patched = new Set<THREE.Material>()

  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return

    // 逐 mesh 克隆再写属性，避免共享几何体拿到别的节点的坐标
    const geometry = mesh.geometry.clone()
    const position = geometry.getAttribute('position')
    const radial = new Float32Array(position.count)
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
      radial[i] = Math.hypot(point.x - center.x, point.z - center.z)
    }
    geometry.setAttribute('aGroundRadial', new THREE.BufferAttribute(radial, 1))
    mesh.geometry = geometry

    const mat = mesh.material as THREE.MeshStandardMaterial
    mat.transparent = true
    if (patched.has(mat)) return
    patched.add(mat)
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGroundFadeInner = { value: inner }
      shader.uniforms.uGroundFadeOuter = { value: outer }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aGroundRadial;\nvarying float vGroundRadial;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundRadial = aGroundRadial;')
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying float vGroundRadial;\nuniform float uGroundFadeInner;\nuniform float uGroundFadeOuter;',
        )
        .replace(
          '#include <opaque_fragment>',
          'diffuseColor.a *= 1.0 - smoothstep( uGroundFadeInner, uGroundFadeOuter, vGroundRadial );\n#include <opaque_fragment>',
        )
    }
    mat.needsUpdate = true
  })
}

/** 地面淡入：用材质 opacity 从 0 推到 1；外缘淡出已经开了透明度，这里只改数值 */
export function setGroundOpacity(ground: LoadedGround, opacity: number): void {
  for (const mat of ground.materials) mat.opacity = opacity
}

/** 统一的加载日志：确认材质识别、贴图解码与包围盒拟合是否按预期生效 */
export function logHouseInfo(label: string, house: LoadedHouse, fitScale: number) {
  const { materials, size, triangles, hasNormals, textureInfo } = house
  console.info(
    `${label} materials: ${materials.all.map((m) => m.name).join(', ')} | ` +
      `glass=${materials.glass.map((m) => m.name).join(',') || 'none'} | ` +
      `lamp=${materials.lamp.map((m) => m.name).join(',') || 'none'} | ` +
      `albedo=${textureInfo.albedo} | orm(ao)=${textureInfo.orm} | ` +
      `tris=${Math.round(triangles)} | normals=${hasNormals ? 'builtin' : 'computed(flat)'} | ` +
      `size=${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)} | scale=${fitScale.toFixed(3)}`,
  )
}

/* ================= 灯光 ================= */
export interface HouseLightRig {
  hemi: THREE.HemisphereLight
  key: THREE.DirectionalLight
  lamp: THREE.PointLight
  /** k = 0 日光 / 1 黑夜，按比例插值灯光与自发光 */
  apply(k: number): void
}

export interface HouseLightsOptions {
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  materials: HouseMaterials
  /** 灯源挂在模型所在 Group 上，跟着模型一起旋转 */
  lampParent: THREE.Object3D
  lampAnchor: THREE.Vector3
  /** 地面材质：夜里额外压暗，避免地面比白天亮 */
  groundMaterials?: THREE.MeshStandardMaterial[]
}

export function createHouseLights(opts: HouseLightsOptions): HouseLightRig {
  const { scene, renderer, materials, lampParent, lampAnchor } = opts
  const groundMaterials = opts.groundMaterials ?? []
  const groundTint = new THREE.Color()

  const hemi = new THREE.HemisphereLight(LIGHT_DAY.hemiSky, LIGHT_DAY.hemiGround, LIGHT_DAY.hemiIntensity)
  const key = new THREE.DirectionalLight(LIGHT_DAY.keyColor, LIGHT_DAY.keyIntensity)
  key.position.copy(LIGHT_DAY.keyPos)
  const lamp = new THREE.PointLight(0xffb45a, LIGHT_DAY.lampIntensity, 14, 2)
  lamp.position.copy(lampAnchor)

  scene.add(hemi, key)
  lampParent.add(lamp)

  function apply(k: number) {
    hemi.intensity = lerp(LIGHT_DAY.hemiIntensity, LIGHT_NIGHT.hemiIntensity, k)
    hemi.color.lerpColors(LIGHT_DAY.hemiSky, LIGHT_NIGHT.hemiSky, k)
    hemi.groundColor.lerpColors(LIGHT_DAY.hemiGround, LIGHT_NIGHT.hemiGround, k)
    key.intensity = lerp(LIGHT_DAY.keyIntensity, LIGHT_NIGHT.keyIntensity, k)
    key.color.lerpColors(LIGHT_DAY.keyColor, LIGHT_NIGHT.keyColor, k)
    key.position.lerpVectors(LIGHT_DAY.keyPos, LIGHT_NIGHT.keyPos, k)
    lamp.intensity = lerp(LIGHT_DAY.lampIntensity, LIGHT_NIGHT.lampIntensity, k)
    renderer.toneMappingExposure = lerp(LIGHT_DAY.exposure, LIGHT_NIGHT.exposure, k)
    for (const mat of materials.glass) {
      mat.emissiveIntensity = lerp(LIGHT_DAY.glassEmissive, LIGHT_NIGHT.glassEmissive, k)
    }
    for (const mat of materials.lamp) {
      mat.emissiveIntensity = lerp(LIGHT_DAY.lampEmissive, LIGHT_NIGHT.lampEmissive, k)
    }
    groundTint.lerpColors(GROUND_TINT_DAY, GROUND_TINT_NIGHT, k)
    for (const mat of groundMaterials) {
      const base = (mat.userData.baseColor as THREE.Color | undefined) ?? mat.color
      mat.color.copy(base).multiply(groundTint)
    }
  }

  return { hemi, key, lamp, apply }
}

/* ================= 取景 ================= */
export interface CameraFrame {
  target: THREE.Vector3
  /** 包围盒 8 个角相对 target 的偏移 */
  corners: THREE.Vector3[]
  viewDir: THREE.Vector3
}

/** 包围盒 8 角拟合：比包围球贴合得多，长宽比变化时不会留大片空白 */
export function makeCameraFrame(bounds: THREE.Box3, viewDir: THREE.Vector3): CameraFrame {
  const target = bounds.getCenter(new THREE.Vector3())
  const corners: THREE.Vector3[] = []
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        corners.push(new THREE.Vector3(x, y, z).sub(target))
      }
    }
  }
  return { target, corners, viewDir: viewDir.clone().normalize() }
}

/** 包围盒 8 角拟合所需的相机距离；拆出来供需要自行缩放取景的页面复用 */
export function frameDistance(
  frame: CameraFrame,
  camera: THREE.PerspectiveCamera,
  aspect: number,
  margin = 1.16,
): number {
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
  const tanH = tanV * aspect
  const forward = frame.viewDir.clone().negate()
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, forward).normalize()

  let dist = 0
  for (const c of frame.corners) {
    const along = c.dot(frame.viewDir)
    dist = Math.max(
      dist,
      along + Math.abs(c.dot(right)) * margin / tanH,
      along + Math.abs(c.dot(up)) * margin / tanV,
    )
  }
  return dist
}

export function applyCameraFrame(
  camera: THREE.PerspectiveCamera,
  frame: CameraFrame,
  aspect: number,
  margin = 1.16,
): void {
  const dist = frameDistance(frame, camera, aspect, margin)
  camera.position.copy(frame.viewDir).multiplyScalar(dist).add(frame.target)
  camera.lookAt(frame.target)
}

/* ================= 运行时：尺寸 / 停帧 / 销毁 ================= */
export interface StageRuntimeOptions {
  host: HTMLElement
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  env: StageEnv
  /** 画布尺寸变化后回调，用于更新相机纵横比与取景 */
  onResize: (width: number, height: number, aspect: number) => void
  /** 每次绘制的回调；dt = 0 表示单帧补绘（reduced-motion 或手动请求） */
  onRender: (elapsed: number, dt: number) => void
}

export interface StageRuntime {
  setActive(active: boolean): void
  resize(): void
  /** 单帧补绘（reduced-motion 下拖拽时手动刷新） */
  renderNow(): void
  dispose(): void
}

export function createStageRuntime(opts: StageRuntimeOptions): StageRuntime {
  const { host, renderer, camera, env, onResize, onRender } = opts
  let disposed = false
  let active = true
  let running = false
  let rafId = 0
  let lastTime = 0

  const canRender = () => !disposed && active && !document.hidden

  function renderOnce() {
    if (!canRender()) return
    onRender(performance.now() / 1000, 0)
  }

  function loop(now: number) {
    if (!running || disposed) return
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0
    lastTime = now
    onRender(now / 1000, dt)
    rafId = requestAnimationFrame(loop)
  }

  function start() {
    if (running || disposed || !active || document.hidden) return
    if (env.reduced) {
      renderOnce()
      return
    }
    running = true
    lastTime = 0
    rafId = requestAnimationFrame(loop)
  }

  function stop() {
    running = false
    cancelAnimationFrame(rafId)
    rafId = 0
  }

  function resize() {
    if (disposed) return
    const width = host.clientWidth
    const height = host.clientHeight
    if (width === 0 || height === 0) return
    renderer.setPixelRatio(clampDpr(env))
    renderer.setSize(width, height, false)
    const aspect = width / height
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    onResize(width, height, aspect)
    if (env.reduced) renderOnce()
  }

  function onVisibility() {
    if (document.hidden) stop()
    else start()
  }

  const ro = new ResizeObserver(() => resize())
  ro.observe(host)
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onVisibility)

  resize()

  function setActive(next: boolean) {
    active = next
    if (next) start()
    else stop()
  }

  function dispose() {
    if (disposed) return
    disposed = true
    stop()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('resize', resize)
  }

  return { setActive, resize, renderNow: renderOnce, dispose }
}

/* ================= 资源释放 ================= */
function disposeMaterial(material: THREE.Material, seen: Set<string>) {
  if (seen.has(material.uuid)) return
  seen.add(material.uuid)
  for (const value of Object.values(material as unknown as Record<string, unknown>)) {
    if (value instanceof THREE.Texture) value.dispose()
  }
  material.dispose()
}

/** 释放整棵场景树的几何、材质与材质引用的贴图 */
export function disposeSceneGraph(root: THREE.Object3D): void {
  const seen = new Set<string>()
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    if (!mesh.material) return
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of list) disposeMaterial(mat, seen)
  })
  root.clear()
}

/** 销毁渲染器并强制丢弃 WebGL 上下文与画布 */
export function releaseRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.dispose()
  renderer.forceContextLoss()
  renderer.domElement.remove()
}

/* ================= 单 WebGL 上下文约束 ================= */
const liveContexts = new Set<object>()

/**
 * 同一时间只允许一个 WebGL 上下文。
 * 另一个舞台还没销毁时直接拒绝创建（调用方走静态降级），
 * 避免路由切换瞬间叠出两个 context。
 */
export function claimWebGLContext(): object {
  if (liveContexts.size > 0) throw new Error('another WebGL context is still alive')
  const token = {}
  liveContexts.add(token)
  return token
}

export function releaseWebGLContext(token: object): void {
  liveContexts.delete(token)
}

/**
 * 等上一个舞台释放后再占用。
 * 路由切换时新页面可能先挂载、旧页面的销毁稍晚一步（iOS 回收 context 更慢），
 * 这里短暂等待而不是立刻抛错，避免首屏永久停在降级卡上。
 */
export async function acquireWebGLContext(timeoutMs = 1500): Promise<object> {
  const deadline = performance.now() + timeoutMs
  while (liveContexts.size > 0 && performance.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 60))
  }
  return claimWebGLContext()
}

/* ================= 阴影贴图 ================= */
export function makeShadowTexture(): THREE.CanvasTexture | null {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.7)')
  g.addColorStop(0.55, 'rgba(0,0,0,0.28)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
