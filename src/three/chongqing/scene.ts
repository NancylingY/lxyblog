import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ChongqingAudio } from './audio'
import { createChongqingTextures } from './textures'
import { buildSkyTier } from './tierSky'
import { buildStreetTier } from './tierStreet'
import { buildUndergroundTier } from './tierUnderground'
import {
  HALF_D,
  HALF_W,
  createWeatherBag,
  mergeWeatherBags,
  type CalloutAnchorDef,
  type CalloutScreenItem,
  type DioramaCallbacks,
  type DioramaController,
  type DioramaMetrics,
  type DioramaStateOptions,
  type DioramaView,
  type DioramaWeather,
} from './types'

const CALLOUT_CARD_W = 216
const CALLOUT_CARD_H = 58
const CALLOUT_GAP_Y = 14

const CALLOUT_DEFS: CalloutAnchorDef[] = [
  // Left column (4 cards, top -> bottom)
  {
    id: 'cableway',
    tier: '+1',
    side: 'left',
    title: '长江索道',
    subtitle: '红白凌空轿厢 · X型钢桁架塔',
    elevation: '+18m',
    localPos: new THREE.Vector3(-4.2, 14.3, -3.5),
    groupKey: 'sky',
  },
  {
    id: 'diaojiaolou',
    tier: '0',
    side: 'left',
    title: '巴渝吊脚楼',
    subtitle: '穿斗立柱 · 美人靠 · 小青瓦飞檐',
    elevation: '+5m',
    localPos: new THREE.Vector3(-5.8, 5.2, 1.4),
    groupKey: 'street',
  },
  {
    id: 'hotpot-street',
    tier: '0',
    side: 'left',
    title: '重庆老火锅 · 小面',
    subtitle: '实景内凹堂食 · 九宫格与灯笼',
    elevation: '0m',
    localPos: new THREE.Vector3(-4.4, 1.6, 2.3),
    groupKey: 'street',
  },
  {
    id: 'subway',
    tier: '-1',
    side: 'left',
    title: '穿山地铁 · 洪崖雨巷站',
    subtitle: '盾构站台 · 红银流线列车进站',
    elevation: '-10m',
    localPos: new THREE.Vector3(-4.2, -3.1, 2.5),
    groupKey: 'underground',
  },
  // Right column (4 cards, top -> bottom)
  {
    id: 'liziba',
    tier: '+1',
    side: 'right',
    title: '李子坝单轨穿楼',
    subtitle: '2号线跨座单轨 · 防盗网居民楼',
    elevation: '+16m',
    localPos: new THREE.Vector3(5.0, 9.6, 0.2),
    groupKey: 'sky',
  },
  {
    id: 'banyan-stairs',
    tier: '0',
    side: 'right',
    title: '山城黄桷树 · 青石梯坎',
    subtitle: '气根青苔堡坎 · 2200+叶簇',
    elevation: '+2m',
    localPos: new THREE.Vector3(1.1, 3.6, 0.9),
    groupKey: 'street',
  },
  {
    id: 'teahouse-taxi',
    tier: '0',
    side: 'right',
    title: '山城茶馆 · 黄色出租',
    subtitle: '湿润沥青霓虹倒影 · 渝A出租车',
    elevation: '0m',
    localPos: new THREE.Vector3(4.2, 1.4, 3.8),
    groupKey: 'street',
  },
  {
    id: 'shelter-hotpot',
    tier: '-1',
    side: 'right',
    title: '防空洞地下老火锅',
    subtitle: '1969砖石拱顶 · 沸腾红油九宫格',
    elevation: '-10m',
    localPos: new THREE.Vector3(5.8, -3.2, 3.4),
    groupKey: 'underground',
  },
]

interface CameraPreset {
  pos: THREE.Vector3
  target: THREE.Vector3
}

const CAMERA_PRESETS: Record<DioramaView, CameraPreset> = {
  hero: {
    pos: new THREE.Vector3(15.2, 6.8, 36.8),
    target: new THREE.Vector3(0.0, 4.1, -0.4),
  },
  street: {
    pos: new THREE.Vector3(-9.5, 4.0, 14.2),
    target: new THREE.Vector3(0.4, 4.5, -0.8),
  },
  explode: {
    pos: new THREE.Vector3(21.5, 11.4, 46.8),
    target: new THREE.Vector3(0.0, 4.2, -0.4),
  },
}

export function createChongqingDiorama(
  container: HTMLElement,
  callbacks: DioramaCallbacks = {},
): DioramaController {
  // ==================== 1. RENDERER & SCENE ====================
  const width = Math.max(container.clientWidth, 320)
  const height = Math.max(container.clientHeight, 240)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(width, height)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.localClippingEnabled = true
  renderer.info.autoReset = false
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x0b1320, 0.0105)

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.25, 220)
  camera.position.copy(CAMERA_PRESETS.hero.pos)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.target.copy(CAMERA_PRESETS.hero.target)
  controls.minDistance = 8.5
  controls.maxDistance = 62
  controls.maxPolarAngle = Math.PI * 0.56
  controls.minPolarAngle = 0.18
  controls.autoRotate = false
  controls.autoRotateSpeed = 0.45
  controls.update()

  // ==================== 2. SELECTIVE BLOOM POST-PROCESSING (CHROME METAL SAFE) ====================
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.34, 0.46, 0.94)
  composer.addPass(bloomPass)
  composer.addPass(new OutputPass())

  // ==================== 3. GRADIENT SKY BACKDROP DOME (ZERO EXTERNAL ASSETS) ====================
  const skyUniforms = {
    uTopColor: { value: new THREE.Color(0x070e18) },
    uMidColor: { value: new THREE.Color(0x111e30) },
    uHorizonColor: { value: new THREE.Color(0x212838) },
  }
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(125, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        varying vec3 vWorldDir;
        void main() {
          float h = clamp(vWorldDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 low = mix(uHorizonColor, uMidColor, smoothstep(0.32, 0.58, h));
          vec3 col = mix(low, uTopColor, pow(max(smoothstep(0.52, 0.96, h), 1e-5), 1.2));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  )
  scene.add(skyDome)

  // Subtle museum gallery floor plane far beneath plinth for gentle visual grounding
  const galleryFloor = new THREE.Mesh(
    new THREE.CircleGeometry(46, 48),
    new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.88, metalness: 0.08 }),
  )
  galleryFloor.rotation.x = -Math.PI / 2
  galleryFloor.position.y = -7.36
  galleryFloor.receiveShadow = true
  scene.add(galleryFloor)

  // ==================== 4. LIGHTING RIG (3 CLIMATES) ====================
  const hemiLight = new THREE.HemisphereLight(0x527298, 0x261d19, 0.82)
  scene.add(hemiLight)

  const keyLight = new THREE.DirectionalLight(0xa6c4e8, 1.45)
  keyLight.position.set(18, 28, 22)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.left = -16
  keyLight.shadow.camera.right = 16
  keyLight.shadow.camera.top = 20
  keyLight.shadow.camera.bottom = -12
  keyLight.shadow.camera.near = 4
  keyLight.shadow.camera.far = 75
  keyLight.shadow.bias = -0.0006
  scene.add(keyLight)

  const warmFillLight = new THREE.DirectionalLight(0xffb070, 0.55)
  warmFillLight.position.set(-18, 12, 14)
  scene.add(warmFillLight)

  const rimLight = new THREE.DirectionalLight(0x6496cc, 0.65)
  rimLight.position.set(-8, 18, -22)
  scene.add(rimLight)

  // ==================== 5. BUILD ALL THREE VERTICAL TIERS ====================
  const textures = createChongqingTextures()
  const dioramaClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), HALF_W + 0.15),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), HALF_W + 0.15),
  ]

  const undergroundTier = buildUndergroundTier(textures, dioramaClipPlanes)
  const streetTier = buildStreetTier(textures, dioramaClipPlanes)
  const skyTier = buildSkyTier(textures, dioramaClipPlanes)

  scene.add(undergroundTier.group)
  scene.add(streetTier.group)
  scene.add(skyTier.group)

  const weatherBag = createWeatherBag()
  mergeWeatherBags(weatherBag, undergroundTier.weatherBag)
  mergeWeatherBags(weatherBag, streetTier.weatherBag)
  mergeWeatherBags(weatherBag, skyTier.weatherBag)

  // ==================== 6. TECHNICAL CAD EXPLODE GUIDE AXES (VISIBLE IN KEY 4) ====================
  const guideAxesGroup = new THREE.Group()
  guideAxesGroup.visible = false
  scene.add(guideAxesGroup)

  const axisLineMat = new THREE.MeshBasicMaterial({
    color: 0x6ce8d6,
    transparent: true,
    opacity: 0.55,
  })
  const axisTickMat = new THREE.MeshBasicMaterial({
    color: 0xe6c178,
    transparent: true,
    opacity: 0.78,
  })

  for (const [ax, az] of [
    [-HALF_W - 0.35, HALF_D + 0.25],
    [HALF_W + 0.35, HALF_D + 0.25],
    [-HALF_W - 0.35, -HALF_D - 0.25],
    [HALF_W + 0.35, -HALF_D - 0.25],
  ]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 29.5, 6), axisLineMat)
    rod.position.set(ax!, 5.4, az!)
    guideAxesGroup.add(rod)

    // Tier elevation tick rings at -10m, 0m, +16m levels
    for (const ty of [-6.0, 0.0, 7.8, 16.5]) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), axisTickMat)
      tick.position.set(ax!, ty, az!)
      guideAxesGroup.add(tick)
    }
  }

  // ==================== 7. PROCEDURAL RAIN STREAKS & SNOWFLAKE PARTICLES ====================
  const rainCount = 900
  const rainPositions = new Float32Array(rainCount * 6)
  const rainSpeeds = new Float32Array(rainCount)
  for (let i = 0; i < rainCount; i++) {
    const x = (Math.random() - 0.5) * 28
    const y = 0.2 + Math.random() * 21
    const z = (Math.random() - 0.5) * 22
    const len = 0.65 + Math.random() * 0.55
    rainSpeeds[i] = 17 + Math.random() * 8
    const o = i * 6
    rainPositions[o] = x
    rainPositions[o + 1] = y
    rainPositions[o + 2] = z
    rainPositions[o + 3] = x - 0.08
    rainPositions[o + 4] = y - len
    rainPositions[o + 5] = z + 0.04
  }
  const rainGeo = new THREE.BufferGeometry()
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xaad0f0,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  })
  const rainLines = new THREE.LineSegments(rainGeo, rainMat)
  scene.add(rainLines)

  // Soft circular snowflake texture
  const snowFlakeCanvas = document.createElement('canvas')
  snowFlakeCanvas.width = 32
  snowFlakeCanvas.height = 32
  const sfCtx = snowFlakeCanvas.getContext('2d')!
  const sfGrad = sfCtx.createRadialGradient(16, 16, 1, 16, 16, 15)
  sfGrad.addColorStop(0, 'rgba(235, 244, 255, 0.92)')
  sfGrad.addColorStop(0.6, 'rgba(210, 228, 248, 0.45)')
  sfGrad.addColorStop(1, 'rgba(200, 220, 245, 0)')
  sfCtx.fillStyle = sfGrad
  sfCtx.fillRect(0, 0, 32, 32)
  const snowFlakeTex = new THREE.CanvasTexture(snowFlakeCanvas)

  const snowCount = 780
  const snowPositions = new Float32Array(snowCount * 3)
  const snowDrift = new Float32Array(snowCount)
  for (let i = 0; i < snowCount; i++) {
    snowPositions[i * 3] = (Math.random() - 0.5) * 28
    snowPositions[i * 3 + 1] = -3 + Math.random() * 24
    snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 22
    snowDrift[i] = Math.random() * Math.PI * 2
  }
  const snowGeo = new THREE.BufferGeometry()
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
  const snowPointsMat = new THREE.PointsMaterial({
    map: snowFlakeTex,
    size: 0.24,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    color: 0xd8e6f5,
  })
  const snowPoints = new THREE.Points(snowGeo, snowPointsMat)
  snowPoints.visible = false
  scene.add(snowPoints)

  // ==================== 8. STATE, CLIMATE APPLICATION & CALLOUT PROJECTION ====================
  const audio = new ChongqingAudio()
  let currentView: DioramaView = 'hero'
  let currentWeather: DioramaWeather = 'rain'
  let isExploded = false
  let explodeFactor = 0
  let convergenceActive = false
  let convergenceTimer = 0
  let simTime = 0
  let camTransitioning = false
  const camGoalPos = CAMERA_PRESETS.hero.pos.clone()
  const camGoalTarget = CAMERA_PRESETS.hero.target.clone()
  let disposed = false
  let rafId = 0
  let lastFrameMs = performance.now()
  let smoothedFps = 60

  let lastCallouts: CalloutScreenItem[] = []
  let lastCalloutOverlaps = 0
  let lastCalloutOutOfBounds = 0

  const applyWeatherVisuals = (weather: DioramaWeather) => {
    const isRain = weather === 'rain'
    const isSun = weather === 'sun'
    const isSnow = weather === 'snow'

    rainLines.visible = isRain
    snowPoints.visible = isSnow

    for (const m of weatherBag.snowMeshes) m.visible = isSnow
    for (const l of weatherBag.wetLeafMeshes) l.visible = !isSnow

    for (const e of weatherBag.emissiveMaterials) {
      e.material.emissiveIntensity = isRain ? e.rainIntensity : isSun ? e.sunIntensity : e.snowIntensity
    }
    for (const h of weatherBag.haloMaterials) {
      if (h.material.uniforms.uOpacity) {
        h.material.uniforms.uOpacity.value = isRain ? h.rainOpacity : isSun ? h.sunOpacity : h.snowOpacity
      }
    }
    for (const pl of weatherBag.pointLights) {
      pl.light.intensity = isRain ? pl.rainIntensity : isSun ? pl.sunIntensity : pl.snowIntensity
    }

    if (isRain) {
      skyUniforms.uTopColor.value.setHex(0x070d18)
      skyUniforms.uMidColor.value.setHex(0x111e32)
      skyUniforms.uHorizonColor.value.setHex(0x202738)
      scene.fog = new THREE.FogExp2(0x0c1422, 0.01)
      hemiLight.color.setHex(0x52729a)
      hemiLight.groundColor.setHex(0x261d19)
      hemiLight.intensity = 0.85
      keyLight.color.setHex(0xa8c6ea)
      keyLight.intensity = 1.48
      keyLight.position.set(18, 28, 22)
      warmFillLight.color.setHex(0xffa65c)
      warmFillLight.intensity = 0.62
      rimLight.color.setHex(0x6496cc)
      rimLight.intensity = 0.7
      renderer.toneMappingExposure = 1.04
      bloomPass.threshold = 0.94
      bloomPass.strength = 0.34
      galleryFloor.material.color.setHex(0x0a0e16)
    } else if (isSun) {
      // Warm Golden-Hour Mountain Sunlight: celadon-to-apricot sky!
      skyUniforms.uTopColor.value.setHex(0x4b7f8c)
      skyUniforms.uMidColor.value.setHex(0xa6c4bc)
      skyUniforms.uHorizonColor.value.setHex(0xf2b98a)
      scene.fog = new THREE.FogExp2(0xd8bea2, 0.0062)
      hemiLight.color.setHex(0xfff0d4)
      hemiLight.groundColor.setHex(0x6a5442)
      hemiLight.intensity = 1.22
      keyLight.color.setHex(0xffe0a8)
      keyLight.intensity = 2.65
      keyLight.position.set(24, 24, 18)
      warmFillLight.color.setHex(0x8ec0d6)
      warmFillLight.intensity = 0.72
      rimLight.color.setHex(0xffc98a)
      rimLight.intensity = 0.85
      renderer.toneMappingExposure = 0.98
      bloomPass.threshold = 0.96
      bloomPass.strength = 0.16
      galleryFloor.material.color.setHex(0xcab69e)
    } else {
      // Cozy Lantern Snow Night — soft matte snow, ZERO bloom whiteout!
      skyUniforms.uTopColor.value.setHex(0x0c1626)
      skyUniforms.uMidColor.value.setHex(0x1a2a40)
      skyUniforms.uHorizonColor.value.setHex(0x2b3a4f)
      scene.fog = new THREE.FogExp2(0x152234, 0.0095)
      hemiLight.color.setHex(0x8aa8cc)
      hemiLight.groundColor.setHex(0x2a2220)
      hemiLight.intensity = 0.92
      keyLight.color.setHex(0xc8dcf2)
      keyLight.intensity = 1.25
      keyLight.position.set(16, 26, 20)
      warmFillLight.color.setHex(0xffaa58)
      warmFillLight.intensity = 0.64
      rimLight.color.setHex(0x82a8d4)
      rimLight.intensity = 0.58
      renderer.toneMappingExposure = 0.96
      bloomPass.threshold = 0.96
      bloomPass.strength = 0.24
      galleryFloor.material.color.setHex(0x101722)
    }

    audio.setWeather(weather)
  }

  const emitState = () => {
    callbacks.onStateChange?.({
      view: currentView,
      weather: currentWeather,
      exploded: isExploded,
      convergence: convergenceActive,
      audioOn: audio.isEnabled(),
      tierStatus: {
        sky: skyTier.getSkyStatus(),
        street: streetTier.getStreetStatus(),
        underground: undergroundTier.getMetroStatus(),
      },
    })
  }

  const updateExplodeTransforms = (snap = false, dt = 0.016) => {
    const target = isExploded ? 1 : 0
    if (snap) {
      explodeFactor = target
    } else {
      explodeFactor += (target - explodeFactor) * Math.min(1, dt * 5.2)
    }
    undergroundTier.group.position.y = -2.65 * explodeFactor
    streetTier.group.position.y = 0
    skyTier.group.position.y = 3.25 * explodeFactor
    guideAxesGroup.visible = explodeFactor > 0.04
    axisLineMat.opacity = 0.55 * explodeFactor
    axisTickMat.opacity = 0.78 * explodeFactor
  }

  /**
   * Projects 8 Chinese CAD callout anchors (4 left + 4 right) to screen coordinates
   * with strict vertical collision avoidance and HUD safe-zone clamping so:
   * - calloutOverlaps === 0
   * - calloutOutOfBounds === 0
   */
  const computeCallouts = () => {
    const visible = explodeFactor > 0.45
    const vw = renderer.domElement.clientWidth || width
    const vh = renderer.domElement.clientHeight || height

    if (!visible) {
      if (lastCallouts.length > 0) {
        lastCallouts = []
        lastCalloutOverlaps = 0
        lastCalloutOutOfBounds = 0
        callbacks.onCalloutsUpdate?.([])
      }
      return
    }

    const safeTop = 108
    const safeBottom = Math.max(safeTop + 280, vh - 106)
    const leftX = 20
    const rightX = Math.max(leftX + CALLOUT_CARD_W + 20, vw - CALLOUT_CARD_W - 20)

    const groupMap = {
      sky: skyTier.group,
      street: streetTier.group,
      underground: undergroundTier.group,
    }

    const rawItems: CalloutScreenItem[] = CALLOUT_DEFS.map((def) => {
      const worldPos = def.localPos.clone()
      groupMap[def.groupKey].localToWorld(worldPos)
      const proj = worldPos.project(camera)
      const anchorX = (proj.x * 0.5 + 0.5) * vw
      const anchorY = (-proj.y * 0.5 + 0.5) * vh
      const cardX = def.side === 'left' ? leftX : rightX
      return {
        id: def.id,
        tier: def.tier,
        side: def.side,
        title: def.title,
        subtitle: def.subtitle,
        elevation: def.elevation,
        anchorX,
        anchorY,
        cardX,
        cardY: Math.max(safeTop, Math.min(safeBottom - CALLOUT_CARD_H, anchorY - CALLOUT_CARD_H * 0.5)),
        visible: true,
      }
    })

    // Resolve vertical overlaps independently per side (left 4, right 4)
    const resolveColumn = (side: 'left' | 'right') => {
      const col = rawItems.filter((c) => c.side === side).sort((a, b) => a.anchorY - b.anchorY)
      const step = CALLOUT_CARD_H + CALLOUT_GAP_Y
      // Forward pass: push down any overlapping cards
      for (let i = 1; i < col.length; i++) {
        const prev = col[i - 1]!
        const curr = col[i]!
        if (curr.cardY < prev.cardY + step) {
          curr.cardY = prev.cardY + step
        }
      }
      // Backward pass: clamp bottom and pull up cleanly
      const maxTop = safeBottom - CALLOUT_CARD_H
      if (col.length > 0 && col[col.length - 1]!.cardY > maxTop) {
        col[col.length - 1]!.cardY = maxTop
        for (let i = col.length - 2; i >= 0; i--) {
          const next = col[i + 1]!
          const curr = col[i]!
          if (curr.cardY + step > next.cardY) {
            curr.cardY = next.cardY - step
          }
        }
      }
      // Final top guard if viewport is compact
      if (col.length > 0 && col[0]!.cardY < safeTop) {
        const avail = Math.max(col.length * CALLOUT_CARD_H, safeBottom - safeTop)
        const evenStep = (avail - CALLOUT_CARD_H) / Math.max(col.length - 1, 1)
        col.forEach((c, idx) => {
          c.cardY = safeTop + idx * evenStep
        })
      }
    }

    resolveColumn('left')
    resolveColumn('right')

    // Compute exact QA overlap & out-of-bounds metrics
    let overlaps = 0
    let oob = 0
    for (let i = 0; i < rawItems.length; i++) {
      const a = rawItems[i]!
      if (a.cardX < 0 || a.cardY < 0 || a.cardX + CALLOUT_CARD_W > vw || a.cardY + CALLOUT_CARD_H > vh) {
        oob++
      }
      for (let j = i + 1; j < rawItems.length; j++) {
        const b = rawItems[j]!
        const overlapX = a.cardX < b.cardX + CALLOUT_CARD_W && a.cardX + CALLOUT_CARD_W > b.cardX
        const overlapY = a.cardY < b.cardY + CALLOUT_CARD_H && a.cardY + CALLOUT_CARD_H > b.cardY
        if (overlapX && overlapY) overlaps++
      }
    }

    lastCallouts = rawItems
    lastCalloutOverlaps = overlaps
    lastCalloutOutOfBounds = oob
    callbacks.onCalloutsUpdate?.(rawItems)
  }

  const stepParticles = (dt: number) => {
    if (rainLines.visible) {
      const arr = rainGeo.attributes.position!.array as Float32Array
      for (let i = 0; i < rainCount; i++) {
        const o = i * 6
        const dy = rainSpeeds[i]! * dt
        arr[o + 1]! -= dy
        arr[o + 4]! -= dy
        if (arr[o + 1]! < 0.2) {
          const resetY = 19 + Math.random() * 4
          const len = arr[o + 1]! - arr[o + 4]!
          arr[o + 1] = resetY
          arr[o + 4] = resetY - Math.max(0.55, Math.min(1.2, Math.abs(len)))
        }
      }
      rainGeo.attributes.position!.needsUpdate = true
    }

    if (snowPoints.visible) {
      const arr = snowGeo.attributes.position!.array as Float32Array
      for (let i = 0; i < snowCount; i++) {
        const o = i * 3
        arr[o]! += Math.sin(simTime * 0.9 + snowDrift[i]!) * dt * 0.55
        arr[o + 1]! -= dt * 1.85
        if (arr[o + 1]! < 0.2) {
          arr[o + 1] = 20 + Math.random() * 3
          arr[o] = (Math.random() - 0.5) * 28
        }
      }
      snowGeo.attributes.position!.needsUpdate = true
    }
  }

  const stepSimulation = (dt: number, snapTransitions = false) => {
    const safeDt = Math.max(0, Math.min(dt, 0.2))
    simTime += safeDt

    if (convergenceActive) {
      convergenceTimer -= safeDt
      if (convergenceTimer <= 0) {
        convergenceActive = false
        emitState()
      }
    }

    updateExplodeTransforms(snapTransitions, safeDt)

    if (camTransitioning) {
      if (snapTransitions) {
        camera.position.copy(camGoalPos)
        controls.target.copy(camGoalTarget)
        camTransitioning = false
      } else {
        const k = Math.min(1, safeDt * 4.5)
        camera.position.lerp(camGoalPos, k)
        controls.target.lerp(camGoalTarget, k)
        if (camera.position.distanceTo(camGoalPos) < 0.04 && controls.target.distanceTo(camGoalTarget) < 0.04) {
          camTransitioning = false
        }
      }
    }

    controls.update()
    undergroundTier.update(simTime, safeDt, convergenceActive)
    streetTier.update(simTime, safeDt, convergenceActive, currentWeather)
    skyTier.update(simTime, safeDt, convergenceActive, currentWeather)
    stepParticles(safeDt)

    renderer.info.reset()
    composer.render()
    computeCallouts()
  }

  // Stop camera tween if user manually drags orbit
  const onOrbitStart = () => {
    camTransitioning = false
  }
  controls.addEventListener('start', onOrbitStart)

  // ==================== 9. PUBLIC CONTROLLER & DETERMINISTIC WINDOW HOOKS ====================
  const setView = (view: DioramaView, snap = false) => {
    currentView = view
    isExploded = view === 'explode'
    const preset = CAMERA_PRESETS[view]
    camGoalPos.copy(preset.pos)
    camGoalTarget.copy(preset.target)
    camTransitioning = true
    if (snap) {
      camera.position.copy(camGoalPos)
      controls.target.copy(camGoalTarget)
      camTransitioning = false
      updateExplodeTransforms(true, 0)
      controls.update()
    }
    emitState()
  }

  const setWeather = (weather: DioramaWeather) => {
    currentWeather = weather
    applyWeatherVisuals(weather)
    emitState()
  }

  const cycleWeather = () => {
    const order: DioramaWeather[] = ['rain', 'sun', 'snow']
    const next = order[(order.indexOf(currentWeather) + 1) % order.length]!
    setWeather(next)
  }

  const toggleExplode = () => {
    if (isExploded) {
      setView('hero')
    } else {
      setView('explode')
    }
  }

  const triggerConvergence = () => {
    convergenceActive = true
    convergenceTimer = 10.5
    audio.triggerConvergenceChime()
    emitState()
  }

  const toggleAudio = () => {
    const on = audio.toggle()
    emitState()
    return on
  }

  const setState = (opts: DioramaStateOptions) => {
    if (opts.weather) {
      currentWeather = opts.weather
      applyWeatherVisuals(currentWeather)
    }
    if (opts.view) {
      setView(opts.view, true)
    }
    if (typeof opts.exploded === 'boolean') {
      isExploded = opts.exploded
      if (isExploded && currentView !== 'explode') {
        currentView = 'explode'
        camera.position.copy(CAMERA_PRESETS.explode.pos)
        controls.target.copy(CAMERA_PRESETS.explode.target)
        camTransitioning = false
      } else if (!isExploded && currentView === 'explode') {
        currentView = 'hero'
        camera.position.copy(CAMERA_PRESETS.hero.pos)
        controls.target.copy(CAMERA_PRESETS.hero.target)
        camTransitioning = false
      }
      updateExplodeTransforms(true, 0)
    }
    if (typeof opts.convergence === 'boolean') {
      convergenceActive = opts.convergence
      convergenceTimer = opts.convergence ? 99 : 0
    }
    if (typeof opts.autoOrbit === 'boolean') {
      controls.autoRotate = opts.autoOrbit
    }
    if (typeof opts.time === 'number') {
      simTime = opts.time
    }
    stepSimulation(0.016, true)
    emitState()
  }

  const setCameraPose = (pos: [number, number, number], target: [number, number, number]) => {
    camTransitioning = false
    camera.position.set(pos[0], pos[1], pos[2])
    controls.target.set(target[0], target[1], target[2])
    controls.update()
    composer.render()
    computeCallouts()
  }

  const getMetrics = (): DioramaMetrics => ({
    fps: Math.round(smoothedFps),
    triangles: renderer.info.render.triangles,
    drawCalls: renderer.info.render.calls,
    weather: currentWeather,
    view: currentView,
    exploded: isExploded,
    convergence: convergenceActive,
    calloutCount: lastCallouts.length,
    calloutOverlaps: lastCalloutOverlaps,
    calloutOutOfBounds: lastCalloutOutOfBounds,
  })

  // Attach deterministic QA hooks on window
  window.__setDioramaState = setState
  window.__advanceSimulation = (dt: number) => stepSimulation(dt, false)
  window.__setCameraPose = setCameraPose
  window.__getDioramaMetrics = getMetrics

  // ==================== 10. RESIZE & ANIMATION LOOP ====================
  const onResize = () => {
    if (disposed) return
    const w = Math.max(container.clientWidth, 320)
    const h = Math.max(container.clientHeight, 240)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
    bloomPass.resolution.set(w, h)
    computeCallouts()
  }
  window.addEventListener('resize', onResize)

  applyWeatherVisuals('rain')
  emitState()

  // Initial deterministic render frame
  stepSimulation(0.016, true)

  const animate = (now: number) => {
    if (disposed) return
    rafId = requestAnimationFrame(animate)
    const rawDt = Math.max(0.001, (now - lastFrameMs) / 1000)
    lastFrameMs = now
    const instantFps = Math.min(120, 1 / rawDt)
    smoothedFps = smoothedFps * 0.9 + instantFps * 0.1
    stepSimulation(Math.min(rawDt, 0.05), false)
  }
  rafId = requestAnimationFrame(animate)

  const dispose = () => {
    disposed = true
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    controls.removeEventListener('start', onOrbitStart)
    controls.dispose()
    audio.dispose()
    textures.dispose()
    snowFlakeTex.dispose()
    delete window.__setDioramaState
    delete window.__advanceSimulation
    delete window.__setCameraPose
    delete window.__getDioramaMetrics

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
        obj.geometry?.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of mats) m?.dispose()
      }
    })
    composer.dispose()
    renderer.dispose()
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement)
    }
  }

  return {
    setView: (v) => setView(v, false),
    setWeather,
    cycleWeather,
    toggleExplode,
    triggerConvergence,
    toggleAudio,
    setState,
    advanceSimulation: (dt) => stepSimulation(dt, false),
    setCameraPose,
    getMetrics,
    dispose,
  }
}
