/**
 * 医院建筑：主楼 + 侧翼 + 蓝玻璃幕墙 + 入口门斗 + 雨棚 + 屋顶设备
 * + 外置消防梯 + 背面后勤区
 *
 * 标识系统**不含任何文字**：主标识为白灯箱上的红十字，雨棚灯箱用十字 + 箭头，
 * 墙面科室牌用图形符号。所有贴合面之间均留有 0.006 以上的间隙，避免 z-fighting。
 */
import * as THREE from 'three'
import { box, cyl, toon, glowMat } from '../toon'
import { HL, BAND_START } from './layout'
import {
  glassCellTexture,
  clearGlassTexture,
  canopyBandTexture,
  deptPictogramTexture,
} from './textures'

const HP = {
  wall: 0xf0f4f9,
  wallShade: 0xdfe7f0,
  wallDark: 0xc7d2de,
  stone: 0xf1f5f9,
  trim: 0xfbfdff,
  glassTint: 0xa9cfe9,
  metal: 0xb2bcc7,
  metalDark: 0x8d99a6,
  red: 0xe0453f,
  blue: 0x3f8fd0,
}

const glassTexBase = glassCellTexture()
const clearTexBase = clearGlassTexture()

export interface BuildingApi {
  doorLeft: THREE.Object3D
  doorRight: THREE.Object3D
  signMat: THREE.MeshBasicMaterial
  update: (t: number, door: number) => void
}

/** 一段幕墙：窗下墙 + 蓝玻璃带（竖框在贴图里） */
function glassBand(
  parent: THREE.Object3D,
  opts: { width: number; yb: number; h: number; cx: number; cz: number; rotY?: number },
) {
  const { width, yb, h, cx, cz, rotY = 0 } = opts
  const g = new THREE.Group()
  g.position.set(cx, yb, cz)
  g.rotation.y = rotY

  const spandrelH = 0.4
  const glassH = h - spandrelH - 0.06

  const tex = glassTexBase.clone()
  tex.needsUpdate = true
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(Math.max(1, Math.round(width / 0.66)), 1)

  const spandrel = box(width, spandrelH, 0.07, HP.wall, { line: true })
  spandrel.position.y = spandrelH / 2
  g.add(spandrel)

  const glass = box(width, glassH, 0.05, 0xffffff, {
    map: tex,
    line: true,
    emissive: 0x8abde4,
    emissiveIntensity: 0.26,
  })
  glass.position.y = spandrelH + glassH / 2
  g.add(glass)

  const sill = box(width, 0.035, 0.09, HP.trim, { line: false })
  sill.position.y = spandrelH + 0.012
  g.add(sill)

  parent.add(g)
  return g
}

/** 屋顶设备 */
function roofEquipment(parent: THREE.Object3D) {
  const roofY = HL.main.h + 0.09
  const g = new THREE.Group()
  g.position.y = roofY

  // 设备机房
  const room = box(1.5, 0.85, 1.1, HP.wallShade, { line: true })
  room.position.set(-0.95, 0.42, -3.2)
  g.add(room)

  const roomRoof = box(1.58, 0.06, 1.18, HP.wallDark, { line: true })
  roomRoof.position.set(-0.95, 0.87, -3.2)
  g.add(roomRoof)

  // 机房百叶
  for (let i = 0; i < 4; i++) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.02), toon(HP.metalDark))
    louver.position.set(-0.95, 0.22 + i * 0.12, -2.64)
    g.add(louver)
  }

  // 冷却塔
  const tower = cyl(0.42, 0.46, 0.78, 16, HP.wallShade, { line: true })
  tower.position.set(1.15, 0.39, -3.1)
  g.add(tower)

  const towerTop = cyl(0.44, 0.44, 0.06, 16, HP.metal, { line: true })
  towerTop.position.set(1.15, 0.8, -3.1)
  g.add(towerTop)

  // 风机圈 + 叶片
  const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 20), toon(HP.metalDark))
  fanRing.rotation.x = Math.PI / 2
  fanRing.position.set(1.15, 0.84, -3.1)
  g.add(fanRing)

  const fanCenter = cyl(0.05, 0.05, 0.03, 10, 0x9aa5b1, { line: false })
  fanCenter.position.set(1.15, 0.845, -3.1)
  g.add(fanCenter)

  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.06), toon(0x9aa5b1))
    blade.position.set(1.15, 0.845, -3.1)
    blade.rotation.y = (i / 4) * Math.PI * 2
    blade.rotation.z = 0.25
    g.add(blade)
  }

  // 风管
  const duct = box(0.34, 0.22, 1.3, HP.metal, { line: true })
  duct.position.set(2.0, 0.11, -2.6)
  g.add(duct)

  const duct2 = box(0.34, 0.22, 0.7, HP.metal, { line: true })
  duct2.position.set(2.0, 0.11, -1.4)
  duct2.rotation.y = 0.4
  g.add(duct2)

  // 风管弯头
  const elbow = box(0.34, 0.22, 0.2, HP.metalDark, { line: true })
  elbow.position.set(2.0, 0.11, -0.98)
  g.add(elbow)

  // 空调外机组
  ;[
    [-1.95, -1.5],
    [-1.95, -2.3],
    [0.35, -1.7],
  ].forEach(([x, z]) => {
    const ac = box(0.5, 0.42, 0.3, 0xdde4ec, { line: true })
    ac.position.set(x, 0.21, z)
    g.add(ac)

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 6, 16), toon(HP.metalDark))
    ring.position.set(x, 0.21, z + 0.155)
    g.add(ring)

    // 支脚
    ;[-0.18, 0.18].forEach((ox) => {
      const foot = box(0.06, 0.06, 0.06, HP.metalDark, { line: false })
      foot.position.set(x + ox, 0.03, z)
      g.add(foot)
    })
  })

  // 检修通道护栏
  const railMat = 0xc2ccd6
  for (let i = 0; i <= 8; i++) {
    const post = cyl(0.012, 0.012, 0.3, 5, railMat, { line: false })
    post.position.set(-2.7 + i * 0.66, 0.15, -1.02)
    g.add(post)
  }
  const railBar = box(5.34, 0.022, 0.022, railMat, { line: false })
  railBar.position.set(0, 0.3, -1.02)
  g.add(railBar)

  // 天线 + 避雷针
  const mast = cyl(0.022, 0.022, 1.55, 6, HP.metalDark, { line: false })
  mast.position.set(2.1, 0.78, -3.55)
  g.add(mast)

  ;[1.05, 1.35].forEach((y) => {
    const cross = box(0.42, 0.02, 0.02, HP.metal)
    cross.position.set(2.1, y, -3.55)
    g.add(cross)
  })

  const rod = cyl(0.008, 0.008, 0.42, 5, 0xd0d7de, { line: false })
  rod.position.set(2.1, 1.72, -3.55)
  g.add(rod)

  parent.add(g)
  return g
}

/** 外置消防楼梯 */
function fireEscape(parent: THREE.Object3D) {
  const g = new THREE.Group()
  const x = HL.wingR.x1 + 0.02
  const z0 = -3.2
  const z1 = -1.5
  const depth = z1 - z0

  const levels = [1.15, 2.45, 3.75]

  ;[z0 + 0.1, z1 - 0.1].forEach((z) => {
    const col = box(0.07, 4.2, 0.07, 0x8f9aa8, { line: true })
    col.position.set(x + 0.5, 2.1, z)
    g.add(col)
  })

  levels.forEach((y, i) => {
    const landing = box(0.95, 0.05, depth, 0x9aa6b4, { line: true })
    landing.position.set(x + 0.5, y, (z0 + z1) / 2)
    g.add(landing)

    const rail = box(0.04, 0.42, depth, 0xb8c2ce, { line: false })
    rail.position.set(x + 0.96, y + 0.24, (z0 + z1) / 2)
    g.add(rail)

    const railTop = box(0.05, 0.04, depth, 0xc6cfd9, { line: false })
    railTop.position.set(x + 0.96, y + 0.46, (z0 + z1) / 2)
    g.add(railTop)

    if (i < levels.length - 1) {
      const runH = levels[i + 1] - y
      const steps = 7
      for (let s = 0; s < steps; s++) {
        const step = box(0.78, 0.03, 0.13, 0xa6b1be, { line: false })
        const t = s / (steps - 1)
        step.position.set(x + 0.5, y + 0.1 + t * (runH - 0.1), z0 + 0.16 + t * (depth - 0.32))
        g.add(step)
      }
      const stringer = box(0.03, 0.05, Math.hypot(runH, depth), 0x8f9aa8, { line: false })
      stringer.position.set(x + 0.88, y + runH / 2, (z0 + z1) / 2)
      stringer.rotation.x = Math.atan2(runH, depth)
      g.add(stringer)
    }
  })

  parent.add(g)
  return g
}

/** 背面后勤区：卸货平台 / 卷帘门 / 设备机组 / 落水管 */
function backFacade(parent: THREE.Object3D, glass: THREE.Material) {
  const m = HL.main
  const g = new THREE.Group()
  const bz = m.z0

  /* ---------- 后勤入口门斗 ---------- */
  const doorX = -1.55
  const doorW = 1.0
  const doorH = 1.75

  const frame = box(doorW + 0.16, doorH + 0.12, 0.06, HP.wallShade, { line: true })
  frame.position.set(doorX, doorH / 2, bz - 0.05)
  g.add(frame)

  // 双开钢门
  ;[-1, 1].forEach((d) => {
    const leaf = box(doorW / 2 - 0.03, doorH - 0.06, 0.05, 0xcfd8e1, { line: true })
    leaf.position.set(doorX + (d * doorW) / 4, doorH / 2, bz - 0.085)
    g.add(leaf)

    const handle = box(0.02, 0.16, 0.02, 0x8d99a6, { line: false })
    handle.position.set(doorX + d * 0.06, 0.95, bz - 0.115)
    g.add(handle)
  })

  // 门上小玻璃
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.3), glass)
  doorGlass.position.set(doorX, 1.32, bz - 0.112)
  doorGlass.rotation.y = Math.PI
  g.add(doorGlass)

  // 门户雨棚
  const porch = box(1.5, 0.08, 0.62, HP.trim, { line: true })
  porch.position.set(doorX, 1.98, bz - 0.31)
  g.add(porch)

  ;[-0.62, 0.62].forEach((ox) => {
    const bracket = box(0.04, 0.04, 0.44, HP.metal, { line: false })
    bracket.position.set(doorX + ox, 1.89, bz - 0.2)
    g.add(bracket)

    // 支柱，避免雨棚看起来悬空
    const post = box(0.05, 1.98, 0.05, HP.trim, { line: true })
    post.position.set(doorX + ox, 0.99, bz - 0.56)
    g.add(post)

    const shoe = box(0.11, 0.04, 0.11, HP.wallDark, { line: false })
    shoe.position.set(doorX + ox, 0.02, bz - 0.56)
    g.add(shoe)
  })

  // 台阶
  for (let i = 0; i < 3; i++) {
    const step = box(1.26, 0.06, 0.18, HP.stone, { line: true })
    step.position.set(doorX, 0.03 + i * 0.06, bz - 0.14 - i * 0.16)
    g.add(step)
  }

  /* ---------- 卸货平台 + 卷帘门 ---------- */
  const dockX = 1.55
  const platform = box(1.9, 0.38, 0.9, 0xc4cdd7, { line: true })
  platform.position.set(dockX, 0.19, bz - 0.5)
  g.add(platform)

  // 平台边缘黄黑警示条
  const warnMat = toon(0xe8b83c)
  const warnDark = toon(0x3a3f47)
  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.02), i % 2 ? warnDark : warnMat)
    stripe.position.set(dockX - 0.85 + i * 0.32, 0.34, bz - 0.95)
    g.add(stripe)
  }

  // 卷帘门
  const shutterW = 1.5
  const shutterH = 1.6
  const shutter = box(shutterW, shutterH, 0.06, 0xd8e0e8, { line: true })
  shutter.position.set(dockX, shutterH / 2 + 0.02, bz - 0.035)
  g.add(shutter)

  // 卷帘横纹（略微外凸，避免与门板共面）
  for (let i = 0; i < 11; i++) {
    const rib = box(shutterW - 0.04, 0.022, 0.018, 0xc2ccd6, { line: false })
    rib.position.set(dockX, 0.1 + i * 0.135, bz - 0.073)
    g.add(rib)
  }

  // 卷帘门导轨
  ;[-1, 1].forEach((d) => {
    const rail = box(0.07, shutterH + 0.1, 0.1, HP.metalDark, { line: true })
    rail.position.set(dockX + (d * (shutterW + 0.07)) / 2, shutterH / 2, bz - 0.06)
    g.add(rail)
  })

  // 卷帘门顶罩
  const hood = box(shutterW + 0.24, 0.18, 0.24, HP.metal, { line: true })
  hood.position.set(dockX, shutterH + 0.12, bz - 0.1)
  g.add(hood)

  // 防撞柱
  ;[-0.95, 1.15].forEach((ox) => {
    const bollard = cyl(0.06, 0.06, 0.6, 10, 0xd8b23c, { line: true })
    bollard.position.set(dockX + ox, 0.3, bz - 0.42)
    g.add(bollard)
  })

  /* ---------- 设备机组 ---------- */
  // 机组混凝土台
  const pad = box(2.1, 0.12, 0.72, 0xcfd6dd, { line: true })
  pad.position.set(-2.35, 0.12, bz - 0.52)
  g.add(pad)

  for (let i = 0; i < 3; i++) {
    const ac = box(0.52, 0.46, 0.34, 0xdfe6ee, { line: true })
    ac.position.set(-3.1 + i * 0.68, 0.41, bz - 0.52)
    g.add(ac)

    const grille = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.34), toon(0xb6c2ce))
    grille.position.set(-3.1 + i * 0.68, 0.41, bz - 0.694)
    grille.rotation.y = Math.PI
    g.add(grille)

    const pipe = cyl(0.02, 0.02, 0.46, 6, 0x9aa5b1, { line: false })
    pipe.position.set(-3.1 + i * 0.68, 0.56, bz - 0.31)
    g.add(pipe)

    // 铜管弯入墙体
    const bend = cyl(0.02, 0.02, 0.16, 6, 0x9aa5b1, { line: false })
    bend.position.set(-3.1 + i * 0.68, 0.79, bz - 0.24)
    bend.rotation.x = Math.PI / 2
    g.add(bend)
  }

  // 排风百叶
  for (let i = 0; i < 3; i++) {
    const vent = box(0.5, 0.34, 0.05, 0xb8c4d0, { line: true })
    vent.position.set(2.55 - i * 0.7, 2.4, bz - 0.06)
    g.add(vent)

    for (let k = 0; k < 4; k++) {
      const slat = box(0.44, 0.03, 0.02, 0x96a3b1, { line: false })
      slat.position.set(2.55 - i * 0.7, 2.27 + k * 0.075, bz - 0.09)
      g.add(slat)
    }
  }

  /* ---------- 后场公告板 ---------- */
  const noticeBack = box(0.86, 0.58, 0.05, 0xffffff, { line: true })
  noticeBack.position.set(-0.05, 1.45, bz - 0.06)
  g.add(noticeBack)

  const noticeFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.52),
    new THREE.MeshBasicMaterial({ map: deptPictogramTexture('stair', '#4aa3d8'), toneMapped: false }),
  )
  noticeFace.rotation.y = Math.PI
  noticeFace.position.set(-0.05, 1.45, bz - 0.088)
  g.add(noticeFace)

  // 壁灯
  ;[-2.6, 2.6].forEach((lx) => {
    const arm = box(0.06, 0.05, 0.24, HP.metalDark, { line: false })
    arm.position.set(lx, 2.55, bz - 0.12)
    g.add(arm)

    const lampBody = box(0.16, 0.1, 0.12, HP.metal, { line: true })
    lampBody.position.set(lx, 2.5, bz - 0.24)
    g.add(lampBody)

    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), glowMat(0xfff4dd, 0.75))
    lens.rotation.x = Math.PI / 2
    lens.position.set(lx, 2.445, bz - 0.24)
    g.add(lens)
  })

  /* ---------- 落水管 ---------- */
  ;[-m.x0 + 0.06, m.x1 - 0.06].forEach((px) => {
    const pipe = cyl(0.035, 0.035, HL.main.h, 8, 0xc8d0d9, { line: true })
    pipe.position.set(px, HL.main.h / 2, bz - 0.09)
    g.add(pipe)

    // 管卡
    for (let k = 1; k <= 4; k++) {
      const clamp = box(0.1, 0.03, 0.1, 0x9aa5b1, { line: false })
      clamp.position.set(px, 0.7 + k * 1.15, bz - 0.09)
      g.add(clamp)
    }
  })

  /* ---------- 背面草坪与杂物 ---------- */
  const crate = box(0.4, 0.32, 0.34, 0xb5895c, { line: true })
  crate.position.set(0.1, 0.16, bz - 0.62)
  g.add(crate)

  crate.rotation.y = 0.2

  parent.add(g)
  return g
}

export function buildBuilding(root: THREE.Group): BuildingApi {
  const g = new THREE.Group()
  root.add(g)

  const m = HL.main
  const cxm = (m.x0 + m.x1) / 2
  const czm = (m.z0 + m.z1) / 2
  const mw = m.x1 - m.x0
  const md = m.z1 - m.z0

  /* ================= 主楼外壳 ================= */
  const backWall = box(mw, m.h, 0.12, HP.wall, { line: true })
  backWall.position.set(cxm, m.h / 2, m.z0 + 0.06)
  g.add(backWall)

  const lWall = box(0.12, m.h, md, HP.wall, { line: true })
  lWall.position.set(m.x0 + 0.06, m.h / 2, czm)
  g.add(lWall)

  const rWall = box(0.12, m.h, md, HP.wall, { line: true })
  rWall.position.set(m.x1 - 0.06, m.h / 2, czm)
  g.add(rWall)

  // 首层顶板
  const slab = box(mw, 0.14, md, HP.wallShade, { line: true })
  slab.position.set(cxm, BAND_START - 0.07, czm)
  g.add(slab)

  // 屋面板
  const roof = box(mw + 0.16, 0.18, md + 0.16, HP.wallShade, { line: true })
  roof.position.set(cxm, m.h + 0.09, czm)
  g.add(roof)

  // 女儿墙
  ;[
    [mw + 0.16, 0.22, 0.1, cxm, m.h + 0.24, m.z1 - 0.02],
    [mw + 0.16, 0.22, 0.1, cxm, m.h + 0.24, m.z0 + 0.02],
    [0.1, 0.22, md + 0.16, m.x0 - 0.02, m.h + 0.24, czm],
    [0.1, 0.22, md + 0.16, m.x1 + 0.02, m.h + 0.24, czm],
  ].forEach(([w, h, d, x, y, z]) => {
    const p = box(w, h, d, HP.wallDark, { line: true })
    p.position.set(x, y, z)
    g.add(p)
  })

  /* ================= 首层玻璃（正面） ================= */
  const clearGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf7ff,
    transparent: true,
    opacity: 0.08,
    roughness: 0.06,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  const groundGlass = new THREE.Mesh(
    new THREE.BoxGeometry(mw - 0.1, HL.ground - 0.14, 0.035),
    clearGlassMat,
  )
  groundGlass.position.set(cxm, HL.ground / 2, m.z1)
  g.add(groundGlass)

  // 玻璃上极淡的天空反光条纹（单独一层，带自己的贴图）
  const reflectTex = clearTexBase.clone()
  reflectTex.needsUpdate = true
  reflectTex.wrapS = THREE.RepeatWrapping
  reflectTex.repeat.set(3, 1)
  const reflect = new THREE.Mesh(
    new THREE.PlaneGeometry(mw - 0.12, HL.ground - 0.16),
    new THREE.MeshBasicMaterial({
      map: reflectTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  )
  reflect.position.set(cxm, HL.ground / 2, m.z1 + 0.028)
  g.add(reflect)

  // 首层竖向铝框（在玻璃外侧）
  for (let i = 0; i <= 8; i++) {
    const x = m.x0 + 0.05 + (i * (mw - 0.1)) / 8
    const mullion = box(0.045, HL.ground - 0.14, 0.06, HP.trim, { line: false })
    mullion.position.set(x, HL.ground / 2, m.z1 + 0.042)
    g.add(mullion)
  }

  // 首层横档
  const transom = box(mw - 0.1, 0.035, 0.06, HP.trim, { line: false })
  transom.position.set(cxm, 1.32, m.z1 + 0.042)
  g.add(transom)

  // 首层踢脚
  const plinth = box(mw, 0.12, 0.1, HP.wallDark, { line: true })
  plinth.position.set(cxm, 0.06, m.z1 + 0.03)
  g.add(plinth)

  // 门口上方的门头横梁（补足玻璃与门洞之间的缝）
  const lintel = box(HL.door.x1 - HL.door.x0 + 0.3, 0.16, 0.12, HP.trim, { line: true })
  lintel.position.set(0, HL.door.y1 + 0.08, m.z1 + 0.02)
  g.add(lintel)

  /* ================= 标准层幕墙 ================= */
  const floors = 4
  const wingTop = HL.wingR.h
  for (let i = 0; i < floors; i++) {
    const yb = BAND_START + i * HL.floorH

    // 正面 / 背面：整幅
    glassBand(g, { width: mw, yb, h: HL.floorH, cx: cxm, cz: m.z1 + 0.01 })
    glassBand(g, { width: mw, yb, h: HL.floorH, cx: cxm, cz: m.z0 - 0.01, rotY: Math.PI })

    // 侧面：只有高出侧翼的楼层才整幅铺开，否则只铺侧翼前后的两小段
    if (yb >= wingTop) {
      glassBand(g, { width: md, yb, h: HL.floorH, cx: m.x1 + 0.01, cz: czm, rotY: Math.PI / 2 })
      glassBand(g, { width: md, yb, h: HL.floorH, cx: m.x0 - 0.01, cz: czm, rotY: -Math.PI / 2 })
    } else {
      // 侧翼遮挡范围 z ∈ [-3.4, -0.3]，只补两头露出来的部分
      ;[
        { w: 0.6, cz: (m.z0 + HL.wingL.z0) / 2 },
        { w: 0.7, cz: (HL.wingL.z1 + m.z1) / 2 },
      ].forEach(({ w, cz }) => {
        glassBand(g, { width: w, yb, h: HL.floorH, cx: m.x1 + 0.01, cz, rotY: Math.PI / 2 })
        glassBand(g, { width: w, yb, h: HL.floorH, cx: m.x0 - 0.01, cz, rotY: -Math.PI / 2 })
      })
    }
  }

  /* ================= 侧翼 ================= */
  ;[HL.wingL, HL.wingR].forEach((w) => {
    const wcx = (w.x0 + w.x1) / 2
    const wcz = (w.z0 + w.z1) / 2
    const ww = w.x1 - w.x0
    const wd = w.z1 - w.z0

    const mass = box(ww, w.h, wd, HP.wall, { line: true })
    mass.position.set(wcx, w.h / 2, wcz)
    g.add(mass)

    const wroof = box(ww + 0.12, 0.14, wd + 0.12, HP.wallShade, { line: true })
    wroof.position.set(wcx, w.h + 0.07, wcz)
    g.add(wroof)

    const wp1 = box(ww + 0.12, 0.18, 0.08, HP.wallDark, { line: true })
    wp1.position.set(wcx, w.h + 0.2, w.z1)
    g.add(wp1)

    // 正面幕墙（2 层）
    for (let i = 0; i < 2; i++) {
      glassBand(g, {
        width: ww,
        yb: BAND_START + i * HL.floorH,
        h: HL.floorH,
        cx: wcx,
        cz: w.z1 + 0.005,
      })
    }

    // 外侧面幕墙
    const outerX = w.x0 < 0 ? w.x0 - 0.005 : w.x1 + 0.005
    const outerRot = w.x0 < 0 ? -Math.PI / 2 : Math.PI / 2
    for (let i = 0; i < 2; i++) {
      glassBand(g, {
        width: wd,
        yb: BAND_START + i * HL.floorH,
        h: HL.floorH,
        cx: outerX,
        cz: wcz,
        rotY: outerRot,
      })
    }

    // 背面小窗（补足体块背面的空白）
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < 2; k++) {
        const win = box(0.5, 0.44, 0.014, 0xa8cde4, {
          line: false,
          emissive: 0x4f8db8,
          emissiveIntensity: 0.3,
        })
        win.position.set(wcx - 0.34 + k * 0.7, 2.35 + i * 0.95, w.z0 - 0.012)
        g.add(win)

        const sill = box(0.56, 0.04, 0.08, HP.trim, { line: false })
        sill.position.set(wcx - 0.34 + k * 0.7, 2.1 + i * 0.95, w.z0 - 0.03)
        g.add(sill)
      }
    }

    // 首层外墙
    const baseWall = box(ww, BAND_START, 0.06, HP.wallShade, { line: false })
    baseWall.position.set(wcx, BAND_START / 2, w.z1 + 0.03)
    g.add(baseWall)

    /* ---------- 首层窗：等距排布，凸出墙面 0.016 ---------- */
    const winW = 0.4
    const winH = 0.52
    const gap = (ww - winW * 3) / 4
    const zw = w.z1 + 0.06 // 首层墙面的外表面

    for (let i = 0; i < 3; i++) {
      const wx = w.x0 + gap + winW / 2 + i * (winW + gap)

      // 玻璃（凸出墙面，带描边）
      const win = box(winW - 0.04, winH - 0.04, 0.02, 0x8fbdd8, {
        line: true,
        emissive: 0x3f7fae,
        emissiveIntensity: 0.3,
      })
      win.position.set(wx, 1.18, zw + 0.008)
      g.add(win)

      // 玻璃上的斜向高光
      const shine = new THREE.Mesh(
        new THREE.PlaneGeometry(winW * 0.28, winH * 0.84),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          toneMapped: false,
        }),
      )
      shine.position.set(wx - winW * 0.13, 1.18, zw + 0.019)
      shine.rotation.z = 0.24
      g.add(shine)

      // 窗框
      const fT = box(winW, 0.022, 0.016, HP.trim, { line: false })
      fT.position.set(wx, 1.18 + winH / 2, zw + 0.016)
      g.add(fT)

      const fB = box(winW, 0.022, 0.016, HP.trim, { line: false })
      fB.position.set(wx, 1.18 - winH / 2, zw + 0.016)
      g.add(fB)

      const fL = box(0.022, winH, 0.016, HP.trim, { line: false })
      fL.position.set(wx - winW / 2, 1.18, zw + 0.016)
      g.add(fL)

      const fR = box(0.022, winH, 0.016, HP.trim, { line: false })
      fR.position.set(wx + winW / 2, 1.18, zw + 0.016)
      g.add(fR)

      // 窗台
      const sill = box(winW + 0.09, 0.045, 0.1, HP.trim, { line: true })
      sill.position.set(wx, 1.18 - winH / 2 - 0.03, zw + 0.02)
      g.add(sill)
    }

    // 侧翼首层的图形标识牌（无文字）
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.21),
      new THREE.MeshBasicMaterial({
        map: deptPictogramTexture('cross', '#2f7fc4'),
        toneMapped: false,
      }),
    )
    plaque.position.set(wcx, 1.78, w.z1 + 0.072)
    g.add(plaque)

    const plaqueBack = box(0.68, 0.26, 0.03, 0xffffff, { line: true })
    plaqueBack.position.set(wcx, 1.78, w.z1 + 0.05)
    g.add(plaqueBack)
  })

  /* ================= 入口门斗 ================= */
  const p = HL.portal
  const pcx = (p.x0 + p.x1) / 2
  const pw = p.x1 - p.x0
  const pz = (p.z0 + p.z1) / 2

  ;[
    [p.x0 + 0.09, 0.18],
    [p.x1 - 0.09, 0.18],
  ].forEach(([x, w]) => {
    const pier = box(w, p.y1, p.z1 - p.z0, HP.stone, { line: true })
    pier.position.set(x, p.y1 / 2, pz)
    g.add(pier)

    // 柱脚与柱头，让壁柱有起收
    const base = box(w + 0.04, 0.12, p.z1 - p.z0 + 0.02, HP.wallDark, { line: true })
    base.position.set(x, 0.06, pz)
    g.add(base)

    const cap = box(w + 0.04, 0.09, p.z1 - p.z0 + 0.02, HP.wallDark, { line: true })
    cap.position.set(x, p.y1 - 0.045, pz)
    g.add(cap)
  })

  const headerH = p.y1 - 1.95
  const header = box(pw, headerH, p.z1 - p.z0, HP.stone, { line: true })
  header.position.set(pcx, 1.95 + headerH / 2, pz)
  g.add(header)

  ;[p.z0, p.z1 - 0.01].forEach((z, i) => {
    const side = box(pw, 0.2, 0.02, HP.wallShade, { line: false })
    side.position.set(pcx, 1.86, z + (i === 0 ? 0.01 : 0))
    g.add(side)
  })

  /* ================= 医院标识：白灯箱 + 凸起红十字 ================= */
  const emblemW = 1.62
  const emblemH = 0.9
  const emblemY = 2.55

  // 背板（发光白灯箱）
  const emblemPanelMat = new THREE.MeshBasicMaterial({ color: 0xfdfefe, toneMapped: false })
  const emblemPanel = box(emblemW, emblemH, 0.07, 0xffffff, { line: false })
  emblemPanel.material = emblemPanelMat as unknown as THREE.MeshToonMaterial
  emblemPanel.position.set(pcx, emblemY, p.z1 + 0.035)
  g.add(emblemPanel)

  // 灯箱外框
  const emblemFrame = box(emblemW + 0.08, emblemH + 0.08, 0.05, HP.wallDark, { line: true })
  emblemFrame.position.set(pcx, emblemY, p.z1 + 0.012)
  g.add(emblemFrame)

  // 红十字（两块凸出的板，带侧向厚度）
  const crossArm = 0.17
  const crossLen = 0.62
  const crossZ = p.z1 + 0.075

  const crossV = box(crossArm, crossLen, 0.03, HP.red, { line: false })
  crossV.position.set(pcx, emblemY, crossZ)
  g.add(crossV)

  const crossH = box(crossLen, crossArm, 0.03, HP.red, { line: false })
  crossH.position.set(pcx, emblemY, crossZ)
  g.add(crossH)

  // 十字的浅色描边，让它在白灯箱上有轮廓
  const crossRimV = box(crossArm + 0.03, crossLen + 0.03, 0.006, 0xe8b7b4, { line: false })
  crossRimV.position.set(pcx, emblemY, p.z1 + 0.071)
  g.add(crossRimV)

  const crossRimH = box(crossLen + 0.03, crossArm + 0.03, 0.006, 0xe8b7b4, { line: false })
  crossRimH.position.set(pcx, emblemY, p.z1 + 0.071)
  g.add(crossRimH)

  // 灯箱上下两条品牌色细带
  ;[1, -1].forEach((d) => {
    const strip = box(emblemW - 0.04, 0.035, 0.02, HP.blue, { line: false })
    strip.position.set(pcx, emblemY + d * (emblemH / 2 - 0.045), p.z1 + 0.072)
    g.add(strip)
  })

  /* ================= 雨棚 ================= */
  const c = HL.canopy
  const ccx = (c.x0 + c.x1) / 2
  const cw = c.x1 - c.x0
  const cd = c.z1 - c.z0

  const canopy = box(cw, 0.09, cd, HP.trim, { line: true })
  canopy.position.set(ccx, c.y + 0.045, (c.z0 + c.z1) / 2)
  g.add(canopy)

  const canopyUnder = box(cw - 0.06, 0.02, cd - 0.06, 0xe6eef5, { line: false })
  canopyUnder.position.set(ccx, c.y - 0.015, (c.z0 + c.z1) / 2)
  g.add(canopyUnder)

  // 棚下灯带
  const canopyLight = box(cw - 0.3, 0.02, 0.07, 0xffffff, { line: false })
  canopyLight.material = glowMat(0xfff6e6, 0.85) as unknown as THREE.MeshToonMaterial
  canopyLight.position.set(ccx, c.y - 0.028, c.z1 - 0.34)
  g.add(canopyLight)

  // 雨棚前沿板 + 图形灯箱
  const fascia = box(cw, 0.28, 0.07, HP.trim, { line: true })
  fascia.position.set(ccx, c.y - 0.14, c.z1 - 0.035)
  g.add(fascia)

  const fasciaMat = new THREE.MeshBasicMaterial({ map: canopyBandTexture(), toneMapped: false })
  const fasciaSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.22), fasciaMat)
  fasciaSign.position.set(ccx, c.y - 0.14, c.z1 + 0.007)
  g.add(fasciaSign)

  // 雨棚支柱
  ;[c.x0 + 0.22, c.x1 - 0.22].forEach((x) => {
    const col = cyl(0.045, 0.05, c.y, 10, HP.trim, { line: true })
    col.position.set(x, c.y / 2, c.z1 - 0.16)
    g.add(col)

    const cap = box(0.13, 0.03, 0.13, HP.wallDark, { line: false })
    cap.position.set(x, 0.015, c.z1 - 0.16)
    g.add(cap)
  })

  /* ================= 自动感应门 ================= */
  const doorW = (HL.door.x1 - HL.door.x0) / 2
  const doorH = HL.door.y1 - HL.door.y0

  function doorPanel(dir: number) {
    const panel = new THREE.Group()

    const pane = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.09, doorH - 0.14, 0.03), clearGlassMat)
    panel.add(pane)

    const ft = box(doorW, 0.055, 0.055, HP.trim, { line: false })
    ft.position.y = doorH / 2 - 0.03
    panel.add(ft)

    const fb = box(doorW, 0.055, 0.055, HP.trim, { line: false })
    fb.position.y = -doorH / 2 + 0.03
    panel.add(fb)

    const fOuter = box(0.05, doorH, 0.055, HP.trim, { line: false })
    fOuter.position.x = dir * (doorW / 2 - 0.025)
    panel.add(fOuter)

    const fInner = box(0.04, doorH, 0.05, HP.trim, { line: false })
    fInner.position.x = -dir * (doorW / 2 - 0.02)
    panel.add(fInner)

    // 防撞提示条
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(doorW - 0.16, 0.05),
      glowMat(0x5fb4e8, 0.85),
    )
    stripe.position.set(0, -0.18, 0.024)
    panel.add(stripe)

    panel.position.set(0, HL.door.y0 + doorH / 2, HL.portal.z1 + 0.015)
    g.add(panel)
    return panel
  }

  const doorLeft = doorPanel(-1)
  const doorRight = doorPanel(1)
  const closedL = HL.door.x0 + doorW / 2
  const closedR = HL.door.x1 - doorW / 2
  doorLeft.position.x = closedL
  doorRight.position.x = closedR

  // 感应器
  const sensor = box(0.3, 0.06, 0.1, HP.metalDark, { line: true })
  sensor.position.set(pcx, 1.9, HL.portal.z1 + 0.06)
  g.add(sensor)

  const sensorLed = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.018), glowMat(0x6fe0b0))
  sensorLed.position.set(pcx + 0.1, 1.9, HL.portal.z1 + 0.112)
  g.add(sensorLed)

  // 门口地垫
  const mat = box(2.2, 0.03, 0.62, 0x5b6875, { line: true })
  mat.position.set(pcx, 0.015, HL.portal.z1 + 0.44)
  g.add(mat)

  /* ================= 外挂消防楼梯 ================= */
  fireEscape(g)

  /* ================= 屋顶设备 ================= */
  roofEquipment(g)

  /* ================= 背面后勤区 ================= */
  backFacade(g, clearGlassMat)

  /* ================= 动画 ================= */
  function update(t: number, door: number) {
    const slide = door * (doorW - 0.06)
    doorLeft.position.x = closedL - slide
    doorRight.position.x = closedR + slide

    // 灯箱亮度：极缓慢的 ±1.2% 呼吸，肉眼几乎不可觉，绝不频闪
    const k = 0.988 + Math.sin(t * 0.42) * 0.012
    emblemPanelMat.color.setScalar(k)
  }

  return { doorLeft, doorRight, signMat: emblemPanelMat, update }
}

/** 供场景根节点复用的外墙色 */
export const HP_COLORS = HP
