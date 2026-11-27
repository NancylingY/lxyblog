import * as THREE from 'three'

export type DioramaView = 'hero' | 'street' | 'explode'
export type DioramaWeather = 'rain' | 'sun' | 'snow'

export interface DioramaStateOptions {
  view?: DioramaView
  weather?: DioramaWeather
  exploded?: boolean
  convergence?: boolean
  time?: number
  autoOrbit?: boolean
}

export interface CalloutScreenItem {
  id: string
  tier: '+1' | '0' | '-1'
  side: 'left' | 'right'
  title: string
  subtitle: string
  elevation: string
  anchorX: number
  anchorY: number
  cardX: number
  cardY: number
  visible: boolean
}

export interface DioramaMetrics {
  fps: number
  triangles: number
  drawCalls: number
  weather: DioramaWeather
  view: DioramaView
  exploded: boolean
  convergence: boolean
  calloutCount: number
  calloutOverlaps: number
  calloutOutOfBounds: number
}

export interface DioramaCallbacks {
  onStateChange?: (state: {
    view: DioramaView
    weather: DioramaWeather
    exploded: boolean
    convergence: boolean
    audioOn: boolean
    tierStatus: { sky: string; street: string; underground: string }
  }) => void
  onCalloutsUpdate?: (callouts: CalloutScreenItem[]) => void
}

export interface DioramaController {
  setView: (view: DioramaView) => void
  setWeather: (weather: DioramaWeather) => void
  cycleWeather: () => void
  toggleExplode: () => void
  triggerConvergence: () => void
  toggleAudio: () => boolean
  setState: (opts: DioramaStateOptions) => void
  advanceSimulation: (dt: number) => void
  setCameraPose: (pos: [number, number, number], target: [number, number, number]) => void
  getMetrics: () => DioramaMetrics
  dispose: () => void
}

export interface WeatherResponsive {
  snowMeshes: THREE.Object3D[]
  wetLeafMeshes: THREE.Object3D[]
  emissiveMaterials: Array<{
    material: THREE.MeshStandardMaterial
    rainIntensity: number
    sunIntensity: number
    snowIntensity: number
  }>
  haloMaterials: Array<{
    material: THREE.ShaderMaterial
    rainOpacity: number
    sunOpacity: number
    snowOpacity: number
  }>
  pointLights: Array<{
    light: THREE.PointLight
    rainIntensity: number
    sunIntensity: number
    snowIntensity: number
  }>
}

export interface CalloutAnchorDef {
  id: string
  tier: '+1' | '0' | '-1'
  side: 'left' | 'right'
  title: string
  subtitle: string
  elevation: string
  localPos: THREE.Vector3
  groupKey: 'sky' | 'street' | 'underground'
}

export const DIORAMA_WIDTH = 20
export const DIORAMA_DEPTH = 14.4
export const HALF_W = DIORAMA_WIDTH / 2
export const HALF_D = DIORAMA_DEPTH / 2

export function createWeatherBag(): WeatherResponsive {
  return {
    snowMeshes: [],
    wetLeafMeshes: [],
    emissiveMaterials: [],
    haloMaterials: [],
    pointLights: [],
  }
}

export function mergeWeatherBags(target: WeatherResponsive, src: WeatherResponsive): void {
  target.snowMeshes.push(...src.snowMeshes)
  target.wetLeafMeshes.push(...src.wetLeafMeshes)
  target.emissiveMaterials.push(...src.emissiveMaterials)
  target.haloMaterials.push(...src.haloMaterials)
  target.pointLights.push(...src.pointLights)
}

/**
 * Metal-safe Fresnel volumetric glow halo shader (zero NaN/Inf, additive soft glow).
 */
export function createHaloMaterial(colorHex: number, baseOpacity = 0.36): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: baseOpacity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float ndv = clamp(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
        float core = pow(max(ndv, 1e-5), 2.4);
        float alpha = core * uOpacity;
        gl_FragColor = vec4(uColor * (0.85 + 0.35 * core), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  })
}

/**
 * Crystal-clear anti-reflective Fresnel acrylic cutaway panel (transmission: 0 for Chrome Metal safety).
 */
export function createAcrylicCutawayMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: new THREE.Color(0xcce8ff) },
      uEdgeColor: { value: new THREE.Color(0xe6f4ff) },
      uOpacity: { value: 0.12 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint;
      uniform vec3 uEdgeColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float ndv = clamp(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
        float fresnel = pow(max(1.0 - ndv, 1e-5), 3.0);
        float edgeX = smoothstep(0.035, 0.0, min(vUv.x, 1.0 - vUv.x));
        float edgeY = smoothstep(0.055, 0.0, min(vUv.y, 1.0 - vUv.y));
        float rim = max(edgeX, edgeY);
        float sheen = smoothstep(0.45, 0.55, vUv.x * 0.65 + vUv.y * 0.35) * 0.045;
        vec3 col = mix(uTint, uEdgeColor, clamp(rim + fresnel * 0.65, 0.0, 1.0));
        float alpha = clamp(uOpacity * 0.35 + fresnel * 0.14 + rim * 0.42 + sheen, 0.0, 0.58);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

declare global {
  interface Window {
    __setDioramaState?: (opts: DioramaStateOptions) => void
    __advanceSimulation?: (dt: number) => void
    __setCameraPose?: (pos: [number, number, number], target: [number, number, number]) => void
    __getDioramaMetrics?: () => DioramaMetrics
  }
}
