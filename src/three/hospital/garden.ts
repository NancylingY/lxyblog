/**
 * 底座 + 门前花园
 *
 * 分区（沿 +Z 由建筑指向观者）：
 *   z 0.42 ~ 1.95  硬质铺装广场：标识牌 / 自行车 / 垃圾桶 / 无障碍位 / 坡道
 *   z 1.95 ~ 4.95  花园带：中央石砌平台 + 圆形水景 + 两侧步道 + 两侧草坪
 *
 * 所有小品的落位都按"占地矩形"核算过，彼此不重叠、不压草地边缘。
 */
import * as THREE from 'three'
import { box, cyl, toon, glowMat } from '../toon'
import { HL } from './layout'
import {
  wayfindingPictogramTexture,
  noticePictogramTexture,
  binLabelTexture,
  groundMarkTexture,
} from './textures'
import { buildFountain, type FountainApi } from './fountain'

const GP = {
  plinth: 0x2b3138,
  plinthRim: 0x3f4854,
  plinthTop: 0x515b68,
  paving: 0xe8ebee,
  pavingDark: 0xd6dade,
  pavingLine: 0xbcc3ca,
  walk: 0xf3f5f7,
  lawn: 0x86c167,
  lawnDark: 0x71ab55,
  hedge: 0x5c9b49,
  hedgeDark: 0x4a8239,
  trunk: 0x8a6a4a,
  trunkDark: 0x74573b,
  leafA: 0x7dbb5f,
  leafB: 0x69a94e,
  leafC: 0x91ca71,
  leafDark: 0x578f41,
  stone: 0xb9c0c7,
  benchWood: 0xb5895c,
  benchMetal: 0x6d7885,
}

/** 各分区完成面标高 */
const Y = {
  plaza: 0.085,
  path: 0.1,
  terrace: 0.1,
  lawn: 0.11,
}

export interface GardenApi {
  update: (t: number) => void
}

/* ================= 绿化 ================= */

/** 一棵有层次的乔木：树池格栅 + 树干 + 分枝 + 九簇树冠 */
function tree(
  parent: THREE.Object3D,
  x: number,
  z: number,
  scale: number,
  sway: THREE.Object3D[],
  phase: number,
) {
  const g = new THREE.Group()
  g.position.set(x, Y.lawn, z)
  g.userData.phase = phase

  // 树池格栅
  const grate = new THREE.Mesh(
    new THREE.RingGeometry(0.055 * scale, 0.17 * scale, 14),
    toon(0x6e7885),
  )
  grate.rotation.x = -Math.PI / 2
  grate.position.y = 0.004
  g.add(grate)

  // 树干
  const h = 0.62 * scale
  const trunk = cyl(0.04 * scale, 0.075 * scale, h, 8, GP.trunk, { line: true })
  trunk.position.y = h / 2
  g.add(trunk)

  // 两段分枝
  ;[-0.38, 0.42].forEach((rot, i) => {
    const br = cyl(0.02 * scale, 0.032 * scale, 0.26 * scale, 6, GP.trunkDark, { line: false })
    br.position.set((i === 0 ? -0.06 : 0.06) * scale, h * 0.88, 0)
    br.rotation.z = rot
    g.add(br)
  })

  // 树冠
  const crown = new THREE.Group()
  crown.position.y = h * 0.92

  const blobs: [number, number, number, number, number][] = [
    [0, 0.3, 0, 0.29, GP.leafA],
    [-0.21, 0.15, 0.1, 0.2, GP.leafB],
    [0.2, 0.17, -0.1, 0.19, GP.leafC],
    [0.03, 0.46, 0.04, 0.17, GP.leafA],
    [-0.12, 0.39, -0.16, 0.15, GP.leafB],
    [0.17, 0.4, 0.15, 0.14, GP.leafDark],
    [-0.25, 0.05, -0.07, 0.14, GP.leafDark],
    [0.26, 0.04, 0.08, 0.13, GP.leafB],
    [0, 0.14, 0.22, 0.14, GP.leafC],
  ]

  blobs.forEach(([bx, by, bz, r, color]) => {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 10, 8), toon(color))
    blob.position.set(bx * scale, by * scale, bz * scale)
    // 压扁一点，避免整棵树是一堆正球
    blob.scale.set(1, 0.86 + (r % 0.1) * 0.5, 1)
    crown.add(blob)
  })

  g.add(crown)
  parent.add(g)
  sway.push(crown)
}

/** 灌木丛：五球堆叠 */
function shrub(parent: THREE.Object3D, x: number, z: number, r: number, seed = 0) {
  const g = new THREE.Group()
  g.position.set(x, Y.lawn, z)

  const parts: [number, number, number, number, number][] = [
    [0, r * 0.78, 0, r, GP.hedge],
    [-r * 0.55, r * 0.58, r * 0.28, r * 0.72, GP.hedgeDark],
    [r * 0.5, r * 0.56, -r * 0.25, r * 0.68, GP.leafB],
    [r * 0.18, r * 0.52, r * 0.6, r * 0.6, GP.hedgeDark],
    [-r * 0.2, r * 1.12, -r * 0.1, r * 0.56, GP.leafA],
  ]

  parts.forEach(([px, py, pz, pr, c], i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(pr, 9, 7), toon(c))
    s.position.set(px, py, pz)
    s.scale.y = 0.8
    s.rotation.y = seed + i
    g.add(s)
  })

  parent.add(g)
}

/** 绿篱：深色底座 + 一列灌木球 */
function hedgeRow(parent: THREE.Object3D, x: number, z: number, len: number, h = 0.32) {
  const g = new THREE.Group()
  g.position.set(x, 0.11, z)

  const base = box(len, h * 0.74, 0.32, GP.hedgeDark, { line: true })
  base.position.y = h * 0.37
  g.add(base)

  const n = Math.max(3, Math.round(len / 0.21))
  for (let i = 0; i < n; i++) {
    const bx = -len / 2 + (len / n) * (i + 0.5)
    const r = 0.115 + (i % 2) * 0.016
    const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), toon(i % 2 ? GP.hedge : GP.leafB))
    blob.position.set(bx, h * 0.74, ((i % 3) - 1) * 0.03)
    blob.scale.set(1.06, 0.82, 1)
    g.add(blob)
  }

  parent.add(g)
}

/* ================= 家具 ================= */

function bench(parent: THREE.Object3D, x: number, z: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, Y.lawn, z)
  g.rotation.y = rotY

  for (let i = 0; i < 3; i++) {
    const slat = box(1.05, 0.042, 0.105, GP.benchWood, { line: true })
    slat.position.set(0, 0.36, -0.12 + i * 0.12)
    g.add(slat)
  }

  for (let i = 0; i < 2; i++) {
    const slat = box(1.05, 0.095, 0.038, GP.benchWood, { line: true })
    slat.position.set(0, 0.5 + i * 0.125, -0.235)
    g.add(slat)
  }

  ;[-0.44, 0.44].forEach((ox) => {
    const leg = box(0.045, 0.36, 0.3, GP.benchMetal, { line: false })
    leg.position.set(ox, 0.18, -0.02)
    g.add(leg)

    const arm = box(0.04, 0.035, 0.4, GP.benchMetal, { line: false })
    arm.position.set(ox, 0.6, -0.05)
    g.add(arm)

    const post = box(0.04, 0.24, 0.04, GP.benchMetal, { line: false })
    post.position.set(ox, 0.48, -0.24)
    g.add(post)
  })

  parent.add(g)
}

/** 庭院景观灯：常亮暖光，无闪动 */
function bollard(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group()
  g.position.set(x, Y.lawn, z)

  const post = cyl(0.032, 0.044, 0.52, 8, 0x6d7885, { line: true })
  post.position.y = 0.26
  g.add(post)

  const head = cyl(0.052, 0.044, 0.08, 8, 0x7d8896, { line: true })
  head.position.y = 0.55
  g.add(head)

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.018, 8), toon(0x59636f))
  cap.position.y = 0.6
  g.add(cap)

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.055, 8), glowMat(0xfff0cc, 0.95))
  lens.position.y = 0.52
  g.add(lens)

  parent.add(g)
}

/** 自行车停放架：地面标线 + 3 个半圆环 + 2 辆车 */
function bikeRack(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group()
  g.position.set(x, Y.plaza, z)

  const mark = box(1.18, 0.004, 0.6, 0xcfd6dd, { line: false })
  mark.position.set(0, 0.005, 0)
  g.add(mark)

  for (let i = 0; i < 3; i++) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 6, 16, Math.PI), toon(0x9aa5b1))
    hoop.position.set((i - 1) * 0.36, 0.018, 0)
    hoop.rotation.x = Math.PI / 2
    g.add(hoop)
  }

  const bike = (ox: number, tilt: number) => {
    const b = new THREE.Group()
    b.position.set(ox, 0, 0.05)
    b.rotation.y = tilt

    ;[-0.19, 0.19].forEach((wx) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 14), toon(0x37414f))
      wheel.position.set(wx, 0.125, 0)
      b.add(wheel)
    })

    const frame = box(0.36, 0.018, 0.018, 0x4f9fd8, { line: false })
    frame.position.y = 0.2
    b.add(frame)

    const down = box(0.22, 0.018, 0.018, 0x4f9fd8, { line: false })
    down.position.set(0.04, 0.16, 0)
    down.rotation.z = 0.5
    b.add(down)

    const seat = box(0.11, 0.028, 0.06, 0x222a36, { line: false })
    seat.position.set(-0.11, 0.3, 0)
    b.add(seat)

    const bar = box(0.02, 0.09, 0.14, 0x37414f, { line: false })
    bar.position.set(0.17, 0.3, 0)
    b.add(bar)

    g.add(b)
  }

  bike(-0.34, 0.16)
  bike(0.34, -0.1)

  parent.add(g)
}

/** 分类垃圾桶：底座 + 桶身 + 桶盖 + 投口 + 图标贴纸 */
function bin(
  parent: THREE.Object3D,
  x: number,
  z: number,
  color: number,
  icon: 'leaf' | 'capsule',
  accent: string,
) {
  const g = new THREE.Group()
  g.position.set(x, Y.plaza, z)

  const foot = box(0.26, 0.028, 0.26, 0x9aa4b0, { line: false })
  foot.position.y = 0.014
  g.add(foot)

  const body = box(0.24, 0.42, 0.24, color, { line: true })
  body.position.y = 0.24
  g.add(body)

  const lid = box(0.265, 0.045, 0.265, 0x39434f, { line: true })
  lid.position.y = 0.475
  g.add(lid)

  const slot = box(0.12, 0.028, 0.02, 0x1b222b, { line: false })
  slot.position.set(0, 0.456, 0.136)
  g.add(slot)

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.13),
    new THREE.MeshBasicMaterial({
      map: binLabelTexture(icon, accent),
      transparent: true,
      toneMapped: false,
    }),
  )
  label.position.set(0, 0.27, 0.1225)
  g.add(label)

  parent.add(g)
}

/* ================= 主构建 ================= */

export function buildGarden(root: THREE.Group): GardenApi {
  const g = new THREE.Group()
  root.add(g)

  const sway: THREE.Object3D[] = []

  /* ================= 展示底座 ================= */
  const plinth = box(HL.base, 0.56, HL.base, GP.plinth, { line: true })
  plinth.position.y = -0.28
  g.add(plinth)

  const rim = box(HL.base + 0.05, 0.06, HL.base + 0.05, GP.plinthRim, { line: true })
  rim.position.y = -0.008
  g.add(rim)

  const topPlate = box(HL.base - 0.02, 0.02, HL.base - 0.02, GP.plinthTop, { line: false })
  topPlate.position.y = 0.02
  g.add(topPlate)

  const base = box(10, 0.04, 10, GP.pavingDark, { line: false })
  base.position.y = 0.035
  g.add(base)

  /* ================= 广场铺装 ================= */
  const PZ0 = 0.42
  const PZ1 = 1.95
  const PW = 8.4
  const plaza = box(PW, 0.05, PZ1 - PZ0, GP.paving, { line: true })
  plaza.position.set(0, 0.06, (PZ0 + PZ1) / 2)
  g.add(plaza)

  const seamMat = new THREE.MeshBasicMaterial({ color: GP.pavingLine, transparent: true, opacity: 0.85 })
  for (let x = -PW / 2 + 0.7; x < PW / 2; x += 0.7) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.014, PZ1 - PZ0), seamMat)
    s.rotation.x = -Math.PI / 2
    s.position.set(x, Y.plaza + 0.005, (PZ0 + PZ1) / 2)
    g.add(s)
  }
  for (let z = PZ0 + 0.38; z < PZ1; z += 0.38) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(PW, 0.014), seamMat)
    s.rotation.x = -Math.PI / 2
    s.position.set(0, Y.plaza + 0.005, z)
    g.add(s)
  }

  const guide = box(2.3, 0.052, PZ1 - PZ0, GP.walk, { line: false })
  guide.position.set(0, 0.062, (PZ0 + PZ1) / 2)
  g.add(guide)

  // 侧翼前的过渡铺装带，补上主楼立面前那一条裸地
  ;[-3.775, 3.775].forEach((sx) => {
    const band = box(1.62, 0.05, 0.735, GP.walk, { line: true })
    band.position.set(sx, 0.06, 0.0475)
    g.add(band)

    // 分缝
    for (let z = -0.16; z < 0.42; z += 0.28) {
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.01), seamMat)
      seam.rotation.x = -Math.PI / 2
      seam.position.set(sx, Y.plaza + 0.005, z)
      g.add(seam)
    }
  })

  /* ================= 花园带：中央平台 + 步道 + 草坪 ================= */
  const GZ0 = 1.95
  const GZ1 = 4.95

  // 中央石砌平台
  const terrace = box(3.24, 0.05, GZ1 - GZ0, GP.paving, { line: true })
  terrace.position.set(0, 0.075, (GZ0 + GZ1) / 2)
  g.add(terrace)

  // 平台分格
  for (let z = GZ0 + 0.5; z < GZ1; z += 0.5) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.16, 0.012), seamMat)
    s.rotation.x = -Math.PI / 2
    s.position.set(0, Y.terrace + 0.005, z)
    g.add(s)
  }

  // 两侧步道
  ;[-1.98, 1.98].forEach((px) => {
    const path = box(0.72, 0.05, GZ1 - GZ0, GP.walk, { line: true })
    path.position.set(px, 0.075, (GZ0 + GZ1) / 2)
    g.add(path)

    for (let z = GZ0 + 0.28; z < GZ1; z += 0.46) {
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.012), seamMat)
      seam.rotation.x = -Math.PI / 2
      seam.position.set(px, Y.path + 0.005, z)
      g.add(seam)
    }
  })

  // 两侧草坪
  ;[
    [-4.6, -2.34],
    [2.34, 4.6],
  ].forEach(([x0, x1]) => {
    const lawn = box(x1 - x0, 0.07, GZ1 - GZ0, GP.lawn, { line: true })
    lawn.position.set((x0 + x1) / 2, 0.075, (GZ0 + GZ1) / 2)
    g.add(lawn)

    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x93cc74, transparent: true, opacity: 0.5 })
    for (let z = GZ0 + 0.3; z < GZ1; z += 0.52) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.12, 0.14), stripeMat)
      s.rotation.x = -Math.PI / 2
      s.position.set((x0 + x1) / 2, Y.lawn + 0.005, z)
      g.add(s)
    }
  })

  // 草坪侧石
  ;[-4.6, -2.34, 2.34, 4.6].forEach((lx) => {
    const curb = box(0.07, 0.1, GZ1 - GZ0, GP.stone, { line: true })
    curb.position.set(lx, 0.085, (GZ0 + GZ1) / 2)
    g.add(curb)
  })

  /* ================= 水景 ================= */
  const fountain: FountainApi = buildFountain(g, 0, 2.95)

  // 水景周围的环形铺装：与广场同色 + 一道深色镶边，读作"铺装"而不是影子
  const ringPad = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1.4, 56, 1),
    toon(0xe9ecef, { side: THREE.DoubleSide }),
  )
  ringPad.rotation.x = -Math.PI / 2
  ringPad.position.set(0, Y.terrace + 0.007, 2.95)
  g.add(ringPad)

  const ringEdge = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.47, 56, 1),
    toon(0xc6ced6, { side: THREE.DoubleSide }),
  )
  ringEdge.rotation.x = -Math.PI / 2
  ringEdge.position.set(0, Y.terrace + 0.007, 2.95)
  g.add(ringEdge)

  /* ================= 建筑前绿篱 ================= */
  // 左翼有侧门，绿篱断开让出通道
  hedgeRow(g, -2.82, 0.56, 0.62, 0.3)
  shrub(g, -4.36, 0.62, 0.17, 3)
  shrub(g, -4.12, 0.5, 0.14, 5)

  hedgeRow(g, 3.3, 0.56, 2.2, 0.3)

  /* ================= 乔木 ================= */
  const trees: [number, number, number][] = [
    [-3.95, 2.45, 1.12],
    [-3.45, 3.55, 0.98],
    [-3.8, 4.62, 0.84],
    [3.95, 2.45, 1.14],
    [3.45, 3.55, 1.0],
    [3.8, 4.62, 0.86],
  ]
  trees.forEach(([tx, tz, s], i) => tree(g, tx, tz, s, sway, i * 1.7))

  /* ================= 花境：水景前的低矮植被与置石 ================= */
  const flowerBed = box(2.9, 0.08, 0.42, GP.lawnDark, { line: true })
  flowerBed.position.set(0, 0.08, 4.66)
  g.add(flowerBed)

  ;[-1.15, -0.72, -0.3, 0.3, 0.72, 1.15].forEach((sx, i) => {
    shrub(g, sx, 4.66, 0.12 + (i % 3) * 0.012, i * 0.6)
  })

  ;[
    [-2.05, 4.5, 0.18],
    [2.05, 4.5, 0.17],
  ].forEach(([rx, rz, r]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), toon(GP.stone))
    rock.position.set(rx, Y.lawn + r * 0.58, rz)
    rock.rotation.set(0.42, rx * 1.7, 0.22)
    rock.scale.set(1, 0.66, 0.9)
    g.add(rock)
  })

  // 草坪边缘的灌木球（均避开座椅与廊灯）
  ;[
    [-4.05, 3.95],
    [-4.1, 2.0],
    [-3.0, 2.05],
    [4.05, 3.95],
    [4.1, 2.0],
    [3.0, 2.05],
  ].forEach(([sx, sz], i) => shrub(g, sx, sz, 0.16 + (i % 2) * 0.02, i))

  /* ================= 长椅 ================= */
  bench(g, -2.62, 2.55, Math.PI / 2)
  bench(g, 2.62, 2.55, -Math.PI / 2)
  bench(g, -2.62, 4.12, Math.PI / 2)
  bench(g, 2.62, 4.12, -Math.PI / 2)

  /* ================= 景观灯 ================= */
  ;[
    [-2.5, 3.32],
    [2.5, 3.32],
    [-4.25, 2.25],
    [4.25, 2.25],
  ].forEach(([lx, lz]) => bollard(g, lx, lz))

  ;[
    [-2.5, 3.32],
    [2.5, 3.32],
  ].forEach(([lx, lz]) => {
    const light = new THREE.PointLight(0xffe3b0, 0.45, 1.4, 1.9)
    light.position.set(lx, Y.lawn + 0.5, lz)
    g.add(light)
  })

  /* ================= 户外导视牌 ================= */
  const wayG = new THREE.Group()
  wayG.position.set(2.52, Y.plaza, 0.82)

  const wayPole = cyl(0.028, 0.032, 1.02, 8, 0x8d99a6, { line: true })
  wayPole.position.y = 0.51
  wayG.add(wayPole)

  const wayTex = wayfindingPictogramTexture()
  const wayMat = new THREE.MeshBasicMaterial({ map: wayTex, toneMapped: false })

  const wayFrame = box(0.8, 0.43, 0.04, 0xd7e2ec, { line: true })
  wayFrame.position.set(0, 0.96, 0)
  wayG.add(wayFrame)

  // 双面：前后各一块，与背板留 0.006 间隙
  ;[1, -1].forEach((dir) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.37), wayMat)
    face.position.set(0, 0.96, dir * 0.026)
    if (dir < 0) face.rotation.y = Math.PI
    wayG.add(face)
  })

  // 顶部红十字
  const wayCrossH = box(0.11, 0.036, 0.05, 0xe0453f, { line: false })
  wayCrossH.position.set(0, 1.25, 0)
  wayG.add(wayCrossH)
  const wayCrossV = box(0.036, 0.11, 0.05, 0xe0453f, { line: false })
  wayCrossV.position.set(0, 1.25, 0)
  wayG.add(wayCrossV)

  g.add(wayG)

  /* ================= 健康教育宣传栏 ================= */
  const boardG = new THREE.Group()
  boardG.position.set(-2.52, Y.plaza, 0.82)

  ;[-0.42, 0.42].forEach((ox) => {
    const pole = cyl(0.024, 0.027, 0.9, 6, 0x8d99a6, { line: true })
    pole.position.set(ox, 0.45, 0)
    boardG.add(pole)

    const foot = box(0.1, 0.035, 0.16, 0x9aa4b0, { line: false })
    foot.position.set(ox, 0.018, 0)
    boardG.add(foot)
  })

  const boardBack = box(0.94, 0.6, 0.05, 0xeef3f7, { line: true })
  boardBack.position.set(0, 1.02, 0)
  boardG.add(boardBack)

  const boardMat = new THREE.MeshBasicMaterial({ map: noticePictogramTexture(), toneMapped: false })
  ;[1, -1].forEach((dir) => {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.54), boardMat)
    face.position.set(0, 1.02, dir * 0.031)
    if (dir < 0) face.rotation.y = Math.PI
    boardG.add(face)
  })

  const boardRoof = box(1.0, 0.045, 0.2, 0xe6eef5, { line: true })
  boardRoof.position.set(0, 1.36, 0.02)
  boardG.add(boardRoof)

  const boardLamp = box(0.86, 0.018, 0.05, 0xffffff, { line: false })
  boardLamp.material = glowMat(0xfff4dd, 0.9) as unknown as THREE.MeshToonMaterial
  boardLamp.position.set(0, 1.332, 0.04)
  boardG.add(boardLamp)

  g.add(boardG)

  /* ================= 分类垃圾桶 ================= */
  bin(g, 3.34, 1.55, 0x4aa86a, 'leaf', '#2c6b45')
  bin(g, 3.66, 1.55, 0x5f9ed6, 'capsule', '#2b5b8c')

  /* ================= 自行车停放 ================= */
  bikeRack(g, -3.52, 1.55)

  /* ================= 无障碍位 + 坡道 ================= */
  // 地面无障碍符号（原来只是"圆环 + 一横"，看起来像减号）
  const wcMark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({
      map: groundMarkTexture('wheelchair', '#2f7fc4'),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  wcMark.rotation.x = -Math.PI / 2
  wcMark.position.set(2.18, Y.plaza + 0.008, 1.5)
  g.add(wcMark)

  const ramp = box(2.2, 0.04, 0.66, GP.walk, { line: true })
  ramp.position.set(0, 0.075, 0.95)
  ramp.rotation.x = -0.11
  g.add(ramp)

  ;[-1.11, 1.11].forEach((ox) => {
    const rail = box(0.035, 0.11, 0.66, 0xb9c2cb, { line: false })
    rail.position.set(ox, 0.13, 0.95)
    rail.rotation.x = -0.11
    g.add(rail)
  })

  /* ================= 后院：混凝土作业面 + 两侧绿化带 ================= */
  const apron = box(6.6, 0.06, 0.92, 0xc6ccd3, { line: true })
  apron.position.set(0, 0.06, -4.5)
  g.add(apron)

  // 作业面分缝
  for (let ax = -3.0; ax <= 3.0; ax += 0.75) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.9), seamMat)
    seam.rotation.x = -Math.PI / 2
    seam.position.set(ax, 0.096, -4.5)
    g.add(seam)
  }

  ;[-3.95, 3.95].forEach((sx, i) => {
    const lawn = box(1.1, 0.07, 0.92, GP.lawnDark, { line: true })
    lawn.position.set(sx, 0.075, -4.5)
    g.add(lawn)

    hedgeRow(g, sx, -4.5, 0.82, 0.28)
    shrub(g, sx + 0.34, -4.82, 0.13, i)
  })

  /* ================= 动画 ================= */
  function update(t: number) {
    fountain.update(t)

    sway.forEach((c, i) => {
      const p = c.parent?.userData.phase ?? i
      c.rotation.z = Math.sin(t * 0.75 + p) * 0.028
      c.rotation.x = Math.cos(t * 0.58 + p * 1.3) * 0.02
    })
  }

  return { update }
}
