/**
 * 积木花园 / Brick Garden —— 真实 Three.js 微缩场景
 *
 * - 全部几何体程序化拼搭：方形底板、带凸点的积木、小屋、树木、花朵、步道
 * - 无外部模型 / 贴图 / 新依赖，仅使用现有 three
 * - 相机以「玩具台」方式环绕：指针拖动改变偏航与俯仰，自动旋转可开关
 * - 五类具名分组挂在真正参与渲染的 scene 上，scene.userData.brickGarden = true
 */
import * as THREE from 'three'

export interface BrickGardenHandle {
  readonly scene: THREE.Scene
  setAutoRotate(on: boolean): void
  resetView(): void
  getViewRevision(): number
  renderNow(): void
  dispose(): void
}

export interface BrickGardenOptions {
  reducedMotion?: boolean
  autoRotate?: boolean
  /** 视角因拖动或重置发生变化时回调（自动旋转不计入） */
  onViewChange?: (revision: number) => void
  /** WebGL 上下文丢失等致命错误 */
  onFailure?: () => void
}

/** 浏览器验收 / 调试用的只读桥，离开页面时删除 */
export interface BrickGardenDebug {
  scene: THREE.Scene
  groups: string[]
  viewRevision: () => number
  autoRotate: () => boolean
}

const PLATE = 8.6
const PLATE_H = 0.34
const UNIT = 0.5
const STUD_R = 0.152
const STUD_H = 0.1
const TOP = PLATE_H
const DEFAULT_YAW = -0.42
const DEFAULT_PITCH = 0.44
const MIN_PITCH = 0.14
const MAX_PITCH = 1.06
const HALF_W = 6.15
const HALF_H = 3.55

/** 奶油白 · 珊瑚橙 · 鼠尾草绿 · 蓝色点缀 */
const C = {
  cream: 0xf4ead8,
  creamLight: 0xfbf4e6,
  creamDeep: 0xe2d2b8,
  sand: 0xecdcc0,
  coral: 0xef8465,
  coralDeep: 0xd96a4d,
  coralSoft: 0xf4a98d,
  sage: 0x9cb98a,
  sageDeep: 0x7c9a6b,
  sageLight: 0xb7cda4,
  blue: 0x7fb2cf,
  blueDeep: 0x5589a8,
  wood: 0xbf8d5f,
  woodDeep: 0x9a6d46,
  white: 0xfffbf1,
  petalPink: 0xf2a9a0,
  petalCream: 0xfae4c8,
  yellow: 0xf1c463,
  leaf: 0x86a86f,
} as const

interface BoxOptions {
  rotY?: number
  cast?: boolean
  rough?: number
}

interface BrickOptions extends BoxOptions {
  studs?: boolean
}

interface Butterfly {
  group: THREE.Group
  wings: THREE.Mesh[]
  baseX: number
  baseY: number
  baseZ: number
}

export function createBrickGardenScene(
  host: HTMLElement,
  options: BrickGardenOptions = {},
): BrickGardenHandle {
  const reduced = options.reducedMotion ?? false
  const coarse = window.matchMedia('(pointer: coarse)').matches

  const renderer = new THREE.WebGLRenderer({
    antialias: !coarse,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.6 : 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  host.appendChild(renderer.domElement)

  /* ================= 资源登记：离开页面时统一释放 ================= */
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  function trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    geometries.add(geo)
    return geo
  }

  const boxGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1))
  const studGeo = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 16))
  const roundGeo = trackGeo(new THREE.CylinderGeometry(1, 1, 1, 30))
  const sphereGeo = trackGeo(new THREE.SphereGeometry(1, 16, 12))

  const materialCache = new Map<string, THREE.MeshStandardMaterial>()
  function paint(color: number, roughness = 0.56, metalness = 0.03): THREE.MeshStandardMaterial {
    const key = `${color}:${roughness}:${metalness}`
    const hit = materialCache.get(key)
    if (hit) return hit
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materialCache.set(key, mat)
    materials.add(mat)
    return mat
  }

  /* ================= 场景 ================= */
  const scene = new THREE.Scene()
  scene.name = 'brick-garden'
  // 验收约定：真正参与渲染的 scene 对象带标记
  scene.userData.brickGarden = true

  const groups = {
    baseplate: new THREE.Group(),
    house: new THREE.Group(),
    trees: new THREE.Group(),
    flowers: new THREE.Group(),
    path: new THREE.Group(),
    details: new THREE.Group(),
  }
  const groupLabels: Record<string, string> = {
    baseplate: '底板',
    house: '小屋',
    trees: '树木',
    flowers: '花朵',
    path: '步道',
    details: '点缀',
  }
  for (const [name, group] of Object.entries(groups)) {
    group.name = name
    group.userData.kind = name
    group.userData.label = groupLabels[name] ?? name
    scene.add(group)
  }

  /* ================= 相机 ================= */
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 160)
  const target = new THREE.Vector3(0, 1.12, 0)
  let fov = 34
  let aspect = 1
  let radius = 13
  let yaw = DEFAULT_YAW
  let pitch = DEFAULT_PITCH

  function placeCamera() {
    const horizontal = Math.cos(pitch) * radius
    camera.position.set(
      target.x + Math.sin(yaw) * horizontal,
      target.y + Math.sin(pitch) * radius,
      target.z + Math.cos(yaw) * horizontal,
    )
    camera.lookAt(target)
  }

  function fitRadius(nextAspect: number) {
    const vFov = THREE.MathUtils.degToRad(fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(nextAspect, 0.35))
    const byWidth = HALF_W / Math.tan(hFov / 2)
    const byHeight = HALF_H / Math.tan(vFov / 2)
    return THREE.MathUtils.clamp(Math.max(byWidth, byHeight) * 1.04, 9, 34)
  }

  /* ================= 灯光 ================= */
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0xbfc9ae, 1.7))

  const sun = new THREE.DirectionalLight(0xfff1d9, 2.6)
  sun.position.set(6.5, 10.5, 7)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -7.4
  sun.shadow.camera.right = 7.4
  sun.shadow.camera.top = 7.4
  sun.shadow.camera.bottom = -7.4
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 32
  sun.shadow.normalBias = 0.022
  sun.shadow.bias = -0.0002
  sun.shadow.camera.updateProjectionMatrix()
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0xd9ecff, 0.85)
  fill.position.set(-7, 5, 4)
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0xffe3c2, 1)
  rim.position.set(-2, 5, -8)
  scene.add(rim)

  /* ================= 台面与软阴影 ================= */
  function groundTexture(): THREE.CanvasTexture | null {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, '#f4e8d5')
    gradient.addColorStop(0.52, '#f2e4cf')
    gradient.addColorStop(1, 'rgba(242, 228, 207, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    textures.add(tex)
    return tex
  }

  const groundMap = groundTexture()
  if (groundMap) {
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundMap,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    materials.add(groundMat)
    const ground = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(26, 64)), groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.012
    ground.renderOrder = -1
    scene.add(ground)
  }

  const shadowMat = new THREE.ShadowMaterial({ color: 0x5a3a22, opacity: 0.18 })
  materials.add(shadowMat)
  const shadowPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(26, 26)), shadowMat)
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = -0.006
  shadowPlane.receiveShadow = true
  scene.add(shadowPlane)

  /* ================= 基础搭件工具 ================= */
  function addBox(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    opts: BoxOptions = {},
  ) {
    const mesh = new THREE.Mesh(boxGeo, paint(color, opts.rough))
    mesh.scale.set(w, h, d)
    mesh.position.set(x, y, z)
    mesh.rotation.y = opts.rotY ?? 0
    mesh.castShadow = opts.cast ?? true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  function addStud(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    color: number,
    radius = STUD_R,
    height = STUD_H,
  ) {
    const mesh = new THREE.Mesh(studGeo, paint(color, 0.5))
    mesh.scale.set(radius, height, radius)
    mesh.position.set(x, y, z)
    mesh.castShadow = false
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  /** 一块带凸点的积木：box + 顶部按半格间距排布的圆柱凸点 */
  function addBrick(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    opts: BrickOptions = {},
  ) {
    const group = new THREE.Group()
    group.position.set(x, y, z)
    group.rotation.y = opts.rotY ?? 0
    parent.add(group)
    addBox(group, w, h, d, color, 0, 0, 0, opts)
    if (opts.studs !== false) {
      const nx = Math.max(1, Math.round(w / UNIT))
      const nz = Math.max(1, Math.round(d / UNIT))
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < nz; j++) {
          addStud(
            group,
            (i - (nx - 1) / 2) * UNIT,
            h / 2 + STUD_H / 2,
            (j - (nz - 1) / 2) * UNIT,
            color,
          )
        }
      }
    }
    return group
  }

  function addTiles(parent: THREE.Object3D, cells: { x: number; z: number }[], color: number) {
    if (!cells.length) return null
    const mesh = new THREE.InstancedMesh(boxGeo, paint(color, 0.62), cells.length)
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(UNIT * 0.96, 0.12, UNIT * 0.96)
    cells.forEach((cell, index) => {
      position.set(cell.x, TOP + 0.06, cell.z)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.castShadow = false
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }

  /* ================= 底板 ================= */
  addBox(groups.baseplate, PLATE, PLATE_H, PLATE, C.cream, 0, PLATE_H / 2, 0)
  addBox(groups.baseplate, PLATE + 0.08, 0.05, PLATE + 0.08, C.creamDeep, 0, 0.025, 0)

  // 底板上 16×16 的凸点阵列
  {
    const count = 16 * 16
    const studs = new THREE.InstancedMesh(studGeo, paint(C.creamLight, 0.5), count)
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3(STUD_R, STUD_H, STUD_R)
    let index = 0
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        position.set((i - 7.5) * UNIT, TOP + STUD_H / 2, (j - 7.5) * UNIT)
        matrix.compose(position, quaternion, scale)
        studs.setMatrixAt(index, matrix)
        index += 1
      }
    }
    studs.instanceMatrix.needsUpdate = true
    studs.castShadow = false
    studs.receiveShadow = true
    groups.baseplate.add(studs)
  }

  // 草坪：两块铺满的绿色小板，留出奶油色步道区
  {
    const light: { x: number; z: number }[] = []
    const deep: { x: number; z: number }[] = []
    const addRegion = (x0: number, x1: number, z0: number, z1: number) => {
      let row = 0
      for (let x = x0; x <= x1 + 1e-6; x += UNIT) {
        let col = 0
        for (let z = z0; z <= z1 + 1e-6; z += UNIT) {
          const cell = { x, z }
          if ((row + col) % 3 === 0) light.push(cell)
          else deep.push(cell)
          col += 1
        }
        row += 1
      }
    }
    addRegion(1, 3.75, -3.5, 2.5)
    addRegion(-3.75, -2.5, 1.5, 3.5)
    addTiles(groups.baseplate, light, C.sageLight)
    addTiles(groups.baseplate, deep, C.sage)
  }

  /* ================= 小屋 ================= */
  {
    const house = groups.house
    house.position.set(-1.9, TOP, -1.5)

    // 地基 + 四面墙
    addBox(house, 3.5, 0.14, 2.7, C.creamDeep, 0, 0.07, 0)
    addBox(house, 3.3, 1.4, 0.2, C.cream, 0, 0.84, 1.25)
    addBox(house, 3.3, 1.4, 0.2, C.cream, 0, 0.84, -1.25)
    addBox(house, 0.2, 1.4, 2.3, C.cream, -1.65, 0.84, 0)
    addBox(house, 0.2, 1.4, 2.3, C.cream, 1.65, 0.84, 0)

    // 四角立柱，强化「拼搭」的接缝
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(house, 0.3, 1.42, 0.3, C.creamDeep, sx * 1.62, 0.85, sz * 1.22)
      }
    }

    // 墙面砖缝：横向三皮 + 每皮错缝的竖缝
    for (const y of [0.52, 0.88, 1.24]) {
      addBox(house, 3.3, 0.018, 0.02, C.creamDeep, 0, y, 1.352, { cast: false })
    }
    const rows = [
      { y0: 0.14, y1: 0.52, xs: [-1.1, -0.15, 0.75] },
      { y0: 0.52, y1: 0.88, xs: [-0.6, 0.3, 1.15] },
      { y0: 0.88, y1: 1.24, xs: [-1.1, -0.15, 0.75] },
      { y0: 1.24, y1: 1.54, xs: [-0.6, 0.3, 1.15] },
    ]
    for (const row of rows) {
      for (const x of row.xs) {
        addBox(house, 0.018, row.y1 - row.y0, 0.02, C.creamDeep, x, (row.y0 + row.y1) / 2, 1.352, {
          cast: false,
        })
      }
    }

    // 门
    addBox(house, 1.06, 1.22, 0.06, C.white, 0, 0.75, 1.35)
    addBox(house, 0.9, 1.06, 0.08, C.blueDeep, 0, 0.67, 1.38)
    const knob = new THREE.Mesh(sphereGeo, paint(0xc9a15e, 0.3, 0.6))
    knob.scale.setScalar(0.05)
    knob.position.set(0.3, 0.72, 1.44)
    knob.castShadow = false
    house.add(knob)

    // 正面窗
    addBox(house, 0.66, 0.66, 0.06, C.white, 1.0, 0.98, 1.35)
    addBox(house, 0.52, 0.52, 0.08, C.blue, 1.0, 0.98, 1.38)
    addBox(house, 0.52, 0.035, 0.09, C.white, 1.0, 0.98, 1.395, { cast: false })
    addBox(house, 0.035, 0.52, 0.09, C.white, 1.0, 0.98, 1.395, { cast: false })
    addBox(house, 0.8, 0.05, 0.14, C.white, 1.0, 0.63, 1.38)

    // 右侧窗
    addBox(house, 0.06, 0.72, 0.72, C.white, 1.75, 0.98, 0.15)
    addBox(house, 0.08, 0.56, 0.56, C.blue, 1.78, 0.98, 0.15)
    addBox(house, 0.09, 0.56, 0.035, C.white, 1.795, 0.98, 0.15, { cast: false })
    addBox(house, 0.09, 0.035, 0.56, C.white, 1.795, 0.98, 0.15, { cast: false })

    // 左侧窗（默认机位能看到这一面）
    addBox(house, 0.06, 0.72, 0.72, C.white, -1.75, 0.98, 0.15)
    addBox(house, 0.08, 0.56, 0.56, C.blue, -1.78, 0.98, 0.15)
    addBox(house, 0.09, 0.56, 0.035, C.white, -1.795, 0.98, 0.15, { cast: false })
    addBox(house, 0.09, 0.035, 0.56, C.white, -1.795, 0.98, 0.15, { cast: false })

    // 两侧墙的砖缝
    for (const x of [-1.752, 1.752]) {
      for (const y of [0.52, 0.88, 1.24]) {
        addBox(house, 0.02, 0.018, 2.3, C.creamDeep, x, y, 0, { cast: false })
      }
    }

    // 阶梯式珊瑚橙屋顶：每层都是带凸点的积木板
    addBrick(house, 3.9, 0.28, 3.1, C.coral, 0, 1.68, 0)
    addBrick(house, 3.15, 0.26, 2.45, C.coralDeep, 0, 1.95, 0)
    addBrick(house, 2.35, 0.24, 1.8, C.coral, 0, 2.2, 0)
    addBrick(house, 1.5, 0.22, 1.1, C.coralDeep, 0, 2.43, 0)

    // 烟囱
    addBrick(house, 0.42, 0.5, 0.42, C.cream, 1.62, 2.07, -1.28)
    addBrick(house, 0.36, 0.42, 0.36, C.creamDeep, 1.62, 2.53, -1.28)
    addBrick(house, 0.52, 0.12, 0.52, C.coral, 1.62, 2.8, -1.28)

    // 门前台阶与花槽
    addBox(house, 1.55, 0.14, 0.62, C.creamLight, 0, 0.07, 1.66)
    addBrick(house, 1, 0.3, 0.42, C.sageDeep, -1.35, 0.15, 1.72)
  }

  /* ================= 树木 ================= */
  function addTree(x: number, z: number, scale: number, deep: boolean) {
    const tree = new THREE.Group()
    tree.position.set(x, TOP, z)
    tree.scale.setScalar(scale)
    groups.trees.add(tree)

    addBox(tree, 0.32, 0.32, 0.32, C.wood, 0, 0.16, 0)
    addBox(tree, 0.26, 0.3, 0.26, C.woodDeep, 0, 0.47, 0)

    const tiers = [
      { r: 0.74, h: 0.3, y: 0.77, color: deep ? C.sageDeep : C.sage },
      { r: 0.58, h: 0.28, y: 1.04, color: C.sageLight },
      { r: 0.42, h: 0.26, y: 1.29, color: deep ? C.sage : C.sageDeep },
    ]
    for (const tier of tiers) {
      const leaf = new THREE.Mesh(roundGeo, paint(tier.color, 0.58))
      leaf.scale.set(tier.r, tier.h, tier.r)
      leaf.position.y = tier.y
      leaf.castShadow = true
      leaf.receiveShadow = true
      tree.add(leaf)
      addStud(tree, 0, tier.y + tier.h / 2 + STUD_H / 2, 0, tier.color, 0.16)
    }
  }

  addTree(2.55, -2.3, 1.45, true)
  addTree(3.35, 0.55, 1.05, false)
  addTree(-3.25, 2.55, 0.82, false)

  // 灌木
  addBrick(groups.trees, 0.8, 0.42, 0.8, C.sageDeep, 0.55, TOP + 0.21, 3.55)
  addBrick(groups.trees, 0.6, 0.36, 0.6, C.sage, -3.6, TOP + 0.18, 0.6)

  /* ================= 花朵 ================= */
  function addFlower(
    x: number,
    z: number,
    baseY: number,
    scale: number,
    petal: number,
    stemHeight = 0.42,
  ) {
    const flower = new THREE.Group()
    flower.position.set(x, baseY, z)
    flower.scale.setScalar(scale)
    groups.flowers.add(flower)

    const stem = new THREE.Mesh(roundGeo, paint(C.leaf, 0.6))
    stem.scale.set(0.026, stemHeight, 0.026)
    stem.position.y = stemHeight / 2
    stem.castShadow = false
    flower.add(stem)

    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(sphereGeo, paint(C.leaf, 0.6))
      leaf.scale.set(0.1, 0.022, 0.05)
      leaf.position.set(side * 0.07, stemHeight * 0.42, 0)
      leaf.rotation.y = side * 0.6
      leaf.castShadow = false
      flower.add(leaf)
    }

    const headY = stemHeight + 0.03
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2
      const leaf = new THREE.Mesh(sphereGeo, paint(petal, 0.5))
      leaf.scale.set(0.085, 0.04, 0.075)
      leaf.position.set(Math.cos(angle) * 0.1, headY, Math.sin(angle) * 0.1)
      leaf.rotation.y = -angle
      leaf.castShadow = false
      flower.add(leaf)
    }

    const core = new THREE.Mesh(sphereGeo, paint(C.yellow, 0.45))
    core.scale.setScalar(0.055)
    core.position.y = headY + 0.02
    core.castShadow = false
    flower.add(core)
  }

  addFlower(-0.55, 2.85, TOP, 1.05, C.coral)
  addFlower(-0.3, 1.9, TOP, 0.88, C.blue)
  addFlower(-2.6, 1.1, TOP, 0.82, C.petalCream)
  addFlower(2.05, 2.7, TOP, 1, C.coralSoft)
  addFlower(3.35, 2.55, TOP, 0.9, C.petalCream)
  addFlower(2.0, -0.35, TOP + 0.12, 0.84, C.blue)
  addFlower(3.8, -1.4, TOP, 0.8, C.coral)
  addFlower(-3.35, 1.55, TOP + 0.12, 0.8, C.petalPink)

  // 花槽里的两朵
  addFlower(-3.25, 0.22, TOP + 0.3, 0.72, C.coral, 0.3)
  addFlower(-2.95, 0.22, TOP + 0.3, 0.66, C.petalCream, 0.28)

  /* ================= 步道 ================= */
  {
    // 从底板前缘通向门前台阶，最后一块留出门廊的位置
    const tiles = [
      { x: -1.92, z: 3.88, r: 0.03 },
      { x: -1.86, z: 3.2, r: -0.04 },
      { x: -1.96, z: 2.52, r: 0.05 },
      { x: -1.88, z: 1.84, r: -0.03 },
      { x: -1.92, z: 1.16, r: 0.02 },
    ]
    tiles.forEach((tile, index) => {
      addBox(
        groups.path,
        0.86,
        0.14,
        0.46,
        index % 3 === 0 ? C.creamLight : C.sand,
        tile.x,
        TOP + 0.07,
        tile.z,
        { rotY: tile.r, rough: 0.66 },
      )
    })
  }

  /* ================= 点缀：池塘与蝴蝶 ================= */
  {
    const baseY = TOP + 0.12
    const pondX = 2.75
    const pondZ = 1.55

    const basin = new THREE.Mesh(roundGeo, paint(C.creamLight, 0.55))
    basin.scale.set(0.82, 0.14, 0.82)
    basin.position.set(pondX, baseY + 0.07, pondZ)
    basin.castShadow = true
    basin.receiveShadow = true
    groups.details.add(basin)

    const water = new THREE.Mesh(roundGeo, paint(C.blue, 0.24))
    water.scale.set(0.66, 0.16, 0.66)
    water.position.set(pondX, baseY + 0.08, pondZ)
    water.receiveShadow = true
    groups.details.add(water)

    for (const offset of [
      { x: -0.22, z: -0.08, s: 0.16 },
      { x: 0.18, z: 0.15, s: 0.12 },
    ]) {
      const pad = new THREE.Mesh(roundGeo, paint(C.sageDeep, 0.55))
      pad.scale.set(offset.s, 0.018, offset.s)
      pad.position.set(pondX + offset.x, baseY + 0.17, pondZ + offset.z)
      pad.castShadow = false
      groups.details.add(pad)
    }
  }

  function addButterfly(x: number, y: number, z: number, wingColor: number): Butterfly {
    const group = new THREE.Group()
    group.position.set(x, y, z)
    groups.details.add(group)

    const body = new THREE.Mesh(sphereGeo, paint(C.woodDeep, 0.5))
    body.scale.set(0.026, 0.09, 0.026)
    body.castShadow = false
    group.add(body)

    const wings: THREE.Mesh[] = []
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(sphereGeo, paint(wingColor, 0.5))
      wing.scale.set(0.12, 0.012, 0.17)
      wing.position.set(side * 0.1, 0.02, 0)
      wing.rotation.z = side * 0.45
      wing.castShadow = false
      group.add(wing)
      wings.push(wing)
    }

    return { group, wings, baseX: x, baseY: y, baseZ: z }
  }

  const butterflies = [
    addButterfly(-0.2, 2.35, 1.9, C.petalPink),
    addButterfly(2.9, 2.1, 2.4, C.blue),
  ]

  /* ================= 渲染循环 ================= */
  let auto = options.autoRotate ?? !reduced
  let revision = 0
  let dirty = true
  let disposed = false
  let raf = 0
  let elapsed = 0
  let last = performance.now()

  function bumpRevision() {
    revision += 1
    options.onViewChange?.(revision)
  }

  function resetView() {
    yaw = DEFAULT_YAW
    pitch = DEFAULT_PITCH
    radius = fitRadius(aspect)
    placeCamera()
    dirty = true
    bumpRevision()
  }

  const butterfliesWings = butterflies.map((item) => item.wings)

  function animateButterflies(time: number) {
    butterflies.forEach((item, index) => {
      const speed = index === 0 ? 0.55 : 0.42
      const phase = index === 0 ? 0 : 1.9
      item.group.position.x = item.baseX + Math.sin(time * speed + phase) * 0.42
      item.group.position.z = item.baseZ + Math.cos(time * speed * 0.8 + phase) * 0.22
      item.group.position.y = item.baseY + Math.sin(time * 1.35 + phase) * 0.1
      item.group.rotation.y = Math.sin(time * 0.6 + phase) * 0.5
      const flap = 0.32 + Math.sin(time * 9 + phase) * 0.28
      butterfliesWings[index]?.forEach((wing, wingIndex) => {
        wing.rotation.z = (wingIndex === 0 ? -1 : 1) * flap
      })
    })
  }

  function renderNow() {
    renderer.render(scene, camera)
    dirty = false
  }

  function frame(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (document.hidden) return

    if (auto) {
      yaw += dt * 0.16
      placeCamera()
      dirty = true
    }
    if (!reduced) {
      elapsed += dt
      animateButterflies(elapsed)
      dirty = true
    }
    if (dirty) renderNow()
  }

  /* ================= 尺寸与交互 ================= */
  function resize() {
    const width = host.clientWidth || 1
    const height = host.clientHeight || 1
    aspect = width / height
    fov = width < 640 ? 42 : 34
    camera.fov = fov
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    radius = fitRadius(aspect)
    placeCamera()
    dirty = true
  }

  let dragging = false
  let activePointer: number | null = null
  let lastX = 0
  let lastY = 0

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragging = true
    activePointer = event.pointerId
    lastX = event.clientX
    lastY = event.clientY
    host.classList.add('is-dragging')
    try {
      host.setPointerCapture(event.pointerId)
    } catch {
      // 某些浏览器在合成事件上不支持捕获，忽略即可，事件仍会冒泡到 host
    }
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || event.pointerId !== activePointer) return
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    if (dx === 0 && dy === 0) return
    lastX = event.clientX
    lastY = event.clientY

    yaw -= dx * 0.008
    pitch = THREE.MathUtils.clamp(pitch + dy * 0.005, MIN_PITCH, MAX_PITCH)
    placeCamera()
    dirty = true
    bumpRevision()
  }

  function endDrag(event: PointerEvent) {
    if (event.pointerId !== activePointer) return
    dragging = false
    activePointer = null
    host.classList.remove('is-dragging')
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
  }

  function onContextLost(event: Event) {
    event.preventDefault()
    cancelAnimationFrame(raf)
    options.onFailure?.()
  }

  const observer = new ResizeObserver(resize)

  host.addEventListener('pointerdown', onPointerDown)
  host.addEventListener('pointermove', onPointerMove)
  host.addEventListener('pointerup', endDrag)
  host.addEventListener('pointercancel', endDrag)
  renderer.domElement.addEventListener('webglcontextlost', onContextLost)

  observer.observe(host)
  resize()
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderNow()
  raf = requestAnimationFrame(frame)

  const debugWindow = window as unknown as { __brickGarden?: BrickGardenDebug }
  const debug: BrickGardenDebug = {
    scene,
    groups: Object.keys(groups),
    viewRevision: () => revision,
    autoRotate: () => auto,
  }
  debugWindow.__brickGarden = debug

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(raf)
    observer.disconnect()
    host.removeEventListener('pointerdown', onPointerDown)
    host.removeEventListener('pointermove', onPointerMove)
    host.removeEventListener('pointerup', endDrag)
    host.removeEventListener('pointercancel', endDrag)
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
    host.classList.remove('is-dragging')
    if (debugWindow.__brickGarden === debug) delete debugWindow.__brickGarden
    scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose()
    })
    scene.clear()
    geometries.forEach((geo) => geo.dispose())
    materials.forEach((mat) => mat.dispose())
    textures.forEach((tex) => tex.dispose())
    geometries.clear()
    materials.clear()
    textures.clear()
    materialCache.clear()
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }

  return {
    scene,
    setAutoRotate(value: boolean) {
      auto = value
      dirty = true
    },
    resetView,
    getViewRevision() {
      return revision
    },
    renderNow,
    dispose,
  }
}
