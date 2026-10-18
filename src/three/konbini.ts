/**
 * 雨夜便利店街角 · 微缩场景
 * 三渲二 / 无 UI / 自由拖拽旋转缩放
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildEnvironment } from './environment'
import { buildStore } from './store'
import { buildProps } from './props'
import { buildWeather } from './weather'

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function createKonbiniScene(container: HTMLElement): () => void {
  /* ================= 渲染器 ================= */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  // 卡通渲染不需要色调映射压色，保持高饱和的动画感
  renderer.toneMapping = THREE.NoToneMapping
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  /* ================= 场景 ================= */
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0f18)
  scene.fog = new THREE.FogExp2(0x0c1420, 0.017)

  const aspect = container.clientWidth / container.clientHeight
  const camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 120)

  // 起始机位：略低的斜俯视角，既能看到整块底座，也能看进店内
  const camFar = new THREE.Vector3(7.3, 5.1, 10.2)
  const camNear = new THREE.Vector3(5.6, 3.3, 7.9)
  camera.position.copy(camFar)

  /* ================= 控制器 ================= */
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(-0.55, 1.2, -0.75)
  controls.enableDamping = true
  controls.dampingFactor = 0.055
  controls.rotateSpeed = 0.65
  controls.zoomSpeed = 0.75
  controls.panSpeed = 0.5
  controls.minDistance = 4.6
  controls.maxDistance = 19
  controls.minPolarAngle = Math.PI * 0.1
  controls.maxPolarAngle = Math.PI * 0.48
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.42
  controls.update()

  // 用户一旦介入，停止自动旋转
  let userTookOver = false
  const onStart = () => {
    userTookOver = true
    controls.autoRotate = false
  }
  controls.addEventListener('start', onStart)

  /* ================= 灯光 ================= */
  scene.add(new THREE.AmbientLight(0x7d8fae, 0.4))

  const hemi = new THREE.HemisphereLight(0x5c7ba8, 0x0f141d, 0.48)
  scene.add(hemi)

  // 冷色月光：给轮廓与投影方向
  const moon = new THREE.DirectionalLight(0xa8c6ff, 1.25)
  moon.position.set(7, 11, 6)
  scene.add(moon)

  // 极弱的补光，避免背面纯黑一片
  const fill = new THREE.DirectionalLight(0x4a6a96, 0.36)
  fill.position.set(-8, 5, -6)
  scene.add(fill)

  /* ================= 建模 ================= */
  const world = new THREE.Group()
  scene.add(world)

  const { puddles } = buildEnvironment(world)
  const store = buildStore(world)
  const props = buildProps(world)
  const weather = buildWeather(world, puddles)

  /* ================= 循环 ================= */
  let raf = 0
  let disposed = false
  let elapsed = 0
  let intro = 0
  const clock = new THREE.Clock()

  function doorOpenAt(t: number) {
    // 每 15s 自动开合一次
    const c = t % 15
    if (c < 9.4) return 0
    if (c < 10.6) return smoothstep(9.4, 10.6, c)
    if (c < 12.4) return 1
    if (c < 13.6) return 1 - smoothstep(12.4, 13.6, c)
    return 0
  }

  function animate() {
    if (disposed) return
    raf = requestAnimationFrame(animate)

    const dt = Math.min(clock.getDelta(), 0.05)
    elapsed += dt

    // 开场镜头推进
    if (intro < 1 && !userTookOver) {
      intro = Math.min(1, intro + dt / 1.8)
      const e = 1 - Math.pow(1 - intro, 3)
      camera.position.lerpVectors(camFar, camNear, e)
    }

    store.update(elapsed, doorOpenAt(elapsed))
    props.update(elapsed)
    weather.update(elapsed)
    controls.update()

    renderer.render(scene, camera)
  }

  animate()

  /* ================= 尺寸响应 ================= */
  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(container)
  window.addEventListener('resize', resize)

  /* ================= 销毁 ================= */
  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    clock.stop()

    ro.disconnect()
    window.removeEventListener('resize', resize)
    controls.removeEventListener('start', onStart)
    controls.dispose()

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()

      const mat = (mesh as THREE.Mesh).material
      if (!mat) return
      const mats = Array.isArray(mat) ? mat : [mat]
      mats.forEach((m) => {
        Object.values(m).forEach((v) => {
          if (v instanceof THREE.Texture) v.dispose()
        })
        m.dispose()
      })
    })

    renderer.dispose()
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement)
    }
  }
}
