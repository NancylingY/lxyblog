/**
 * 白天 · 现代综合医院微缩场景
 * 三渲二 / 无 UI / 自由拖拽旋转缩放 / 无频闪
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildGarden } from './garden'
import { buildBuilding } from './building'
import { buildInterior } from './interior'

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

/** 天空球：柔和竖向渐变 */
function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(0xa9cbe9) },
      uMid: { value: new THREE.Color(0xcfe4f5) },
      uBottom: { value: new THREE.Color(0xeaf4fb) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uBottom;
      varying vec3 vPos;

      void main() {
        float h = normalize(vPos).y;
        vec3 col = mix(uBottom, uMid, smoothstep(-0.1, 0.28, h));
        col = mix(col, uTop, smoothstep(0.28, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 28, 18), mat)
  sky.frustumCulled = false
  return sky
}

export function createHospitalScene(container: HTMLElement): () => void {
  /* ================= 渲染器 ================= */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  /* ================= 场景 ================= */
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xdfeef9)
  scene.fog = new THREE.FogExp2(0xdfeef9, 0.004)
  scene.add(skyDome())

  const aspect = container.clientWidth / container.clientHeight
  const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 140)

  const camFar = new THREE.Vector3(10.6, 7.4, 13.4)
  const camNear = new THREE.Vector3(9.4, 6.2, 11.9)
  camera.position.copy(camFar)

  /* ================= 控制器 ================= */
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.95, -0.5)
  controls.enableDamping = true
  controls.dampingFactor = 0.055
  controls.rotateSpeed = 0.65
  controls.zoomSpeed = 0.75
  controls.panSpeed = 0.5
  controls.minDistance = 6
  controls.maxDistance = 22
  controls.minPolarAngle = Math.PI * 0.1
  controls.maxPolarAngle = Math.PI * 0.485
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.36
  controls.update()

  let userTookOver = false
  const onStart = () => {
    userTookOver = true
    controls.autoRotate = true
  }
  controls.addEventListener('start', onStart)

  /* ================= 日间光照 ================= */
  scene.add(new THREE.AmbientLight(0xd2e2f2, 0.48))

  const hemi = new THREE.HemisphereLight(0xd0e6ff, 0xb2bfa6, 0.38)
  scene.add(hemi)

  // 主日光
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.5)
  sun.position.set(-7, 12, 9)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -8
  sun.shadow.camera.right = 8
  sun.shadow.camera.top = 8
  sun.shadow.camera.bottom = -8
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 42
  sun.shadow.bias = -0.0008
  sun.shadow.normalBias = 0.02
  scene.add(sun)

  // 天空补光（让背光面不发黑）
  const fill = new THREE.DirectionalLight(0xbcd8ef, 0.58)
  fill.position.set(9, 5, -7)
  scene.add(fill)

  // 地面反弹的暖白补光
  const bounce = new THREE.DirectionalLight(0xfff0dc, 0.12)
  bounce.position.set(0, -6, 4)
  scene.add(bounce)

  /* ================= 建模 ================= */
  const world = new THREE.Group()
  scene.add(world)

  const garden = buildGarden(world)
  const building = buildBuilding(world)
  const interior = buildInterior(world)

  // 阴影配置：只有地面接收阴影，建筑自身不接收（避免自阴影把立面压黑）
  world.updateMatrixWorld(true)
  const wp = new THREE.Vector3()
  world.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as THREE.Material | THREE.Material[]
    const transparent = Array.isArray(mat)
      ? mat.some((m) => m.transparent)
      : mat.transparent

    mesh.castShadow = !transparent
    mesh.getWorldPosition(wp)
    mesh.receiveShadow = !transparent && wp.y < 0.55
  })

  /* ================= 循环 ================= */
  let raf = 0
  let disposed = false
  let elapsed = 0
  let intro = 0
  const clock = new THREE.Clock()

  function doorOpenAt(t: number) {
    // 每 16 秒自动开合一次，动作平缓，无跳变
    const c = t % 16
    if (c < 10.2) return 0
    if (c < 11.6) return smoothstep(10.2, 11.6, c)
    if (c < 13.4) return 1
    if (c < 14.8) return 1 - smoothstep(13.4, 14.8, c)
    return 0
  }

  function animate() {
    if (disposed) return
    raf = requestAnimationFrame(animate)

    const dt = Math.min(clock.getDelta(), 0.05)
    elapsed += dt

    if (intro < 1 && !userTookOver) {
      intro = Math.min(1, intro + dt / 1.9)
      const e = 1 - Math.pow(1 - intro, 3)
      camera.position.lerpVectors(camFar, camNear, e)
    }

    building.update(elapsed, doorOpenAt(elapsed))
    garden.update(elapsed)
    interior.update(elapsed)

    controls.update()
    renderer.render(scene, camera)
  }

  animate()

  /* ================= 尺寸 ================= */
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
