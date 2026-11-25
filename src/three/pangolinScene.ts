import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export interface PangolinScene {
  setSpeed(value: number): void
  setPaused(value: boolean): void
  setCamera(index: number): void
  dispose(): void
}

/** All geometry, including the overlapping armor, is generated here. No asset requests. */
export function createPangolinScene(host: HTMLElement, onFailure: () => void): PangolinScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#e7e9db')
  scene.fog = new THREE.Fog('#e7e9db', 12, 30)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  host.appendChild(renderer.domElement)
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D pangolin riding a unicycle')
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 4.4
  controls.maxDistance = 15
  controls.minPolarAngle = 0.35
  controls.maxPolarAngle = Math.PI / 2 - 0.04
  controls.target.set(0, 1.45, 0)

  const materials = new Set<THREE.Material>()
  const geometries = new Set<THREE.BufferGeometry>()
  function mat(color: string, metalness = 0, roughness = 0.65) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness })
    materials.add(m)
    return m
  }
  const skin = mat('#a97b51'), belly = mat('#c8a577'), dark = mat('#29382e')
  const armor = [mat('#98683e'), mat('#b0814a'), mat('#c2985d'), mat('#ad7c43')]
  const mint = mat('#6cae9b', 0.45, 0.3), brass = mat('#d6b46a', 0.7, 0.28)
  const tire = mat('#303932'), chrome = mat('#e4e7d9', 0.72, 0.28), saddle = mat('#794d38')
  const sphereGeo = new THREE.SphereGeometry(1, 24, 16)
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 12)
  const boxGeo = new THREE.BoxGeometry(1, 1, 1)
  function mesh(geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D) {
    geometries.add(geo)
    const o = new THREE.Mesh(geo, m)
    o.castShadow = true
    o.receiveShadow = true
    parent.add(o)
    return o
  }
  function ellipsoid(parent: THREE.Object3D, m: THREE.Material, p: number[], s: number[]) {
    const o = mesh(sphereGeo, m, parent)
    o.position.set(p[0]!, p[1]!, p[2]!)
    o.scale.set(s[0]!, s[1]!, s[2]!)
    return o
  }
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const up = v(0, 1, 0)
  function link(parent: THREE.Object3D, m: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
    const o = mesh(cylinderGeo, m, parent)
    placeLink(o, a, b, radius)
    return o
  }
  function placeLink(o: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
    o.position.copy(a).add(b).multiplyScalar(0.5)
    o.scale.set(radius, a.distanceTo(b), radius)
    o.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize())
  }
  function torus(parent: THREE.Object3D, radius: number, tube: number, m: THREE.Material) {
    return mesh(new THREE.TorusGeometry(radius, tube, 12, 80), m, parent)
  }

  scene.add(new THREE.HemisphereLight('#fff8df', '#6d816b', 2.6))
  const sun = new THREE.DirectionalLight('#fff0d1', 4.2)
  sun.position.set(4, 8, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 6, bottom: -5, near: 0.1, far: 22 })
  sun.shadow.normalBias = 0.035
  sun.shadow.bias = -0.00015
  scene.add(sun)
  const rim = new THREE.DirectionalLight('#c5e6df', 2.8)
  rim.position.set(-4, 4, -5)
  scene.add(rim)

  // A small woodland diorama with a moving practice belt: the rider stays in frame.
  const platform = mesh(new THREE.CylinderGeometry(3.55, 3.7, 0.26, 96), mat('#849e84'), scene)
  platform.position.y = -0.12
  const edge = torus(scene, 3.55, 0.035, brass)
  edge.rotation.x = Math.PI / 2
  edge.position.y = 0.018
  const floor = mesh(new THREE.PlaneGeometry(200, 200), mat('#e7e9db'), scene)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.28
  const path = mesh(boxGeo, mat('#d7ceb1'), scene)
  path.position.set(0, 0.035, 0)
  path.scale.set(6.7, 0.065, 1.55)
  const marks: THREE.Mesh[] = []
  for (let i = 0; i < 16; i++) {
    const o = mesh(boxGeo, mat('#f5edd6'), scene)
    o.position.set(-3.2 + i * 0.4, 0.071, -0.56)
    o.scale.set(0.14, 0.006, 0.025)
    marks.push(o)
  }
  let seed = 43
  function random() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const leaves = [mat('#577956'), mat('#7d9968'), mat('#a9b77a')]
  const stone = mat('#a5ad98')
  for (let i = 0; i < 54; i++) {
    const x = (random() - 0.5) * 6.6, z = (random() - 0.5) * 6.6
    if (Math.abs(z) < 1.03 || x * x + z * z > 11) continue
    if (i % 3 === 0) {
      ellipsoid(scene, stone, [x, 0.13, z], [0.13 + random() * 0.17, 0.15, 0.19])
    } else {
      for (let j = 0; j < 4; j++) {
        const leaf = ellipsoid(scene, leaves[j % 3]!, [x + (j - 1.5) * 0.06, 0.2, z], [0.045, 0.16 + random() * 0.17, 0.035])
        leaf.rotation.z = (j - 1.5) * 0.35
      }
    }
  }
  // Stylized saplings frame the scene without blocking the character.
  for (const [x, z, s] of [[-2.5, -1.5, 0.9], [1.7, -2.2, 0.7], [-1.1, -2.7, 0.55]]) {
    const tree = new THREE.Group()
    tree.position.set(x!, 0, z!)
    tree.scale.setScalar(s!)
    scene.add(tree)
    link(tree, mat('#84765b'), v(0, 0, 0), v(0, 1.65, 0), 0.045)
    for (let j = 0; j < 3; j++) {
      const crown = mesh(new THREE.IcosahedronGeometry(0.65, 1), leaves[j]!, tree)
      crown.position.set(j === 1 ? 0.23 : -0.1, 1.25 + j * 0.32, 0)
      crown.scale.set(0.8, 0.85, 0.72)
    }
  }

  const rig = new THREE.Group()
  scene.add(rig)
  const wheelY = 0.74, wheelRadius = 0.64, crankRadius = 0.265
  const wheel = new THREE.Group()
  wheel.position.y = wheelY
  rig.add(wheel)
  torus(wheel, wheelRadius, 0.075, tire)
  torus(wheel, wheelRadius - 0.075, 0.026, brass)
  torus(wheel, wheelRadius + 0.005, 0.006, dark).position.z = 0.072
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2
    link(wheel, chrome, v(0, 0, i % 2 ? 0.055 : -0.055), v(Math.sin(a) * 0.56, Math.cos(a) * 0.56, 0), 0.008)
  }
  link(wheel, brass, v(0, 0, -0.18), v(0, 0, 0.18), 0.09)
  for (const side of [-1, 1]) {
    link(rig, mint, v(0, wheelY, side * 0.15), v(-0.06, 1.51, side * 0.13), 0.037)
  }
  link(rig, chrome, v(-0.06, 1.42, 0), v(-0.06, 1.81, 0), 0.038)
  ellipsoid(rig, saddle, [-0.03, 1.82, 0], [0.29, 0.09, 0.22])

  // A ridged shield shape makes each scale catch light individually.
  const scaleGeo = new THREE.BufferGeometry()
  scaleGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, 0.35, 0, 0.5, 0.35, 0, 0, 0.05, 0.21,
    0.5, 0.35, 0, 0.44, -0.12, 0, 0, 0.05, 0.21,
    0.44, -0.12, 0, 0, -0.65, 0.015, 0, 0.05, 0.21,
    0, -0.65, 0.015, -0.44, -0.12, 0, 0, 0.05, 0.21,
    -0.44, -0.12, 0, -0.5, 0.35, 0, 0, 0.05, 0.21,
  ], 3))
  scaleGeo.computeVertexNormals()
  armor.forEach(m => { m.side = THREE.DoubleSide })
  function scaleAt(parent: THREE.Object3D, p: THREE.Vector3, normal: THREE.Vector3, size: number, index: number) {
    const o = mesh(scaleGeo, armor[index % armor.length]!, parent)
    o.position.copy(p)
    o.quaternion.setFromUnitVectors(v(0, 0, 1), normal.normalize())
    o.scale.set(size, size * 1.22, size * 0.65)
  }
  const body = new THREE.Group()
  rig.add(body)
  ellipsoid(body, skin, [-0.08, 2.25, 0], [0.51, 0.68, 0.34]).rotation.z = 0.22
  ellipsoid(body, belly, [0.24, 2.16, 0], [0.27, 0.45, 0.3])
  for (let row = 0; row < 12; row++) {
    const lat = -1.05 + row * 0.19
    const count = 11
    for (let col = 0; col < count; col++) {
      const a = -1.8 + (col + (row % 2) * 0.5) / count * 3.6
      const p = v(-0.1 - Math.cos(lat) * Math.cos(a) * 0.53, 2.25 + Math.sin(lat) * 0.69, Math.cos(lat) * Math.sin(a) * 0.355)
      scaleAt(body, p, v(-Math.cos(lat) * Math.cos(a), Math.sin(lat) * 0.7, Math.cos(lat) * Math.sin(a)), 0.205, row + col)
    }
  }
  const head = new THREE.Group()
  head.position.set(0.3, 2.67, 0)
  body.add(head)
  ellipsoid(head, skin, [0.1, 0, 0], [0.36, 0.29, 0.265])
  const snout = mesh(new THREE.ConeGeometry(0.22, 0.65, 32), belly, head)
  snout.rotation.z = -Math.PI / 2 - 0.2
  snout.position.set(0.52, -0.095, 0)
  ellipsoid(head, dark, [0.84, -0.16, 0], [0.052, 0.042, 0.057])
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [-0.09, 0.12, side * 0.24], [0.1, 0.125, 0.045])
    ellipsoid(head, saddle, [-0.07, 0.13, side * 0.273], [0.06, 0.075, 0.015])
    ellipsoid(head, dark, [0.27, 0.035, side * 0.234], [0.047, 0.052, 0.025])
    ellipsoid(head, mat('#fff9e6'), [0.283, 0.054, side * 0.254], [0.014, 0.016, 0.008])
  }
  for (let r = 0; r < 4; r++) {
    for (let c = -2; c <= 2; c++) {
      scaleAt(head, v(-0.18 + r * 0.105, 0.25 - r * 0.023 - Math.abs(c) * 0.018, c * 0.085), v(0, 1, c * 0.2), 0.14, r + c + 8)
    }
  }
  const tail = new THREE.Group()
  tail.position.set(-0.38, 1.93, 0)
  body.add(tail)
  for (let i = 0; i < 14; i++) {
    const t = i / 13, radius = 0.23 * (1 - t) + 0.028
    const p = v(-t * 1.45, -Math.sin(t * Math.PI * 0.7) * 0.72, Math.sin(t * Math.PI) * 0.1)
    ellipsoid(tail, skin, p.toArray(), [Math.max(radius * 1.1, 0.08), radius, radius])
    for (let j = 0; j < 7; j++) {
      const a = j / 7 * Math.PI * 2
      scaleAt(tail, p.clone().add(v(0, Math.cos(a) * radius, Math.sin(a) * radius)), v(-0.25, Math.cos(a), Math.sin(a)), radius * 0.95, i + j)
    }
  }
  const arms = [-1, 1].map(side => {
    const upper = link(body, skin, v(0, 0, 0), v(0, 1, 0), 0.1)
    const lower = link(body, skin, v(0, 0, 0), v(0, 1, 0), 0.075)
    const joint = ellipsoid(body, skin, [0, 0, 0], [0.096, 0.096, 0.096])
    const hand = ellipsoid(body, belly, [0, 0, 0], [0.13, 0.065, 0.1])
    for (let j = 0; j < 3; j++) ellipsoid(hand, brass, [0.6, -0.2, (j - 1) * 0.5], [0.5, 0.22, 0.12])
    return { side, upper, lower, hand, joint }
  })
  const legs = [-1, 1].map(side => ({
    side,
    upper: link(rig, skin, v(0, 0, 0), v(0, 1, 0), 0.14),
    lower: link(rig, belly, v(0, 0, 0), v(0, 1, 0), 0.095),
    knee: ellipsoid(rig, skin, [0, 0, 0], [0.145, 0.145, 0.13]),
    foot: ellipsoid(rig, skin, [0, 0, 0], [0.19, 0.075, 0.115]),
    crank: link(rig, brass, v(0, 0, 0), v(0, 1, 0), 0.025),
    pedal: mesh(boxGeo, dark, rig),
  }))
  legs.forEach(l => l.pedal.scale.set(0.3, 0.045, 0.18))

  let speed = 1, paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let phase = 0, distance = 0, lastTime = 0, frame = 0, disposed = false
  function setCamera(index: number) {
    controls.target.set(index === 2 ? 0.1 : 0, index === 2 ? 2 : 1.45, 0)
    const positions = [[5.4, 3.6, 7.7], [0.5, 2.7, 9.4], [4.6, 3.1, 4.1]]
    camera.position.fromArray(positions[index] ?? positions[0]!)
    controls.update()
  }
  setCamera(0)
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    camera.fov = width < 700 ? 42 : 36
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  function contextLost(e: Event) { e.preventDefault(); cancelAnimationFrame(frame); onFailure() }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  function visibility() { lastTime = 0 }
  document.addEventListener('visibilitychange', visibility)

  function animate(time: number) {
    if (disposed) return
    frame = requestAnimationFrame(animate)
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0
    lastTime = time
    if (document.hidden) return
    if (!paused) {
      // Direct-drive unicycle: omega = v / r, crank and wheel share one phase.
      const velocity = speed * 0.95
      distance += velocity * dt
      phase -= velocity / wheelRadius * dt
    }
    wheel.rotation.z = phase
    rig.rotation.x = Math.sin(phase) * 0.038
    body.position.y = Math.cos(phase * 2) * 0.026
    body.rotation.x = -Math.sin(phase) * 0.045
    head.rotation.z = Math.sin(phase * 2) * 0.025
    tail.rotation.x = Math.sin(phase - 0.5) * 0.09
    body.updateMatrix()
    for (const l of legs) {
      const a = phase + (l.side === 1 ? 0 : Math.PI)
      const axle = v(0, wheelY, l.side * 0.23)
      const pedal = v(-Math.sin(a) * crankRadius, wheelY + Math.cos(a) * crankRadius, l.side * 0.28)
      l.pedal.position.copy(pedal)
      placeLink(l.crank, axle, pedal, 0.025)
      const ankle = pedal.clone().add(v(0, 0.095, 0))
      l.foot.position.copy(ankle).add(v(0.065, -0.006, 0))
      const hip = v(-0.04, 1.91, l.side * 0.245).applyMatrix4(body.matrix)
      // Two-bone IK: the ankle stays attached to the pedal throughout the cycle.
      const delta = ankle.clone().sub(hip), d = delta.length()
      const upperLength = 0.79, lowerLength = 0.77
      const along = (upperLength ** 2 - lowerLength ** 2 + d * d) / (2 * d)
      const direction = delta.normalize()
      const bend = v(1, 0, 0).addScaledVector(direction, -direction.x).normalize()
      const knee = hip.clone().addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)))
      placeLink(l.upper, hip, knee, 0.14)
      placeLink(l.lower, knee, ankle, 0.09)
      l.knee.position.copy(knee)
    }
    for (const a of arms) {
      const sway = Math.sin(phase + a.side * 0.7)
      const shoulder = v(0.25, 2.43, a.side * 0.28)
      const elbow = v(0.36 + sway * 0.08, 2.24 + sway * 0.09, a.side * 0.62)
      const hand = v(0.5 + sway * 0.13, 2.32 + sway * 0.18, a.side * 0.91)
      placeLink(a.upper, shoulder, elbow, 0.095)
      placeLink(a.lower, elbow, hand, 0.065)
      a.joint.position.copy(elbow)
      a.hand.position.copy(hand)
    }
    marks.forEach((m, i) => { m.position.x = ((i * 0.4 - distance) % 6.4 + 6.4) % 6.4 - 3.2 })
    controls.update()
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(animate)
  return {
    setSpeed(value) { speed = THREE.MathUtils.clamp(value, 0, 2.5) },
    setPaused(value) { paused = value }, setCamera,
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      controls.dispose()
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
