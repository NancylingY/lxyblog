/**
 * 三渲二（Cel Shading）基础工具
 * - MeshToonMaterial + 三阶梯度贴图 → 硬边明暗分层
 * - EdgesGeometry 描边 →  Anime 风格清晰轮廓
 * - Canvas 程序化贴图 → 招牌 / 海报 / 杂志，零外部资源
 */
import * as THREE from 'three'

/* ============ 色板：雨夜霓虹 ============ */
export const C = {
  night: 0x141c2e,
  asphalt: 0x1d2432,
  asphaltWet: 0x161d29,
  sidewalk: 0x2b3345,
  sidewalkTop: 0x333d52,
  curb: 0x3c4759,
  paint: 0xd8e2ee,
  ink: 0x0a1020,

  storeWall: 0xc4d2e2,
  storeWallDark: 0x9fb0c4,
  storeTrim: 0xe9f1f9,
  signGreen: 0x35d07f,
  signGreenDeep: 0x148a52,

  warm: 0xffd79a,
  warmBright: 0xfff1d2,
  cyan: 0x7fe3ff,
  pink: 0xff7fb0,
  amber: 0xffb454,
  red: 0xff5f6d,
  orange: 0xff9a4d,

  interiorFloor: 0xf2e5cd,
  interiorShelf: 0xf2ece0,
  interiorWall: 0xfbf4e6,
} as const

/* ============ 梯度贴图 ============ */
let gradTex: THREE.DataTexture | null = null

function gradientMap() {
  if (gradTex) return gradTex
  // 4 阶：深影 → 中影 → 亮部 → 高光，最近邻采样保证硬边
  // 注意：RGBA 每像素 4 字节，4 像素必须给满 16 个值，否则最亮档会取到无效数据
  const steps = [
    62, 62, 62, 255,
    150, 150, 150, 255,
    216, 216, 216, 255,
    255, 255, 255, 255,
  ]
  const data = new Uint8Array(steps)
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  gradTex = tex
  return tex
}

/* ============ 卡通材质 ============ */
export interface ToonOpts {
  emissive?: number
  emissiveIntensity?: number
  map?: THREE.Texture | null
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
  depthWrite?: boolean
}

const matCache = new Map<string, THREE.MeshToonMaterial>()

export function toon(color: number, opts: ToonOpts = {}) {
  const key = [
    color,
    opts.emissive ?? -1,
    opts.emissiveIntensity ?? 1,
    opts.map?.uuid ?? '',
    opts.transparent ? 1 : 0,
    opts.opacity ?? 1,
    opts.side ?? 0,
    opts.depthWrite === false ? 0 : 1,
  ].join('|')

  const hit = matCache.get(key)
  if (hit) return hit

  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: gradientMap(),
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
  })
  if (opts.emissive !== undefined) {
    m.emissive = new THREE.Color(opts.emissive)
    m.emissiveIntensity = opts.emissiveIntensity ?? 1
  }
  if (opts.map) m.map = opts.map

  matCache.set(key, m)
  return m
}

/** 纯自发光材质：灯带、屏幕、霓虹 */
export function glowMat(color: number, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
  })
}

/** 叠加发光面片：光晕、积水反光条 */
export function additiveMat(color: number, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  })
}

/* ============ 描边 ============ */
const edgeMat = new THREE.LineBasicMaterial({
  color: 0x080d18,
  transparent: true,
  opacity: 0.62,
})

export function outline(mesh: THREE.Object3D & { geometry?: THREE.BufferGeometry }, threshold = 28) {
  if (!mesh.geometry) return null
  const edges = new THREE.EdgesGeometry(mesh.geometry as THREE.BufferGeometry, threshold)
  const line = new THREE.LineSegments(edges, edgeMat)
  line.renderOrder = 2
  mesh.add(line)
  return line
}

/* ============ 几何体工厂 ============ */
export interface BoxOpts extends ToonOpts {
  /** 是否描边，默认开启 */
  line?: boolean
  /** 描边阈值 */
  lineAngle?: number
}

export function box(w: number, h: number, d: number, color: number, opts: BoxOpts = {}) {
  const { line = true, lineAngle = 28, ...matOpts } = opts
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color, matOpts))
  if (line) outline(mesh, lineAngle)
  return mesh
}

export function cyl(
  rTop: number,
  rBottom: number,
  h: number,
  segments: number,
  color: number,
  opts: BoxOpts = {},
) {
  const { line = true, lineAngle = 30, ...matOpts } = opts
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), toon(color, matOpts))
  if (line) outline(mesh, lineAngle)
  return mesh
}

/** 放到指定坐标的快捷方法 */
export function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number) {
  obj.position.set(x, y, z)
  return obj
}

/* ============ Canvas 程序化贴图 ============ */
export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  draw(ctx, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** 便利店招牌贴图 */
export function signTexture() {
  return canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f4faf7'
    ctx.fillRect(0, 0, w, h)

    // 顶部与底部品牌色条
    ctx.fillStyle = '#2ec97a'
    ctx.fillRect(0, 0, w, 16)
    ctx.fillStyle = '#1ea862'
    ctx.fillRect(0, h - 16, w, 16)
    ctx.fillStyle = '#ffb454'
    ctx.fillRect(0, 20, w, 5)

    ctx.fillStyle = '#0d3b26'
    ctx.font = 'bold 62px "Hiragino Sans", "Noto Sans JP", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText('コンビニ', 40, h * 0.56)

    ctx.fillStyle = '#148a52'
    ctx.font = 'bold 44px "JetBrains Mono", monospace'
    ctx.fillText('KONBINI', 420, h * 0.55)

    // 24H 徽标
    ctx.fillStyle = '#ff8b3d'
    const bx = 830
    ctx.beginPath()
    ctx.roundRect(bx, 36, 150, 58, 10)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 40px "JetBrains Mono", monospace'
    ctx.fillText('24H', bx + 22, 66)
  })
}

/** 竖排侧招 */
export function sideSignTexture() {
  return canvasTexture(128, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f4faf7'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#2ec97a'
    ctx.fillRect(0, 0, 14, h)
    ctx.fillStyle = '#1ea862'
    ctx.fillRect(w - 14, 0, 14, h)
    ctx.fillStyle = '#0d3b26'
    ctx.font = 'bold 44px "Hiragino Sans", "Noto Sans JP", sans-serif'
    ctx.textAlign = 'center'
    const chars = ['コ', 'ン', 'ビ', 'ニ']
    chars.forEach((c, i) => ctx.fillText(c, w / 2, 90 + i * 108))
  })
}

/** 通用海报贴图 */
export function posterTexture(bg: string, accent: string, title: string, sub: string) {
  return canvasTexture(256, 340, (ctx, w, h) => {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(w * 0.72, h * 0.3, 66, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    ctx.arc(w * 0.36, h * 0.62, 90, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 34px "Hiragino Sans", "Noto Sans JP", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(title, 22, h * 0.78)
    ctx.font = '18px "Hiragino Sans", sans-serif'
    ctx.globalAlpha = 0.85
    ctx.fillText(sub, 22, h * 0.88)
  })
}

/** 杂志封面 */
export function magazineTexture(i: number) {
  const hues = ['#ff6f91', '#56c8ff', '#ffb454', '#8be04f', '#c792ea', '#ff9a4d']
  const hue = hues[i % hues.length]
  return canvasTexture(96, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f7f9fc'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = hue
    ctx.fillRect(0, 0, w, 40)
    ctx.globalAlpha = 0.5
    ctx.fillRect(6, 50, w - 12, 48)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#1a2230'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText('MAG', 8, 26)
    ctx.fillStyle = '#5a6675'
    ctx.font = '10px sans-serif'
    ctx.fillText('WEEKLY', 8, 110)
  })
}

/** 路面导视箭头 */
export function arrowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.moveTo(w / 2, 18)
    ctx.lineTo(w - 22, 56)
    ctx.lineTo(w * 0.62, 56)
    ctx.lineTo(w * 0.62, 108)
    ctx.lineTo(w * 0.38, 108)
    ctx.lineTo(w * 0.38, 56)
    ctx.lineTo(22, 56)
    ctx.closePath()
    ctx.fill()
  })
}

/** 公告栏 */
export function boardTexture() {
  return canvasTexture(384, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d9c9a8'
    ctx.fillRect(0, 0, w, h)
    const notes = [
      { x: 22, y: 24, w: 96, h: 118, c: '#fffdf5' },
      { x: 134, y: 18, w: 108, h: 92, c: '#ffe9b8' },
      { x: 256, y: 30, w: 104, h: 104, c: '#ffffff' },
      { x: 30, y: 156, w: 120, h: 74, c: '#ffd9e2' },
      { x: 168, y: 128, w: 84, h: 102, c: '#dff3ff' },
    ]
    notes.forEach((n, i) => {
      ctx.save()
      ctx.translate(n.x + n.w / 2, n.y + n.h / 2)
      ctx.rotate((i % 2 === 0 ? -1 : 1) * 0.03)
      ctx.fillStyle = n.c
      ctx.fillRect(-n.w / 2, -n.h / 2, n.w, n.h)
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.strokeRect(-n.w / 2, -n.h / 2, n.w, n.h)
      ctx.fillStyle = 'rgba(40,50,70,0.45)'
      for (let l = 0; l < 6; l++) {
        ctx.fillRect(-n.w / 2 + 8, -n.h / 2 + 14 + l * 14, n.w * 0.7, 3)
      }
      ctx.restore()
    })
  })
}

/** 自动贩卖机面板 */
export function vendingTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#eef6ff'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#2b57c8'
    ctx.fillRect(0, 0, w, 46)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText('DRINK', 16, 34)

    // 商品格
    const colors = ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#ff9f45', '#b06bff']
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = colors[(r * 3 + c) % colors.length]
        ctx.fillRect(18 + c * 76, 66 + r * 66, 58, 46)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillRect(26 + c * 76, 74 + r * 66, 12, 30)
        ctx.fillStyle = '#33405a'
        ctx.fillRect(18 + c * 76, 118 + r * 66, 58, 8)
      }
    }

    ctx.fillStyle = '#1b2438'
    ctx.fillRect(0, h - 96, w, 96)
    ctx.fillStyle = '#3ef0a0'
    ctx.font = 'bold 20px monospace'
    ctx.fillText('¥ 130', 20, h - 58)
    ctx.fillStyle = '#7f8da3'
    ctx.fillRect(140, h - 74, 92, 42)
  })
}

/** 路牌 */
export function streetSignTexture() {
  return canvasTexture(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#1d6fd6'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 5
    ctx.strokeRect(6, 6, w - 12, h - 12)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px "Hiragino Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('桜坂 2丁目', w / 2, h * 0.62)
  })
}

/** 積水微光径向渐变 */
let sheenTex: THREE.Texture | null = null
export function sheenTexture() {
  if (sheenTex) return sheenTex
  sheenTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(140, 210, 255, 0.55)')
    g.addColorStop(0.55, 'rgba(90, 150, 220, 0.18)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
  return sheenTex
}

/** 雨滴沿玻璃滑落 */
export function glassStreakMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      float hash(float n) { return fract(sin(n) * 43758.5453); }

      void main() {
        float col = floor(vUv.x * 54.0);
        float seed = hash(col * 1.37);
        float cx = fract(vUv.x * 54.0);

        // 列的软边
        float xw = smoothstep(0.5, 0.10, abs(cx - 0.5));

        // 只有一部分列在下雨
        float active = step(0.42, seed);

        float speed = 0.55 + seed * 1.15;
        float offset = hash(col * 7.11);

        // 水滴头部从下往上循环（视觉上是向下流）
        float hy = 1.0 - fract(uTime * 0.19 * speed + offset);
        float dy = vUv.y - hy;

        float len = 0.10 + seed * 0.20;
        float trail = smoothstep(len, 0.0, dy) * step(0.0, dy);
        float head = smoothstep(0.013, 0.0, abs(dy));

        float a = (trail * 0.42 + head * 0.85) * xw * active * uOpacity;
        if (a < 0.004) discard;

        vec3 col3 = mix(vec3(0.62, 0.82, 1.0), vec3(1.0, 0.90, 0.74), seed * 0.6);
        gl_FragColor = vec4(col3, a);
      }
    `,
  })
}
