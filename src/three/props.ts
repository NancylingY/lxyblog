/**
 * 街角道具：贩卖机 / 自行车 / 伞架 / 垃圾桶 / 路灯 / 电线杆 / 信号灯
 *           路牌 / 护栏 / 空调外机 / 公告栏 / 邻楼与小巷
 */
import * as THREE from 'three'
import {
  box,
  cyl,
  toon,
  outline,
  vendingTexture,
  boardTexture,
  streetSignTexture,
} from './toon'
import { LAYOUT, addLightPool, addGlowDisc } from './environment'

const { x0: SX0, x1: SX1, z1: SZ1, floor: SY } = LAYOUT.store

export interface PropsApi {
  update: (t: number) => void
}

/* ================= 自动贩卖机 ================= */
function vendingMachine(parent: THREE.Object3D, x: number, z: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)
  g.rotation.y = rotY

  const W = 0.92
  const H = 1.86
  const D = 0.62

  // 机身
  const body = box(W, H, D, 0xdfe9f5, { line: true })
  body.position.y = H / 2
  g.add(body)

  // 正面商品面板（发光）
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.08, H * 0.62),
    new THREE.MeshBasicMaterial({ map: vendingTexture(), toneMapped: false }),
  )
  face.position.set(0, H * 0.62, D / 2 + 0.005)
  g.add(face)

  // 取货口
  const slot = box(W - 0.24, 0.26, 0.04, 0x2a3442, { line: true })
  slot.position.set(0, 0.34, D / 2 + 0.02)
  g.add(slot)

  // 顶部灯条
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.06, 0.06, 0.03),
    new THREE.MeshBasicMaterial({ color: 0x5ad1ff, toneMapped: false }),
  )
  topBar.position.set(0, H - 0.06, D / 2 + 0.01)
  g.add(topBar)

  // 底部脚
  ;[-0.36, 0.36].forEach((ox) => {
    const foot = box(0.1, 0.06, 0.1, 0x4a5464, { line: false })
    foot.position.set(ox, 0.03, 0)
    g.add(foot)
  })

  // 贩卖机溢出的冷光
  const light = new THREE.PointLight(0xbfe6ff, 2.6, 2.6, 1.7)
  light.position.set(0, 1.1, 0.5)
  g.add(light)

  parent.add(g)
  return g
}

/* ================= 自行车 ================= */
function bicycle(parent: THREE.Object3D, x: number, z: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)
  g.rotation.y = rotY

  const frameColor = 0x4f9fd8
  const dark = 0x2b3442
  const metal = 0x8d98a6
  const R = 0.21

  /* ---------- 关键点（侧视 x-y 平面，车轮着地） ---------- */
  const rear = { x: -0.42, y: R }
  const front = { x: 0.42, y: R }
  const bb = { x: -0.03, y: 0.19 } // 五通 / 中轴
  const seatTop = { x: -0.14, y: 0.6 }
  const headTop = { x: 0.3, y: 0.63 }
  const headBot = { x: 0.34, y: 0.46 }

  /** 在两点之间架一根圆管（圆柱默认沿 Y 轴） */
  const rod = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    r: number,
    color: number,
  ) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    const m = cyl(r, r, len, 7, color, { line: false })
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0)
    m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2
    g.add(m)
    return m
  }

  /* ---------- 车轮 ---------- */
  ;[rear, front].forEach((hub) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(R, 0.017, 6, 22), toon(dark))
    wheel.position.set(hub.x, hub.y, 0)
    outline(wheel, 40)
    g.add(wheel)

    // 花鼓
    const hubMesh = cyl(0.022, 0.022, 0.075, 8, metal, { line: false })
    hubMesh.position.set(hub.x, hub.y, 0)
    hubMesh.rotation.x = Math.PI / 2
    g.add(hubMesh)

    // 辐条
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(R * 1.86, 0.0045, 0.0045), toon(metal))
      spoke.position.set(hub.x, hub.y, 0)
      spoke.rotation.z = (i / 6) * Math.PI
      g.add(spoke)
    }
  })

  /* ---------- 车架：每一根都真正连到节点 ---------- */
  rod(bb, seatTop, 0.017, frameColor) // 立管
  rod(seatTop, headTop, 0.016, frameColor) // 上管
  rod(bb, headBot, 0.017, frameColor) // 下管
  rod(headBot, headTop, 0.018, frameColor) // 头管
  rod(bb, rear, 0.012, frameColor) // 后下叉
  rod(seatTop, rear, 0.011, frameColor) // 后上叉
  rod(headBot, front, 0.013, metal) // 前叉

  /* ---------- 座杆 + 车座 ---------- */
  rod(seatTop, { x: -0.15, y: 0.68 }, 0.012, metal)

  const seat = box(0.19, 0.032, 0.095, 0x222a36, { line: true })
  seat.position.set(-0.16, 0.7, 0)
  g.add(seat)

  /* ---------- 车把 ---------- */
  rod(headTop, { x: 0.29, y: 0.73 }, 0.012, metal)

  const handle = cyl(0.012, 0.012, 0.34, 8, dark, { line: false })
  handle.position.set(0.29, 0.745, 0)
  handle.rotation.x = Math.PI / 2
  g.add(handle)

  ;[-1, 1].forEach((d) => {
    const grip = cyl(0.016, 0.016, 0.085, 8, 0x3a4351, { line: false })
    grip.position.set(0.29, 0.745, d * 0.155)
    grip.rotation.x = Math.PI / 2
    g.add(grip)
  })

  /* ---------- 中轴 + 曲柄 + 脚踏 ---------- */
  const crank = cyl(0.042, 0.042, 0.028, 12, metal, { line: false })
  crank.position.set(bb.x, bb.y, 0)
  crank.rotation.x = Math.PI / 2
  g.add(crank)

  ;[1, -1].forEach((d) => {
    const arm = box(0.016, 0.12, 0.012, 0x4a5464, { line: false })
    arm.position.set(bb.x + 0.028, bb.y - d * 0.045, d * 0.05)
    arm.rotation.z = d * 0.55
    g.add(arm)

    const pedal = box(0.085, 0.016, 0.05, 0x2b3442, { line: false })
    pedal.position.set(bb.x + 0.085, bb.y - d * 0.105, d * 0.075)
    g.add(pedal)
  })

  /* ---------- 前车筐 ---------- */
  const basket = box(0.23, 0.15, 0.23, 0xa4b2c2, { line: true })
  basket.position.set(0.48, 0.575, 0)
  g.add(basket)

  const basketRim = box(0.245, 0.02, 0.245, 0x8f9daf, { line: false })
  basketRim.position.set(0.48, 0.655, 0)
  g.add(basketRim)

  rod({ x: 0.42, y: 0.52 }, { x: 0.48, y: 0.52 }, 0.008, metal)

  /* ---------- 挡泥板 ---------- */
  ;[front, rear].forEach((hub) => {
    const fender = new THREE.Mesh(
      new THREE.TorusGeometry(R + 0.032, 0.011, 4, 14, Math.PI * 0.72),
      toon(metal),
    )
    fender.position.set(hub.x, hub.y, 0)
    fender.rotation.z = 0.45
    g.add(fender)
  })

  /* ---------- 撑脚 ---------- */
  const stand = cyl(0.009, 0.009, 0.21, 5, 0x6a7484, { line: false })
  stand.position.set(-0.12, 0.105, 0.07)
  stand.rotation.x = 0.32
  g.add(stand)

  parent.add(g)
  return g
}

/* ================= 伞架 ================= */
function umbrellaStand(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)

  const bucket = cyl(0.13, 0.11, 0.42, 12, 0x4a5464, { line: true })
  bucket.position.y = 0.21
  g.add(bucket)

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 16), toon(0x6b7688))
  rim.rotation.x = Math.PI / 2
  rim.position.y = 0.42
  g.add(rim)

  // 几把伞
  const colors = [0xdfe9f5, 0xff8fa3, 0x8fd0ff]
  colors.forEach((c, i) => {
    const shaft = cyl(0.008, 0.008, 0.7, 5, c, { line: false })
    shaft.position.set((i - 1) * 0.05, 0.55, (i % 2) * 0.04 - 0.02)
    shaft.rotation.z = (i - 1) * 0.09
    g.add(shaft)

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.16, 8),
      toon(c, { transparent: true, opacity: 0.9 }),
    )
    canopy.position.set((i - 1) * 0.05 + (i - 1) * 0.03, 0.44, (i % 2) * 0.04 - 0.02)
    canopy.rotation.z = (i - 1) * 0.09
    g.add(canopy)
  })

  parent.add(g)
  return g
}

/* ================= 分类垃圾桶 ================= */
function trashBins(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)

  const defs = [
    { c: 0x3f8fd6, label: 'かん' },
    { c: 0x4aa86a, label: 'ペット' },
    { c: 0xd8694f, label: 'もえる' },
  ]

  defs.forEach((d, i) => {
    const body = box(0.3, 0.72, 0.32, d.c, { line: true })
    body.position.set((i - 1) * 0.34, 0.36, 0)
    g.add(body)

    const lid = box(0.32, 0.05, 0.34, 0x2f3947, { line: true })
    lid.position.set((i - 1) * 0.34, 0.75, 0)
    g.add(lid)

    // 投入口
    const hole = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.07),
      new THREE.MeshBasicMaterial({ color: 0x0c1119 }),
    )
    hole.rotation.x = -Math.PI / 2
    hole.position.set((i - 1) * 0.34, 0.78, 0.02)
    g.add(hole)
  })

  parent.add(g)
  return g
}

/* ================= 路灯 ================= */
function streetLamp(parent: THREE.Object3D, x: number, z: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)
  g.rotation.y = rotY

  const H = 3.6

  const base = cyl(0.09, 0.11, 0.24, 10, 0x4d5768, { line: true })
  base.position.y = 0.12
  g.add(base)

  const pole = cyl(0.05, 0.06, H, 10, 0x5a6475, { line: true })
  pole.position.y = H / 2 + 0.2
  g.add(pole)

  // 弯臂
  const arm = cyl(0.045, 0.045, 0.62, 8, 0x5a6475, { line: true })
  arm.position.set(-0.28, H + 0.16, 0)
  arm.rotation.z = Math.PI / 2 - 0.18
  g.add(arm)

  // 灯头
  const head = box(0.34, 0.1, 0.18, 0x3e4757, { line: true })
  head.position.set(-0.56, H + 0.06, 0)
  g.add(head)

  const lamp = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.14),
    new THREE.MeshBasicMaterial({ color: 0xffe9b8, toneMapped: false }),
  )
  lamp.rotation.x = Math.PI / 2
  lamp.position.set(-0.56, H + 0.005, 0)
  g.add(lamp)

  // 灯下的体积光锥
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, H + 0.1, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd28a,
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  )
  cone.position.set(-0.56, (H + 0.1) / 2, 0)
  g.add(cone)

  // 根因修复（toon.ts 渐变贴图下半段置 0）后，背光面不再接受直射光，
  // 点光源不会在墙面/屋顶刷出同心圆环，可放心给街灯一个中等强度做局部照明。
  const light = new THREE.PointLight(0xffd9a0, 3.5, 7.5, 1.4)
  light.position.set(-0.56, H - 0.1, 0)
  g.add(light)

  parent.add(g)
  addLightPool(parent, x - 0.56, z, 3.2, 3.2, 0xffc887, 0.34, 0.1)
  addGlowDisc(parent, x - 0.56, z, 4.6, 0xffb968, 0.3, 0.102)

  return g
}

/* ================= 电线杆 + 电线 ================= */
function utilityPole(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)

  const H = 4.8

  const pole = cyl(0.07, 0.1, H, 10, 0x6d7684, { line: true })
  pole.position.y = H / 2
  g.add(pole)

  // 横担
  ;[H - 0.5, H - 1.15].forEach((y, i) => {
    const arm = box(1.0 - i * 0.15, 0.05, 0.05, 0x5d6878, { line: true })
    arm.position.set(0, y, 0)
    g.add(arm)

    // 绝缘子
    ;[-0.42, 0, 0.42].forEach((ox) => {
      const ins = cyl(0.026, 0.03, 0.08, 6, 0x9ea9b7, { line: false })
      ins.position.set(ox * (1 - i * 0.15), y + 0.07, 0)
      g.add(ins)
    })
  })

  // 变压器
  const trans = cyl(0.14, 0.14, 0.42, 12, 0x59636f, { line: true })
  trans.position.set(0.16, H - 1.9, 0)
  g.add(trans)

  // 电线杆上的编号牌
  const numPlate = box(0.16, 0.22, 0.02, 0xdfe6ee, { line: false })
  numPlate.position.set(0.02, 2.4, 0.09)
  g.add(numPlate)

  parent.add(g)
  return { group: g, top: H }
}

/** 一根下垂的电线 */
function wire(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, sag = 0.3) {
  const mid = from.clone().add(to).multiplyScalar(0.5)
  mid.y -= sag
  const curve = new THREE.CatmullRomCurve3([from, mid, to])
  const geo = new THREE.TubeGeometry(curve, 14, 0.009, 4, false)
  const line = new THREE.Mesh(geo, toon(0x1c2432, { emissive: 0x141b26, emissiveIntensity: 0.3 }))
  parent.add(line)
  return line
}

/* ================= 交通信号灯 ================= */
function trafficLight(parent: THREE.Object3D, x: number, z: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)
  g.rotation.y = rotY

  const H = 3.2

  const pole = cyl(0.055, 0.07, H, 10, 0x4b5566, { line: true })
  pole.position.y = H / 2
  g.add(pole)

  const base = cyl(0.1, 0.12, 0.18, 10, 0x3d4656, { line: true })
  base.position.y = 0.09
  g.add(base)

  // 横臂：伸向车道一侧，避免遮挡店面
  const arm = box(0.9, 0.07, 0.07, 0x4b5566, { line: true })
  arm.position.set(0.45, H - 0.1, 0)
  g.add(arm)

  // 灯箱
  const housing = box(0.22, 0.62, 0.22, 0x232b38, { line: true })
  housing.position.set(0.85, H - 0.42, 0)
  g.add(housing)

  const lensGeo = new THREE.CircleGeometry(0.075, 14)
  const mats = [0xff4d5e, 0xffc93c, 0x3ddc84].map(
    (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 1 }),
  )

  mats.forEach((mat, i) => {
    const lens = new THREE.Mesh(lensGeo, mat)
    lens.position.set(0.85, H - 0.22 - i * 0.19, 0.115)
    g.add(lens)
  })

  // 行人信号灯（小方箱）
  const pedHousing = box(0.2, 0.36, 0.18, 0x232b38, { line: true })
  pedHousing.position.set(0.15, 2.3, 0)
  g.add(pedHousing)

  const pedMat = new THREE.MeshBasicMaterial({ color: 0xff4d5e, toneMapped: false })
  const pedLens = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.11), pedMat)
  pedLens.position.set(0.15, 2.4, 0.095)
  g.add(pedLens)

  parent.add(g)

  return { lensMats: mats, pedMat }
}

/* ================= 路牌 ================= */
function roadSign(parent: THREE.Object3D, x: number, z: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, SY, z)
  g.rotation.y = rotY

  const pole = cyl(0.035, 0.04, 2.6, 8, 0x8d97a5, { line: true })
  pole.position.y = 1.3
  g.add(pole)

  const signMat = new THREE.MeshBasicMaterial({ map: streetSignTexture(), toneMapped: false })
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.03), signMat)
  sign.position.set(0.36, 2.42, 0)
  g.add(sign)

  parent.add(g)
  return g
}

/* ================= 护栏 ================= */
function guardrail(parent: THREE.Object3D, cx: number, cz: number, len: number, axis: 'x' | 'z') {
  const g = new THREE.Group()
  const railColor = 0xb8c2cf

  const posts = Math.max(2, Math.round(len / 0.9) + 1)

  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1) - 0.5
    const py = 0.42
    const post = cyl(0.035, 0.035, 0.84, 8, railColor, { line: true })
    if (axis === 'x') {
      post.position.set(cx + t * len, py, cz)
    } else {
      post.position.set(cx, py, cz + t * len)
    }
    g.add(post)
  }

  // 两根横杆
  ;[0.66, 0.42].forEach((ry) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(axis === 'x' ? len : 0.05, 0.05, axis === 'x' ? 0.05 : len),
      toon(railColor),
    )
    outline(rail, 30)
    rail.position.set(cx, ry, cz)
    g.add(rail)
  })

  parent.add(g)
  return g
}

/* ================= 空调外机 ================= */
function acUnit(parent: THREE.Object3D, x: number, y: number, z: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  g.rotation.y = rotY

  const body = box(0.62, 0.46, 0.3, 0xc8d0da, { line: true })
  g.add(body)

  // 风扇圈
  const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 18), toon(0x7d8794))
  fanRing.position.z = 0.152
  g.add(fanRing)

  const fanHub = cyl(0.03, 0.03, 0.02, 8, 0x59636f, { line: false })
  fanHub.rotation.x = Math.PI / 2
  fanHub.position.z = 0.155
  g.add(fanHub)

  // 叶片
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), toon(0x8d97a5))
    blade.position.set(0, 0, 0.158)
    blade.rotation.z = (i / 3) * Math.PI * 2
    g.add(blade)
  }

  // 侧面散热格栅
  for (let i = 0; i < 5; i++) {
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.005), toon(0x9aa4b2))
    grille.position.set(0.14, -0.14 + i * 0.06, 0.152)
    g.add(grille)
  }

  // 支架
  const bracket = box(0.5, 0.03, 0.26, 0x6f7887, { line: false })
  bracket.position.y = -0.24
  g.add(bracket)

  // 冷凝水管
  const pipe = cyl(0.012, 0.012, 0.5, 5, 0x9aa4b2, { line: false })
  pipe.position.set(-0.2, -0.4, 0.1)
  g.add(pipe)

  parent.add(g)
  return g
}

/* ================= 公告栏 ================= */
function bulletinBoard(parent: THREE.Object3D, x: number, y: number, z: number) {
  const g = new THREE.Group()
  g.position.set(x, y, z)

  const frame = box(1.0, 0.72, 0.06, 0x6b5540, { line: true })
  g.add(frame)

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.64),
    new THREE.MeshBasicMaterial({ map: boardTexture(), toneMapped: false }),
  )
  board.position.z = 0.035
  g.add(board)

  // 小顶棚
  const roof = box(1.08, 0.05, 0.16, 0x5a4835, { line: true })
  roof.position.set(0, 0.4, 0.04)
  g.add(roof)

  parent.add(g)
  return g
}

/* ================= 邻楼 + 小巷 ================= */
function neighborBuilding(parent: THREE.Object3D) {
  const g = new THREE.Group()

  const x0 = -4.85
  const x1 = -3.72
  const z0 = -3.7
  const z1 = 0.62
  const h = 3.5

  const body = box(x1 - x0, h, z1 - z0, 0x3a4454, { line: true })
  body.position.set((x0 + x1) / 2, SY + h / 2, (z0 + z1) / 2)
  g.add(body)

  // 屋顶檐口
  const cornice = box(x1 - x0 + 0.12, 0.16, z1 - z0 + 0.12, 0x2c3543, { line: true })
  cornice.position.set((x0 + x1) / 2, SY + h + 0.08, (z0 + z1) / 2)
  g.add(cornice)

  // 窗户（部分亮灯）
  const litColors = [0xffd79a, 0xffc26b, 0x2a3444, 0x3a4557, 0xffd79a]
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const lit = litColors[(row * 3 + col) % litColors.length]
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.52),
        new THREE.MeshBasicMaterial({ color: lit, toneMapped: false }),
      )
      win.position.set(x1 + 0.014, SY + 2.0 + row * 1.05, -2.6 + col * 1.2)
      win.rotation.y = Math.PI / 2
      g.add(win)

      // 窗框
      const frame = box(0.02, 0.56, 0.44, 0x222a36, { line: false })
      frame.position.set(x1 - 0.02, SY + 2.0 + row * 1.05, -2.6 + col * 1.2)
      g.add(frame)
    }
  }

  // 一层面街店铺卷帘门
  const shutter = box(0.04, 1.6, 1.4, 0x59616e, { line: true })
  shutter.position.set(x1 + 0.03, SY + 0.8, -1.0)
  g.add(shutter)

  // 卷帘门横纹
  for (let i = 0; i < 10; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 1.36), toon(0x404855))
    line.position.set(x1 + 0.072, SY + 0.12 + i * 0.15, -1.0)
    g.add(line)
  }

  // 面向街道的窗户（二层）
  // 楼体 x0=-4.85~x1=-3.72（宽 1.13），窗排总宽 1.02 → 每侧留 0.055 置中。
  // 原来 x0+0.28 起步，左距 0.13 右缘却超出转角 0.07（窗框），整排偏右且穿出楼角。
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const lit = [0x2a3444, 0xffd79a, 0x33405a, 0xffc26b, 0x2a3444, 0x3a4557][row * 3 + col]
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.42),
        new THREE.MeshBasicMaterial({ color: lit, toneMapped: false }),
      )
      win.position.set(x0 + 0.2 + col * 0.36, SY + 1.7 + row * 1.1, z1 + 0.014)
      g.add(win)

      const frame = box(0.34, 0.46, 0.02, 0x1f2733, { line: false })
      frame.position.set(x0 + 0.2 + col * 0.36, SY + 1.7 + row * 1.1, z1 - 0.02)
      g.add(frame)
    }
  }

  // 街面空调外机
  acUnit(g, x0 + 0.5, SY + 1.05, z1 + 0.16, 0)

  // 遮阳棚
  const canopy = box(1.0, 0.06, 0.36, 0x8a5c46, { line: true })
  canopy.position.set(x0 + 0.62, SY + 1.35, z1 + 0.18)
  canopy.rotation.x = -0.08
  g.add(canopy)

  // 屋顶水塔
  const tank = cyl(0.3, 0.3, 0.5, 12, 0x59636f, { line: true })
  tank.position.set(-4.2, SY + h + 0.33, -2.9)
  g.add(tank)

  // 落水管
  const downpipe = cyl(0.045, 0.045, h, 8, 0x4c5665, { line: false })
  downpipe.position.set(x1 + 0.06, SY + h / 2, 0.55)
  g.add(downpipe)

  parent.add(g)

  /* ---- 小巷内部 ---- */
  const alleyX = (x1 + SX0) / 2 // 巷道中心
  // 空调外机必须贴墙：一台挂便利店左外墙，一台挂邻楼右外墙。
  // 注意 z 要错开邻楼巷侧窗（窗在 z -2.6 / -1.4 / -0.2，各宽 0.4）：
  // 邻楼那台放两窗之间的空档 -2.0（占 -2.31~-1.69），店墙那台放 -1.0，都不挡窗。
  acUnit(parent, SX0 - 0.15, SY + 1.55, -1.0, -Math.PI / 2)
  acUnit(parent, x1 + 0.15, SY + 2.2, -2.0, Math.PI / 2)

  // 巷道地灯（灯面自发光即可，不再挂 PointLight：
  // 巷中点光源会把便利店左墙刷成一个硬边暖色圆团——卡通量化的截断圆，
  // 从默认机位看就是交界处一团光晕。氛围交给 emissive 灯面 + 地面渐变光池）
  const alleyLampMat = new THREE.MeshBasicMaterial({ color: 0xffcf8a, toneMapped: false })
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), alleyLampMat)
  lamp.rotation.x = Math.PI / 2
  lamp.position.set(alleyX, SY + 2.6, -0.5)
  g.add(lamp)

  // 灯光在地面的落点（径渐变，硬边会变成"荧光纸片"）
  addLightPool(parent, alleyX, -0.5, 1.3, 1.3, 0xffc887, 0.26, 0.1)

  // 巷内垃圾桶
  const bin = box(0.34, 0.44, 0.34, 0x6d7582, { line: true })
  bin.position.set(alleyX + 0.1, SY + 0.22, -2.9)
  parent.add(bin)

  // 巷内纸箱堆
  const carton = box(0.32, 0.24, 0.28, 0xb08a5e, { line: true })
  carton.position.set(alleyX - 0.12, SY + 0.12, -1.9)
  parent.add(carton)

  const carton2 = box(0.26, 0.2, 0.24, 0xa87f54, { line: true })
  carton2.position.set(alleyX + 0.14, SY + 0.1, -1.72)
  carton2.rotation.y = 0.3
  parent.add(carton2)

  return g
}

/* ================= 汇总 ================= */
/** 店顶绝对高度（与 store 模块保持一致） */
const STORE_ROOF_Y = SY + LAYOUT.store.height + 0.2

let trafficLightRef: ReturnType<typeof trafficLight> | null = null

export function buildProps(root: THREE.Group): PropsApi {
  /* --- 店外正面 --- */
  vendingMachine(root, -2.16, 0.98)
  addLightPool(root, -2.16, 1.35, 1.6, 1.4, 0x9fd8ff, 0.3, 0.1)
  addGlowDisc(root, -2.16, 1.45, 2.6, 0x7fc8ff, 0.26, 0.102)

  umbrellaStand(root, -0.58, 1.02)
  trashBins(root, 1.5, 1.38)

  // 墙面公告栏
  bulletinBoard(root, -1.1, SY + 1.5, SZ1 + 0.02)

  /* --- 右侧人行道 --- */
  bicycle(root, 2.08, -1.35, Math.PI / 2 + 0.12)
  streetLamp(root, 2.28, -0.55)
  utilityPole(root, 2.34, -2.75)
  trafficLightRef = trafficLight(root, 2.66, 1.58, -Math.PI * 0.42)
  roadSign(root, 2.44, -0.75, -Math.PI / 2)

  /* --- 护栏 --- */
  guardrail(root, 2.52, -1.35, 2.9, 'z')
  guardrail(root, -3.85, 1.68, 1.9, 'x')

  /* --- 邻楼与小巷 --- */
  neighborBuilding(root)

  /* --- 电线：杆 → 店顶 → 邻楼 --- */
  const poleTop = new THREE.Vector3(2.34, SY + 4.55, -2.75)
  wire(root, poleTop, new THREE.Vector3(SX1 + 0.2, STORE_ROOF_Y, -2.4), 0.35)
  wire(root, poleTop, new THREE.Vector3(-3.6, SY + 3.6, -3.0), 0.5)
  wire(root, poleTop, new THREE.Vector3(5.35, SY + 2.9, 3.5), 0.55)
  wire(root, new THREE.Vector3(2.34, SY + 4.05, -2.75), new THREE.Vector3(-3.6, SY + 3.4, -2.4), 0.55)

  /* --- 交通信号灯动画 --- */
  const liveColors = [0xff4d5e, 0xffc93c, 0x3ddc84]
  const dimColors = [0x4a2530, 0x4a4025, 0x1e3a2c]
  let lastPhase = -1

  function update(t: number) {
    const phase = Math.floor(t / 4) % 3
    if (phase === lastPhase || !trafficLightRef) return
    lastPhase = phase

    trafficLightRef.lensMats.forEach((m, i) => {
      const on = i === phase
      m.color.setHex(on ? liveColors[i] : dimColors[i])
      m.opacity = on ? 1 : 0.35
    })
    trafficLightRef.pedMat.color.setHex(phase === 2 ? 0x3ddc84 : 0xff4d5e)
  }

  return { update }
}
