/**
 * 医院一层室内：门诊大厅 / 咨询台 / 候诊区 / 护士站 / 药房 / 电梯厅 / 自助设备
 *
 * 全部标识使用图形符号（红十字 / 胶囊 / 箭头 / 平面图），不含文字。
 * 配色刻意提高对比（蓝色座椅、木色台面、绿色植物），
 * 这样隔着玻璃也能一眼读出室内层次。
 */
import * as THREE from 'three'
import { box, cyl, toon, glowMat } from '../toon'
import { HL } from './layout'
import {
  deptPictogramTexture,
  floorPlanTexture,
  queueScreenTexture,
  healthPosterTexture,
  screenUiTexture,
  floorArrowTexture,
  type PicoIcon,
} from './textures'

const IP = {
  floor: 0xdde5ee,
  floorTile: 0xccd8e4,
  wall: 0xf8fafc,
  wallBand: 0x3f8fd0,
  desk: 0xd8e2ea,
  deskTop: 0xb9cbd8,
  wood: 0xb08a5f,
  seat: 0x4a8fc4,
  seatDark: 0x2c668c,
  metal: 0xa8b3c0,
  white: 0xfbfdff,
  plant: 0x5fa861,
  plantDark: 0x477f49,
}

export interface InteriorApi {
  update: (t: number) => void
}

/** 小盆栽 */
function pottedPlant(parent: THREE.Object3D, x: number, y: number, z: number, s = 1) {
  const g = new THREE.Group()
  g.position.set(x, y, z)

  const pot = cyl(0.075 * s, 0.06 * s, 0.11 * s, 10, 0xd9cbb6, { line: true })
  pot.position.y = 0.055 * s
  g.add(pot)

  const soil = cyl(0.068 * s, 0.068 * s, 0.012 * s, 10, 0x6b5a45, { line: false })
  soil.position.y = 0.112 * s
  g.add(soil)

  ;[
    [0, 0.19, 0, 0.085],
    [-0.05, 0.16, 0.03, 0.06],
    [0.05, 0.17, -0.02, 0.062],
    [0.01, 0.26, 0.01, 0.055],
  ].forEach(([px, py, pz, r], i) => {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(r * s, 8, 6),
      toon(i % 2 ? IP.plant : IP.plantDark),
    )
    leaf.position.set(px * s, py * s, pz * s)
    leaf.scale.y = 0.85
    g.add(leaf)
  })

  parent.add(g)
}

export function buildInterior(root: THREE.Group): InteriorApi {
  const g = new THREE.Group()
  root.add(g)

  const x0 = HL.main.x0 + 0.14
  const x1 = HL.main.x1 - 0.14
  const z0 = HL.main.z0 + 0.14
  const z1 = HL.main.z1 - 0.06
  const fy = HL.floorY
  const ceil = HL.ground - 0.06
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2

  /* ================= 地面 ================= */
  const floor = box(x1 - x0, 0.06, z1 - z0, IP.floor, {
    line: false,
    emissive: 0x3a4048,
    emissiveIntensity: 0.12,
  })
  floor.position.set(cx, fy - 0.03, cz)
  g.add(floor)

  // 双色地砖：棋盘格，读得出地面
  const tileMat = new THREE.MeshBasicMaterial({ color: IP.floorTile })
  for (let ix = 0; ix < 6; ix++) {
    for (let iz = 0; iz < 8; iz++) {
      if ((ix + iz) % 2 !== 0) continue
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.7), tileMat)
      t.rotation.x = -Math.PI / 2
      t.position.set(x0 + 0.5 + ix * 0.9, fy + 0.004, z0 + 0.5 + iz * 0.76)
      g.add(t)
    }
  }

  /* ================= 顶棚 + 灯带 ================= */
  const ceiling = box(x1 - x0, 0.05, z1 - z0, IP.white, { line: false })
  ceiling.position.set(cx, ceil, cz)
  g.add(ceiling)

  const panelMat = new THREE.MeshBasicMaterial({ color: 0xf6fcff, toneMapped: false })
  const panelSpots: [number, number][] = [
    [-1.5, -0.6],
    [0, -0.6],
    [1.5, -0.6],
    [-1.5, -1.8],
    [0, -1.8],
    [1.5, -1.8],
    [-1.5, -3.0],
    [0, -3.0],
    [1.5, -3.0],
  ]
  panelSpots.forEach(([px, pz]) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), panelMat)
    panel.rotation.x = Math.PI / 2
    panel.position.set(px, ceil - 0.03, pz)
    g.add(panel)

    const frame = box(0.7, 0.03, 0.42, 0xf0f6fb, { line: false })
    frame.position.set(px, ceil - 0.012, pz)
    g.add(frame)
  })

  // 室内补光：让玻璃内侧明显亮于室外阴影
  ;[
    [-1.4, -0.7],
    [1.4, -0.7],
    [0, -1.8],
    [-1.4, -2.9],
    [1.4, -2.9],
  ].forEach(([lx, lz]) => {
    const light = new THREE.PointLight(0xe8f5ff, 3.6, 4.8, 1.2)
    light.position.set(lx, ceil - 0.16, lz)
    g.add(light)
  })

  /* ================= 内墙衬板 ================= */
  const backInner = box(x1 - x0, HL.ground - 0.1, 0.03, IP.wall, {
    line: false,
    emissive: 0x4e565f,
    emissiveIntensity: 0.22,
  })
  backInner.position.set(cx, HL.ground / 2, z0 + 0.015)
  g.add(backInner)

  const leftInner = box(0.03, HL.ground - 0.1, z1 - z0, IP.wall, {
    line: false,
    emissive: 0x4e565f,
    emissiveIntensity: 0.22,
  })
  leftInner.position.set(x0 + 0.015, HL.ground / 2, cz)
  g.add(leftInner)

  const rightInner = box(0.03, HL.ground - 0.1, z1 - z0, IP.wall, {
    line: false,
    emissive: 0x4e565f,
    emissiveIntensity: 0.22,
  })
  rightInner.position.set(x1 - 0.015, HL.ground / 2, cz)
  g.add(rightInner)

  // 墙面蓝色腰线（打断大白墙）
  ;[
    [x1 - x0, 0.05, 0.036, cx, 1.3, z0 + 0.036, 0],
    [0.036, 0.05, z1 - z0, x0 + 0.036, 1.3, cz, 0],
  ].forEach(([w, h, d, px, py, pz]) => {
    const band = box(w, h, d, IP.wallBand, { line: false })
    band.position.set(px, py, pz)
    g.add(band)
  })

  /* ================= 背墙红十字（室内视觉焦点） ================= */
  const crossPlate = box(0.72, 0.72, 0.02, 0xffffff, { line: true })
  crossPlate.position.set(-2.42, 1.5, z0 + 0.035)
  g.add(crossPlate)

  const wallCrossV = box(0.15, 0.55, 0.02, 0xe0453f, { line: false })
  wallCrossV.position.set(-2.42, 1.5, z0 + 0.05)
  g.add(wallCrossV)

  const wallCrossH = box(0.55, 0.15, 0.02, 0xe0453f, { line: false })
  wallCrossH.position.set(-2.42, 1.5, z0 + 0.05)
  g.add(wallCrossH)

  /* ================= 导诊咨询台 ================= */
  const deskH = 0.98

  const deskMain = box(1.14, deskH, 0.46, IP.desk, { line: true })
  deskMain.position.set(-1.3, fy + deskH / 2, -0.55)
  g.add(deskMain)

  // 台面正面的木色饰面板
  const deskFace = box(1.2, 0.46, 0.04, IP.wood, { line: true })
  deskFace.position.set(-1.3, fy + 0.62, -0.318)
  g.add(deskFace)

  // 台面下方的深色踢脚
  const deskKick = box(1.16, 0.18, 0.03, 0x4a5663, { line: false })
  deskKick.position.set(-1.3, fy + 0.13, -0.316)
  g.add(deskKick)

  // 吊挂式导诊牌：从吊顶吊下来，给大厅一个色彩锚点
  const hangSign = box(1.34, 0.28, 0.05, 0xffffff, { line: true })
  hangSign.position.set(-1.3, fy + 1.5, -0.55)
  g.add(hangSign)

  const hangFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.26, 0.22),
    new THREE.MeshBasicMaterial({ map: deptPictogramTexture('cross', '#3f8fd0'), toneMapped: false }),
  )
  hangFace.position.set(-1.3, fy + 1.5, -0.522)
  g.add(hangFace)

  // 吊杆
  ;[-0.52, 0.52].forEach((ox) => {
    const rod = cyl(0.008, 0.008, 0.2, 5, 0x9aa5b1, { line: false })
    rod.position.set(-1.3 + ox, fy + 1.72, -0.55)
    g.add(rod)
  })

  const deskTop = box(1.22, 0.05, 0.54, IP.deskTop, { line: true })
  deskTop.position.set(-1.3, fy + deskH + 0.025, -0.55)
  g.add(deskTop)

  const deskSide = box(0.44, deskH, 0.62, IP.desk, { line: true })
  deskSide.position.set(-1.86, fy + deskH / 2, -0.98)
  g.add(deskSide)

  const deskTop2 = box(0.5, 0.05, 0.68, IP.deskTop, { line: true })
  deskTop2.position.set(-1.86, fy + deskH + 0.025, -0.98)
  g.add(deskTop2)

  // 台面上的图形牌（红十字）
  const deskLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.21),
    new THREE.MeshBasicMaterial({
      map: deptPictogramTexture('cross', '#4aa3d8'),
      toneMapped: false,
    }),
  )
  deskLabel.position.set(-1.3, fy + 0.78, -0.296)
  g.add(deskLabel)

  const monStand = cyl(0.014, 0.014, 0.14, 6, 0x8d99a6, { line: false })
  monStand.position.set(-1.5, fy + deskH + 0.12, -0.6)
  g.add(monStand)

  const mon = box(0.34, 0.22, 0.02, 0x33445a, { line: true })
  mon.position.set(-1.5, fy + deskH + 0.29, -0.58)
  mon.rotation.x = -0.12
  g.add(mon)

  const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), glowMat(0x9fe0ff))
  monScreen.position.set(-1.5, fy + deskH + 0.29, -0.567)
  monScreen.rotation.x = -0.12
  g.add(monScreen)

  pottedPlant(g, -0.55, fy, -0.42, 1.1)

  /* ================= 候诊座椅 ================= */
  function seat(sx: number, sz: number) {
    const s = new THREE.Group()
    s.position.set(sx, fy, sz)

    const base = box(0.34, 0.05, 0.32, IP.seat, { line: true })
    base.position.y = 0.42
    s.add(base)

    const back = box(0.34, 0.3, 0.05, IP.seat, { line: true })
    back.position.set(0, 0.6, -0.14)
    back.rotation.x = -0.08
    s.add(back)

    const leg = box(0.05, 0.4, 0.05, IP.metal, { line: false })
    leg.position.set(0, 0.2, 0.02)
    s.add(leg)

    const arm = box(0.04, 0.05, 0.28, IP.seatDark, { line: false })
    arm.position.set(0.19, 0.5, 0)
    s.add(arm)

    g.add(s)
  }

  ;[-1.25, -1.65, -2.05].forEach((rz) => {
    for (let i = 0; i < 5; i++) seat(0.35 + i * 0.4, rz)
    const rail = box(1.72, 0.04, 0.05, IP.seatDark, { line: false })
    rail.position.set(1.15, fy + 0.3, rz + 0.02)
    g.add(rail)
  })

  /* ================= 护士站 ================= */
  const nsH = 1.05
  const nsBody = box(1.5, nsH, 0.42, IP.desk, { line: true })
  nsBody.position.set(0.85, fy + nsH / 2, -2.55)
  g.add(nsBody)

  const nsFace = box(1.56, 0.62, 0.04, IP.wood, { line: true })
  nsFace.position.set(0.85, fy + 0.62, -2.325)
  g.add(nsFace)

  const nsTop = box(1.58, 0.05, 0.5, IP.deskTop, { line: true })
  nsTop.position.set(0.85, fy + nsH + 0.025, -2.55)
  g.add(nsTop)

  const nsLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.2),
    new THREE.MeshBasicMaterial({
      map: deptPictogramTexture('heart', '#4cba7f'),
      toneMapped: false,
    }),
  )
  nsLabel.position.set(0.85, fy + 0.9, -2.303)
  g.add(nsLabel)

  pottedPlant(g, 1.42, fy + nsH + 0.05, -2.6, 0.9)

  /* ================= 药房取药窗口 ================= */
  const phH = 1.15
  const pharmacy = box(2.0, phH, 0.3, 0xeef2f7, { line: true })
  pharmacy.position.set(1.05, fy + phH / 2, -3.6)
  g.add(pharmacy)

  const phTop = box(2.06, 0.05, 0.36, 0xcdd9e4, { line: true })
  phTop.position.set(1.05, fy + phH + 0.025, -3.6)
  g.add(phTop)

  for (let i = 0; i < 2; i++) {
    const winFrame = box(0.54, 0.34, 0.03, 0x9fb0c0, { line: true })
    winFrame.position.set(0.63 + i * 0.85, fy + phH + 0.06, -3.44)
    g.add(winFrame)

    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.28), glowMat(0xeaf7ff))
    win.position.set(0.63 + i * 0.85, fy + phH + 0.06, -3.421)
    g.add(win)
  }

  const phSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.32),
    new THREE.MeshBasicMaterial({
      map: deptPictogramTexture('capsule', '#2f7fc4'),
      toneMapped: false,
    }),
  )
  phSign.position.set(1.05, fy + 1.66, -3.436)
  g.add(phSign)

  /* ================= 电子叫号屏 ================= */
  const queueFrame = box(0.84, 0.58, 0.04, 0x24384a, { line: true })
  queueFrame.position.set(-0.55, fy + 1.42, -3.47)
  g.add(queueFrame)

  const queue = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.5),
    new THREE.MeshBasicMaterial({ map: queueScreenTexture(), toneMapped: false }),
  )
  queue.position.set(-0.55, fy + 1.42, -3.443)
  g.add(queue)

  /* ================= 电梯厅 ================= */
  for (let i = 0; i < 2; i++) {
    const ex = x0 + 0.02
    const ez = -2.9 + i * 0.78

    const frame = box(0.05, 1.5, 0.66, 0x9fb0c0, { line: true })
    frame.position.set(ex + 0.03, fy + 0.75, ez)
    g.add(frame)

    const doorL = box(0.03, 1.42, 0.3, 0xb9c9d6, { line: true })
    doorL.position.set(ex + 0.07, fy + 0.73, ez - 0.16)
    g.add(doorL)

    const doorR = box(0.03, 1.42, 0.3, 0xb9c9d6, { line: true })
    doorR.position.set(ex + 0.07, fy + 0.73, ez + 0.16)
    g.add(doorR)

    const indicator = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), glowMat(0xffb454))
    indicator.rotation.y = Math.PI / 2
    indicator.position.set(ex + 0.085, fy + 1.62, ez)
    g.add(indicator)
  }

  /* ================= 楼层平面图 ================= */
  const dirFrame = box(0.03, 0.82, 0.64, 0x9fb0c0, { line: true })
  dirFrame.position.set(x0 + 0.035, fy + 0.95, -1.55)
  g.add(dirFrame)

  const dirBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.76),
    new THREE.MeshBasicMaterial({ map: floorPlanTexture(), toneMapped: false }),
  )
  dirBoard.rotation.y = Math.PI / 2
  dirBoard.position.set(x0 + 0.053, fy + 0.95, -1.55)
  g.add(dirBoard)

  /* ================= 健康海报（右墙） ================= */
  for (let i = 0; i < 2; i++) {
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.54),
      new THREE.MeshBasicMaterial({ map: healthPosterTexture(i + 1), toneMapped: false }),
    )
    poster.rotation.y = -Math.PI / 2
    poster.position.set(x1 - 0.053, fy + 1.2, -1.5 + i * 0.62)
    g.add(poster)
  }

  /* ================= 自助挂号机 ================= */
  const kiosk = box(0.42, 1.05, 0.34, 0xeef4f9, { line: true })
  kiosk.position.set(1.95, fy + 0.52, -0.35)
  g.add(kiosk)

  const kioskScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.4),
    new THREE.MeshBasicMaterial({ map: screenUiTexture(0), toneMapped: false }),
  )
  kioskScreen.position.set(1.95, fy + 0.72, -0.172)
  kioskScreen.rotation.x = -0.16
  g.add(kioskScreen)

  /* ================= 自动售货机 ================= */
  const vending = box(0.5, 1.5, 0.4, 0xe7eef5, { line: true })
  vending.position.set(2.0, fy + 0.75, -3.5)
  g.add(vending)

  const vendingFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.84),
    new THREE.MeshBasicMaterial({ map: screenUiTexture(2), toneMapped: false }),
  )
  vendingFace.position.set(2.0, fy + 0.98, -3.293)
  g.add(vendingFace)

  /* ================= 饮水机 ================= */
  const water = box(0.3, 1.1, 0.3, 0xf2f6fa, { line: true })
  water.position.set(-0.05, fy + 0.55, -2.6)
  g.add(water)

  const waterTop = cyl(0.1, 0.1, 0.24, 10, 0xbfe4f7, { line: true })
  waterTop.position.set(-0.05, fy + 1.22, -2.6)
  g.add(waterTop)

  /* ================= 医用推车 ================= */
  const cartH = 0.72
  const cart = new THREE.Group()
  const cartBody = box(0.5, 0.22, 0.34, 0xc9d6e2, { line: true })
  cartBody.position.y = cartH
  cart.add(cartBody)

  ;[0.18, 0.54].forEach((y) => {
    const tray = box(0.46, 0.03, 0.3, 0xb4c3d2, { line: false })
    tray.position.y = y + 0.06
    cart.add(tray)
  })

  ;[
    [-0.2, -0.13],
    [0.2, -0.13],
    [-0.2, 0.13],
    [0.2, 0.13],
  ].forEach(([ox, oz]) => {
    const leg = box(0.03, cartH, 0.03, 0xa8b4c0, { line: false })
    leg.position.set(ox, cartH / 2, oz)
    cart.add(leg)
  })

  cart.position.set(0.42, fy, -2.95)
  g.add(cart)

  /* ================= 轮椅 ================= */
  const wc = new THREE.Group()
  const wcSeat = box(0.3, 0.04, 0.28, 0x4f7f9e, { line: true })
  wcSeat.position.y = 0.26
  wc.add(wcSeat)

  const wcBack = box(0.3, 0.3, 0.04, 0x4f7f9e, { line: true })
  wcBack.position.set(0, 0.42, -0.14)
  wc.add(wcBack)

  ;[-0.17, 0.17].forEach((ox) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 6, 16), toon(0x37414f))
    wheel.position.set(ox, 0.16, 0)
    wc.add(wheel)
  })

  ;[-0.1, 0.1].forEach((ox) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12), toon(0x4a5464))
    wheel.position.set(ox, 0.07, 0.2)
    wc.add(wheel)
  })

  wc.position.set(1.6, fy, -2.95)
  wc.rotation.y = -0.5
  g.add(wc)

  /* ================= 医疗废弃物桶 ================= */
  const binColors = [0xf0c24a, 0xe07a5f]
  ;[
    [0.0, -3.05],
    [0.22, -3.05],
  ].forEach(([bx, bz], i) => {
    const bin = cyl(0.09, 0.08, 0.3, 10, binColors[i], { line: true })
    bin.position.set(bx, fy + 0.15, bz)
    g.add(bin)
  })

  /* ================= 拖把池（后场） ================= */
  const mop = box(0.34, 0.5, 0.34, 0xd6dee6, { line: true })
  mop.position.set(-2.0, fy + 0.25, -3.55)
  g.add(mop)

  const mopTap = cyl(0.015, 0.015, 0.3, 6, 0xa8b4c0, { line: false })
  mopTap.position.set(-2.0, fy + 0.72, -3.6)
  g.add(mopTap)

  /* ================= 后场通道门 ================= */
  const backDoor = box(0.6, 1.6, 0.05, 0xdfe6ee, { line: true })
  backDoor.position.set(-1.1, fy + 0.8, z0 + 0.04)
  g.add(backDoor)

  // 门上图形牌（只画一个箭头，表示通道方向）
  const backDoorSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.1),
    new THREE.MeshBasicMaterial({
      map: deptPictogramTexture('arrowR', '#e07a5f'),
      toneMapped: false,
    }),
  )
  backDoorSign.position.set(-1.1, fy + 1.72, z0 + 0.07)
  g.add(backDoorSign)

  /* ================= 地面导向箭头 ================= */
  const arrowMat = new THREE.MeshBasicMaterial({
    map: floorArrowTexture('#5fb4e8'),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  ;[
    [-0.2, -0.9],
    [0.6, -0.9],
  ].forEach(([ax, az]) => {
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), arrowMat)
    arrow.rotation.x = -Math.PI / 2
    arrow.position.set(ax, fy + 0.034, az)
    g.add(arrow)
  })

  /* ================= 走廊科室牌 ================= */
  const deptTags: [PicoIcon, string][] = [
    ['bed', '#4aa3d8'],
    ['capsule', '#4cba7f'],
  ]
  deptTags.forEach(([icon, color], i) => {
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.17),
      new THREE.MeshBasicMaterial({ map: deptPictogramTexture(icon, color), toneMapped: false }),
    )
    tag.position.set(-1.85 + i * 0.64, fy + 1.72, z0 + 0.06)
    g.add(tag)
  })

  return {
    update: () => {
      /* 室内陈设静态，保留接口 */
    },
  }
}
