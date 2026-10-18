/**
 * 环境：微缩底座、人行道板块、湿路面、斑马线、排水沟、积水
 */
import * as THREE from 'three'
import { C, box, toon, additiveMat, sheenTexture, outline } from './toon'

/** 场景统一坐标系（单位 ≈ 米），供其它模块共享 */
export const LAYOUT = {
  /** 底座边长 */
  base: 10.4,
  /** 抬高的人行道板块（便利店 + 邻楼 + 街角都在上面） */
  plate: { x0: -5, x1: 2.6, z0: -5, z1: 1.8, top: 0.09 },
  /** 便利店占地 */
  store: { x0: -2.6, x1: 1.6, z0: -3.4, z1: 0.8, floor: 0.09, height: 2.75 },
  /** 马路边界 */
  frontRoadZ: 1.8,
  rightRoadX: 2.6,
}

export interface Puddle {
  x: number
  z: number
  rx: number
  rz: number
  y: number
}

/** 地面反光条：湿路面上灯光拉出的竖向亮带 */
export function addLightPool(
  parent: THREE.Object3D,
  x: number,
  z: number,
  w: number,
  d: number,
  color: number,
  opacity = 0.34,
  y = 0.028,
) {
  const geo = new THREE.PlaneGeometry(w, d)
  const mesh = new THREE.Mesh(geo, additiveMat(color, opacity))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, y, z)
  mesh.renderOrder = 3
  parent.add(mesh)
  return mesh
}

/** 柔和光晕（径向渐变） */
export function addGlowDisc(
  parent: THREE.Object3D,
  x: number,
  z: number,
  size: number,
  color: number,
  opacity = 0.45,
  y = 0.03,
) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: sheenTexture(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  m.renderOrder = 3
  parent.add(m)
  return m
}

export function buildEnvironment(root: THREE.Group) {
  const puddles: Puddle[] = []

  /* ================= 底座 ================= */
  const plinth = box(LAYOUT.base, 0.56, LAYOUT.base, 0x151c2a, { line: true })
  plinth.position.y = -0.28
  root.add(plinth)

  // 底座上沿一条细亮边，强化"收藏模型"感
  const rim = box(LAYOUT.base + 0.04, 0.05, LAYOUT.base + 0.04, 0x3d4a5d, { line: true })
  rim.position.y = -0.01
  root.add(rim)

  // 侧面铭牌凹槽
  const plate = box(1.5, 0.16, 0.02, 0x0e1522, { line: false })
  plate.position.set(0, -0.3, LAYOUT.base / 2 + 0.005)
  root.add(plate)

  /* ================= 沥青路面 ================= */
  const road = box(10, 0.04, 10, C.asphalt, { line: false })
  road.position.y = 0.0
  root.add(road)

  // 路面细微颗粒（用低亮度条纹暗示粗糙度）
  const grainGeo = new THREE.PlaneGeometry(10, 10)
  const grain = new THREE.Mesh(
    grainGeo,
    new THREE.MeshBasicMaterial({
      color: 0x0f151f,
      transparent: true,
      opacity: 0.35,
    }),
  )
  grain.rotation.x = -Math.PI / 2
  grain.position.y = 0.023
  root.add(grain)

  /* ================= 抬高的人行道板块 ================= */
  const { x0, x1, z0, z1, top } = LAYOUT.plate
  const pw = x1 - x0
  const pd = z1 - z0
  const plateMesh = box(pw, top, pd, C.sidewalk, { line: true })
  plateMesh.position.set((x0 + x1) / 2, top / 2, (z0 + z1) / 2)
  root.add(plateMesh)

  // 铺装缝：沿 X 与 Z 的浅色细线
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x46536a, transparent: true, opacity: 0.5 })
  for (let x = x0 + 1.2; x < x1; x += 1.2) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.018, pd), seamMat)
    seam.rotation.x = -Math.PI / 2
    seam.position.set(x, top + 0.002, (z0 + z1) / 2)
    root.add(seam)
  }
  for (let z = z0 + 1.2; z < z1; z += 1.2) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(pw, 0.018), seamMat)
    seam.rotation.x = -Math.PI / 2
    seam.position.set((x0 + x1) / 2, top + 0.002, z)
    root.add(seam)
  }

  /* ================= 路缘石 ================= */
  const curbMat = C.curb
  // 前侧路缘（沿 X）
  const curbFront = box(pw, 0.14, 0.16, curbMat, { line: true })
  curbFront.position.set((x0 + x1) / 2, 0.07, z1 + 0.08)
  root.add(curbFront)

  // 右侧路缘（沿 Z，从板块前沿到最后）
  const curbRight = box(0.16, 0.14, pd, curbMat, { line: true })
  curbRight.position.set(x1 + 0.08, 0.07, (z0 + z1) / 2)
  root.add(curbRight)

  /* ================= 排水沟 + 雨水篦子 ================= */
  const gutter = box(pw - 0.2, 0.02, 0.18, 0x0d121b, { line: false })
  gutter.position.set((x0 + x1) / 2, 0.026, z1 + 0.28)
  root.add(gutter)

  const grateGeo = new THREE.BoxGeometry(0.3, 0.035, 0.16)
  const grateMat = toon(0x2a3546)
  for (let gx = x0 + 0.9; gx < x1 - 0.4; gx += 1.35) {
    const grate = new THREE.Mesh(grateGeo, grateMat)
    grate.position.set(gx, 0.03, z1 + 0.28)
    outline(grate, 40)
    root.add(grate)
  }

  // 右侧排水沟
  const gutter2 = box(0.18, 0.02, pd - 0.2, 0x0d121b, { line: false })
  gutter2.position.set(x1 + 0.28, 0.026, (z0 + z1) / 2)
  root.add(gutter2)

  /* ================= 斑马线（横穿右侧车道） ================= */
  const zebraMat = toon(0xcfd9e6, { emissive: 0x2a3342, emissiveIntensity: 0.4 })
  // 右侧路缘石占 x 2.60~2.76，标线从 2.80 起，避免埋进路缘石里
  for (let i = 0; i < 4; i++) {
    const z = -0.15 + i * 0.52
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.02, 0.26), zebraMat)
    stripe.position.set(3.66, 0.03, z)
    root.add(stripe)
  }

  // 停止线：右侧车道（车沿 Z 行驶）→ 横线沿 X
  const stopLineRight = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.14), zebraMat)
  stopLineRight.position.set(3.66, 0.03, 1.66)
  root.add(stopLineRight)

  // 停止线：前街（车沿 X 行驶）→ 横线沿 Z
  const stopLineFront = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 2.4), zebraMat)
  stopLineFront.position.set(2.44, 0.03, 3.15)
  root.add(stopLineFront)

  /* ================= 中心虚线（前街） ================= */
  // 从路边停车位之后才开始，避免虚线压在停车格里
  for (let x = -2.2; x < 2.2; x += 0.9) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.1), zebraMat)
    dash.position.set(x, 0.03, 3.15)
    root.add(dash)
  }

  /* ================= 路边停车位 ================= */
  const parkMat = toon(0xbecbd9, { emissive: 0x2a3342, emissiveIntensity: 0.35 })
  const parkLine = (w: number, d: number, px: number, pz: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), parkMat)
    m.position.set(px, 0.03, pz)
    root.add(m)
  }
  // 前侧路缘石占 z 1.80~1.96，停车格从 1.98 起
  parkLine(0.09, 1.52, -4.35, 2.74)
  parkLine(0.09, 1.52, -2.55, 2.74)
  parkLine(1.85, 0.09, -3.45, 3.5)
  // 车轮挡
  const wheelStop = box(0.16, 0.12, 0.5, 0x8d99a8, { line: true })
  wheelStop.position.set(-3.45, 0.06, 3.38)
  root.add(wheelStop)

  /* ================= 井盖 ================= */
  const manhole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24),
    toon(0x28323f),
  )
  manhole.position.set(0.4, 0.03, 3.6)
  outline(manhole, 40)
  root.add(manhole)

  const manhole2 = manhole.clone()
  manhole2.position.set(3.5, 0.03, -2.2)
  root.add(manhole2)

  /* ================= 积水 ================= */
  const puddleDefs: Puddle[] = [
    { x: 0.1, z: 2.85, rx: 1.05, rz: 0.62, y: 0.032 },
    { x: 3.35, z: 0.55, rx: 0.8, rz: 0.5, y: 0.032 },
    { x: -1.7, z: 2.2, rx: 0.72, rz: 0.44, y: 0.032 },
    { x: 2.15, z: 3.55, rx: 0.62, rz: 0.4, y: 0.032 },
    { x: -3.6, z: 1.02, rx: 0.55, rz: 0.34, y: 0.104 },
    { x: 1.35, z: 1.3, rx: 0.42, rz: 0.28, y: 0.104 },
  ]

  puddleDefs.forEach((p) => {
    const geo = new THREE.CircleGeometry(1, 26)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0b1522,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    })
    const m = new THREE.Mesh(geo, mat)
    m.rotation.x = -Math.PI / 2
    m.scale.set(p.rx, p.rz, 1)
    m.position.set(p.x, p.y, p.z)
    m.renderOrder = 2
    root.add(m)

    // 水面上的一层冷光
    const sheen = new THREE.Mesh(
      new THREE.PlaneGeometry(p.rx * 2.1, p.rz * 2.1),
      new THREE.MeshBasicMaterial({
        map: sheenTexture(),
        color: 0x8ec8ff,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    sheen.rotation.x = -Math.PI / 2
    sheen.position.set(p.x, p.y + 0.002, p.z)
    sheen.renderOrder = 3
    root.add(sheen)

    puddles.push(p)
  })

  /* ================= 便利店门前的灯光反射 ================= */
  addLightPool(root, 0.4, 1.15, 2.4, 1.5, 0xffcf8a, 0.3, 0.105)
  addGlowDisc(root, 0.4, 1.25, 3.4, 0xffb96b, 0.34, 0.106)

  return { puddles }
}
