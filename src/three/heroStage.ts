/**
 * 首屏 3D 展示卡
 * - 一块有厚度与圆角倒角的板，正面贴离屏 Canvas 绘制的文字纹理
 * - 小屋模型立在板前的展示台上，与板共用同一套灯光
 * - 日/夜用材质与灯光插值过渡，不重建场景
 * - 只在首屏可见时创建；隐藏/离屏停帧；销毁时释放全部 GPU 资源
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {
  LIGHT_DAY,
  LIGHT_NIGHT,
  applyCameraFrame,
  acquireWebGLContext,
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
import { createHouseDrag } from './houseDrag'

// 展示台的默认朝向与交互限位（拖拽逻辑与 /house 共用 houseDrag）
const BASE_YAW = -0.16
const BASE_PITCH = -0.02

const BOARD_W = 3.4
const BOARD_H = 3.4
const BOARD_D = 0.36
const FRONT_Z = BOARD_D / 2
const SHELF_W = 1.95
const SHELF_D = 1.42
const SHELF_H = 0.24
const SHELF_Z = FRONT_Z + SHELF_D / 2
// 小屋按包围盒拟合到台面内，换模型（如 v2）只换文件即可
const HOUSE_FIT_W = 1.8
const HOUSE_FIT_D = 1.3
// 卡面（含文字层）在板上的边长
const ART_SIZE = 3.06
// 卡面纹理边长：底板 1024 够用；文字层固定 1536（桌面由 2048 下调，移动端本来就是 1536）
const ART_BG_TEX = 1024
const ART_TEXT_TEX = 1536

export interface HeroStageOptions {
  /** 小屋模型地址，换模型只需替换该路径指向的文件 */
  url: string
  /** 地面模型地址；加载失败时只显示小屋 */
  groundUrl: string
  light: boolean
  onReady?: () => void
}

export interface HeroStageHandle {
  setLight(light: boolean): void
  setActive(active: boolean): void
  dispose(): void
}

/* ================= 纹理美术字 ================= */
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

type ArtPalette = {
  bgTop: string
  bgBottom: string
  glow: string
  ink: string
  muted: string
  teal: string
  amber: string
  grid: string
  card: string
  cardBorder: string
  cardShadow: string
}

const ART_DAY: ArtPalette = {
  bgTop: '#fffdf8',
  bgBottom: '#eef3f3',
  glow: 'rgba(255, 214, 150, 0.22)',
  ink: '#102630',
  muted: 'rgba(38, 66, 80, 0.72)',
  teal: '#0a6580',
  amber: '#9c5a12',
  grid: 'rgba(13, 116, 144, 0.07)',
  card: '#ffffff',
  cardBorder: 'rgba(16, 38, 48, 0.1)',
  cardShadow: 'rgba(16, 38, 48, 0.12)',
}

const ART_NIGHT: ArtPalette = {
  bgTop: '#101d26',
  bgBottom: '#0a1218',
  glow: 'rgba(61, 220, 132, 0.14)',
  ink: '#d6ecf2',
  muted: 'rgba(151, 183, 193, 0.62)',
  teal: '#6fe3ff',
  amber: '#ffb454',
  grid: 'rgba(111, 227, 255, 0.075)',
  card: '#16252f',
  cardBorder: 'rgba(160, 210, 225, 0.16)',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string) {
  const target = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in target) target.letterSpacing = value
}

/**
 * 卡面底板层：渐变、网格、两张悬浮卡片的面板与边框。
 * 数据量小、边缘柔和，1024 就够，不用跟文字层一起占显存。
 */
function drawArtBackground(ctx: CanvasRenderingContext2D, P: ArtPalette) {
  roundRect(ctx, 0, 0, 1024, 1024, 46)
  const bg = ctx.createLinearGradient(0, 0, 1024, 1024)
  bg.addColorStop(0, P.bgTop)
  bg.addColorStop(1, P.bgBottom)
  ctx.fillStyle = bg
  ctx.fill()

  ctx.save()
  ctx.clip()
  const glow = ctx.createRadialGradient(820, 120, 20, 820, 120, 420)
  glow.addColorStop(0, P.glow)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1024, 1024)

  // 细网格
  ctx.strokeStyle = P.grid
  ctx.lineWidth = 1.4
  for (let i = 64; i < 1024; i += 64) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 1024)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(1024, i)
    ctx.stroke()
  }
  ctx.restore()

  // 悬浮卡片：延续原 2D 卡的分层结构（代码卡 + 数据卡）
  const cardPanel = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.save()
    ctx.shadowColor = P.cardShadow
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 10
    roundRect(ctx, x, y, w, h, r)
    ctx.fillStyle = P.card
    ctx.fill()
    ctx.restore()
    ctx.lineWidth = 1.6
    ctx.strokeStyle = P.cardBorder
    roundRect(ctx, x, y, w, h, r)
    ctx.stroke()
  }
  cardPanel(56, 48, 912, 628, 26)
  cardPanel(56, 690, 380, 294, 22)
}

/**
 * 卡面分层绘制，坐标仍是 1024 的设计坐标系。
 * - bg：底板渐变、网格、卡片面板（1024，够用即可）
 * - text：文字、色点、柱状条（按屏幕像素反算的高分辨率）
 * 两者都直接按纹理分辨率绘制，缩到屏幕时由 mipmap 降采样，笔画不会二次插值发虚。
 * 只在尺寸或主题变化时调用。
 */
function drawArtwork(
  canvas: HTMLCanvasElement,
  size: number,
  light: boolean,
  compact: boolean,
  layer: 'bg' | 'text',
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = size
  canvas.height = size

  const P = light ? ART_DAY : ART_NIGHT
  const u = size / 1024
  ctx.setTransform(u, 0, 0, u, 0, 0)
  ctx.clearRect(0, 0, 1024, 1024)

  const font = (px: number, weight = 400) => `${weight} ${px}px ${FONT_MONO}`

  // 背景层画完直接返回，文字层画布保持透明
  if (layer === 'bg') {
    drawArtBackground(ctx, P)
    return
  }

  // 顶部：三个圆点 + 文件名
  const dots: Array<[string, number]> = [
    [P.amber, 96],
    [P.teal, 126],
    [P.muted, 156],
  ]
  for (const [color, x] of dots) {
    ctx.beginPath()
    ctx.arc(x, 96, 8, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
  ctx.font = font(30)
  ctx.textAlign = 'right'
  ctx.fillStyle = P.muted
  ctx.fillText('practice.ts', 944, 106)

  // 小屏（窄舞台）放大主要文字，保证 390px 宽度下仍可读
  const codeSize = compact ? 58 : 48
  const codeGap = compact ? 92 : 78
  const codeTop = compact ? 196 : 210

  // 代码块
  type Seg = [text: string, color: string]
  const lines: Seg[][] = [
    [['const ', P.amber], ['practice = {', P.ink]],
    [['  role: ', P.ink], ["'full-stack'", P.teal], [',', P.ink]],
    [['  flow: ', P.ink], ["'design → ship'", P.teal], [',', P.ink]],
    [['  shipped: ', P.ink], ['6', P.amber], [',', P.ink]],
    [['}', P.ink]],
  ]
  ctx.font = font(codeSize)
  ctx.textAlign = 'left'
  lines.forEach((segments, row) => {
    const y = codeTop + row * codeGap
    let x = 96
    for (const [text, color] of segments) {
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
      x += ctx.measureText(text).width
    }
  })

  // 状态行
  const statusY = compact ? 662 : 592
  const statusSize = compact ? 34 : 26
  ctx.beginPath()
  ctx.arc(104, statusY, compact ? 9 : 7, 0, Math.PI * 2)
  ctx.fillStyle = P.amber
  ctx.fill()
  ctx.font = font(statusSize)
  setLetterSpacing(ctx, compact ? '3px' : '2.4px')
  ctx.fillStyle = P.muted
  ctx.fillText('OPEN TO SELECTED WORK', 124, statusY + statusSize * 0.32)
  setLetterSpacing(ctx, '0px')

  // 左下：设计 token
  const labelSize = compact ? 32 : 24
  const tokensY = compact ? 754 : 726
  ctx.font = font(labelSize)
  setLetterSpacing(ctx, '3px')
  ctx.fillStyle = P.muted
  ctx.fillText('DESIGN TOKENS', 96, tokensY)
  setLetterSpacing(ctx, '0px')

  const swatchR = compact ? 23 : 18
  const swatchGap = compact ? 76 : 62
  const swatchY = compact ? 798 : 754
  const swatches: Array<[string, string]> = [
    [P.ink, 'rgba(255,255,255,0.35)'],
    [P.teal, P.teal],
    [P.amber, P.amber],
  ]
  swatches.forEach(([fill, ring], i) => {
    ctx.beginPath()
    ctx.arc(96 + swatchR + i * swatchGap, swatchY, swatchR, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = ring
    ctx.stroke()
  })

  // 左下：交付数量
  const shippedY = compact ? 872 : 846
  ctx.font = font(labelSize)
  setLetterSpacing(ctx, '3px')
  ctx.fillStyle = P.muted
  ctx.fillText('SHIPPED', 96, shippedY)
  setLetterSpacing(ctx, '0px')
  const metricSize = compact ? 104 : 84
  const metricY = compact ? 972 : 924
  ctx.font = font(metricSize, 700)
  ctx.fillStyle = P.ink
  ctx.fillText('06', 96, metricY)

  // 柱状条
  const bars = [38, 66, 48, 82]
  bars.forEach((h, i) => {
    const bh = h * (compact ? 1.15 : 0.9)
    const x = (compact ? 240 : 232) + i * (compact ? 32 : 26)
    const bw = compact ? 20 : 16
    const y = metricY - bh + 8
    const g = ctx.createLinearGradient(0, y, 0, y + bh)
    g.addColorStop(0, i % 2 === 1 ? P.amber : P.teal)
    g.addColorStop(1, i % 2 === 1 ? 'rgba(255,180,84,0.18)' : 'rgba(111,227,255,0.16)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(x, y, bw, bh, 5)
    ctx.fill()
  })
}

// 接触阴影贴图与资源释放统一走 houseKit

export async function createHeroStageScene(
  host: HTMLElement,
  opts: HeroStageOptions,
): Promise<HeroStageHandle> {
  const env = detectStageEnv()

  // 同一时间只允许一个 WebGL 上下文；转码器要先知道设备支持哪些压缩格式，
  // 所以渲染器先建，模型加载失败时连同渲染器一起释放，不留 context
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

  /* ================= 场景与展示台 ================= */
  const scene = new THREE.Scene()
  const display = new THREE.Group()
  display.rotation.set(BASE_PITCH, BASE_YAW, 0)
  scene.add(display)

  // 板：厚 0.36、圆角倒角 0.14
  const boardMat = new THREE.MeshStandardMaterial({
    color: LIGHT_DAY.surface.clone(),
    roughness: 0.72,
    metalness: 0.04,
  })
  const board = new THREE.Mesh(new RoundedBoxGeometry(BOARD_W, BOARD_H, BOARD_D, 4, 0.14), boardMat)
  board.position.y = BOARD_H / 2
  display.add(board)

  // 板前展示台，小屋立在台面上
  const shelf = new THREE.Mesh(
    new RoundedBoxGeometry(SHELF_W, SHELF_H, SHELF_D, 3, 0.09),
    boardMat,
  )
  shelf.position.set(0.55, SHELF_H / 2, SHELF_Z)
  display.add(shelf)

  /* ================= 卡面：底板层 + 文字层 ================= */
  // 底板（渐变/网格/面板）1024 足够；文字层单独用高分辨率纹理，只多占一张小图
  const bgCanvas = document.createElement('canvas')
  const bgTexture = new THREE.CanvasTexture(bgCanvas)
  const textCanvas = document.createElement('canvas')
  const textTexture = new THREE.CanvasTexture(textCanvas)
  for (const tex of [bgTexture, textTexture]) {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = true
  }
  // 卡面是"印刷品"：不参与灯光衰减，保证日夜切换后文字始终可读
  const bgMat = new THREE.MeshBasicMaterial({
    map: bgTexture,
    toneMapped: false,
    transparent: true,
  })
  const textMat = new THREE.MeshBasicMaterial({
    map: textTexture,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
  })
  const artwork = new THREE.Mesh(new THREE.PlaneGeometry(ART_SIZE, ART_SIZE), bgMat)
  artwork.position.set(0, BOARD_H / 2, FRONT_Z + 0.003)
  const artText = new THREE.Mesh(new THREE.PlaneGeometry(ART_SIZE, ART_SIZE), textMat)
  artText.position.set(0, BOARD_H / 2, FRONT_Z + 0.0045)
  artText.renderOrder = 1
  display.add(artwork, artText)

  /* ================= 小屋 ================= */
  // 模型已由 houseKit 归一化：底面贴 y=0、水平居中
  const { model, materials } = loaded
  const house = new THREE.Group()
  house.add(model)
  // 同时受台面宽、深约束，换模型后自动适配，不用改代码
  const fitScale = Math.min(
    HOUSE_FIT_W / Math.max(loaded.size.x, 0.001),
    HOUSE_FIT_D / Math.max(loaded.size.z, 0.001),
  )
  house.scale.setScalar(fitScale)
  house.position.set(0.55, SHELF_H, SHELF_Z)
  display.add(house)

  logHouseInfo('[heroStage]', loaded, fitScale)

  display.updateMatrixWorld(true)
  const houseBounds = new THREE.Box3().setFromObject(house)
  const houseCenter = houseBounds.getCenter(new THREE.Vector3())
  const houseCenterLocal = display.worldToLocal(houseCenter.clone())

  // 接触阴影（display 局部坐标，落在台面上）
  const shadowTexture = makeShadowTexture()
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture ?? undefined,
    transparent: true,
    opacity: LIGHT_DAY.shadowOpacity,
    depthWrite: false,
  })
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.28), shadowMat)
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.set(houseCenterLocal.x, SHELF_H + 0.018, houseCenterLocal.z)
  display.add(contactShadow)

  /* ================= 灯光 ================= */
  // 灯源挂在 house 上，跟模型一起缩放/旋转；其余灯光与曝光由 houseKit 统一插值
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

  /* ================= 相机 ================= */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  // 取景以展示台与房屋为主体：地面晚到且只是脚下的小地块，不计入包围盒
  const displayBounds = new THREE.Box3().setFromObject(display)
  const frame = makeCameraFrame(displayBounds, new THREE.Vector3(0.1, 0.14, 1))

  // 倾斜面：各向异性拉到设备上限（一般 16），减轻斜视角下纹理被 mip 抹平
  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy())
  bgTexture.anisotropy = maxAniso
  textTexture.anisotropy = maxAniso
  if (shadowTexture) shadowTexture.anisotropy = maxAniso
  // 小屋贴图同样开各向异性，斜视角下纹路与窗框不发糊
  for (const mat of materials.all) {
    if (mat.map) mat.map.anisotropy = maxAniso
    if (mat.metalnessMap) mat.metalnessMap.anisotropy = maxAniso
    if (mat.roughnessMap) mat.roughnessMap.anisotropy = maxAniso
  }

  /* ================= 地面：晚到淡入 ================= */
  // 与房屋共用同一原点与比例：套用房屋归一化的同一偏移，再跟随房屋的缩放与落点。
  // 失败或未就绪时房子照常显示，不回退到其它地面。
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
      const groundScale = fitGroundScale(g, SHELF_W, SHELF_D)
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
      logGroundInfo('[heroStage]', g, groundScale)
    })
    .catch(() => console.info('[heroStage] ground unavailable, house only'))

  /* ================= 卡面纹理 / 重绘 ================= */
  // 尺寸固定，只有主题或小屏字号变化时才重绘
  let artLight = opts.light
  let artCompact: boolean | null = null

  function refreshArtwork(force = false) {
    const compact = (host.clientWidth || 460) <= 380
    if (!force && opts.light === artLight && compact === artCompact) return
    artLight = opts.light
    artCompact = compact
    drawArtwork(bgCanvas, ART_BG_TEX, opts.light, compact, 'bg')
    drawArtwork(textCanvas, ART_TEXT_TEX, opts.light, compact, 'text')
    bgTexture.needsUpdate = true
    textTexture.needsUpdate = true
  }

  /* ================= 运行时 ================= */
  let mix = opts.light ? 0 : 1
  let targetMix = mix

  // 拖拽旋转：整块展示卡一起转，房屋与台面/地面保持贴合
  const drag = createHouseDrag({
    host,
    object: display,
    baseYaw: BASE_YAW,
    basePitch: BASE_PITCH,
    reduced: env.reduced,
    sway: 0.028,
    swaySpeed: 0.16,
    onReducedFrame: () => runtime.renderNow(),
  })

  // 灯光、曝光、玻璃/灯具自发光由共用层插值；板与接触阴影是本卡自己的材质
  function applyMix(k: number) {
    lights.apply(k)
    boardMat.color.lerpColors(LIGHT_DAY.surface, LIGHT_NIGHT.surface, k)
    shadowMat.opacity = lerp(LIGHT_DAY.shadowOpacity, LIGHT_NIGHT.shadowOpacity, k)
  }

  const runtime = createStageRuntime({
    host,
    renderer,
    camera,
    env,
    onResize: (_width, _height, aspect) => {
      applyCameraFrame(camera, frame, aspect, 1.16)
      refreshArtwork()
    },
    onRender: (elapsed, dt) => {
      const delta = targetMix - mix
      if (Math.abs(delta) <= 0.001) mix = targetMix
      else if (dt > 0) mix += delta * (1 - Math.exp(-dt * 7))
      drag.update(elapsed, dt)
      if (!env.reduced) {
        // 极小幅度浮动：只是让板"活"一点，不摇镜头
        display.position.y = Math.sin(elapsed * 0.5) * 0.012
      }
      applyMix(mix)
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
    refreshArtwork(true)
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
    bgTexture.dispose()
    textTexture.dispose()
    shadowTexture?.dispose()
    ktx2.dispose()
    releaseRenderer(renderer)
    releaseWebGLContext(contextToken)
  }

  display.updateMatrixWorld(true)
  runtime.renderNow()
  runtime.setActive(true)
  opts.onReady?.()

  return { setLight, setActive, dispose }
}
