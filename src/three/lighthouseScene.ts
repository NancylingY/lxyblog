/**
 * 「其他」页 · 海边灯塔夜景卡
 * - 海面为自制着色器：多组正弦波 + 噪声细节，近岸破碎与泡沫随浪滚动
 * - 灯塔光束：聚光灯 + 加法混合锥形外壳（假体积），附轻雾片与扫镜耀斑
 * - 夜景：深蓝夜空、月光方向光、星点、月亮辉光
 * - 复用 houseKit 的渲染器 / DPR 封顶 / KTX2 / 停帧 / 单 context 守卫 / 资源释放
 * - 真实模型未到位时用程序化占位灯塔，文件到位后自动替换，不重启场景
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  acquireWebGLContext,
  createKtx2Loader,
  createStageRenderer,
  createStageRuntime,
  detectStageEnv,
  disposeSceneGraph,
  frameDistance,
  makeCameraFrame,
  releaseRenderer,
  releaseWebGLContext,
  type CameraFrame,
} from './houseKit'
import { createHouseDrag } from './houseDrag'

const VIEW_DIR = new THREE.Vector3(0.16, 0.32, 1)
const BASE_YAW = 0
const BASE_PITCH = -0.02
/** 比首屏 ±40° 宽得多，但转到侧面就停，避免整座岛甩到镜头前 */
const YAW_LIMIT = Math.PI * 100 / 180
/** 俯仰限位：看不到水面以下的模型底面 */
const PITCH_LIMIT = Math.PI * 7 / 180
const SWAY = 0.06
const SWAY_SPEED = 0.12

/** 光束一圈 8 秒 */
const BEAM_PERIOD = 8
const BEAM_LENGTH = 18
const BEAM_RADIUS = 3.2

/** 水位线在 z = -2，往镜头方向 +z 是海，往 -z 是岸 */
const SHORE_Z = -2

/** 灯塔本体归一化后的目标高度：与占位塔取景一致 */
const TOWER_HEIGHT = 4.4
/** 塔基底部几乎贴着水面，让浪尖盖住接缝 */
const BASE_LIFT = 0.02

/** 缩放：相机距离乘数，越小越近；松手后阻尼回到默认取景 */
const ZOOM_MIN = 0.62
const ZOOM_MAX = 1.65
/** 滚轮 / 双指停下多久后开始复位 */
const ZOOM_IDLE_MS = 700
const ZOOM_TRACK_SPEED = 10
const ZOOM_RETURN_SPEED = 2.6
/** 模型字节进度在总进度条里占的区间 */
const MODEL_START = 12
const MODEL_END = 80

export type LighthouseLoadStage = 'engine' | 'scene' | 'decoder' | 'model' | 'shader' | 'ready'

/** 真实加载进度：模型字节数来自 GLTFLoader onProgress，其余是阶段完成事件 */
export interface LighthouseProgress {
  stage: LighthouseLoadStage
  percent: number
  loadedBytes?: number
  totalBytes?: number
}

export interface LighthouseOptions {
  url: string
  onReady?: () => void
  onProgress?: (progress: LighthouseProgress) => void
  /** 缩放总开关：全屏页开滚轮 + 双指 */
  zoom?: boolean
  /** 滚轮缩放单独开关；卡片里关掉，滚轮留给页面滚动 */
  wheelZoom?: boolean
}

export interface LighthouseHandle {
  setActive(active: boolean): void
  /** 全屏页的场景控件：开关灯塔光束（含海面高光带与耀斑） */
  setBeam(on: boolean): void
  dispose(): void
}

export interface LighthouseDebug {
  fps: number
  segments: number
  beamAngle: number
  drag: { yaw: number; pitch: number; yawLimit: number; pitchLimit: number }
  model: 'glb' | 'placeholder'
  pointCount: number
  lampY: number
  modelScale: number
  glass: boolean
  lamp: boolean
  beam: boolean
  /** 水面是否绘制光束光斑（?glint=off 时为 false） */
  glint: boolean
  zoom: { current: number; goal: number; min: number; max: number }
}

function makeGlowTexture(inner = 0.55): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(inner * 0.5, 'rgba(255,255,255,0.45)')
    g.addColorStop(inner, 'rgba(255,255,255,0.12)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/* ================= 海面 ================= */
const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uShoreZ;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vHeight;
varying float vShore;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise2(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

/** 三组不同方向 / 波长 / 振幅的长波 + 一层高频细节 + 近岸短波破碎 */
float waveHeight(vec2 p, float t, float shore) {
  float h = 0.0;
  h += sin(dot(p, vec2(0.86, 0.51)) * 0.52 + t * 0.85) * 0.34;
  h += sin(dot(p, vec2(-0.44, 0.90)) * 0.95 - t * 1.15) * 0.20;
  h += sin(dot(p, vec2(0.997, -0.08)) * 1.55 + t * 1.65) * 0.12;
  h += (fbm3(p * 1.5 + vec2(t * 0.28, -t * 0.19)) - 0.5) * 0.22;

  // 近岸破碎：高频短波，随离岸距离指数衰减
  float chop = exp(-max(shore, 0.0) * 0.45);
  h += sin(dot(p, vec2(0.70, -0.72)) * 3.4 + t * 2.6) * 0.16 * chop * chop;

  // 近岸振幅随距离增大（岸边碎浪小，外海涌浪大）
  float grow = smoothstep(0.0, 7.0, shore);
  return h * mix(0.30, 1.0, grow);
}

void main() {
  vec3 p = position;
  float shore = p.z - uShoreZ;
  float h = waveHeight(p.xz, uTime, shore);

  // 有限差分求法线，避免每个顶点再算一次完整波面
  float e = 0.35;
  float hx = waveHeight(p.xz + vec2(e, 0.0), uTime, shore);
  float hz = waveHeight(p.xz + vec2(0.0, e), uTime, shore);
  vec3 localN = normalize(vec3((h - hx) / e, 1.0, (h - hz) / e));

  vec4 world = modelMatrix * vec4(p.x, h, p.z, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * localN);
  vHeight = h;
  vShore = shore;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uMoonDir;
uniform vec3 uBeamDir;
uniform vec3 uBeamPos;
uniform vec3 uBeamColor;
uniform vec3 uSkyColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uHorizonColor;
uniform float uBeamStrength;
/* 调试开关：0 = 水面完全不画光束光斑，只留雾中光柱与月光 */
uniform float uBeamGlint;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vHeight;
varying float vShore;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 2; i++) {
    v += a * noise2(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

/**
 * GGX 法线分布，按峰值归一化到 [0,1]：
 * 保留 GGX 的角度形状（窄芯 + 长尾），峰值不再随粗糙度暴涨，
 * 便于在没有能量守恒补正的夜景里直接乘菲涅尔与衰减。
 */
float ggxLobe(float ndh, float rough) {
  float alpha = max(rough, 0.02);
  float a2 = alpha * alpha;
  float d = ndh * ndh * (a2 - 1.0) + 1.0;
  return (a2 * a2) / (d * d);
}

/**
 * 各向异性 GGX，同样按峰值归一化（N = H 时等于 1）。
 * 横向（aB）窄、纵向（aT，沿「灯塔 → 相机」）长，高光才连成一条滑道；
 * 各向同性版本会让反射摊成一块圆斑。
 */
float anisoLobe(float ndh, float hT, float hB, float aT, float aB) {
  float at = max(aT, 0.02);
  float ab = max(aB, 0.02);
  float d = hT * hT / (at * at) + hB * hB / (ab * ab) + ndh * ndh;
  return 1.0 / (d * d);
}

/** 单点光源的水面镜面项：各向异性 GGX × Schlick 菲涅尔 × 距离 / 大气衰减 */
float pointGlint(vec3 N, vec3 V, vec3 Lp, vec3 T, vec3 B, float aT, float aB, float weight) {
  vec3 toL = Lp - vWorldPos;
  float d2 = dot(toL, toL);
  vec3 L = toL * inversesqrt(max(d2, 1e-4));
  float ndl = dot(N, L);
  if (ndl <= 0.0) return 0.0;
  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float vdh = max(dot(V, H), 0.0);
  float D = anisoLobe(ndh, dot(H, T), dot(H, B), aT, aB);
  // 只用 GGX：亮斑边界由波面法线分布决定，不再叠加窄芯碎点
  float spec = D;
  float F = 0.02 + 0.98 * pow(1.0 - vdh, 5.0);
  // 距离衰减（1/d² 的软化近似）+ 大气消光
  float atten = (1.0 / (1.0 + d2 * 0.020)) * exp(-d2 * 0.0022);
  return spec * F * atten * weight;
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float dist = length(cameraPosition - vWorldPos);

  vec2 rp = vWorldPos.xz;

  // 细波纹法线：四层不同尺度 / 流速的正弦波解析梯度 + 两层流动噪声，
  // 只扰动法线，不改高度与基色；近岸弱一些，避免岸边变成噪点
  vec2 rip = vec2(0.0);
  rip += vec2(0.94, 0.34) * cos(dot(rp, vec2(0.94, 0.34)) * 6.2 + uTime * 2.1) * 0.55;
  rip += vec2(-0.62, 0.78) * cos(dot(rp, vec2(-0.62, 0.78)) * 9.7 - uTime * 2.8) * 0.62;
  rip += vec2(0.28, -0.96) * cos(dot(rp, vec2(0.28, -0.96)) * 15.3 + uTime * 3.9) * 0.70;
  rip += vec2(0.84, 0.55) * cos(dot(rp, vec2(0.84, 0.55)) * 24.0 - uTime * 5.2) * 0.80;
  float rn1 = noise2(rp * 7.0 + vec2(uTime * 0.62, -uTime * 0.48)) - 0.5;
  float rn2 = noise2(rp * 17.0 - vec2(uTime * 1.05, uTime * 0.72)) - 0.5;
  rip += vec2(rn1, rn2) * 1.6;
  /*
   * 高光用「宏观浪面 + 少量细纹」的法线：
   * 高频细纹全量参与镜面会把反射变成逐像素抽奖（一地碎白点），
   * 这里只保留 ~0.06 的细纹扰动，让亮斑轮廓随浪起伏而不散开。
   */
  vec3 NGlint = normalize(N + vec3(rip.x, 0.0, rip.y) * 0.06);
  rip *= 0.018 * mix(0.55, 1.0, smoothstep(0.0, 5.0, vShore));
  N = normalize(N + vec3(rip.x, 0.0, rip.y));

  // 水体：近岸偏青、外海吸光变深
  float outward = smoothstep(0.0, 8.0, vShore);
  vec3 base = mix(uShallowColor, uDeepColor, outward);
  base *= mix(0.86, 1.0, exp(-max(vShore, 0.0) * 0.06));
  vec3 col = base;

  // 菲涅尔（Schlick，F0=0.02）：视线越掠射，海面越接近全反射
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  // 环境反射：天空梯度 + 很弱的月晕，避免海面是一块纯色板
  vec3 R = reflect(-V, N);
  vec3 envCol = mix(uHorizonColor, uSkyColor * 1.35, smoothstep(-0.02, 0.40, R.y));
  envCol += vec3(0.30, 0.42, 0.66) * pow(max(dot(R, uMoonDir), 0.0), 16.0) * 0.45;
  col = mix(col, envCol, clamp(fresnel * 0.70, 0.0, 0.75));

  float nearF = 1.0 - smoothstep(3.0, 22.0, dist);
  float moonRough = mix(0.115, 0.130, nearF);

  // 月光：GGX 镜面（连续的月光滑道），宽光泽项保留一点点整体提亮
  vec3 Hm = normalize(uMoonDir + V);
  float ndhm = max(dot(NGlint, Hm), 0.0);
  float vdhm = max(dot(V, Hm), 0.0);
  float moonD = ggxLobe(ndhm, moonRough);
  float moonF = 0.02 + 0.98 * pow(1.0 - vdhm, 5.0);
  col += vec3(0.60, 0.76, 1.0) * (moonD * moonF * 1.15 + pow(ndhm, 24.0) * 0.03);

  /*
   * 光束落水：沿光轴取若干采样点当点光源，各自走 GGX + 菲涅尔。
   * 亮斑只出现在「视线 - 细浪法线 - 该采样点」满足反射的位置，
   * 因此光束扫过时反光是自然扫过去的，而不是沿方位角铺一条贴片。
   */
  float beamGlint = 0.0;
  if (uBeamStrength > 0.001 && uBeamGlint > 0.5) {
    /*
     * 细条纹理：噪声沿「灯塔 → 相机」的反射路径拉伸（横向高频、纵向低频），
     * 高光被切成一条条与路径同向的细带，而不是各向同性的孤立碎点。
     */
    vec2 toCam = cameraPosition.xz - uBeamPos.xz;
    vec2 pathDir = toCam * inversesqrt(max(dot(toCam, toCam), 1e-4));
    vec2 rel = vWorldPos.xz - uBeamPos.xz;
    float along = dot(rel, pathDir);
    float across = dot(rel, vec2(-pathDir.y, pathDir.x));
    float streak = noise2(vec2(across * 26.0, along * 0.60 - uTime * 0.40)) * 0.62
                 + noise2(vec2(across * 58.0, along * 1.35 - uTime * 0.95) + 19.7) * 0.38;
    // 只做亮度调制，不做阈值切割：保证带子始终连续
    streak = 0.74 + 0.34 * smoothstep(0.30, 0.76, streak);

    // 各向异性波瓣的切向基：T 沿反射路径，B 横切路径
    vec3 path3 = vec3(pathDir.x, 0.0, pathDir.y);
    vec3 Tgl = normalize(path3 - NGlint * dot(path3, NGlint));
    vec3 Bgl = cross(NGlint, Tgl);

    float glint = 0.0;
    for (int i = 0; i < BEAM_SAMPLES; i++) {
      float f = (float(i) + 0.55) / float(BEAM_SAMPLES);
      vec3 Lp = uBeamPos + uBeamDir * mix(2.4, 17.0, f);
      // 近处横切波瓣更宽（高光被浪打碎），远处收窄成连续滑道；远端能量更低
      float aB = mix(0.050, 0.062, f) + nearF * 0.045;
      float aT = mix(0.20, 0.26, f);
      glint += pointGlint(NGlint, V, Lp, Tgl, Bgl, aT, aB, mix(1.0, 0.45, f));
    }
    glint /= float(BEAM_SAMPLES);
    // 塔基贴脸处压暗，避免近距高光糊成白点
    glint *= smoothstep(0.6, 3.0, length(vWorldPos.xz - uBeamPos.xz));
    // 相机脚下那段掠射反光没有意义，压掉，避免手机竖屏下糊满下半屏
    glint *= smoothstep(3.0, 7.5, dist);
    // 软膝：保留峰值，但不会连续过曝成白块
    glint /= 1.0 + glint * 0.9;
    /*
     * 亮度标定：GGX 已按峰值 1 归一化，点采样还要乘菲涅尔（这个视角下只有 4%~11%）
     * 和距离衰减，量级会掉到 1e-3。这里统一乘一个辐射亮度系数，
     * 把光束落水抬到夜景里肉眼可读的亮度，亮斑形状完全由 GGX 决定。
     */
    beamGlint = glint * uBeamStrength * 28.0 * streak;
    col += uBeamColor * beamGlint;
  }

  /*
   * 泡沫：不再画。
   * 之前的浪脊阈值方案在这个机位上会退化成满海面的孤立白斑；
   * 改用「到岛心距离」画环之后，又是一圈规整的白色光环——
   * 两种都不是「沿浪脊、贴岸的连续带」。按「宁可少也不要撒芝麻」的原则，
   * 直接去掉，等以后有真实岸线几何（或屏幕空间的连续破碎）再做。
   */

  // 远处融进夜空，海平线不出现硬切边
  col = mix(col, uSkyColor, smoothstep(30.0, 62.0, dist));
  gl_FragColor = vec4(col, 1.0);
}
`

/* ================= 夜空 ================= */
const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SKY_FRAG = /* glsl */ `
uniform vec3 uTopColor;
uniform vec3 uHorizonColor;
uniform vec3 uMoonDir;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  vec3 col = mix(uHorizonColor, uTopColor, smoothstep(-0.02, 0.55, d.y));
  float m = max(dot(d, uMoonDir), 0.0);
  col += vec3(0.52, 0.66, 0.92) * pow(m, 180.0) * 0.85;
  col += vec3(0.14, 0.26, 0.48) * pow(m, 12.0) * 0.16;
  gl_FragColor = vec4(col, 1.0);
}
`

/* ================= 光柱外壳 ================= */
const BEAM_VERT = /* glsl */ `
varying float vAlong;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vAlong = uv.y;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform vec3 uOrigin;
uniform float uLength;
uniform float uTime;
varying float vAlong;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float vd = abs(dot(N, V));

  // 沿光束轴的真实距离（0 灯室 → 1 远端），不依赖锥体 UV 方向
  float s = clamp(length(vWorldPos - uOrigin) / max(uLength, 0.001), 0.0, 1.0);

  // 视线相关：切向处淡出，面向镜头处保留柔光；
  // 不再用「边缘更亮」的 rim，避免两侧出现清晰几何轮廓
  float edgeFade = smoothstep(0.02, 0.42, vd);
  float body = 0.025 + 0.075 * pow(vd, 0.8);

  // 纵向首尾淡出：灯室附近收窄防过曝，远端自然消失
  float headFade = smoothstep(0.04, 0.20, s);
  float tailFade = 1.0 - smoothstep(0.72, 1.0, s);

  // 低频噪声让轮廓不再是直线；很慢的时间扰动，随光束整体移动
  vec3 np = vWorldPos * 1.15 + vec3(uTime * 0.18, -uTime * 0.12, uTime * 0.08);
  float n = noise2(np.xz + np.y * 0.7);
  float n2 = noise2(np.xy * 2.3 - np.z);
  float shape = mix(0.62, 1.18, smoothstep(0.18, 0.82, n * 0.72 + n2 * 0.28));

  // 距离衰减：远端再压一档，避免整条锥体铺满
  float distFade = 1.0 / (1.0 + s * 1.4);

  float alpha = body * edgeFade * headFade * tailFade * shape * distFade * uStrength;
  // 加法混合上限：两层壳叠加也不会糊成白雾
  alpha = min(alpha, 0.16);

  // dither：加法混合的低透明度渐变最容易出色带
  float dith = (hash21(gl_FragCoord.xy + uTime) - 0.5) / 160.0;
  gl_FragColor = vec4(uColor, clamp(alpha + dith, 0.0, 1.0));
}
`

export async function createLighthouseScene(
  host: HTMLElement,
  opts: LighthouseOptions,
): Promise<LighthouseHandle> {
  const env = detectStageEnv()
  /* 对比用：?glint=off 关掉水面光束光斑，只留雾中光柱与月光 */
  const params = new URLSearchParams(window.location.search)
  const glintOn = params.get('glint') !== 'off'

  const contextToken = await acquireWebGLContext()
  let renderer: THREE.WebGLRenderer
  try {
    renderer = createStageRenderer(env)
  } catch (error) {
    releaseWebGLContext(contextToken)
    throw error
  }

  const ktx2 = createKtx2Loader(renderer)

  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const display = new THREE.Group()
  display.rotation.set(BASE_PITCH, BASE_YAW, 0)
  scene.add(display)

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 160)
  scene.add(camera)

  const glowTexture = makeGlowTexture()

  /* ================= 场	景元素 ================= */
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uTopColor: { value: new THREE.Color(0x0c1830) },
      uHorizonColor: { value: new THREE.Color(0x22476b) },
      uMoonDir: { value: new THREE.Vector3(-0.55, 0.42, -0.72).normalize() },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), skyMat)
  sky.renderOrder = -2
  display.add(sky)

  // 星点：只铺上半球
  const starPositions = new Float32Array(240 * 3)
  for (let i = 0; i < 240; i++) {
    const theta = Math.random() * Math.PI * 2
    const y = 0.10 + Math.random() * 0.85
    const r = Math.sqrt(1 - y * y)
    starPositions[i * 3] = Math.cos(theta) * r * 52
    starPositions[i * 3 + 1] = y * 52
    starPositions[i * 3 + 2] = Math.sin(theta) * r * 52
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xd7e6ff,
    size: 1.7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  display.add(new THREE.Points(starGeo, starMat))

  // 月亮辉光
  const moonDir = new THREE.Vector3(-0.55, 0.42, -0.72).normalize()
  const moonSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xcfe2ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  moonSprite.position.copy(moonDir).multiplyScalar(56)
  moonSprite.scale.setScalar(9)
  display.add(moonSprite)

  /* ================= 灯光 ================= */
  const moon = new THREE.DirectionalLight(0xa9c8ff, 1.6)
  moon.position.copy(moonDir).multiplyScalar(24)
  // 镜头方向补一点冷光，让塔身、礁石在夜空里露出剪影轮廓
  const fill = new THREE.DirectionalLight(0x8fb4e0, 0.62)
  fill.position.copy(VIEW_DIR).multiplyScalar(20)
  const hemi = new THREE.HemisphereLight(0x223a5c, 0x060a10, 0.68)
  scene.add(moon, fill, hemi)

  /* ================= 灯塔占位 / 模型 ================= */
  const lighthouseGroup = new THREE.Group()
  // glb 与占位塔都以「塔基底部 ≈ 水面」为原点，组本身不再抬高
  lighthouseGroup.position.set(0, 0, -3.2)
  display.add(lighthouseGroup)

  const placeholder = buildPlaceholderLighthouse()
  lighthouseGroup.add(placeholder.root)
  let modelKind: LighthouseDebug['model'] = 'placeholder'
  let modelScale = 1

  // 光柱枢轴挂在灯室位置，随灯塔一起旋转
  const beamPivot = new THREE.Group()
  beamPivot.position.set(0, placeholder.lampY, 0)
  lighthouseGroup.add(beamPivot)

  // 灯芯辉光与局部照明，占位塔与 glb 共用
  const lampGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffcc84,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  lampGlow.scale.setScalar(1.15)
  lampGlow.renderOrder = 4
  beamPivot.add(lampGlow)

  const lampLight = new THREE.PointLight(0xffc27a, 7, 4.2, 2)
  beamPivot.add(lampLight)

  let lampMat: THREE.MeshStandardMaterial | null = placeholder.lantern
  let hasGlass = false
  let hasLamp = false

  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffd99a) },
      uStrength: { value: 1 },
      uOrigin: { value: new THREE.Vector3() },
      uLength: { value: BEAM_LENGTH },
      uTime: { value: 0 },
    },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const beamGeo = new THREE.ConeGeometry(BEAM_RADIUS, BEAM_LENGTH, 28, 1, true)
  beamGeo.translate(0, -BEAM_LENGTH / 2, 0)
  beamGeo.rotateX(-Math.PI / 2)
  const beamShell = new THREE.Mesh(beamGeo, beamMat)
  beamShell.renderOrder = 2
  beamPivot.add(beamShell)

  // 内层更窄更亮，两层锥体叠出「中间亮、边缘虚」的体积感
  const beamCoreMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xfff0cd) },
      uStrength: { value: 1 },
      uOrigin: { value: new THREE.Vector3() },
      uLength: { value: BEAM_LENGTH },
      uTime: { value: 0 },
    },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const beamCoreGeo = new THREE.ConeGeometry(1.05, BEAM_LENGTH * 0.92, 20, 1, true)
  beamCoreGeo.translate(0, -BEAM_LENGTH * 0.46, 0)
  beamCoreGeo.rotateX(-Math.PI / 2)
  const beamCore = new THREE.Mesh(beamCoreGeo, beamCoreMat)
  beamCore.renderOrder = 3
  beamPivot.add(beamCore)

  // 轻雾片：沿光束方向铺一层柔光，提升可见度
  const mist = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffe2ad,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  mist.position.set(0, 0, 5.5)
  mist.scale.set(7, 7, 1)
  beamPivot.add(mist)

  const spot = new THREE.SpotLight(0xffdca4, 420, 70, 0.20, 0.45, 1.4)
  spot.position.set(0, 0, 0)
  spot.target.position.set(0, -0.9, BEAM_LENGTH)
  beamPivot.add(spot, spot.target)

  /* ================= 海面 ================= */
  const segments = env.lowPower ? 96 : env.coarse ? 144 : 240
  const waterGeo = new THREE.PlaneGeometry(60, 60, segments, segments)
  waterGeo.rotateX(-Math.PI / 2)
  const waterUniforms = {
    uTime: { value: 0 },
    uShoreZ: { value: SHORE_Z },
    uMoonDir: { value: moonDir.clone() },
    uBeamDir: { value: new THREE.Vector3(0, 0, 1) },
    uBeamPos: { value: new THREE.Vector3(0, 3.4, 0) },
    uBeamColor: { value: new THREE.Color(0xffcf8f) },
    uSkyColor: { value: new THREE.Color(0x12344d) },
    uDeepColor: { value: new THREE.Color(0x0c1c2c) },
    uShallowColor: { value: new THREE.Color(0x175a66) },
    uHorizonColor: { value: new THREE.Color(0x22476b) },
    uBeamStrength: { value: 0.55 },
    uBeamGlint: { value: glintOn ? 1 : 0 },
  }
  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    // 低配机减采样点：光斑会更碎一点，但不影响反射位置
    defines: { BEAM_SAMPLES: env.lowPower ? 3 : 5 },
    fog: false,
  })
  const water = new THREE.Mesh(waterGeo, waterMat)
  display.add(water)

  /* ================= 岸与礁石（占位） ================= */
  const coast = placeholder.coast
  display.add(coast)

  /* ================= 取景与缩放 ================= */
  const frame: CameraFrame = makeCameraFrame(
    new THREE.Box3(new THREE.Vector3(-5.2, -0.4, -9.4), new THREE.Vector3(5.2, 4.7, 2.2)),
    VIEW_DIR,
  )
  /** 默认取景距离；缩放以它为基准乘系数 */
  let baseDist = 1
  let zoomGoal = 1
  let zoomCur = 1
  const applyCamera = () => {
    camera.position.copy(frame.viewDir).multiplyScalar(baseDist * zoomCur).add(frame.target)
    camera.lookAt(frame.target)
  }
  /**
   * 竖屏水平视角只有约 15°，而光柱锥角约 20°：距离再远，锥体也必然横贯整屏，
   * 看起来就是一条雾带而不是一束光。这里按纵横比把锥体收窄，横屏保持原尺寸。
   */
  const beamNarrow = (aspect: number) =>
    THREE.MathUtils.lerp(0.4, 1, THREE.MathUtils.smoothstep(aspect, 0.62, 1.15))
  const fitCamera = (aspect: number) => {
    const wide = frameDistance(frame, camera, aspect, 1.02)
    // 竖屏按宽度拟合会把相机推到 50+ 单位外（灯塔只剩屏高 1/6），
    // 远距 + 窄视角会把光柱压成一条低对比的雾带，所以竖屏改用高度拟合
    const tall = frameDistance(frame, camera, 1, 1.02)
    const portrait = 1 - THREE.MathUtils.smoothstep(aspect, 0.62, 1.05)
    baseDist = THREE.MathUtils.lerp(wide, tall, portrait)
    const narrow = beamNarrow(aspect)
    beamShell.scale.set(narrow, narrow, 1)
    beamCore.scale.set(narrow, narrow, 1)
    mist.scale.set(7 * narrow, 7 * narrow, 1)
    applyCamera()
  }

  /* ================= 耀斑 ================= */
  const flare = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffe0b0,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  flare.position.set(0, 0, -1.2)
  flare.scale.setScalar(1.05)
  flare.renderOrder = 10
  camera.add(flare)

  /* ================= 拖拽 ================= */
  const drag = createHouseDrag({
    host,
    object: display,
    baseYaw: BASE_YAW,
    basePitch: BASE_PITCH,
    reduced: env.reduced,
    yawLimit: YAW_LIMIT,
    pitchLimit: PITCH_LIMIT,
    sway: SWAY,
    swaySpeed: SWAY_SPEED,
    onReducedFrame: () => runtime.renderNow(),
  })

  /* ================= 缩放：滚轮 + 双指 ================= */
  const zoomEnabled = opts.zoom ?? false
  const wheelZoom = zoomEnabled && (opts.wheelZoom ?? false)
  const zoomPointers = new Map<number, { x: number; y: number }>()
  let pinchSpread = 0
  let pinchGoal = 1
  let zoomResetTimer = 0

  function setZoomGoal(next: number) {
    zoomGoal = THREE.MathUtils.clamp(next, ZOOM_MIN, ZOOM_MAX)
    if (env.reduced) {
      zoomCur = zoomGoal
      applyCamera()
      runtime.renderNow()
    }
  }

  /** 滚轮 / 双指停下后开始阻尼复位到默认取景，不抢拖拽手势 */
  function armZoomReset() {
    clearTimeout(zoomResetTimer)
    zoomResetTimer = window.setTimeout(() => {
      zoomResetTimer = 0
      setZoomGoal(1)
    }, ZOOM_IDLE_MS)
  }

  function currentSpread() {
    const [a, b] = [...zoomPointers.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  function onZoomDown(e: PointerEvent) {
    zoomPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (zoomPointers.size === 2) {
      // 双指开始：先停掉单指旋转，避免边转边缩
      drag.cancel()
      pinchSpread = currentSpread()
      pinchGoal = zoomGoal
      clearTimeout(zoomResetTimer)
      zoomResetTimer = 0
    }
  }

  function onZoomMove(e: PointerEvent) {
    if (!zoomPointers.has(e.pointerId)) return
    zoomPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (zoomPointers.size < 2 || pinchSpread <= 0) return
    const spread = currentSpread()
    if (spread <= 0) return
    // 两指张开 = 拉近
    setZoomGoal(pinchGoal * (pinchSpread / spread))
  }

  function onZoomUp(e: PointerEvent) {
    zoomPointers.delete(e.pointerId)
    if (zoomPointers.size < 2) pinchSpread = 0
    if (zoomPointers.size === 0) armZoomReset()
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
    setZoomGoal(zoomGoal * Math.exp(e.deltaY * unit * 0.0012))
    armZoomReset()
  }

  if (zoomEnabled) {
    host.addEventListener('pointerdown', onZoomDown)
    host.addEventListener('pointermove', onZoomMove)
    host.addEventListener('pointerup', onZoomUp)
    host.addEventListener('pointercancel', onZoomUp)
  }
  // 卡片里不接滚轮：滚轮留给页面滚动，避免整页被一张卡 hijack
  if (wheelZoom) host.addEventListener('wheel', onWheel, { passive: false })

  /* ================= 运行状态 ================= */
  let beamAngle = env.reduced ? 0 : Math.PI * 0.35
  let beamEnabled = true
  let beamLevel = 1
  let elapsedSeconds = env.reduced ? 0 : performance.now() / 1000
  const beamDirWorld = new THREE.Vector3()
  const lampWorld = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const beamQuat = new THREE.Quaternion()
  const baseExposure = 1.4
  let flareLevel = 0
  let frameCount = 0
  let fpsTimer = 0
  let fps = 60
  let disposed = false
  /** 卡片可能在本轮加载途中滚出视口，boot 结束时不要强行开帧 */
  let activeWanted = true

  const runtime = createStageRuntime({
    host,
    renderer,
    camera,
    env,
    onResize: (_w, _h, aspect) => fitCamera(aspect),
    onRender: (elapsed, dt) => {
      if (!env.reduced && dt > 0) {
        elapsedSeconds += dt
        beamAngle = (beamAngle + dt * Math.PI * 2 / BEAM_PERIOD) % (Math.PI * 2)
      }
      const t = elapsedSeconds
      const pulse = env.reduced ? 1 : 0.86 + 0.14 * Math.sin(t * 2.1)
      // 光束开关：全屏页控件切到关时平滑淡出，水面高光带与耀斑一起消失
      beamLevel += ((beamEnabled ? 1 : 0) - beamLevel) * (dt > 0 ? 1 - Math.exp(-dt * 5) : 1)

      drag.update(elapsed, dt)
      // 缩放：操作中快速跟手，松手后慢阻尼回到默认取景
      if (dt > 0 && Math.abs(zoomGoal - zoomCur) > 0.0005) {
        const speed = zoomGoal === 1 ? ZOOM_RETURN_SPEED : ZOOM_TRACK_SPEED
        zoomCur += (zoomGoal - zoomCur) * (1 - Math.exp(-dt * speed))
        if (Math.abs(zoomGoal - zoomCur) < 0.0005) zoomCur = zoomGoal
        applyCamera()
      }
      beamPivot.rotation.y = beamAngle
      // 光束方向（世界空间）与镜头夹角：正对镜头时锥体会糊成一片，按夹角淡出
      beamDirWorld.set(0, -0.03, 1).applyQuaternion(beamPivot.getWorldQuaternion(beamQuat))
      beamPivot.getWorldPosition(lampWorld)
      toCamera.copy(camera.position).sub(lampWorld).normalize()
      const align = beamDirWorld.dot(toCamera)
      // 正对镜头时锥体末端几乎贴到相机，再低的透明度也会铺满整屏 →
      // 直接收到 0，改用耀斑与曝光提升让人「看到光」而不是看到一层雾
      const beamFade = 1 - THREE.MathUtils.smoothstep(align, 0.62, 0.94)
      beamMat.uniforms.uStrength.value = pulse * beamLevel * beamFade
      beamCoreMat.uniforms.uStrength.value = pulse * 1.5 * beamLevel * beamFade
      beamMat.uniforms.uTime.value = t
      beamCoreMat.uniforms.uTime.value = t
      mist.material.opacity = 0.13 * pulse * beamLevel * beamFade
      spot.intensity = 310 * pulse * beamLevel * beamFade
      waterUniforms.uTime.value = t
      waterUniforms.uBeamStrength.value = 0.55 * pulse * beamLevel
      if (lampMat) lampMat.emissiveIntensity = 1.85 * (0.75 + 0.35 * pulse)
      lampGlow.material.opacity = 0.22 + 0.16 * pulse
      lampLight.intensity = 4.6 * pulse
      moonSprite.material.opacity = 0.5 + 0.06 * Math.sin(t * 0.5)

      waterUniforms.uBeamDir.value.copy(beamDirWorld)
      waterUniforms.uBeamPos.value.copy(lampWorld)
      beamMat.uniforms.uOrigin.value.copy(lampWorld)
      beamCoreMat.uniforms.uOrigin.value.copy(lampWorld)
      let target = 0
      if (!env.reduced) {
        target = Math.max(0, (align - 0.62) / 0.38) ** 2 * 0.42 * beamLevel
      }
      flareLevel += (target - flareLevel) * (dt > 0 ? 1 - Math.exp(-dt * 9) : 1)
      flare.material.opacity = flareLevel
      renderer.toneMappingExposure = baseExposure + flareLevel * 0.35

      if (dt > 0) {
        frameCount += 1
        fpsTimer += dt
        if (fpsTimer >= 1) {
          fps = frameCount / fpsTimer
          frameCount = 0
          fpsTimer = 0
        }
      }

      renderer.render(scene, camera)
    },
  })

  /* ================= 加载进度 / 模型替换 ================= */
  const report = (progress: LighthouseProgress) => opts.onProgress?.(progress)

  /** 用 load 而不是 loadAsync：onProgress 的 loaded / total 是真实字节进度 */
  function loadModelWithProgress(): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      const gltfLoader = new GLTFLoader()
      gltfLoader.setKTX2Loader(ktx2)
      gltfLoader.load(
        opts.url,
        (gltf) => resolve(gltf.scene),
        (event) => {
          const total = event.total || 0
          const loaded = event.loaded || 0
          const frac = total > 0 ? Math.min(1, loaded / total) : 0
          report({
            stage: 'model',
            percent: MODEL_START + (MODEL_END - MODEL_START) * frac,
            loadedBytes: loaded,
            totalBytes: total,
          })
        },
        (error) => reject(error),
      )
    })
  }

  function applyModel(model: THREE.Group) {
    /*
     * 导出场景里 220×220 的沙洲与远处前景礁石是给 Blender 宽景相机取景用的，
     * 搬进卡片特写会变成一块浮在海上的白板；只保留灯塔本体与近岸散落礁石。
     */
    const dropNodes: THREE.Object3D[] = []
    model.traverse((obj) => {
      if (obj.name === 'T_Ground' || obj.name.startsWith('T_FgRock')) dropNodes.push(obj)
    })
    for (const obj of dropNodes) obj.removeFromParent()

    // 用灯塔本体（LH_*）量尺度，礁石与地形不参与归一化
    const lhBox = new THREE.Box3()
    let lampNode: THREE.Object3D | null = null
    model.traverse((obj) => {
      if (!obj.name.startsWith('LH_')) return
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      lhBox.expandByObject(mesh)
      if (obj.name === 'LH_LampCore') lampNode = mesh
    })
    if (lhBox.isEmpty()) lhBox.setFromObject(model)

    const lhSize = lhBox.getSize(new THREE.Vector3())
    const lhCenter = lhBox.getCenter(new THREE.Vector3())
    const scale = TOWER_HEIGHT / Math.max(lhSize.y, 0.001)
    modelScale = scale
    model.scale.setScalar(scale)
    // 塔基底部贴水面，水平方向把灯塔对准场景原点
    model.position.set(-lhCenter.x * scale, -lhBox.min.y * scale + BASE_LIFT, -lhCenter.z * scale)

    // 材质：玻璃半透、灯芯发光，其余平色 PBR 原样保留
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial
        if (!std.isMeshStandardMaterial) continue
        if (std.name === 'M_Glass') {
          std.transparent = true
          std.depthWrite = false
          std.opacity = 0.34
          std.roughness = 0.08
          std.metalness = 0
          std.emissive = new THREE.Color(0x2a1a06)
          std.emissiveIntensity = 0.9
          hasGlass = true
        } else if (std.name === 'M_LampCore') {
          std.emissiveIntensity = 2.4
          std.toneMapped = false
          lampMat = std
          hasLamp = true
        }
      }
    })

    lighthouseGroup.remove(placeholder.root)
    disposeSceneGraph(placeholder.root)
    // 真实模型自带礁石，占位海岸岛会与它叠成一张扁平的深色盘子
    display.remove(coast)
    disposeSceneGraph(coast)
    lighthouseGroup.add(model)

    // 光柱从真实灯芯位置发出
    lighthouseGroup.updateWorldMatrix(true, true)
    if (lampNode) {
      const worldPos = (lampNode as THREE.Object3D).getWorldPosition(new THREE.Vector3())
      beamPivot.position.set(0, lighthouseGroup.worldToLocal(worldPos).y, 0)
    } else {
      beamPivot.position.y = TOWER_HEIGHT * 0.86
    }

    let triangles = 0
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const geo = mesh.geometry as THREE.BufferGeometry
      const index = geo.getIndex()
      triangles += (index ? index.count : geo.getAttribute('position').count) / 3
    })
    console.info(
      `[lighthouse] model loaded: tris=${Math.round(triangles)} height=${TOWER_HEIGHT} scale=${scale.toFixed(3)} lampY=${beamPivot.position.y.toFixed(2)} glass=${hasGlass} lamp=${hasLamp}`,
    )
    modelKind = 'glb'
    if (env.reduced) runtime.renderNow()
  }

  async function boot() {
    report({ stage: 'decoder', percent: 6 })
    try {
      await ktx2.init()
    } catch {
      /* 解码器不可用时由 GLTFLoader 报错，落回占位塔 */
    }
    if (disposed) return

    report({ stage: 'model', percent: MODEL_START })
    let model: THREE.Group | null = null
    try {
      model = await loadModelWithProgress()
    } catch {
      console.info('[lighthouse] model unavailable, using placeholder')
    }
    if (disposed) {
      if (model) disposeSceneGraph(model)
      return
    }
    if (model) applyModel(model)
    report({ stage: 'model', percent: MODEL_END })

    // 真实着色器编译阶段：先不渲染首帧，避免同步编译把进度条卡在 86% 却看不到阶段文字
    report({ stage: 'shader', percent: 86 })
    try {
      await renderer.compileAsync(scene, camera)
    } catch (error) {
      console.warn('[lighthouse] shader precompile skipped', error)
    }
    if (disposed) return
    report({ stage: 'ready', percent: 100 })
    runtime.renderNow()
    if (activeWanted) runtime.setActive(true)
    opts.onReady?.()
  }

  report({ stage: 'scene', percent: 3 })
  void boot()

  // 本地验证用：访问时带 ?debug3d 才暴露帧率、网格与角度
  const debugWindow = window as unknown as {
    __lighthouseDebug?: () => LighthouseDebug
    __lighthouseBeam?: (rad: number) => void
    __lighthouseZoom?: (scale: number) => void
    __lighthouseGlint?: (on: boolean) => void
  }
  if (new URLSearchParams(window.location.search).has('debug3d')) {
    debugWindow.__lighthouseDebug = () => ({
      fps,
      segments,
      beamAngle,
      drag: drag.angles(),
      model: modelKind,
      pointCount: starPositions.length / 3,
      lampY: beamPivot.position.y,
      modelScale,
      glass: hasGlass,
      lamp: hasLamp,
      beam: beamEnabled,
      glint: waterUniforms.uBeamGlint.value > 0.5,
      zoom: { current: zoomCur, goal: zoomGoal, min: ZOOM_MIN, max: ZOOM_MAX },
    })
    // 截图核对光束方位与水面高光带是否一致
    debugWindow.__lighthouseBeam = (rad: number) => {
      beamAngle = rad % (Math.PI * 2)
      runtime.renderNow()
    }
    // 定角缩放，便于 headless 截取同一帧的近 / 远对比
    debugWindow.__lighthouseZoom = (scale: number) => {
      zoomGoal = THREE.MathUtils.clamp(scale, ZOOM_MIN, ZOOM_MAX)
      zoomCur = zoomGoal
      applyCamera()
      runtime.renderNow()
    }
    // 水面光束光斑开关，便于和「无光斑」版本对照
    debugWindow.__lighthouseGlint = (on: boolean) => {
      waterUniforms.uBeamGlint.value = on ? 1 : 0
      runtime.renderNow()
    }
  }

  /* ================= 对外接口 ================= */
  return {
    setActive(active: boolean) {
      activeWanted = active
      runtime.setActive(active)
    },
    setBeam(on: boolean) {
      beamEnabled = on
      if (env.reduced) {
        beamLevel = on ? 1 : 0
        runtime.renderNow()
      }
    },
    dispose() {
      disposed = true
      activeWanted = false
      delete debugWindow.__lighthouseDebug
      delete debugWindow.__lighthouseBeam
      delete debugWindow.__lighthouseZoom
      delete debugWindow.__lighthouseGlint
      clearTimeout(zoomResetTimer)
      zoomPointers.clear()
      drag.dispose()
      host.removeEventListener('pointerdown', onZoomDown)
      host.removeEventListener('pointermove', onZoomMove)
      host.removeEventListener('pointerup', onZoomUp)
      host.removeEventListener('pointercancel', onZoomUp)
      host.removeEventListener('wheel', onWheel)
      runtime.dispose()
      disposeSceneGraph(scene)
      glowTexture.dispose()
      ktx2.dispose()
      releaseRenderer(renderer)
      releaseWebGLContext(contextToken)
    },
  }
}

/* ================= 程序化占位灯塔 ================= */
function buildPlaceholderLighthouse(): {
  root: THREE.Group
  coast: THREE.Group
  lantern: THREE.MeshStandardMaterial
  lampY: number
} {
  const root = new THREE.Group()

  const towerMat = new THREE.MeshStandardMaterial({ color: 0xe7edf4, roughness: 0.62, metalness: 0.05 })
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xa8392f, roughness: 0.66, metalness: 0.04 })
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.45, metalness: 0.55 })
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a24,
    emissive: 0xffc36f,
    emissiveIntensity: 1.8,
    roughness: 0.3,
    metalness: 0.2,
  })

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.52, 3.1, 26), towerMat)
  tower.position.y = 1.55
  root.add(tower)

  // 两道红色环带，用上下半径近似锥度
  const bandA = new THREE.Mesh(new THREE.CylinderGeometry(0.455, 0.475, 0.34, 26), stripeMat)
  bandA.position.y = 0.95
  const bandB = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.375, 0.30, 26), stripeMat)
  bandB.position.y = 2.25
  root.add(bandA, bandB)

  // 观景台与栏杆
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.09, 20), metalMat)
  deck.position.y = 3.12
  const rail = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.022, 8, 24), metalMat)
  rail.rotation.x = Math.PI / 2
  rail.position.y = 3.26
  root.add(deck, rail)

  // 灯室
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.44, 16), lanternMat)
  lantern.position.y = 3.40
  root.add(lantern)

  // 顶盖与风标
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.40, 16), metalMat)
  roof.position.y = 3.82
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), metalMat)
  finial.position.y = 4.05
  root.add(roof, finial)

  // 基座礁石，遮住塔身与地面的接缝
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x39464f, roughness: 0.92, metalness: 0.03, flatShading: true })
  const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), rockMat)
  baseRock.position.set(0, 0.28, 0)
  baseRock.scale.set(1.25, 0.55, 1.15)
  root.add(baseRock)

  /* 海岸：压扁的低多边形岛 + 散落礁石 */
  const coast = new THREE.Group()
  const island = new THREE.Mesh(new THREE.SphereGeometry(6.2, 30, 14), rockMat)
  island.scale.set(1.05, 0.22, 0.68)
  island.position.set(0, -0.55, -6.4)
  coast.add(island)

  const boulderGeo = new THREE.DodecahedronGeometry(1, 0)
  const spots: Array<[number, number, number, number, number]> = [
    [-3.3, -2.7, 0.45, 0.75, 0.55],
    [3.1, -3.1, 0.42, 0.9, 0.6],
    [-4.8, -5.4, 0.34, 0.7, 0.45],
    [4.6, -5.0, 0.36, 0.8, 0.5],
    [-1.5, -7.2, 0.3, 0.6, 0.45],
    [1.8, -7.8, 0.26, 0.55, 0.4],
    [-3.9, -1.2, 0.22, 0.5, 0.36],
    [4.0, -1.5, 0.24, 0.55, 0.38],
  ]
  for (const [x, z, y, sx, sz] of spots) {
    const rock = new THREE.Mesh(boulderGeo, rockMat)
    rock.position.set(x, y, z)
    rock.scale.set(sx, sx * 1.15, sz)
    rock.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.5)
    coast.add(rock)
  }

  return { root, coast, lantern: lanternMat, lampY: 3.40 }
}
