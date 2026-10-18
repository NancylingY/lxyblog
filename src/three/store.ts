/**
 * 便利店：建筑外壳 + 玻璃幕墙 + 招牌 + 自动门 + 完整店内陈设
 * 店内是全场最亮的光源，与室外雨夜形成冷/暖对比
 */
import * as THREE from 'three'
import {
  C,
  sheenTexture,
  box,
  cyl,
  toon,
  signTexture,
  sideSignTexture,
  posterTexture,
  magazineTexture,
  arrowTexture,
  glassStreakMaterial,
} from './toon'
import { LAYOUT, addLightPool, addGlowDisc } from './environment'

const { x0: SX0, x1: SX1, z0: SZ0, z1: SZ1, floor: SY, height: SH } = LAYOUT.store
const W = SX1 - SX0
const D = SZ1 - SZ0
const CX = (SX0 + SX1) / 2
const CZ = (SZ0 + SZ1) / 2

const T = 0.12 // 墙厚
const GLASS_Y0 = 0.42
const GLASS_Y1 = 2.15
const ROOF_Y = SY + SH

const DOOR = { x0: -0.2, x1: 1.0 }

export interface StoreApi {
  doorLeft: THREE.Object3D
  doorRight: THREE.Object3D
  signMat: THREE.MeshToonMaterial
  sideSignMat: THREE.MeshBasicMaterial
  glassStreak: THREE.ShaderMaterial
  interiorLights: THREE.PointLight[]
  update: (t: number, doorOpen: number) => void
}

/** 货架上一排商品（实例化，颜色随机） */
function fillProducts(
  parent: THREE.Object3D,
  x0: number,
  x1: number,
  y: number,
  z: number,
  height = 0.16,
  depth = 0.13,
) {
  const count = Math.max(2, Math.floor((x1 - x0) / 0.085))
  const geo = new THREE.BoxGeometry(0.062, height, depth)
  const mat = toon(0xffffff)
  const inst = new THREE.InstancedMesh(geo, mat, count)
  const palette = [0xe04a63, 0xe8a916, 0x2fae74, 0x2f7fd6, 0x8a5fd0, 0xe0703a, 0xf2f2f2, 0x3fb4dc]
  const m = new THREE.Matrix4()
  const color = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const px = x0 + (i + 0.5) * ((x1 - x0) / count)
    m.makeTranslation(px, y, z)
    inst.setMatrixAt(i, m)
    color.setHex(palette[Math.floor(Math.random() * palette.length)])
    inst.setColorAt(i, color)
  }
  inst.instanceMatrix.needsUpdate = true
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true
  parent.add(inst)
  return inst
}

/** 一组货架（沿 X 方向的长条） */
function gondola(parent: THREE.Object3D, cx: number, cz: number, len: number, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(cx, SY, cz)
  g.rotation.y = rotY

  const depth = 0.6
  const base = box(len, 0.1, depth, 0xfaf3e4, {
    line: true,
    emissive: 0xfff2dc,
    emissiveIntensity: 0.4,
  })
  base.position.y = 0.05
  g.add(base)

  // 侧板
  ;[-len / 2 + 0.03, len / 2 - 0.03].forEach((lx) => {
    const side = box(0.05, 1.32, depth, 0xfdf8ec, {
      line: true,
      emissive: 0xfff2dc,
      emissiveIntensity: 0.4,
    })
    side.position.set(lx, 0.71, 0)
    g.add(side)
  })

  // 背板
  const back = box(len, 1.28, 0.04, 0xfdf8ec, {
    line: false,
    emissive: 0xfff2dc,
    emissiveIntensity: 0.4,
  })
  back.position.set(0, 0.7, -depth / 2 + 0.03)
  g.add(back)

  const levels = [0.42, 0.76, 1.1]
  levels.forEach((ly, li) => {
    const plank = box(len - 0.1, 0.04, depth - 0.06, 0xfdf8ec, {
      line: true,
      emissive: 0xfff2dc,
      emissiveIntensity: 0.4,
    })
    plank.position.set(0, ly, 0)
    g.add(plank)

    // 每层商品分前后两排
    fillProducts(g, -len / 2 + 0.08, len / 2 - 0.08, ly + 0.12, 0.1, 0.18 - li * 0.02, 0.11)
    fillProducts(g, -len / 2 + 0.08, len / 2 - 0.08, ly + 0.1, -0.12, 0.16 - li * 0.02, 0.1)
  })

  // 层板价格条
  levels.forEach((ly) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(len - 0.1, 0.035, 0.01), toon(0xf3d98a))
    strip.position.set(0, ly - 0.005, depth / 2 - 0.02)
    g.add(strip)
  })

  parent.add(g)
  return g
}

/** 饮料冷柜 */
function drinksFridge(parent: THREE.Object3D, cx: number, cz: number, w = 1.15, rotY = 0) {
  const g = new THREE.Group()
  g.position.set(cx, SY, cz)
  g.rotation.y = rotY

  const h = 2.05
  const body = box(w, h, 0.62, 0xdbe6f0, { line: true })
  body.position.y = h / 2
  g.add(body)

  // 发光内胆
  const inner = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.14, h - 0.3),
    new THREE.MeshBasicMaterial({ color: 0xeaf7ff, toneMapped: false }),
  )
  inner.position.set(0, h / 2 + 0.06, 0.315)
  g.add(inner)

  // 玻璃门
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.1, h - 0.24),
    toon(0xcfeaff, { transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  )
  glass.position.set(0, h / 2, 0.34)
  g.add(glass)

  // 瓶装饮料：四层
  const colors = [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xffd93d, 0xff9f45, 0xb06bff, 0x7fe3ff, 0xf7f7f7]
  for (let row = 0; row < 4; row++) {
    const y = 0.42 + row * 0.45
    const count = 7
    for (let i = 0; i < count; i++) {
      const px = -w / 2 + 0.1 + i * ((w - 0.2) / (count - 1))
      const can = cyl(0.033, 0.033, 0.18, 10, colors[(row * 7 + i) % colors.length], { line: false })
      can.position.set(px, y + 0.09, 0.22)
      g.add(can)
    }
    // 层板
    const plank = new THREE.Mesh(new THREE.BoxGeometry(w - 0.14, 0.02, 0.24), toon(0xc8d4e0))
    plank.position.set(0, y, 0.2)
    g.add(plank)
  }

  // 顶部品牌灯条
  const brandBar = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.14, 0.03), toon(0x5ad1ff, { emissive: 0x3aa8e0, emissiveIntensity: 0.9 }))
  brandBar.position.set(0, h - 0.14, 0.33)
  g.add(brandBar)

  parent.add(g)
  return g
}

/** 收银台 + 后台设备 */
function counterArea(parent: THREE.Object3D) {
  const g = new THREE.Group()

  const H = 0.92
  const TOP = SY + H + 0.05

  /* ---------- 柜台：顺时针转 90°，长边沿 Z 贴右侧，让开入口 ----------
     顾客从 -X 侧（货架通道）靠近，店员在 +X 侧（靠玻璃），
     这是便利店正常的动线：进门 → 逛货架 → 回来结账。
  ------------------------------------------------------------- */
  const CX0 = 0.66
  const CX1 = 1.26
  const CZ0 = -2.2
  const CZ1 = -0.2
  const cw = CX1 - CX0
  const cd = CZ1 - CZ0
  const ccx = (CX0 + CX1) / 2
  const ccz = (CZ0 + CZ1) / 2

  // 柜体
  const body = box(cw, H, cd, 0xcbb79a, {
    line: true,
    emissive: 0xffe9c8,
    emissiveIntensity: 0.22,
  })
  body.position.set(ccx, SY + H / 2, ccz)
  g.add(body)

  // 台面
  const top = box(cw + 0.04, 0.05, cd + 0.04, 0xe3d4b8, { line: true })
  top.position.set(ccx, TOP - 0.025, ccz)
  g.add(top)

  // 顾客侧（-X）踢脚 + 防撞条
  const kick = box(0.02, 0.12, cd, 0x6b5d4a, { line: false })
  kick.position.set(CX0 - 0.008, SY + 0.06, ccz)
  g.add(kick)

  const edge = box(0.02, 0.02, cd, 0xb9c6d3, { line: false })
  edge.position.set(CX0 - 0.026, TOP - 0.055, ccz)
  g.add(edge)

  // 柜台内部分层隔板
  const innerShelf = box(cw - 0.06, 0.03, cd - 0.08, 0xd8c9ae, { line: false })
  innerShelf.position.set(ccx, SY + 0.34, ccz)
  g.add(innerShelf)

  const innerDiv = box(0.02, 0.3, cd - 0.08, 0xc9b99c, { line: false })
  innerDiv.position.set(ccx, SY + 0.18, ccz)
  g.add(innerDiv)

  /* ---------- 台面物件：沿 Z 一字排开 ---------- */
  // 收银机
  const reg = box(0.26, 0.16, 0.28, 0x3b4759, { line: true })
  reg.position.set(0.96, TOP + 0.08, -0.55)
  g.add(reg)

  const regKeys = box(0.14, 0.012, 0.22, 0x66748a, { line: false })
  regKeys.position.set(0.96, TOP + 0.166, -0.55)
  g.add(regKeys)

  // 店员侧显示屏（朝 +X）
  const screenStand = cyl(0.018, 0.018, 0.16, 8, 0x4a5768, { line: false })
  screenStand.position.set(1.06, TOP + 0.24, -0.74)
  g.add(screenStand)

  const screenBezel = box(0.03, 0.21, 0.3, 0x2f3947, { line: true })
  screenBezel.position.set(1.09, TOP + 0.35, -0.74)
  g.add(screenBezel)

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.17),
    new THREE.MeshBasicMaterial({ color: 0x9fe6ff, toneMapped: false }),
  )
  screen.rotation.y = Math.PI / 2
  screen.position.set(1.108, TOP + 0.35, -0.74)
  g.add(screen)

  // 扫码器
  const scanner = box(0.12, 0.06, 0.1, 0x2f3947, { line: false })
  scanner.position.set(0.9, TOP + 0.03, -0.28)
  g.add(scanner)

  // 关东煮锅
  const odenBase = box(0.42, 0.18, 0.4, 0x8f98a6, { line: true })
  odenBase.position.set(0.96, TOP + 0.09, -1.64)
  g.add(odenBase)

  const odenTop = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xffcf7a, toneMapped: false }),
  )
  odenTop.rotation.x = -Math.PI / 2
  odenTop.position.set(0.96, TOP + 0.181, -1.64)
  g.add(odenTop)

  const ballColors = [0xe8b06a, 0xd98a5a, 0xf0d9a8, 0xc9895e]
  for (let i = 0; i < 9; i++) {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.024 + (i % 3) * 0.005, 8, 6),
      toon(ballColors[i % ballColors.length]),
    )
    ball.position.set(0.85 + (i % 3) * 0.075, TOP + 0.196, -1.76 + Math.floor(i / 3) * 0.07)
    g.add(ball)
  }

  // 热食保温柜
  const hotCase = box(0.4, 0.3, 0.34, 0x3a4352, { line: true })
  hotCase.position.set(0.96, TOP + 0.15, -1.18)
  g.add(hotCase)

  const hotGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.2),
    toon(0xffe0a8, {
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      emissive: 0xffb454,
      emissiveIntensity: 0.55,
    }),
  )
  hotGlass.rotation.y = Math.PI / 2
  hotGlass.position.set(1.163, TOP + 0.19, -1.18)
  g.add(hotGlass)

  // 柜内炸物
  for (let i = 0; i < 3; i++) {
    const food = box(0.05, 0.045, 0.07, 0xd99a4a, { line: false })
    food.position.set(0.88, TOP + 0.08, -1.28 + i * 0.09)
    g.add(food)
  }

  // 咖啡机
  const coffee = box(0.28, 0.44, 0.28, 0x39414f, { line: true })
  coffee.position.set(0.98, TOP + 0.22, -2.02)
  g.add(coffee)

  const coffeePanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.15),
    new THREE.MeshBasicMaterial({ color: 0xffb454, toneMapped: false }),
  )
  coffeePanel.rotation.y = Math.PI / 2
  coffeePanel.position.set(1.123, TOP + 0.32, -2.02)
  g.add(coffeePanel)

  const spout = box(0.04, 0.04, 0.05, 0x20262f, { line: false })
  spout.position.set(0.83, TOP + 0.06, -2.02)
  g.add(spout)

  // 杯塔
  for (let i = 0; i < 3; i++) {
    const cup = cyl(0.03, 0.024, 0.07, 8, 0xf6f2e8, { line: false })
    cup.position.set(0.8, TOP + 0.035 + i * 0.012, -2.16 + i * 0.055)
    g.add(cup)
  }

  /* ---------- 后方工作柜（落地，微波炉坐在柜顶） ---------- */
  const workCabinet = box(1.2, 1.12, 0.38, 0xdfd6c6, {
    line: true,
    emissive: 0xffe9c8,
    emissiveIntensity: 0.3,
  })
  workCabinet.position.set(0.55, SY + 0.56, -2.45)
  g.add(workCabinet)

  const cabinetSeam = box(0.012, 0.9, 0.38, 0xc3b9a7, { line: false })
  cabinetSeam.position.set(0.55, SY + 0.58, -2.45)
  g.add(cabinetSeam)

  ;[0.28, 0.82].forEach((hx) => {
    const handle = box(0.12, 0.025, 0.025, 0x9aa4b2, { line: false })
    handle.position.set(hx, SY + 0.86, -2.25)
    g.add(handle)
  })

  // 微波炉
  const microTop = SY + 1.12
  const micro = box(0.42, 0.28, 0.3, 0x4a5464, { line: true })
  micro.position.set(0.4, microTop + 0.14, -2.45)
  g.add(micro)

  const microDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.18),
    new THREE.MeshBasicMaterial({ color: 0x1d2734, toneMapped: false }),
  )
  microDoor.position.set(0.4, microTop + 0.14, -2.294)
  g.add(microDoor)

  const microPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x6fe0b0, toneMapped: false }),
  )
  microPanel.position.set(0.57, microTop + 0.19, -2.294)
  g.add(microPanel)

  // 柜顶：杯面箱
  const noodleBox = box(0.26, 0.2, 0.22, 0xc4693f, { line: true })
  noodleBox.position.set(0.92, microTop + 0.1, -2.45)
  g.add(noodleBox)

  parent.add(g)
  return g
}

/** 店内主光带 + 吸顶灯 */
function ceilingLights(parent: THREE.Object3D) {
  const lights: THREE.PointLight[] = []
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xfff8e8, toneMapped: false })

  const spots: [number, number][] = [
    [-1.75, -2.3],
    [-0.15, -2.3],
    [1.15, -2.3],
    [-1.75, -0.95],
    [-0.15, -0.95],
    [1.15, -0.95],
  ]

  spots.forEach(([x, z]) => {
    // 灯箱面板（贴天花板）
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.5), panelMat)
    panel.rotation.x = Math.PI / 2
    panel.position.set(x, SY + SH - 0.055, z)
    parent.add(panel)

    // 灯罩边框
    const frame = box(1.1, 0.04, 0.56, 0xf6f9fd, { line: false })
    frame.position.set(x, SY + SH - 0.015, z)
    parent.add(frame)

    // 6 盏均布，强度压低：既照亮货架正面，又不过曝吃掉商品颜色
    const light = new THREE.PointLight(0xffd9a3, 5.0, 7.0, 1.15)
    light.position.set(x, SY + SH - 0.34, z)
    parent.add(light)
    lights.push(light)
  })

  // 注：这里原本还有一盏 entryLight（门口补光）。
  // 它离招牌背板只有 0.6，光线直接穿过招牌照亮其**外表面**，
  // 在三渲二材质上被梯度贴图量化成一圈明显的圆斑。已删除，
  // 门口亮度由 6 盏吊顶灯 + 招牌自发光承担。

  return lights
}

export function buildStore(root: THREE.Group): StoreApi {
  const g = new THREE.Group()
  root.add(g)

  const wallColor = C.storeWall
  const trimColor = C.storeTrim

  /* ================= 地板 ================= */
  const floorBed = box(W, 0.05, D, 0x8a7f6e, { line: false })
  floorBed.position.set(CX, SY + 0.02, CZ)
  g.add(floorBed)

  const innerFloor = box(W - T * 2, 0.02, D - T * 2, C.interiorFloor, {
    line: false,
    emissive: 0xffe6c2,
    emissiveIntensity: 0.3,
  })
  innerFloor.position.set(CX, SY + 0.045, CZ)
  g.add(innerFloor)

  // 地砖缝
  const tileMat = new THREE.MeshBasicMaterial({ color: 0xcabfa8, transparent: true, opacity: 0.5 })
  for (let x = SX0 + T + 0.7; x < SX1 - T; x += 0.7) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.012, D - T * 2), tileMat)
    t.rotation.x = -Math.PI / 2
    t.position.set(x, SY + 0.057, CZ)
    g.add(t)
  }

  /* ================= 实墙：后墙 + 左侧墙 ================= */
  const backWall = box(W, SH, T, wallColor, { line: true })
  backWall.position.set(CX, SY + SH / 2, SZ0 + T / 2)
  g.add(backWall)

  const leftWall = box(T, SH, D, wallColor, { line: true })
  leftWall.position.set(SX0 + T / 2, SY + SH / 2, CZ)
  g.add(leftWall)

  // 后墙内侧涂料
  const backInner = box(W - T * 2, SH - 0.35, 0.02, C.interiorWall, {
    line: false,
    emissive: 0xfff0d4,
    emissiveIntensity: 0.3,
  })
  backInner.position.set(CX, SY + (SH - 0.35) / 2 + 0.1, SZ0 + T + 0.022)
  g.add(backInner)

  const leftInner = box(0.02, SH - 0.35, D - T * 2, C.interiorWall, {
    line: false,
    emissive: 0xfff0d4,
    emissiveIntensity: 0.3,
  })
  leftInner.position.set(SX0 + T + 0.022, SY + (SH - 0.35) / 2 + 0.1, CZ)
  g.add(leftInner)

  /* ================= 前立面：柱 + 过梁 + 踢脚 ================= */
  const pierL = box(0.16, SH, T, wallColor, { line: true })
  pierL.position.set(SX0 + 0.08, SY + SH / 2, SZ1 - T / 2)
  g.add(pierL)

  const pierR = box(0.16, SH, T, wallColor, { line: true })
  pierR.position.set(SX1 - 0.08, SY + SH / 2, SZ1 - T / 2)
  g.add(pierR)

  // 门框柱
  const doorPostL = box(0.08, GLASS_Y1 - GLASS_Y0, 0.1, trimColor, { line: true })
  doorPostL.position.set(DOOR.x0, SY + (GLASS_Y0 + GLASS_Y1) / 2, SZ1 - T / 2)
  g.add(doorPostL)

  const doorPostR = box(0.08, GLASS_Y1 - GLASS_Y0, 0.1, trimColor, { line: true })
  doorPostR.position.set(DOOR.x1, SY + (GLASS_Y0 + GLASS_Y1) / 2, SZ1 - T / 2)
  g.add(doorPostR)

  // 过梁
  const header = box(W, SH - GLASS_Y1 + SY, T, wallColor, { line: true })
  header.position.set(CX, SY + GLASS_Y1 + (SH - GLASS_Y1 + SY) / 2, SZ1 - T / 2)
  g.add(header)

  // 踢脚（玻璃下沿）
  const kick = box(W, GLASS_Y0 - SY + 0.02, T + 0.02, 0xc9d5e2, { line: true })
  kick.position.set(CX, SY + (GLASS_Y0 - SY) / 2, SZ1 - T / 2)
  g.add(kick)

  /* ================= 右立面 ================= */
  const rPierA = box(T, SH, 0.16, wallColor, { line: true })
  rPierA.position.set(SX1 - T / 2, SY + SH / 2, SZ0 + 0.08)
  g.add(rPierA)

  const rPierB = box(T, SH, 0.16, wallColor, { line: true })
  rPierB.position.set(SX1 - T / 2, SY + SH / 2, SZ1 - 0.08)
  g.add(rPierB)

  const rHeader = box(T, SH - GLASS_Y1 + SY, D, wallColor, { line: true })
  rHeader.position.set(SX1 - T / 2, SY + GLASS_Y1 + (SH - GLASS_Y1 + SY) / 2, CZ)
  g.add(rHeader)

  const rKick = box(T + 0.02, GLASS_Y0 - SY + 0.02, D, 0xc9d5e2, { line: true })
  rKick.position.set(SX1 - T / 2, SY + (GLASS_Y0 - SY) / 2, CZ)
  g.add(rKick)

  /* ================= 玻璃幕墙 ================= */
  const glassMat = toon(0xb8dcf5, {
    transparent: true,
    opacity: 0.045,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  // 正面玻璃（门洞两侧）
  const gw1 = DOOR.x0 - (SX0 + 0.16)
  const glassFrontA = new THREE.Mesh(new THREE.PlaneGeometry(gw1, GLASS_Y1 - GLASS_Y0), glassMat)
  glassFrontA.position.set(SX0 + 0.16 + gw1 / 2, SY + (GLASS_Y0 + GLASS_Y1) / 2, SZ1 - T / 2)
  g.add(glassFrontA)

  const gw2 = SX1 - 0.16 - DOOR.x1
  if (gw2 > 0.02) {
    const glassFrontB = new THREE.Mesh(new THREE.PlaneGeometry(gw2, GLASS_Y1 - GLASS_Y0), glassMat)
    glassFrontB.position.set(DOOR.x1 + gw2 / 2, SY + (GLASS_Y0 + GLASS_Y1) / 2, SZ1 - T / 2)
    g.add(glassFrontB)
  }

  // 右侧玻璃
  const glassRight = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.32, GLASS_Y1 - GLASS_Y0), glassMat)
  glassRight.rotation.y = -Math.PI / 2
  glassRight.position.set(SX1 - T / 2, SY + (GLASS_Y0 + GLASS_Y1) / 2, CZ)
  g.add(glassRight)

  // 横向分格条
  const mullionMat = toon(0xe4ecf5)
  const midBar = box(gw1, 0.045, 0.055, 0xe4ecf5, { line: false })
  midBar.position.set(SX0 + 0.16 + gw1 / 2, SY + 1.28, SZ1 - 0.01)
  g.add(midBar)

  // 竖向分格条（沿玻璃等分）
  const addMullion = (x: number, z: number, alongX: boolean) => {
    const m = alongX
      ? new THREE.Mesh(new THREE.BoxGeometry(0.045, GLASS_Y1 - GLASS_Y0, 0.055), mullionMat)
      : new THREE.Mesh(new THREE.BoxGeometry(0.055, GLASS_Y1 - GLASS_Y0, 0.045), mullionMat)
    m.position.set(x, SY + (GLASS_Y0 + GLASS_Y1) / 2, z)
    g.add(m)
  }
  addMullion(SX0 + 0.16 + gw1 / 3, SZ1 - 0.01, true)
  addMullion(SX0 + 0.16 + (gw1 * 2) / 3, SZ1 - 0.01, true)

  // 右侧玻璃竖向分格
  for (let i = 1; i <= 2; i++) {
    const z = SZ0 + 0.16 + ((D - 0.32) * i) / 3
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.055, GLASS_Y1 - GLASS_Y0, 0.045), mullionMat)
    m.position.set(SX1 + 0.005, SY + (GLASS_Y0 + GLASS_Y1) / 2, z)
    g.add(m)
  }

  const midBarR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, D - 0.32), mullionMat)
  midBarR.position.set(SX1 + 0.005, SY + 1.28, CZ)
  g.add(midBarR)

  /* ================= 自动门（两扇推拉） ================= */
  const doorW = (DOOR.x1 - DOOR.x0) / 2
  const doorH = GLASS_Y1 - GLASS_Y0
  const DOOR_Z = SZ1 - T / 2 + 0.022

  /** 单扇门：铝框 + 玻璃 + 密封胶条 + 地面毛刷 */
  function doorPanel(dir: number) {
    const p = new THREE.Group()

    const fw = 0.044 // 框料宽
    const fh = 0.05 // 横框高
    const frameMat = 0xb9c7d6
    const glassW = doorW - fw * 2
    const glassH = doorH - fh * 2

    // 玻璃（略微内凹，让框有厚度）
    const glassPane = new THREE.Mesh(
      new THREE.PlaneGeometry(glassW, glassH),
      toon(0xcfe9fa, {
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    glassPane.position.z = -0.004
    p.add(glassPane)

    // 玻璃上的斜向高光
    const highlight = new THREE.Mesh(
      new THREE.PlaneGeometry(glassW * 0.3, glassH * 0.95),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    highlight.position.set(glassW * 0.16, 0, 0.002)
    highlight.rotation.z = 0.2
    p.add(highlight)

    // 上下横框
    const frameTop = box(doorW, fh, 0.052, frameMat, { line: true })
    frameTop.position.y = doorH / 2 - fh / 2
    p.add(frameTop)

    const frameBottom = box(doorW, fh, 0.052, frameMat, { line: true })
    frameBottom.position.y = -doorH / 2 + fh / 2
    p.add(frameBottom)

    // 外侧竖框（宽一点，是门料的主框）
    const frameOuter = box(fw, doorH - fh * 2, 0.052, frameMat, { line: true })
    frameOuter.position.x = dir * (doorW / 2 - fw / 2)
    p.add(frameOuter)

    // 内侧竖框（窄边，闭合时两扇交叠处）
    const frameInner = box(fw * 0.7, doorH - fh * 2, 0.046, frameMat, { line: true })
    frameInner.position.x = -dir * (doorW / 2 - fw * 0.35)
    p.add(frameInner)

    // 密封胶条（内侧竖框上的深色软胶）
    const seal = box(0.014, doorH - fh * 2 - 0.02, 0.056, 0x39424f, { line: false })
    seal.position.x = -dir * (doorW / 2 - fw * 0.1)
    p.add(seal)

    // 中横档
    const midRail = box(glassW, 0.026, 0.044, 0xa9b8c8, { line: false })
    midRail.position.y = -doorH * 0.1
    p.add(midRail)

    // 底部毛刷（挡风条）
    const brush = box(doorW - 0.02, 0.018, 0.03, 0x252e3b, { line: false })
    brush.position.y = -doorH / 2 - 0.006
    p.add(brush)

    // 门扇玻璃上的小标识
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x4fd49a, transparent: true, opacity: 0.85, toneMapped: false }),
    )
    badge.position.set(-dir * 0.12, -doorH * 0.26, 0.026)
    p.add(badge)

    p.position.set(0, SY + (GLASS_Y0 + GLASS_Y1) / 2, DOOR_Z)
    g.add(p)
    return p
  }

  const doorLeft = doorPanel(-1)
  const doorRight = doorPanel(1)
  const doorClosedL = DOOR.x0 + doorW / 2
  const doorClosedR = DOOR.x1 - doorW / 2
  doorLeft.position.x = doorClosedL
  doorRight.position.x = doorClosedR

  /* ---------- 门的硬件：轨道 / 传感器 / 门槛 ---------- */
  const doorCenterX = (DOOR.x0 + DOOR.x1) / 2

  // 顶部导轨
  const track = box(DOOR.x1 - DOOR.x0 + 0.28, 0.05, 0.1, 0x8b97a7, { line: true })
  track.position.set(doorCenterX, SY + GLASS_Y1 - 0.045, DOOR_Z - 0.02)
  g.add(track)

  // 导轨上的滑块
  ;[-doorW / 2, doorW / 2].forEach((ox) => {
    const slider = box(0.07, 0.035, 0.06, 0x6e7b8c, { line: false })
    slider.position.set(doorCenterX + ox, SY + GLASS_Y1 - 0.085, DOOR_Z - 0.02)
    g.add(slider)
  })

  // 门头传感器
  const sensor = box(0.26, 0.055, 0.09, 0x2f3946, { line: true })
  sensor.position.set(doorCenterX, SY + GLASS_Y1 + 0.08, SZ1 + 0.06)
  g.add(sensor)

  const sensorLed = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x3ddc84, toneMapped: false }),
  )
  sensorLed.position.set(doorCenterX + 0.08, SY + GLASS_Y1 + 0.06, SZ1 + 0.107)
  sensorLed.rotation.x = -0.6
  g.add(sensorLed)

  // 门槛金属压条
  const threshold = box(DOOR.x1 - DOOR.x0 + 0.12, 0.012, 0.14, 0x9aa6b4, { line: true })
  threshold.position.set(doorCenterX, SY + 0.006, SZ1 - 0.05)
  g.add(threshold)

  // 门槛缝隙
  const sillGap = box(DOOR.x1 - DOOR.x0, 0.008, 0.02, 0x141a24, { line: false })
  sillGap.position.set(doorCenterX, SY + 0.013, SZ1 - 0.05)
  g.add(sillGap)

  /* ================= 玻璃上的雨水痕迹 ================= */
  const glassStreak = glassStreakMaterial()
  glassStreak.uniforms.uOpacity.value = 0.18

  const streakA = new THREE.Mesh(new THREE.PlaneGeometry(gw1 - 0.04, GLASS_Y1 - GLASS_Y0), glassStreak)
  streakA.position.set(SX0 + 0.16 + gw1 / 2, SY + (GLASS_Y0 + GLASS_Y1) / 2, SZ1 + 0.012)
  g.add(streakA)

  if (gw2 > 0.02) {
    const streakB = new THREE.Mesh(new THREE.PlaneGeometry(gw2 - 0.04, GLASS_Y1 - GLASS_Y0), glassStreak)
    streakB.position.set(DOOR.x1 + gw2 / 2, SY + (GLASS_Y0 + GLASS_Y1) / 2, SZ1 + 0.012)
    g.add(streakB)
  }

  const streakC = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.36, GLASS_Y1 - GLASS_Y0), glassStreak)
  streakC.rotation.y = -Math.PI / 2
  streakC.position.set(SX1 + 0.012, SY + (GLASS_Y0 + GLASS_Y1) / 2, CZ)
  g.add(streakC)

  /* ================= 屋顶 ================= */
  const roof = box(W + 0.12, 0.14, D + 0.12, 0x4e5a6c, { line: true })
  roof.name = 'storeRoof'
  roof.position.set(CX, ROOF_Y + 0.07, CZ)
  g.add(roof)

  // 女儿墙
  const parapetF = box(W + 0.12, 0.18, 0.08, 0x3f4a5a, { line: true })
  parapetF.position.set(CX, ROOF_Y + 0.23, SZ1 + 0.02)
  g.add(parapetF)

  const parapetL = box(0.08, 0.18, D + 0.12, 0x3f4a5a, { line: true })
  parapetL.position.set(SX0 - 0.02, ROOF_Y + 0.23, CZ)
  g.add(parapetL)

  // 屋顶设备：空调外机 + 通风管 + 检修口
  const roofAc = box(0.62, 0.42, 0.4, 0x9aa6b6, { line: true })
  roofAc.position.set(SX0 + 1.0, ROOF_Y + 0.35, SZ0 + 1.1)
  g.add(roofAc)

  const roofAcFan = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 16), toon(0x6b7688))
  roofAcFan.position.set(SX0 + 1.0, ROOF_Y + 0.35, SZ0 + 1.31)
  g.add(roofAcFan)

  const vent = cyl(0.08, 0.08, 0.5, 10, 0x8a94a4, { line: true })
  vent.position.set(SX1 - 0.9, ROOF_Y + 0.4, SZ0 + 0.9)
  g.add(vent)

  // 屋顶护栏
  const railMat = 0x7d8899
  for (let i = 0; i <= 6; i++) {
    const post = cyl(0.018, 0.018, 0.34, 6, railMat, { line: false })
    post.position.set(SX0 + 0.35 + i * ((W - 0.7) / 6), ROOF_Y + 0.35, SZ1 - 0.06)
    g.add(post)
  }
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(W - 0.7, 0.03, 0.03), toon(railMat))
  railTop.position.set(CX, ROOF_Y + 0.52, SZ1 - 0.06)
  g.add(railTop)

  const ventCap = cyl(0.12, 0.09, 0.06, 10, 0x74808f, { line: true })
  ventCap.position.set(SX1 - 0.9, ROOF_Y + 0.68, SZ0 + 0.9)
  g.add(ventCap)

  /* ================= 招牌 ================= */
  const signTex = signTexture()
  const signMat = toon(0xffffff, { map: signTex, emissive: 0xffffff, emissiveIntensity: 0.55 })
  signMat.emissiveMap = signTex
  signMat.needsUpdate = true

  const signBoard = box(W, 0.56, 0.1, 0xf2f8f4, { line: true })
  signBoard.position.set(CX, SY + 2.42, SZ1 + 0.03)
  g.add(signBoard)

  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, 0.5), signMat)
  signFace.position.set(CX, SY + 2.42, SZ1 + 0.096)
  g.add(signFace)

  // 右侧招牌
  const signBoardR = box(0.1, 0.56, D, 0xf2f8f4, { line: true })
  signBoardR.position.set(SX1 + 0.03, SY + 2.42, CZ)
  g.add(signBoardR)

  const signFaceR = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.06, 0.5), signMat)
  signFaceR.rotation.y = Math.PI / 2
  signFaceR.position.set(SX1 + 0.096, SY + 2.42, CZ)
  g.add(signFaceR)

  /* ================= 垂直侧招（街角） ================= */
  const sideTex = sideSignTexture()
  const sideSignMat = new THREE.MeshBasicMaterial({ map: sideTex, toneMapped: false })
  const sideSign = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.1), sideSignMat)
  sideSign.position.set(SX1 + 0.24, SY + 2.0, SZ1 - 0.26)
  g.add(sideSign)

  // 侧招支架（从墙面伸出）
  const bracket = box(0.46, 0.05, 0.05, 0x8a97a8, { line: false })
  bracket.position.set(SX1 + 0.02, SY + 2.56, SZ1 - 0.26)
  g.add(bracket)

  const bracket2 = box(0.46, 0.05, 0.05, 0x8a97a8, { line: false })
  bracket2.position.set(SX1 + 0.02, SY + 1.44, SZ1 - 0.26)
  g.add(bracket2)

  /* ================= 屋檐雨棚 ================= */
  const awning = box(W - 0.1, 0.06, 0.62, 0xdbe6f0, { line: true })
  awning.position.set(CX, SY + 2.12, SZ1 + 0.32)
  g.add(awning)

  // 雨棚前挡
  const awningLip = box(W - 0.1, 0.14, 0.04, 0xc3d2e0, { line: true })
  awningLip.position.set(CX, SY + 2.05, SZ1 + 0.62)
  g.add(awningLip)

  /* ================= 门口地垫 ================= */
  const mat = box(1.5, 0.03, 0.5, 0x3a4250, { line: true })
  mat.position.set((DOOR.x0 + DOOR.x1) / 2, SY + 0.015, SZ1 + 0.3)
  g.add(mat)

  // 地垫条纹
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x55606f }),
    )
    s.rotation.x = -Math.PI / 2
    s.position.set((DOOR.x0 + DOOR.x1) / 2, SY + 0.032, SZ1 + 0.16 + i * 0.09)
    g.add(s)
  }

  /* ================= 店内：货架 ================= */
  gondola(g, -1.32, -2.55, 1.9)
  gondola(g, -1.32, -1.62, 1.9)

  /* ================= 店内：饮料柜 / 冰淇淋柜 ================= */
  drinksFridge(g, 0.85, -3.0, 1.15)
  drinksFridge(g, -0.35, -3.0, 0.9)

  // 冰淇淋冷冻柜
  const freezer = box(1.0, 1.1, 0.55, 0xd7e5f2, { line: true })
  freezer.position.set(-2.05, SY + 0.55, -2.95)
  g.add(freezer)

  const freezerLid = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.46),
    toon(0xd4ecff, { transparent: true, opacity: 0.35, depthWrite: false, emissive: 0x224466, emissiveIntensity: 0.5 }),
  )
  freezerLid.rotation.x = -Math.PI / 2
  freezerLid.position.set(-2.05, SY + 1.11, -2.95)
  g.add(freezerLid)

  /* ================= 店内：收银区 ================= */
  counterArea(g)

  /* ================= 店内：杂志架 ================= */
  const magGroup = new THREE.Group()
  magGroup.position.set(-1.75, SY, 0.28)
  const magBase = box(1.15, 0.72, 0.3, 0xe5dbc9, { line: true })
  magBase.position.y = 0.36
  magGroup.add(magBase)

  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      const cover = new THREE.Mesh(
        new THREE.PlaneGeometry(0.13, 0.19),
        new THREE.MeshBasicMaterial({ map: magazineTexture(row * 7 + i), toneMapped: false }),
      )
      cover.position.set(-0.48 + i * 0.16, 0.22 + row * 0.22, 0.16)
      cover.rotation.x = -0.12
      magGroup.add(cover)
    }
  }
  g.add(magGroup)

  /* ================= 店内：后场门 + 储物柜 ================= */
  const staffDoor = box(0.62, 1.85, 0.06, 0xd2dbd2, { line: true })
  staffDoor.position.set(-2.05, SY + 0.925, SZ0 + T + 0.02)
  g.add(staffDoor)

  const staffKnob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), toon(0xb8c3cf))
  staffKnob.position.set(-1.8, SY + 0.95, SZ0 + T + 0.08)
  g.add(staffKnob)

  // 储物柜
  for (let i = 0; i < 3; i++) {
    const locker = box(0.3, 1.0, 0.32, 0xc8d3df, { line: true })
    locker.position.set(-2.28 + i * 0.33, SY + 0.5, -3.0)
    g.add(locker)
  }

  /* ================= 店内：地面导视箭头 ================= */
  const arrow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({
      map: arrowTexture(),
      transparent: true,
      opacity: 0.75,
      toneMapped: false,
    }),
  )
  arrow.rotation.x = -Math.PI / 2
  arrow.rotation.z = Math.PI
  arrow.position.set(0.4, SY + 0.062, 0.15)
  g.add(arrow)

  /* ================= 店内：玻璃上的海报 ================= */
  const posterA = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.56),
    new THREE.MeshBasicMaterial({ map: posterTexture('#ff6f91', '#ffd166', 'NEW', '期間限定'), toneMapped: false }),
  )
  posterA.rotation.y = Math.PI
  posterA.position.set(-1.55, SY + 1.5, SZ1 - T - 0.01)
  g.add(posterA)

  const posterB = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.5),
    new THREE.MeshBasicMaterial({ map: posterTexture('#38b6ff', '#ffb454', 'SALE', 'おにぎり'), toneMapped: false }),
  )
  posterB.rotation.y = Math.PI
  posterB.position.set(1.2, SY + 1.5, SZ1 - T - 0.01)
  g.add(posterB)

  const posterC = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.54),
    new THREE.MeshBasicMaterial({ map: posterTexture('#7ee0b0', '#ff6f91', 'HOT', 'からあげ'), toneMapped: false }),
  )
  posterC.rotation.y = -Math.PI / 2
  posterC.position.set(SX1 - T - 0.01, SY + 1.5, -1.9)
  g.add(posterC)

  /* ================= 店内：收银提示牌 / 吊旗 ================= */
  for (let i = 0; i < 3; i++) {
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.22),
      new THREE.MeshBasicMaterial({
        color: [0xff6f91, 0x7ee0b0, 0xffd166][i],
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    )
    flag.position.set(-1.9 + i * 1.5, SY + 2.2, -0.55)
    flag.rotation.y = 0.1
    g.add(flag)
  }

  /* ================= 店外：自动贩卖机位置留给 props ================= */

  /* ================= 灯光 ================= */
  const interiorLights = ceilingLights(g)

  // 沿玻璃上沿的灯槽：从外面看是一道明亮的暖白光边
  const coveMat = new THREE.MeshBasicMaterial({ color: 0xfff6e4, toneMapped: false })
  const coveFront = new THREE.Mesh(new THREE.BoxGeometry(W - 0.44, 0.07, 0.09), coveMat)
  coveFront.position.set(CX, SY + 2.08, SZ1 - 0.36)
  g.add(coveFront)

  const coveRight = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, D - 0.44), coveMat)
  coveRight.position.set(SX1 - 0.36, SY + 2.08, CZ)
  g.add(coveRight)

  // 店内外溢的暖光（假泛光，让"亮"读得出来）
  const haloMat = new THREE.MeshBasicMaterial({
    map: sheenTexture(),
    color: 0xffc98a,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const haloFront = new THREE.Mesh(new THREE.PlaneGeometry(W + 2.0, 3.4), haloMat)
  haloFront.position.set(CX, SY + 1.35, SZ1 + 0.06)
  g.add(haloFront)

  const haloRight = new THREE.Mesh(new THREE.PlaneGeometry(D + 1.8, 3.4), haloMat)
  haloRight.rotation.y = Math.PI / 2
  haloRight.position.set(SX1 + 0.06, SY + 1.35, CZ)
  g.add(haloRight)

  // 门口地面暖光溢出
  addLightPool(root, 0.4, 1.12, 2.9, 1.9, 0xffc98a, 0.46, 0.1)
  addGlowDisc(root, 0.4, 1.3, 4.2, 0xffb268, 0.36, 0.101)

  /* ================= 动画 ================= */
  function update(t: number, doorOpen: number) {
    // 自动门
    const slide = doorOpen * (doorW - 0.06)
    doorLeft.position.x = doorClosedL - slide
    doorRight.position.x = doorClosedR + slide

    // 招牌灯箱：极轻微的明暗呼吸，不做高频闪烁
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.85)
    signMat.emissiveIntensity = 0.5 + breathe * 0.05

    // 玻璃雨痕
    glassStreak.uniforms.uTime.value = t
  }

  return {
    doorLeft,
    doorRight,
    signMat,
    sideSignMat,
    glassStreak,
    interiorLights,
    update,
  }
}
