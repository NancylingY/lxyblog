/**
 * 首屏全幅 3D 动态视觉引擎：流体晶体与星轨仪（Kinetic Astrolabe）
 * - 纯程序化 Three.js + 自定义 GLSL 着色器，零外部模型下载、首帧即显
 * - 日光模式（海岸清晨）：瓷白/深海青/落日琥珀珠光晶体 + 海雾微粒 + 柔光海浪网格
 * - 深夜模式（开发者终端）：黑曜石/磷光绿/电光青霓虹晶体 + 星尘矩阵 + 能量地形波
 * - 支持三种形态实时变形（0 流体晶体 / 1 量子晶格 / 2 星轨核心）
 * - 支持指针视差、拖拽惯性旋转、点击/按钮触发径向能量脉冲波
 * - 自动追踪 DOM 槽位（slotEl）完成桌面右偏 / 手机居上精确取景，永不与文字重叠
 */
import * as THREE from 'three'
import {
  acquireWebGLContext,
  createStageRenderer,
  createStageRuntime,
  detectStageEnv,
  disposeSceneGraph,
  releaseRenderer,
  releaseWebGLContext,
} from './houseKit'

export type HeroKineticMode = 0 | 1 | 2

export interface HeroKineticOptions {
  light: boolean
  mode?: HeroKineticMode
  /** 决定 3D 主体中心与缩放的布局占位槽（桌面右侧 / 移动端上方） */
  slotEl?: HTMLElement | null
  onReady?: () => void
}

export interface HeroKineticHandle {
  setLight(light: boolean): void
  setMode(mode: HeroKineticMode): void
  setActive(active: boolean): void
  setSlotEl(el: HTMLElement | null): void
  pulse(): void
  dispose(): void
}

/* ================= GLSL 3D Simplex Noise ================= */
const SIMPLEX_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

/* ================= 核心流体晶体着色器 ================= */
const CORE_VERT = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform vec3 uWeights; // x: Prism, y: Lattice, z: Pulse
uniform vec2 uPointer;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vDisp;
varying float vWave;
varying vec3 vWorldPos;

${SIMPLEX_GLSL}

float evalDisp(vec3 n) {
  float t = uTime;

  // 0: 流体晶体（柔顺有机流动波）
  float n1 = snoise(n * 1.65 + vec3(t * 0.24, t * 0.19, -t * 0.15));
  float n2 = snoise(n * 3.1 - vec3(t * 0.32, -t * 0.22, t * 0.18)) * 0.35;
  float dPrism = (n1 + n2) * 0.21;

  // 1: 量子晶格（锐利折面与晶体棱角）
  float ridge = 1.0 - abs(snoise(n * 2.55 + vec3(0.0, t * 0.28, t * 0.2)));
  float facet = pow(clamp(ridge, 0.0, 1.0), 2.4) * 0.34 - 0.11;
  float latticeGrid = sin(n.x * 11.0 + t * 0.6) * sin(n.y * 11.0 - t * 0.5) * sin(n.z * 11.0) * 0.045;
  float dLattice = facet + latticeGrid;

  // 2: 星轨核心（谐振驻波与高能波动）
  float lat = sin(n.y * 8.5 - t * 2.6) * 0.14;
  float lon = cos(atan(n.z, n.x) * 4.0 + t * 1.4) * 0.08 * (1.0 - abs(n.y));
  float breath = snoise(n * 2.1 + vec3(t * 0.45)) * 0.13;
  float dPulse = lat + lon + breath;

  // 脉冲冲击波：由底部扫向顶部的能量环
  float ringPhase = (1.0 - uPulse) * 2.4 - 1.2;
  float ring = exp(-pow((n.y - ringPhase) * 4.2, 2.0)) * uPulse * 0.28;

  // 指针轻微磁吸隆起
  vec3 ptrDir = normalize(vec3(uPointer.x * 0.9, uPointer.y * 0.9, 1.0));
  float ptrPull = pow(max(dot(n, ptrDir), 0.0), 4.0) * 0.085;

  return dPrism * uWeights.x + dLattice * uWeights.y + dPulse * uWeights.z + ring + ptrPull;
}

void main() {
  vec3 n = normalize(position);
  float disp = evalDisp(n);

  // 有限差分重算平滑法线，让着色器高光与折面清晰锐利
  vec3 tangent = normalize(abs(n.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : cross(vec3(0.0, 1.0, 0.0), n));
  vec3 bitangent = normalize(cross(n, tangent));
  float eps = 0.024;
  vec3 nT = normalize(n + tangent * eps);
  vec3 nB = normalize(n + bitangent * eps);
  vec3 p0 = position + n * disp;
  vec3 pT = nT * (length(position) + evalDisp(nT));
  vec3 pB = nB * (length(position) + evalDisp(nB));
  vec3 calcNormal = normalize(cross(pT - p0, pB - p0));

  vec4 worldPos = modelMatrix * vec4(p0, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * calcNormal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vDisp = disp;
  vWave = sin(n.y * 10.0 - uTime * 3.0) * 0.5 + 0.5;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const CORE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uNight;
uniform float uPulse;
uniform vec3 uWeights;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vDisp;
varying float vWave;
varying vec3 vWorldPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - NdotV, 2.55);
  float sharpRim = pow(1.0 - NdotV, 4.4);

  // 三点立体照明（主光 + 边缘暖/冷辅光 + 底部反光）
  vec3 L1 = normalize(vec3(0.62, 0.78, 0.65));
  vec3 L2 = normalize(vec3(-0.75, -0.25, 0.55));
  float diff1 = max(dot(N, L1), 0.0);
  float diff2 = max(dot(N, L2), 0.0);
  vec3 H1 = normalize(L1 + V);
  vec3 H2 = normalize(L2 + V);
  float spec1 = pow(max(dot(N, H1), 0.0), 46.0);
  float spec2 = pow(max(dot(N, H2), 0.0), 22.0);

  // 位移归一化因子，控制峰谷层次感
  float peak = smoothstep(-0.18, 0.24, vDisp);

  // —— 日光色板：海岸清晨（深海青 + 暖瓷白 + 落日金虹彩）——
  vec3 dayDeep = vec3(0.04, 0.28, 0.39);       // 深海青
  vec3 dayMid  = vec3(0.07, 0.54, 0.64);       // 澄澈海蓝青
  vec3 dayPeak = vec3(0.95, 0.93, 0.87);       // 暖瓷高光
  vec3 dayRim  = vec3(0.96, 0.64, 0.22);       // 落日琥珀金
  vec3 dayIridescent = mix(
    vec3(0.11, 0.74, 0.78),
    vec3(0.98, 0.72, 0.34),
    0.5 + 0.5 * sin(NdotV * 5.2 + vDisp * 9.0 + uTime * 0.7)
  );

  vec3 dayCol = mix(dayDeep, dayMid, smoothstep(0.0, 0.72, diff1 * 0.72 + peak * 0.45));
  dayCol = mix(dayCol, dayPeak, pow(diff1, 1.8) * 0.52 + peak * 0.28);
  dayCol += dayIridescent * fresnel * 0.62;
  dayCol += dayRim * sharpRim * 0.75;
  dayCol += vec3(1.0, 0.97, 0.90) * spec1 * 0.95;
  dayCol += vec3(0.24, 0.76, 0.85) * spec2 * 0.32;

  // —— 深夜色板：开发者终端（黑曜石 + 磷光绿 + 电光青 + 琥珀微光）——
  vec3 nightDeep = vec3(0.025, 0.06, 0.095);   // 黑曜石底
  vec3 nightMid  = vec3(0.05, 0.24, 0.28);     // 幽蓝青
  vec3 nightGlow = vec3(0.24, 0.86, 0.52);     // 磷光绿 #3ddc84
  vec3 nightCyan = vec3(0.34, 0.78, 1.0);      // 电光青 #56c8ff
  vec3 nightAmber = vec3(1.0, 0.71, 0.33);     // 琥珀 #ffb454

  vec3 nightIridescent = mix(
    nightGlow,
    nightCyan,
    0.5 + 0.5 * sin(NdotV * 5.5 - uTime * 0.9 + vDisp * 10.0)
  );
  vec3 nightCol = mix(nightDeep, nightMid, diff1 * 0.6 + peak * 0.48);
  // 晶体峰顶能量脉络
  float vein = smoothstep(0.56, 0.92, peak) * (0.45 + 0.55 * uWeights.y + 0.35 * uWeights.z);
  nightCol += mix(nightGlow, nightAmber, uWeights.z * 0.5) * vein * 0.55;
  nightCol += nightIridescent * fresnel * 1.15;
  nightCol += mix(nightCyan, nightAmber, 0.35) * sharpRim * 0.85;
  nightCol += vec3(0.86, 1.0, 0.96) * spec1 * 1.05;
  nightCol += nightCyan * diff2 * 0.28 + nightGlow * spec2 * 0.45;

  vec3 col = mix(dayCol, nightCol, uNight);

  // 星轨核心模式：叠加柔和水平能量条纹
  float scanBand = smoothstep(0.65, 0.98, vWave) * uWeights.z;
  vec3 bandTint = mix(vec3(0.98, 0.76, 0.38), vec3(0.34, 0.92, 0.65), uNight);
  col += bandTint * scanBand * 0.22;

  // 点击脉冲瞬间提亮整颗晶体边缘
  vec3 pulseTint = mix(vec3(1.0, 0.84, 0.48), vec3(0.42, 1.0, 0.74), uNight);
  col += pulseTint * uPulse * (0.28 + fresnel * 0.95);

  gl_FragColor = vec4(col, 0.97);
}
`

/* ================= 全幅氛围波浪地平线着色器 ================= */
const WAVE_VERT = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform vec2 uPointer;

varying float vElev;
varying float vFade;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float dist = length(pos.xz);

  float w1 = sin(pos.x * 0.55 + uTime * 0.72) * cos(pos.z * 0.5 - uTime * 0.55) * 0.24;
  float w2 = sin((pos.x + pos.z) * 0.95 - uTime * 1.15) * 0.08;
  float ripple = sin(dist * 2.8 - (1.0 - uPulse) * 14.0) * exp(-dist * 0.28) * uPulse * 0.38;

  pos.y += w1 + w2 + ripple + (uPointer.y * 0.08);
  vElev = w1 + w2 + ripple;
  vFade = smoothstep(9.5, 2.2, dist);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const WAVE_FRAG = /* glsl */ `
uniform float uNight;
uniform float uPulse;

varying float vElev;
varying float vFade;
varying vec2 vUv;

void main() {
  // 零扩展依赖的细密发光网格 + 交叉星点，兼容全部移动端 GPU
  vec2 cell = fract(vUv * 26.0) - 0.5;
  float gx = smoothstep(0.455, 0.498, abs(cell.x));
  float gy = smoothstep(0.455, 0.498, abs(cell.y));
  float line = max(gx, gy);
  float node = smoothstep(0.11, 0.02, length(abs(cell) - vec2(0.5)));

  vec3 dayCol = mix(vec3(0.05, 0.45, 0.56), vec3(0.76, 0.44, 0.08), smoothstep(-0.18, 0.22, vElev));
  vec3 nightCol = mix(vec3(0.18, 0.78, 0.50), vec3(0.34, 0.78, 1.0), smoothstep(-0.18, 0.22, vElev));
  vec3 col = mix(dayCol, nightCol, uNight);

  float baseAlpha = mix(0.24, 0.36, uNight) + uPulse * 0.22;
  float alpha = (line * 0.85 + node * 0.9) * vFade * baseAlpha;
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(col, alpha);
}
`

/* ================= 氛围粒子星尘着色器 ================= */
const PARTICLE_VERT = /* glsl */ `
attribute float aScale;
attribute float aPhase;
attribute float aColorMix;

uniform float uTime;
uniform float uDpr;
uniform float uPulse;
uniform vec2 uPointer;

varying float vAlpha;
varying float vMix;

void main() {
  vec3 pos = position;
  float t = uTime * 0.38 + aPhase;

  pos.x += sin(t * 1.1 + pos.y * 0.5) * 0.22 + uPointer.x * 0.25 * (0.4 + aScale * 0.3);
  pos.y += cos(t * 0.85 + pos.x * 0.4) * 0.20 + uPointer.y * 0.22 * (0.4 + aScale * 0.3);
  pos.z += sin(t * 0.7 + aPhase) * 0.16;

  // 脉冲时微粒略微向外扩散闪烁
  pos += normalize(pos + vec3(0.0001)) * uPulse * 0.32;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  float depthSize = clamp(24.0 / max(-mvPos.z, 1.5), 1.8, 10.0);
  gl_PointSize = aScale * depthSize * uDpr * (1.0 + uPulse * 0.35);

  float twinkle = 0.55 + 0.45 * sin(uTime * 1.7 + aPhase * 3.0);
  vAlpha = twinkle * smoothstep(-14.0, -3.5, mvPos.z);
  vMix = aColorMix;
}
`

const PARTICLE_FRAG = /* glsl */ `
uniform float uNight;
uniform float uPulse;

varying float vAlpha;
varying float vMix;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.06, d);
  float glow = pow(core, 1.8);

  vec3 dayCol = mix(vec3(0.05, 0.46, 0.57), vec3(0.84, 0.50, 0.10), vMix);
  vec3 nightCol = mix(vec3(0.24, 0.86, 0.52), vec3(0.34, 0.78, 1.0), vMix);
  vec3 col = mix(dayCol, nightCol, uNight);

  float alpha = glow * vAlpha * (mix(0.62, 0.88, uNight) + uPulse * 0.25);
  gl_FragColor = vec4(col, alpha);
}
`

/** 程序化生成卫星柔光晕纹理（64×64） */
function makeGlowSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
  grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.65)')
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.14)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export async function createHeroKineticScene(
  host: HTMLElement,
  opts: HeroKineticOptions,
): Promise<HeroKineticHandle> {
  const env = detectStageEnv()
  const contextToken = await acquireWebGLContext()

  let renderer: THREE.WebGLRenderer
  try {
    renderer = createStageRenderer(env)
  } catch (error) {
    releaseWebGLContext(contextToken)
    throw error
  }

  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.style.pointerEvents = 'none'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60)
  camera.position.set(0, 0.15, 7.6)

  /* ================= 灯光（用于星轨环与浮空微晶） ================= */
  const ambient = new THREE.AmbientLight(0xffffff, 0.75)
  const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.0)
  keyLight.position.set(5, 6, 5)
  const rimLight = new THREE.DirectionalLight(0x3ddc84, 1.4)
  rimLight.position.set(-5, -2, 4)
  scene.add(ambient, keyLight, rimLight)

  /* ================= 主体 3D 舞台组（自动对齐 DOM 槽位） ================= */
  const stageRoot = new THREE.Group()
  scene.add(stageRoot)

  const sculpture = new THREE.Group()
  stageRoot.add(sculpture)

  // 1. 核心流体晶体
  const coreDetail = env.lowPower ? 14 : env.coarse ? 20 : 28
  const coreGeo = new THREE.IcosahedronGeometry(1.06, coreDetail)
  const modeWeights = new THREE.Vector3(1, 0, 0)
  const targetWeights = new THREE.Vector3(1, 0, 0)
  const setTargetWeights = (m: HeroKineticMode) => {
    targetWeights.set(m === 0 ? 1 : 0, m === 1 ? 1 : 0, m === 2 ? 1 : 0)
  }
  setTargetWeights(opts.mode ?? 0)
  modeWeights.copy(targetWeights)

  const pointerUniform = new THREE.Vector2(0, 0)
  const coreUniforms = {
    uTime: { value: 0 },
    uNight: { value: opts.light ? 0 : 1 },
    uPulse: { value: 0 },
    uWeights: { value: modeWeights },
    uPointer: { value: pointerUniform },
  }
  const coreMat = new THREE.ShaderMaterial({
    vertexShader: CORE_VERT,
    fragmentShader: CORE_FRAG,
    uniforms: coreUniforms,
    transparent: true,
  })
  const coreMesh = new THREE.Mesh(coreGeo, coreMat)
  sculpture.add(coreMesh)

  // 2. 外层多面体能量晶格线框
  const cageGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.42, 1))
  const cageMat = new THREE.LineBasicMaterial({
    color: 0x0d7490,
    transparent: true,
    opacity: 0.28,
  })
  const cage = new THREE.LineSegments(cageGeo, cageMat)
  sculpture.add(cage)

  // 3. 三层精密陀螺星轨环 + 游走卫星节点（Design · Code · AI）
  const glowTex = makeGlowSpriteTexture()
  const ringConfigs = [
    { radius: 1.78, tube: 0.012, tiltX: 1.18, tiltZ: 0.34, speed: 0.32, satPhase: 0.4, accent: 'primary' as const },
    { radius: 2.12, tube: 0.009, tiltX: -0.92, tiltZ: 0.62, speed: -0.24, satPhase: 2.3, accent: 'secondary' as const },
    { radius: 2.48, tube: 0.007, tiltX: 0.48, tiltZ: -0.82, speed: 0.17, satPhase: 4.5, accent: 'amber' as const },
  ]

  interface OrbitEntry {
    pivot: THREE.Group
    ringMat: THREE.MeshStandardMaterial
    satPivot: THREE.Group
    satMat: THREE.MeshBasicMaterial
    haloMat: THREE.SpriteMaterial
    speed: number
    accent: 'primary' | 'secondary' | 'amber'
  }

  const orbits: OrbitEntry[] = []
  const satGeo = new THREE.SphereGeometry(0.056, 16, 16)

  for (const cfg of ringConfigs) {
    const pivot = new THREE.Group()
    pivot.rotation.set(cfg.tiltX, 0, cfg.tiltZ)

    const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 12, 128)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x0d7490,
      emissive: 0x0d7490,
      emissiveIntensity: 0.35,
      metalness: 0.22,
      roughness: 0.3,
      transparent: true,
      opacity: 0.78,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    pivot.add(ringMesh)

    // 卫星球体 + 柔光晕
    const satPivot = new THREE.Group()
    satPivot.rotation.z = cfg.satPhase
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const satMesh = new THREE.Mesh(satGeo, satMat)
    satMesh.position.set(cfg.radius, 0, 0)

    const haloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x0d7490,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const halo = new THREE.Sprite(haloMat)
    halo.position.copy(satMesh.position)
    halo.scale.setScalar(0.36)

    satPivot.add(satMesh, halo)
    pivot.add(satPivot)
    sculpture.add(pivot)

    orbits.push({
      pivot,
      ringMat,
      satPivot,
      satMat,
      haloMat,
      speed: cfg.speed,
      accent: cfg.accent,
    })
  }

  // 4. 浮空微晶碎片群（单次 InstancedMesh 绘制）
  const shardCount = env.lowPower ? 14 : env.coarse ? 20 : 34
  const shardGeo = new THREE.OctahedronGeometry(0.055, 0)
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x1aa6b7,
    emissive: 0x0d7490,
    emissiveIntensity: 0.42,
    metalness: 0.16,
    roughness: 0.26,
    flatShading: true,
    transparent: true,
    opacity: 0.88,
  })
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, shardCount)
  const shardSeeds = Array.from({ length: shardCount }, (_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / shardCount)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    return {
      radius: 1.75 + (i % 5) * 0.28,
      phi,
      theta,
      speed: (i % 2 === 0 ? 1 : -1) * (0.12 + (i % 7) * 0.025),
      spin: 0.5 + (i % 4) * 0.35,
      scale: 0.58 + (i % 5) * 0.24,
    }
  })
  const dummy = new THREE.Object3D()
  sculpture.add(shards)

  // 5. 全幅氛围粒子星尘
  const particleCount = env.lowPower ? 90 : env.coarse ? 130 : 240
  const pPos = new Float32Array(particleCount * 3)
  const pScale = new Float32Array(particleCount)
  const pPhase = new Float32Array(particleCount)
  const pColorMix = new Float32Array(particleCount)
  for (let i = 0; i < particleCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 14.0
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 8.2
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 6.0 - 1.2
    pScale[i] = 0.75 + Math.random() * 1.45
    pPhase[i] = Math.random() * Math.PI * 2
    pColorMix[i] = Math.random()
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
  particleGeo.setAttribute('aScale', new THREE.BufferAttribute(pScale, 1))
  particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(pPhase, 1))
  particleGeo.setAttribute('aColorMix', new THREE.BufferAttribute(pColorMix, 1))

  const particleUniforms = {
    uTime: { value: 0 },
    uDpr: { value: Math.min(window.devicePixelRatio || 1, env.lowPower ? 1.5 : 2) },
    uNight: { value: opts.light ? 0 : 1 },
    uPulse: { value: 0 },
    uPointer: { value: pointerUniform },
  }
  const particleMat = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    uniforms: particleUniforms,
    transparent: true,
    depthWrite: false,
  })
  const particles = new THREE.Points(particleGeo, particleMat)
  scene.add(particles)

  // 6. 底部全幅 3D 透视波浪地平线
  const waveSegs = env.lowPower ? 28 : 44
  const waveGeo = new THREE.PlaneGeometry(18, 12, waveSegs, waveSegs)
  waveGeo.rotateX(-Math.PI / 2)
  const waveUniforms = {
    uTime: { value: 0 },
    uNight: { value: opts.light ? 0 : 1 },
    uPulse: { value: 0 },
    uPointer: { value: pointerUniform },
  }
  const waveMat = new THREE.ShaderMaterial({
    vertexShader: WAVE_VERT,
    fragmentShader: WAVE_FRAG,
    uniforms: waveUniforms,
    transparent: true,
    depthWrite: false,
  })
  const waveFloor = new THREE.Mesh(waveGeo, waveMat)
  waveFloor.position.set(0, -2.55, -1.0)
  scene.add(waveFloor)

  /* ================= 主题色板平滑插值 ================= */
  const COL_DAY_PRIMARY = new THREE.Color(0x0d7490)
  const COL_DAY_SECONDARY = new THREE.Color(0x0891b2)
  const COL_DAY_AMBER = new THREE.Color(0xc96a14)
  const COL_NIGHT_PRIMARY = new THREE.Color(0x3ddc84)
  const COL_NIGHT_SECONDARY = new THREE.Color(0x56c8ff)
  const COL_NIGHT_AMBER = new THREE.Color(0xffb454)
  const KEY_DAY = new THREE.Color(0xfff5e4)
  const KEY_NIGHT = new THREE.Color(0x9be7ff)
  const tmpColor = new THREE.Color()

  let nightMix = opts.light ? 0 : 1
  let targetNight = nightMix
  let pulseEnergy = 0

  function applyThemeMix(k: number) {
    coreUniforms.uNight.value = k
    waveUniforms.uNight.value = k
    particleUniforms.uNight.value = k

    keyLight.color.lerpColors(KEY_DAY, KEY_NIGHT, k)
    keyLight.intensity = THREE.MathUtils.lerp(2.1, 1.5, k)
    rimLight.color.lerpColors(COL_DAY_AMBER, COL_NIGHT_PRIMARY, k)
    rimLight.intensity = THREE.MathUtils.lerp(1.2, 2.0, k)
    ambient.intensity = THREE.MathUtils.lerp(0.85, 0.45, k)

    // 外层晶格线框颜色
    cageMat.color.lerpColors(COL_DAY_PRIMARY, COL_NIGHT_PRIMARY, k)
    const latticeBoost = modeWeights.y * 0.22 + pulseEnergy * 0.25
    cageMat.opacity = THREE.MathUtils.lerp(0.24, 0.36, k) + latticeBoost

    // 浮空微晶颜色（日光下呈通透海蓝/暖金微晶，深夜呈磷光晶簇）
    shardMat.color.lerpColors(COL_DAY_SECONDARY, COL_NIGHT_SECONDARY, k)
    shardMat.emissive.lerpColors(COL_DAY_PRIMARY, COL_NIGHT_PRIMARY, k)
    shardMat.emissiveIntensity = THREE.MathUtils.lerp(0.38, 0.62, k) + pulseEnergy * 0.45

    // 三层星轨环与卫星光晕
    for (const o of orbits) {
      if (o.accent === 'primary') tmpColor.lerpColors(COL_DAY_PRIMARY, COL_NIGHT_PRIMARY, k)
      else if (o.accent === 'secondary') tmpColor.lerpColors(COL_DAY_SECONDARY, COL_NIGHT_SECONDARY, k)
      else tmpColor.lerpColors(COL_DAY_AMBER, COL_NIGHT_AMBER, k)

      o.ringMat.color.copy(tmpColor)
      o.ringMat.emissive.copy(tmpColor)
      o.ringMat.emissiveIntensity = THREE.MathUtils.lerp(0.18, 0.72, k) + pulseEnergy * 0.65
      o.ringMat.opacity = THREE.MathUtils.lerp(0.58, 0.8, k)
      o.satMat.color.copy(tmpColor).lerp(new THREE.Color(0xffffff), 0.48)
      o.haloMat.color.copy(tmpColor)
      o.haloMat.opacity = THREE.MathUtils.lerp(0.65, 0.95, k)
      o.haloMat.blending = k > 0.45 ? THREE.AdditiveBlending : THREE.NormalBlending
    }
  }

  /* ================= 精准对齐 DOM 槽位（桌面右偏 / 手机居上） ================= */
  let slotEl: HTMLElement | null = opts.slotEl ?? null

  function alignToSlot(width: number, height: number, aspect: number) {
    camera.aspect = aspect
    camera.fov = width <= 640 ? 44 : 40
    camera.position.set(0, width <= 640 ? 0.05 : 0.12, width <= 640 ? 7.8 : 7.6)
    camera.updateProjectionMatrix()

    const vFovRad = THREE.MathUtils.degToRad(camera.fov)
    const dist = camera.position.z
    const visH = 2 * Math.tan(vFovRad / 2) * dist
    const visW = visH * aspect

    if (slotEl && width > 0 && height > 0) {
      const hostRect = host.getBoundingClientRect()
      const slotRect = slotEl.getBoundingClientRect()
      if (hostRect.width > 0 && hostRect.height > 0 && slotRect.width > 20 && slotRect.height > 20) {
        const cx = (slotRect.left + slotRect.width / 2 - hostRect.left) / hostRect.width
        const cy = (slotRect.top + slotRect.height / 2 - hostRect.top) / hostRect.height
        const ndcX = cx * 2 - 1
        const ndcY = -(cy * 2 - 1)
        stageRoot.position.set(ndcX * (visW / 2), ndcY * (visH / 2) + camera.position.y, 0)

        // 按槽位可见短边精确换算 3D 缩放（星轨直径约 5.2 世界单位）
        const slotWorldW = (slotRect.width / hostRect.width) * visW
        const slotWorldH = (slotRect.height / hostRect.height) * visH
        const targetDiameter = Math.min(slotWorldW, slotWorldH) * 0.9
        const scale = THREE.MathUtils.clamp(targetDiameter / 5.15, 0.42, 1.18)
        stageRoot.scale.setScalar(scale)
        waveFloor.position.y = width <= 640 ? -2.95 : -2.55
        return
      }
    }

    // 兜底：无槽位时桌面偏右、窄屏居中偏上
    if (width > 960) {
      stageRoot.position.set(visW * 0.24, 0.1, 0)
      stageRoot.scale.setScalar(0.96)
    } else {
      stageRoot.position.set(0, visH * 0.18, 0)
      stageRoot.scale.setScalar(0.62)
    }
  }

  /* ================= 鼠标视差 + 拖拽旋转 + 点击脉冲 ================= */
  const targetPtr = new THREE.Vector2(0, 0)
  let dragActive = false
  let dragMoved = false
  let dragStartX = 0
  let dragStartY = 0
  let dragYaw = 0
  let dragPitch = 0
  let velYaw = 0
  let velPitch = 0
  let boundSlot: HTMLElement | null = null
  let slotObserver: ResizeObserver | null = null

  function realign() {
    const w = host.clientWidth || window.innerWidth
    const h = host.clientHeight || window.innerHeight
    alignToSlot(w, h, w / Math.max(h, 1))
  }

  function onGlobalPointerMove(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return
    const rect = host.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    targetPtr.set(THREE.MathUtils.clamp(nx, -1, 1), THREE.MathUtils.clamp(ny, -1, 1))
  }

  function onSlotPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragActive = true
    dragMoved = false
    dragStartX = e.clientX
    dragStartY = e.clientY
    // 仅鼠标捕获指针，触屏把竖向滑动完整让给页面滚动
    if (e.pointerType === 'mouse') {
      boundSlot?.setPointerCapture?.(e.pointerId)
    }
  }

  function onSlotPointerMove(e: PointerEvent) {
    if (!dragActive) return
    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY
    dragStartX = e.clientX
    dragStartY = e.clientY
    if (Math.hypot(dx, dy) > 2) dragMoved = true
    if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.2) return
    velYaw += dx * 0.0055
    velPitch += dy * 0.0042
  }

  function onSlotPointerUp(e: PointerEvent) {
    if (!dragActive) return
    dragActive = false
    if (e.pointerType === 'mouse') {
      boundSlot?.releasePointerCapture?.(e.pointerId)
    }
    if (!dragMoved && e.type !== 'pointercancel') triggerPulse()
  }

  function bindSlotEvents(el: HTMLElement | null) {
    if (boundSlot === el) return
    if (boundSlot) {
      boundSlot.removeEventListener('pointerdown', onSlotPointerDown)
      boundSlot.removeEventListener('pointermove', onSlotPointerMove)
      boundSlot.removeEventListener('pointerup', onSlotPointerUp)
      boundSlot.removeEventListener('pointercancel', onSlotPointerUp)
    }
    slotObserver?.disconnect()
    slotObserver = null
    boundSlot = el
    if (boundSlot) {
      boundSlot.addEventListener('pointerdown', onSlotPointerDown)
      boundSlot.addEventListener('pointermove', onSlotPointerMove)
      boundSlot.addEventListener('pointerup', onSlotPointerUp)
      boundSlot.addEventListener('pointercancel', onSlotPointerUp)
      if (typeof ResizeObserver !== 'undefined') {
        slotObserver = new ResizeObserver(realign)
        slotObserver.observe(boundSlot)
      }
    }
  }

  bindSlotEvents(slotEl)
  window.addEventListener('pointermove', onGlobalPointerMove, { passive: true })

  function triggerPulse() {
    pulseEnergy = 1.0
    velYaw += 0.055
    if (env.reduced) runtime.renderNow()
  }

  /* ================= 渲染主循环 ================= */
  let simTime = 0

  const runtime = createStageRuntime({
    host,
    renderer,
    camera,
    env,
    onResize: (width, height, aspect) => {
      particleUniforms.uDpr.value = renderer.getPixelRatio()
      alignToSlot(width, height, aspect)
    },
    onRender: (_elapsed, dt) => {
      const step = Math.min(dt, 0.05)
      if (!env.reduced) simTime += step

      // 平滑主题插值
      const dNight = targetNight - nightMix
      if (Math.abs(dNight) < 0.001) nightMix = targetNight
      else if (step > 0) nightMix += dNight * (1 - Math.exp(-step * 6.5))

      // 平滑形态权重插值
      const lerpFactor = step > 0 ? 1 - Math.exp(-step * 5.2) : 1
      modeWeights.lerp(targetWeights, lerpFactor)

      // 脉冲衰减
      if (pulseEnergy > 0.001 && step > 0) {
        pulseEnergy *= Math.exp(-step * 2.5)
      } else if (pulseEnergy <= 0.001) {
        pulseEnergy = 0
      }

      // 指针平滑跟随
      pointerUniform.lerp(targetPtr, step > 0 ? 1 - Math.exp(-step * 6.0) : 1)

      // 拖拽惯性阻尼
      dragYaw += velYaw
      dragPitch = THREE.MathUtils.clamp(dragPitch + velPitch, -0.75, 0.75)
      velYaw *= Math.exp(-step * 5.5)
      velPitch *= Math.exp(-step * 5.5)
      if (!dragActive) {
        dragPitch *= Math.exp(-step * 1.1)
      }

      // 整体悬浮呼吸 + 视差微倾
      const autoYaw = simTime * (0.22 + modeWeights.z * 0.14)
      sculpture.rotation.y = autoYaw + dragYaw + pointerUniform.x * 0.26
      sculpture.rotation.x = Math.sin(simTime * 0.5) * 0.08 + dragPitch - pointerUniform.y * 0.18
      sculpture.position.y = env.reduced ? 0 : Math.sin(simTime * 0.95) * 0.08

      // 外层多面体晶格反向旋转 + 脉冲扩张
      cage.rotation.y = -simTime * 0.3
      cage.rotation.x = simTime * 0.16
      const cageScale = 1.0 + modeWeights.y * 0.06 + pulseEnergy * 0.16
      cage.scale.setScalar(cageScale)

      // 三层星轨环谐振旋转与卫星运行
      orbits.forEach((o, idx) => {
        const boost = 1 + pulseEnergy * 2.2 + modeWeights.z * 0.6
        o.satPivot.rotation.z += step * o.speed * 1.9 * boost
        o.pivot.rotation.y = simTime * o.speed * 0.45 * (idx % 2 === 0 ? 1 : -1)
        const rScale = 1 + pulseEnergy * (0.06 + idx * 0.03)
        o.pivot.scale.setScalar(rScale)
      })

      // 浮空微晶群更新
      for (let i = 0; i < shardCount; i++) {
        const s = shardSeeds[i]!
        const angle = s.theta + simTime * s.speed
        const r = s.radius + Math.sin(simTime * 0.9 + i) * 0.08 + pulseEnergy * 0.25
        dummy.position.set(
          Math.sin(s.phi) * Math.cos(angle) * r,
          Math.cos(s.phi) * r * 0.78,
          Math.sin(s.phi) * Math.sin(angle) * r,
        )
        dummy.rotation.set(simTime * s.spin + i, simTime * s.spin * 0.7, i * 0.4)
        dummy.scale.setScalar(s.scale * (1 + pulseEnergy * 0.25))
        dummy.updateMatrix()
        shards.setMatrixAt(i, dummy.matrix)
      }
      shards.instanceMatrix.needsUpdate = true

      // 着色器 uniforms 更新
      coreUniforms.uTime.value = simTime
      coreUniforms.uPulse.value = pulseEnergy
      waveUniforms.uTime.value = simTime
      waveUniforms.uPulse.value = pulseEnergy
      particleUniforms.uTime.value = simTime
      particleUniforms.uPulse.value = pulseEnergy

      applyThemeMix(nightMix)
      renderer.render(scene, camera)
    },
  })

  /* ================= 对外接口 ================= */
  function setLight(light: boolean) {
    targetNight = light ? 0 : 1
    if (env.reduced) {
      nightMix = targetNight
      runtime.renderNow()
    }
  }

  function setMode(mode: HeroKineticMode) {
    setTargetWeights(mode)
    triggerPulse()
  }

  function setActive(active: boolean) {
    runtime.setActive(active)
  }

  function setSlotEl(el: HTMLElement | null) {
    slotEl = el
    bindSlotEvents(el)
    const w = host.clientWidth || window.innerWidth
    const h = host.clientHeight || window.innerHeight
    alignToSlot(w, h, w / Math.max(h, 1))
  }

  function dispose() {
    window.removeEventListener('pointermove', onGlobalPointerMove)
    bindSlotEvents(null)
    runtime.dispose()
    disposeSceneGraph(scene)
    glowTex.dispose()
    releaseRenderer(renderer)
    releaseWebGLContext(contextToken)
  }

  // 首帧对齐并立即渲染
  const initW = host.clientWidth || window.innerWidth
  const initH = host.clientHeight || window.innerHeight
  alignToSlot(initW, initH, initW / Math.max(initH, 1))
  applyThemeMix(nightMix)
  runtime.renderNow()
  runtime.setActive(true)
  opts.onReady?.()

  return { setLight, setMode, setActive, setSlotEl, pulse: triggerPulse, dispose }
}
