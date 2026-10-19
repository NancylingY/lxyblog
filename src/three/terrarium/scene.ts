/**
 * 微光之境 · 玻璃立方体里的微缩生态
 * 等距视角 / 自由旋转缩放 / 昼夜过渡 / 直接渲染（不经过后期合成层）
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildTerrain } from './terrain'
import { buildFlora } from './flora'
import { buildFauna } from './fauna'
import { buildSky } from './sky'
import { buildBackgroundTexture, buildEnvironmentTexture, glintTexture, glowTexture } from './textures'

export interface TerrariumControls {
  dispose: () => void
  toggleDayNight: () => void
}

const GLASS_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying vec3 vLocal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - world.xyz);
    vLocal = position;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const GLASS_FRAG = /* glsl */ `
  uniform vec3 uTint;
  uniform float uOpacity;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying vec3 vLocal;

  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewW))), 2.4);
    float sweep = smoothstep(2.4, 3.0, abs(vLocal.x)) * 0.5;
    float haze = smoothstep(0.8, 3.2, vLocal.y) * 0.06;
    float streak = smoothstep(0.955, 1.0, sin((vLocal.x * 0.75 + vLocal.y * 0.95) * 1.15)) * 0.035;
    vec3 col = mix(uTint * 0.4, uTint * 1.2, fresnel) + vec3(0.02) + sweep * 0.05 + haze + streak;
    float alpha = uOpacity * (0.1 + fresnel * 0.95) + haze * 0.5;
    gl_FragColor = vec4(col, alpha);
  }
`

function buildGlass(): {
  group: THREE.Group
  shell: THREE.ShaderMaterial
  edge: THREE.MeshBasicMaterial
  glints: THREE.Sprite[]
  glow: THREE.Sprite
} {
  const group = new THREE.Group()
  const w = 7.2
  const h = 6.4
  const d = 7.2
  const cy = 3.55

  const shellMat = new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: new THREE.Color(0x9fd6ff) },
      uOpacity: { value: 0.16 },
    },
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  })
  const shell = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shellMat)
  shell.position.y = cy
  shell.renderOrder = 4
  group.add(shell)

  // 发光的玻璃棱边
  const edgeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xbfe8ff).multiplyScalar(1.9),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const hx = w / 2
  const hy = h / 2
  const hz = d / 2
  const edgeGeoY = new THREE.CylinderGeometry(0.0065, 0.0065, h, 5, 1, true)
  const edgeGeoX = new THREE.CylinderGeometry(0.0065, 0.0065, w, 5, 1, true)
  const edgeGeoZ = new THREE.CylinderGeometry(0.0065, 0.0065, d, 5, 1, true)

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const edge = new THREE.Mesh(edgeGeoY, edgeMat)
      edge.position.set(sx * hx, cy, sz * hz)
      edge.renderOrder = 5
      group.add(edge)
    }
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const edge = new THREE.Mesh(edgeGeoX, edgeMat)
      edge.rotation.z = Math.PI / 2
      edge.position.set(0, cy + sy * hy, sz * hz)
      edge.renderOrder = 5
      group.add(edge)
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const edge = new THREE.Mesh(edgeGeoZ, edgeMat)
      edge.rotation.x = Math.PI / 2
      edge.position.set(sx * hx, cy + sy * hy, 0)
      edge.renderOrder = 5
      group.add(edge)
    }
  }

  // 八个转角的高光
  const glintMap = glintTexture()
  const glints: THREE.Sprite[] = []
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const mat = new THREE.SpriteMaterial({
          map: glintMap,
          color: 0xd8f2ff,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
        const sprite = new THREE.Sprite(mat)
        sprite.position.set(sx * hx, cy + sy * hy, sz * hz)
        sprite.scale.setScalar(0.22)
        group.add(sprite)
        glints.push(sprite)
      }
    }
  }

  // 岛底的悬浮辉光
  const underMat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: 0x54bfe0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glow = new THREE.Sprite(underMat)
  glow.position.set(0, 0.6, 0)
  glow.scale.set(2.35, 0.9, 1)
  group.add(glow)

  return { group, shell: shellMat, edge: edgeMat, glints, glow }
}

export function createTerrariumScene(
  container: HTMLElement,
  onPhase?: (isDay: boolean) => void,
): TerrariumControls {
  /* ------------------------------ renderer ------------------------------ */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'none'
  container.appendChild(renderer.domElement)

  /* ------------------------------ scene ------------------------------ */
  const scene = new THREE.Scene()
  const background = buildBackgroundTexture()
  const environment = buildEnvironmentTexture()
  scene.background = background
  scene.environment = environment
  scene.environmentIntensity = 0.55
  scene.fog = new THREE.FogExp2(0x060e18, 0.004)

  const camera = new THREE.PerspectiveCamera(
    34,
    container.clientWidth / Math.max(1, container.clientHeight),
    0.1,
    160,
  )
  const target = new THREE.Vector3(0, 3.18, 0.05)
  const viewDir = new THREE.Vector3(0.58, 0.46, 0.78).normalize()

  function fitDistance(): number {
    const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))
    const fitV = 3.45 / vTan
    const fitH = 3.55 / (vTan * camera.aspect)
    return Math.max(12.4, fitV * 1.18, fitH * 1.05)
  }

  let baseDistance = fitDistance()
  camera.position.copy(target).addScaledVector(viewDir, baseDistance * 1.38)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(target)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.rotateSpeed = 0.55
  controls.zoomSpeed = 0.7
  controls.minDistance = 7.2
  controls.maxDistance = baseDistance * 1.8
  controls.minPolarAngle = Math.PI * 0.12
  controls.maxPolarAngle = Math.PI * 0.48
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.3
  controls.update()

  /* ------------------------------ lights ------------------------------ */
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x35452f, 0.6)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xffd9a6, 1.85)
  sun.position.set(5.6, 10.2, 4.6)
  sun.target.position.copy(target)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -4.6
  sun.shadow.camera.right = 4.6
  sun.shadow.camera.top = 5.2
  sun.shadow.camera.bottom = -3.2
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 32
  sun.shadow.bias = -0.0007
  sun.shadow.normalBias = 0.018
  scene.add(sun, sun.target)

  const rim = new THREE.DirectionalLight(0x9fdcff, 1.0)
  rim.position.set(-6.4, 4.2, -5.2)
  scene.add(rim)

  const fill = new THREE.DirectionalLight(0xb6d6ee, 0.32)
  fill.position.set(3.2, 2.8, 7.4)
  scene.add(fill)

  const cloudLight = new THREE.PointLight(0xffd9a4, 0.45, 4.2, 2)
  cloudLight.position.set(0.2, 5.75, 0.65)
  scene.add(cloudLight)

  const underLight = new THREE.PointLight(0x4fb4d6, 1.5, 3.4, 2)
  underLight.position.set(0, 0.6, 0)
  scene.add(underLight)

  /* ------------------------------ world ------------------------------ */
  const world = new THREE.Group()
  world.scale.setScalar(1.12)
  scene.add(world)

  const terrain = buildTerrain()
  const flora = buildFlora()
  const fauna = buildFauna()
  const sky = buildSky()
  world.add(terrain.group, flora, fauna.group, sky.group)

  const glass = buildGlass()
  scene.add(glass.group)

  /* ------------------------------ day / night ------------------------------ */
  const daySun = new THREE.Color(0xffd9a6)
  const nightSun = new THREE.Color(0xa9c8ff)
  const daySky = new THREE.Color(0xcfe8ff)
  const nightSky = new THREE.Color(0x203a5e)
  const dayGround = new THREE.Color(0x465438)
  const nightGround = new THREE.Color(0x0d1620)
  const dayRim = new THREE.Color(0x9fdcff)
  const nightRim = new THREE.Color(0x8fb8ff)
  const dayEdge = new THREE.Color(0xbfe8ff)
  const nightEdge = new THREE.Color(0x9fc9ff)
  const dayFog = new THREE.Color(0x08131f)
  const nightFog = new THREE.Color(0x02050a)
  const dayGlassTint = new THREE.Color(0xaee0ff)
  const nightGlassTint = new THREE.Color(0x8fc4ff)
  const dayCloudWarm = new THREE.Color(0xffd9a4)
  const daySunPos = new THREE.Vector3(5.6, 10.2, 4.6)
  const nightSunPos = new THREE.Vector3(-4.8, 7.6, -3.8)

  let dayness = 1
  let phase = 0
  let hold = 12
  let auto = true
  let targetDay = 1
  let lastLit = true
  let intro = 0
  let disposed = false

  const applyDay = (day: number) => {
    sun.intensity = THREE.MathUtils.lerp(0.34, 1.85, day)
    sun.color.copy(nightSun).lerp(daySun, day)
    sun.position.lerpVectors(nightSunPos, daySunPos, day)

    hemi.intensity = THREE.MathUtils.lerp(0.16, 0.62, day)
    hemi.color.copy(nightSky).lerp(daySky, day)
    hemi.groundColor.copy(nightGround).lerp(dayGround, day)

    rim.intensity = THREE.MathUtils.lerp(1.3, 0.82, day)
    rim.color.copy(nightRim).lerp(dayRim, day)
    fill.intensity = THREE.MathUtils.lerp(0.12, 0.28, day)

    cloudLight.intensity = THREE.MathUtils.lerp(0.25, 0.45, day)
    cloudLight.color.copy(nightSun).lerp(dayCloudWarm, day)
    underLight.intensity = THREE.MathUtils.lerp(2.6, 1.5, day)

    scene.fog!.color.copy(nightFog).lerp(dayFog, day)
    scene.backgroundIntensity = THREE.MathUtils.lerp(1.22, 0.9, day)
    scene.environmentIntensity = THREE.MathUtils.lerp(0.3, 0.55, day)

    glass.shell.uniforms.uOpacity.value = THREE.MathUtils.lerp(0.22, 0.17, day)
    glass.shell.uniforms.uTint.value.copy(nightGlassTint).lerp(dayGlassTint, day)
    glass.edge.color.copy(nightEdge).lerp(dayEdge, day).multiplyScalar(THREE.MathUtils.lerp(1.65, 1.35, day))
    glass.edge.opacity = THREE.MathUtils.lerp(0.72, 0.44, day)

    for (let i = 0; i < glass.glints.length; i++) {
      const mat = glass.glints[i].material as THREE.SpriteMaterial
      mat.opacity = THREE.MathUtils.lerp(0.56, 0.28, day) * (0.75 + 0.25 * Math.sin(i * 1.9))
      mat.color.copy(nightEdge).lerp(dayEdge, day)
    }
    ;(glass.glow.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.lerp(0.24, 0.11, day)

    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 1.02, day)
  }
  applyDay(1)
  onPhase?.(true)

  /* ------------------------------ loop ------------------------------ */
  const clock = new THREE.Clock()
  let raf = 0

  const frame = () => {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min(clock.getDelta(), 0.05)
    const time = clock.elapsedTime

    if (auto) {
      if (hold > 0) {
        hold -= dt
      } else {
        phase += dt * 0.075
        dayness = 0.5 + 0.5 * Math.cos(phase)
      }
    } else {
      dayness += (targetDay - dayness) * Math.min(1, dt * 0.85)
    }

    const day = dayness * dayness * (3 - 2 * dayness)
    applyDay(day)

    const lit = day > 0.5
    if (lit !== lastLit) {
      lastLit = lit
      onPhase?.(lit)
    }

    terrain.update(time, day)
    fauna.update(time, day)
    sky.update(time, day)

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 3.6)
      const eased = 1 - Math.pow(1 - intro, 3)
      const distance = THREE.MathUtils.lerp(baseDistance * 1.38, baseDistance, eased)
      const dir = camera.position.clone().sub(controls.target).normalize()
      camera.position.copy(controls.target).addScaledVector(dir, distance)
    }

    controls.update()
    renderer.render(scene, camera)
  }
  frame()

  /* ------------------------------ resize ------------------------------ */
  const resize = () => {
    const w = container.clientWidth
    const h = Math.max(1, container.clientHeight)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    baseDistance = fitDistance()
    controls.maxDistance = baseDistance * 1.8
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)

  // WebGL 上下文丢失时阻止默认行为，恢复后重新同步尺寸
  const onContextLost = (event: Event) => {
    event.preventDefault()
  }
  const onContextRestored = () => {
    resize()
  }
  renderer.domElement.addEventListener('webglcontextlost', onContextLost, false)
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false)

  /* ------------------------------ api ------------------------------ */
  const toggleDayNight = () => {
    auto = false
    targetDay = dayness > 0.5 ? 0 : 1
  }

  const dispose = () => {
    disposed = true
    cancelAnimationFrame(raf)
    observer.disconnect()
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
    controls.dispose()
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const material = mesh.material
      if (!material) return
      if (Array.isArray(material)) {
        for (const m of material) disposeMaterial(m)
      } else {
        disposeMaterial(material)
      }
    })
    background.dispose()
    environment.dispose()
    renderer.dispose()
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement)
    }
    scene.clear()
  }

  return { dispose, toggleDayNight }
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose()
  }
  material.dispose()
}
