import * as THREE from 'three'
import type { ChongqingTextures } from './textures'
import {
  HALF_W,
  createHaloMaterial,
  createWeatherBag,
  type DioramaWeather,
  type WeatherResponsive,
} from './types'

export interface SkyTierHandle {
  group: THREE.Group
  weatherBag: WeatherResponsive
  update: (time: number, dt: number, convergence: boolean, weather: DioramaWeather) => void
  getSkyStatus: () => string
}

/**
 * TIER +1 (+14m to +18m · 李子坝单轨穿楼 & 长江索道):
 * - 7-story Chongqing residential apartment tower with weathered cream/terracotta mosaic-tile facade,
 *   3D protruding wrought-iron security window cages (凸出式防盗网) with potted plants & tiny drying laundry,
 *   warm/cool window interiors & curtain silhouettes, wall-mounted AC units, rooftop water tanks, solar heater,
 *   stair penthouse, glowing red rooftop neon (重庆 · 山城) & side vertical neon (雾都山城).
 * - Clean hollow structural tunnel punched through mid-floors (floors 3-5) framed by concrete collar &
 *   illuminated 李子坝站 · LIZIBA gantry sign, carrying an elevated concrete straddle-beam viaduct with catwalk railings.
 * - 4-car articulated Chongqing CRT Line 2 straddle monorail train gliding through the tunnel with ZERO wall clipping.
 * - Yangtze River Cableway (长江索道) red-and-cream gondola gliding cleanly above the rooftop silhouette along taut
 *   steel catenary cables strung between X-braced steel lattice pylons with red aviation beacons.
 */
export function buildSkyTier(
  textures: ChongqingTextures,
  dioramaClipPlanes: THREE.Plane[],
): SkyTierHandle {
  const group = new THREE.Group()
  group.name = 'tier_sky'
  const weatherBag = createWeatherBag()

  // ==================== MATERIALS ====================
  const mosaicMat = new THREE.MeshStandardMaterial({
    map: textures.mosaicFacade,
    roughness: 0.78,
    metalness: 0.05,
  })
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x6f7378,
    roughness: 0.85,
    metalness: 0.08,
  })
  const darkConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x4c5056,
    roughness: 0.88,
    metalness: 0.1,
  })
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x262b30,
    roughness: 0.45,
    metalness: 0.72,
  })
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x7c858e,
    roughness: 0.36,
    metalness: 0.78,
  })
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xdce4ee,
    roughness: 0.92,
    metalness: 0.0,
  })

  // ==================== 1. LIZIBA 7-STORY RESIDENTIAL APARTMENT TOWER (李子坝单轨穿楼) ====================
  // Tower footprint: x in [+1.5, +8.5] (w=7.0), z in [-5.8, +0.4] (d=6.2), base y = 4.2, roof y = 13.55
  // Hollow monorail tunnel through floors 3-5: z in [-3.75, -1.15] (width 2.6), y in [7.0, 9.95] (height 2.95)
  const tower = new THREE.Group()
  group.add(tower)

  const tx = 5.0
  const tz = -2.7
  const tw = 7.0
  const td = 6.2

  // Transfer podium base (y = 4.0 to 4.3)
  const podium = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.35, 0.32, td + 0.35), darkConcreteMat)
  podium.position.set(tx, 4.16, tz)
  podium.castShadow = true
  podium.receiveShadow = true
  tower.add(podium)

  // Floors 1-2 solid lower block (y = 4.3 to 7.0, h = 2.7)
  const lowerBlock = new THREE.Mesh(new THREE.BoxGeometry(tw, 2.7, td), mosaicMat)
  lowerBlock.position.set(tx, 5.65, tz)
  lowerBlock.castShadow = true
  lowerBlock.receiveShadow = true
  tower.add(lowerBlock)

  // Floors 3-5 SPLIT into Front Wing & Back Wing so the monorail tunnel corridor is 100% HOLLOW!
  // Front wing: z in [-1.15, +0.4] (depth = 1.55, center z = -0.375)
  const midFrontWing = new THREE.Mesh(new THREE.BoxGeometry(tw, 2.95, 1.55), mosaicMat)
  midFrontWing.position.set(tx, 8.475, -0.375)
  midFrontWing.castShadow = true
  midFrontWing.receiveShadow = true
  tower.add(midFrontWing)

  // Back wing: z in [-5.8, -3.75] (depth = 2.05, center z = -4.775)
  const midBackWing = new THREE.Mesh(new THREE.BoxGeometry(tw, 2.95, 2.05), mosaicMat)
  midBackWing.position.set(tx, 8.475, -4.775)
  midBackWing.castShadow = true
  midBackWing.receiveShadow = true
  tower.add(midBackWing)

  // Interior dark concrete lining of the hollow tunnel ceiling & floor (no blocking faces at x = 1.5 or 8.5!)
  const tunnelCeilLiner = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.04, 0.14, 2.6), darkConcreteMat)
  tunnelCeilLiner.position.set(tx, 9.9, -2.45)
  tower.add(tunnelCeilLiner)
  const tunnelFloorLiner = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.04, 0.14, 2.6), darkConcreteMat)
  tunnelFloorLiner.position.set(tx, 7.05, -2.45)
  tower.add(tunnelFloorLiner)

  // Warm recessed LED strip inside the hollow Liziba station tunnel ceiling
  const tunnelGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe8c2,
    emissive: 0xffc66e,
    emissiveIntensity: 0.78,
  })
  weatherBag.emissiveMaterials.push({
    material: tunnelGlowMat,
    rainIntensity: 0.78,
    sunIntensity: 0.45,
    snowIntensity: 0.74,
  })
  const tunnelStrip = new THREE.Mesh(new THREE.BoxGeometry(tw - 0.3, 0.06, 0.45), tunnelGlowMat)
  tunnelStrip.position.set(tx, 9.8, -2.45)
  tower.add(tunnelStrip)

  // Floors 6-7 upper full-depth residential block (y = 9.95 to 13.45, h = 3.5)
  const upperBlock = new THREE.Mesh(new THREE.BoxGeometry(tw, 3.5, td), mosaicMat)
  upperBlock.position.set(tx, 11.7, tz)
  upperBlock.castShadow = true
  upperBlock.receiveShadow = true
  tower.add(upperBlock)

  // Horizontal architectural concrete floor ledges & parapet
  for (const fy of [7.0, 9.95, 13.45]) {
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.24, 0.16, td + 0.24), concreteMat)
    ledge.position.set(tx, fy, tz)
    tower.add(ledge)
  }

  // Rooftop parapet wall (y = 13.53 to 13.98)
  const parapetH = 0.45
  const parapetBack = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.16, parapetH, 0.2), concreteMat)
  parapetBack.position.set(tx, 13.75, -5.78)
  tower.add(parapetBack)
  const parapetFront = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.16, parapetH, 0.2), concreteMat)
  parapetFront.position.set(tx, 13.75, 0.38)
  tower.add(parapetFront)
  for (const px of [1.52, 8.48]) {
    const pSide = new THREE.Mesh(new THREE.BoxGeometry(0.2, parapetH, td), concreteMat)
    pSide.position.set(px, 13.75, tz)
    tower.add(pSide)
  }

  // Architectural concrete tunnel portal collars + illuminated 李子坝站 · LIZIBA gantry sign on BOTH west & east faces
  const lizibaSignTex = textures.makeSign({
    w: 512,
    h: 112,
    bg: '#133a2c',
    border: '#56d492',
    text: '李子坝站 · LIZIBA',
    subtext: 'CHONGQING RAIL TRANSIT LINE 2',
    color: '#f2fff8',
    subColor: '#a6e5c5',
    glow: '#32c778',
  })
  const lizibaSignMat = new THREE.MeshStandardMaterial({
    map: lizibaSignTex,
    emissive: 0xffffff,
    emissiveMap: lizibaSignTex,
    emissiveIntensity: 0.72,
    roughness: 0.32,
  })
  weatherBag.emissiveMaterials.push({
    material: lizibaSignMat,
    rainIntensity: 0.72,
    sunIntensity: 0.45,
    snowIntensity: 0.68,
  })

  for (const portalX of [1.46, 8.54]) {
    const dir = portalX < 5 ? -1 : 1
    // Architectural concrete collar framing the tunnel opening (top, bottom, left, right)
    const collarTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 3.15), concreteMat)
    collarTop.position.set(portalX, 10.02, -2.45)
    tower.add(collarTop)
    const collarBot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 3.15), concreteMat)
    collarBot.position.set(portalX, 6.96, -2.45)
    tower.add(collarBot)
    for (const cz of [-3.88, -1.02]) {
      const collarSide = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.1, 0.28), concreteMat)
      collarSide.position.set(portalX, 8.48, cz)
      tower.add(collarSide)
    }
    // Illuminated 李子坝站 · LIZIBA gantry sign right above the portal collar
    const gantryBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 2.85), ironMat)
    gantryBox.position.set(portalX + dir * 0.14, 10.48, -2.45)
    tower.add(gantryBox)
    const gantryFace = new THREE.Mesh(new THREE.PlaneGeometry(2.74, 0.54), lizibaSignMat)
    gantryFace.position.set(portalX + dir * 0.23, 10.48, -2.45)
    gantryFace.rotation.y = dir < 0 ? -Math.PI / 2 : Math.PI / 2
    tower.add(gantryFace)
  }

  // ==================== 2. APARTMENT WINDOWS, 3D PROTRUDING SECURITY CAGES, PLANTS, LAUNDRY & AC UNITS ====================
  const winWarmMat = new THREE.MeshStandardMaterial({
    color: 0xffd796,
    emissive: 0xffa947,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  })
  const winCoolMat = new THREE.MeshStandardMaterial({
    color: 0xaad2eb,
    emissive: 0x6baad6,
    emissiveIntensity: 0.58,
    roughness: 0.25,
  })
  const winDarkMat = new THREE.MeshStandardMaterial({
    color: 0x202833,
    emissive: 0x16222e,
    emissiveIntensity: 0.2,
    roughness: 0.2,
  })
  weatherBag.emissiveMaterials.push(
    { material: winWarmMat, rainIntensity: 0.85, sunIntensity: 0.22, snowIntensity: 0.82 },
    { material: winCoolMat, rainIntensity: 0.58, sunIntensity: 0.16, snowIntensity: 0.55 },
  )

  const acWhiteMat = new THREE.MeshStandardMaterial({ color: 0xcfd2d4, roughness: 0.65 })
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xa45234, roughness: 0.82 })
  const plantLeafMat = new THREE.MeshStandardMaterial({ color: 0x3b6e3c, roughness: 0.78 })
  const laundryColors = [0xd65656, 0x5288ba, 0xe8d594, 0xe6e6e6]

  // Build windows across front facade (z = +0.4) and west facade (x = +1.5)
  const floorYs = [5.1, 6.25, 7.8, 9.1, 10.75, 11.95, 13.0]
  const frontCols = [2.45, 3.85, 5.25, 6.65, 7.8]

  floorYs.forEach((fy, fIdx) => {
    frontCols.forEach((wx, cIdx) => {
      const seed = fIdx * 11 + cIdx * 7
      const wMat = seed % 5 === 0 ? winDarkMat : seed % 3 === 0 ? winCoolMat : winWarmMat

      // Recessed window frame + interior glowing pane
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.82, 0.1), darkConcreteMat)
      frame.position.set(wx, fy, 0.4)
      tower.add(frame)

      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.7), wMat)
      glass.position.set(wx, fy, 0.46)
      tower.add(glass)

      // Curtain silhouette hint on half of the lit windows
      if (seed % 2 === 0 && wMat !== winDarkMat) {
        const curtain = new THREE.Mesh(
          new THREE.PlaneGeometry(0.32, 0.68),
          new THREE.MeshStandardMaterial({ color: 0x42342c, roughness: 0.9, transparent: true, opacity: 0.52 }),
        )
        curtain.position.set(wx + (seed % 4 === 0 ? 0.24 : -0.24), fy, 0.47)
        tower.add(curtain)
      }

      // 3D Protruding Wrought-Iron Security Window Cage (凸出式防盗网) on most apartments
      if (seed % 4 !== 1) {
        const cage = new THREE.Group()
        cage.position.set(wx, fy - 0.04, 0.62)
        tower.add(cage)

        // Top rain canopy & bottom tray of protruding security cage
        const cageTop = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.035, 0.36), ironMat)
        cageTop.position.y = 0.42
        cage.add(cageTop)
        const cageBot = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.035, 0.34), ironMat)
        cageBot.position.y = -0.38
        cage.add(cageBot)

        // Vertical iron bars across front & sides
        for (let bx = -0.46; bx <= 0.47; bx += 0.185) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.8, 5), ironMat)
          bar.position.set(bx, 0.02, 0.16)
          cage.add(bar)
        }
        // Horizontal tie bar
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.022, 0.022), ironMat)
        hBar.position.set(0, 0.02, 0.16)
        cage.add(hBar)

        // Small terracotta potted plant tucked inside cage
        if (seed % 3 === 0) {
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.1, 7), terracottaMat)
          pot.position.set(-0.26, -0.31, 0.02)
          cage.add(pot)
          const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.085, 0), plantLeafMat)
          bush.position.set(-0.26, -0.22, 0.02)
          cage.add(bush)
        }
        // Tiny colorful drying laundry hints hanging on cage rail
        if (seed % 5 === 2) {
          const clothMat = new THREE.MeshStandardMaterial({
            color: laundryColors[seed % laundryColors.length]!,
            roughness: 0.85,
          })
          const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.03), clothMat)
          shirt.position.set(0.22, -0.1, 0.17)
          cage.add(shirt)
        }
      }

      // Wall-mounted AC outdoor unit beside selected windows
      if (seed % 3 === 1 && cIdx < frontCols.length - 1) {
        const ac = new THREE.Group()
        ac.position.set(wx + 0.68, fy - 0.18, 0.56)
        const acBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.24), acWhiteMat)
        ac.add(acBox)
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 12), ironMat)
        fan.rotation.x = Math.PI / 2
        fan.position.set(-0.05, 0, 0.115)
        ac.add(fan)
        tower.add(ac)
      }
    })

    // West facade windows (skip tunnel opening on floors 3-5 at z in [-3.8, -1.1])
    for (const wz of [-5.0, -2.45, -0.35]) {
      const inTunnel = fy > 6.8 && fy < 10.1 && wz > -3.9 && wz < -1.0
      if (inTunnel) continue
      const wMat = (fIdx + Math.round(Math.abs(wz))) % 2 === 0 ? winWarmMat : winCoolMat
      const wPane = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.68), wMat)
      wPane.rotation.y = -Math.PI / 2
      wPane.position.set(1.48, fy, wz)
      tower.add(wPane)
    }
  })

  // ==================== 3. ROOFTOP DETAILS & NEON SIGNS (重庆 · 山城 / 雾都山城) ====================
  // Concrete stair penthouse
  const penthouse = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.18, 1.85), concreteMat)
  penthouse.position.set(7.0, 14.08, -4.3)
  penthouse.castShadow = true
  tower.add(penthouse)

  // Stainless steel rooftop water tanks on steel legs
  const tankSteelMat = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.26, metalness: 0.86 })
  for (const txTank of [2.6, 3.65]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.92, 16), tankSteelMat)
    tank.position.set(txTank, 14.22, -4.55)
    tower.add(tank)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), tankSteelMat)
    dome.position.set(txTank, 14.68, -4.55)
    tower.add(dome)
    for (const ang of [0, 2.1, 4.2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), ironMat)
      leg.position.set(txTank + Math.cos(ang) * 0.26, 13.68, -4.55 + Math.sin(ang) * 0.26)
      tower.add(leg)
    }
  }

  // Solar water heater with angled vacuum tubes
  const solarGroup = new THREE.Group()
  solarGroup.position.set(5.1, 13.56, -4.5)
  tower.add(solarGroup)
  const solarTank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.15, 12), tankSteelMat)
  solarTank.rotation.z = Math.PI / 2
  solarTank.position.set(0, 0.65, -0.25)
  solarGroup.add(solarTank)
  const solarPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.05, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x1a2c44, roughness: 0.2, metalness: 0.72 }),
  )
  solarPanel.position.set(0, 0.34, 0.15)
  solarPanel.rotation.x = 0.55
  solarGroup.add(solarPanel)

  // Glowing red rooftop neon sign: 重庆 · 山城 (kept compact so Cableway clears cleanly above!)
  const roofNeonTex = textures.makeSign({
    w: 512,
    h: 128,
    bg: '#2b0908',
    border: '#ff5c40',
    text: '重庆 · 山城',
    color: '#ffe5cc',
    glow: '#ff3624',
    serif: true,
  })
  const roofNeonMat = new THREE.MeshStandardMaterial({
    map: roofNeonTex,
    emissive: 0xff452e,
    emissiveMap: roofNeonTex,
    emissiveIntensity: 1.15,
    roughness: 0.3,
  })
  weatherBag.emissiveMaterials.push({
    material: roofNeonMat,
    rainIntensity: 1.15,
    sunIntensity: 0.42,
    snowIntensity: 1.02,
  })
  const roofNeonFrame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.84, 0.14), ironMat)
  roofNeonFrame.position.set(4.5, 14.32, 0.15)
  tower.add(roofNeonFrame)
  const roofNeonFace = new THREE.Mesh(new THREE.PlaneGeometry(3.26, 0.74), roofNeonMat)
  roofNeonFace.position.set(4.5, 14.32, 0.23)
  tower.add(roofNeonFace)
  for (const sx of [3.2, 5.8]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.08), ironMat)
    strut.position.set(sx, 13.78, 0.15)
    tower.add(strut)
  }

  // Side vertical neon sign: 雾都山城
  const sideNeonTex = textures.makeSign({
    w: 128,
    h: 448,
    bg: '#1c0c14',
    border: '#ff7048',
    text: '雾都山城',
    color: '#ffebd0',
    glow: '#ff4824',
    vertical: true,
    serif: true,
  })
  const sideNeonMat = new THREE.MeshStandardMaterial({
    map: sideNeonTex,
    emissive: 0xff5a36,
    emissiveMap: sideNeonTex,
    emissiveIntensity: 1.1,
    roughness: 0.3,
  })
  weatherBag.emissiveMaterials.push({
    material: sideNeonMat,
    rainIntensity: 1.1,
    sunIntensity: 0.38,
    snowIntensity: 0.96,
  })
  const sideNeonBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.75, 0.76), ironMat)
  sideNeonBox.position.set(1.36, 11.75, 0.06)
  tower.add(sideNeonBox)
  const sideNeonFace = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 2.62), sideNeonMat)
  sideNeonFace.rotation.y = -Math.PI / 2
  sideNeonFace.position.set(1.28, 11.75, 0.06)
  tower.add(sideNeonFace)

  // Matte Snow blanket on Liziba rooftop & parapet (visible ONLY in snow mode, zero whiteout!)
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(tw - 0.15, 0.14, td - 0.15), snowCapMat)
  roofSnow.position.set(tx, 13.58, tz)
  roofSnow.visible = false
  tower.add(roofSnow)
  weatherBag.snowMeshes.push(roofSnow)

  // ==================== 4. ELEVATED CONCRETE STRADDLE-BEAM VIADUCT (高架跨座单轨梁) ====================
  const viaduct = new THREE.Group()
  group.add(viaduct)

  // Concrete PC straddle guideway beam passing straight through the Liziba hollow tunnel at z = -2.45, y = 7.45
  const guideBeam = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.68, 0.64), concreteMat)
  guideBeam.position.set(0, 7.45, -2.45)
  guideBeam.castShadow = true
  guideBeam.receiveShadow = true
  viaduct.add(guideBeam)

  // Side steel maintenance catwalk + safety railings on left span (x = -9.9 to +1.35) & right stub (x = +8.65 to +9.9)
  const addCatwalk = (xStart: number, xEnd: number) => {
    const len = xEnd - xStart
    const cx = (xStart + xEnd) * 0.5
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.42), ironMat)
    deck.position.set(cx, 7.26, -1.9)
    viaduct.add(deck)
    // Handrail bars
    for (const ry of [7.62, 7.92]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.035, 0.035), steelMat)
      rail.position.set(cx, ry, -1.7)
      viaduct.add(rail)
    }
    for (let px = xStart + 0.3; px <= xEnd - 0.2; px += 0.9) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 0.04), steelMat)
      post.position.set(px, 7.6, -1.7)
      viaduct.add(post)
    }
  }
  addCatwalk(-9.9, 1.38)
  addCatwalk(8.62, 9.9)

  // Chamfered concrete T-piers with riveted steel pier bearings supporting the viaduct
  for (const px of [-7.8, -2.1]) {
    const pierShaft = new THREE.Mesh(new THREE.BoxGeometry(0.76, 3.05, 0.78), concreteMat)
    pierShaft.position.set(px, 5.52, -2.45)
    pierShaft.castShadow = true
    viaduct.add(pierShaft)

    const pierCap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.34, 1.2), darkConcreteMat)
    pierCap.position.set(px, 6.95, -2.45)
    viaduct.add(pierCap)

    // Riveted steel bearing pads
    const bearing = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.78), ironMat)
    bearing.position.set(px, 7.12, -2.45)
    viaduct.add(bearing)
  }

  // ==================== 5. CHONGQING CRT LINE 2 STRADDLE MONORAIL (4-CAR ARTICULATED TRAIN) ====================
  const monorailGroup = new THREE.Group()
  monorailGroup.position.set(0, 7.75, -2.45)
  group.add(monorailGroup)

  const monoClip = [...dioramaClipPlanes]
  const monoWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xe6ebee,
    roughness: 0.28,
    metalness: 0.22,
    clippingPlanes: monoClip,
  })
  const monoEmeraldMat = new THREE.MeshStandardMaterial({
    color: 0x168a58,
    roughness: 0.32,
    metalness: 0.28,
    clippingPlanes: monoClip,
  })
  const monoSilverMat = new THREE.MeshStandardMaterial({
    color: 0xbac4ce,
    roughness: 0.26,
    metalness: 0.68,
    clippingPlanes: monoClip,
  })
  const monoDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1d2228,
    roughness: 0.5,
    metalness: 0.35,
    clippingPlanes: monoClip,
  })
  const monoGlassMat = new THREE.MeshStandardMaterial({
    color: 0x14222c,
    roughness: 0.14,
    metalness: 0.68,
    transparent: true,
    opacity: 0.48,
    clippingPlanes: monoClip,
  })
  const monoInteriorMat = new THREE.MeshStandardMaterial({
    color: 0xfff0d2,
    emissive: 0xffd288,
    emissiveIntensity: 0.92,
    roughness: 0.4,
    clippingPlanes: monoClip,
  })
  const monoHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfff9e6,
    emissive: 0xffe099,
    emissiveIntensity: 1.65,
    clippingPlanes: monoClip,
  })
  const monoTailMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2820,
    emissiveIntensity: 1.4,
    clippingPlanes: monoClip,
  })
  const monoDestTex = textures.makeSign({
    w: 384,
    h: 64,
    bg: '#120f0b',
    text: '2号线 · 较场口',
    color: '#ffc142',
    glow: '#ff9a00',
  })
  const monoDestMat = new THREE.MeshStandardMaterial({
    map: monoDestTex,
    emissive: 0xffffff,
    emissiveMap: monoDestTex,
    emissiveIntensity: 0.95,
    clippingPlanes: monoClip,
  })

  // 4-car articulated train (car width = 1.18, height = 1.55 — clears the 2.6×2.95 tunnel with huge margin!)
  const mCarLen = 2.65
  const mGap = 0.2
  for (let i = 0; i < 4; i++) {
    const cx = (i - 1.5) * (mCarLen + mGap)
    const car = new THREE.Group()
    car.position.x = cx
    monorailGroup.add(car)

    // Rubber-tire bogie skirts hugging BOTH sides of the concrete straddle beam
    for (const sz of [-0.46, 0.46]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(mCarLen - 0.1, 0.56, 0.22), monoDarkMat)
      skirt.position.set(0, -0.14, sz)
      car.add(skirt)
    }

    // Lower white/silver body + signature emerald-green CRT Line 2 stripe
    const bodyLow = new THREE.Mesh(new THREE.BoxGeometry(mCarLen, 0.44, 1.14), monoWhiteMat)
    bodyLow.position.y = 0.34
    car.add(bodyLow)
    const greenBand = new THREE.Mesh(new THREE.BoxGeometry(mCarLen + 0.01, 0.2, 1.16), monoEmeraldMat)
    greenBand.position.y = 0.4
    car.add(greenBand)

    // Curved silver roof & HVAC pods
    const roof = new THREE.Mesh(new THREE.BoxGeometry(mCarLen, 0.22, 1.06), monoSilverMat)
    roof.position.y = 1.24
    car.add(roof)
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.11, 0.68), monoDarkMat)
    hvac.position.y = 1.38
    car.add(hvac)

    // Recessed lit passenger cabin interior with seats & 扶手吊环 handstraps
    const cabCore = new THREE.Mesh(new THREE.BoxGeometry(mCarLen - 0.14, 0.58, 0.86), monoInteriorMat)
    cabCore.position.y = 0.86
    car.add(cabCore)
    for (let sx = -0.8; sx <= 0.8; sx += 0.4) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.009, 6, 10), monoWhiteMat)
      strap.position.set(sx, 1.04, 0.28)
      car.add(strap)
    }

    // Flush window glazing + crisp window mullions on both sides
    for (const sz of [-0.57, 0.57]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(mCarLen - 0.16, 0.54, 0.03), monoGlassMat)
      win.position.set(0, 0.86, sz)
      car.add(win)
      for (const px of [-1.22, -0.62, 0, 0.62, 1.22]) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.58, 0.05), monoWhiteMat)
        mullion.position.set(px, 0.86, sz)
        car.add(mullion)
      }
    }

    // Aerodynamic front & rear cab noses
    if (i === 0 || i === 3) {
      const dir = i === 3 ? 1 : -1
      const nose = new THREE.Group()
      nose.position.set(dir * (mCarLen * 0.5), 0.12, 0)
      if (dir < 0) nose.rotation.y = Math.PI
      car.add(nose)

      const noseShape = new THREE.Shape()
      noseShape.moveTo(0, 0)
      noseShape.lineTo(0.62, 0.08)
      noseShape.quadraticCurveTo(0.84, 0.36, 0.5, 1.04)
      noseShape.lineTo(0, 1.22)
      noseShape.closePath()
      const noseGeo = new THREE.ExtrudeGeometry(noseShape, {
        depth: 1.0,
        bevelEnabled: true,
        bevelThickness: 0.07,
        bevelSize: 0.06,
        bevelSegments: 3,
      })
      noseGeo.translate(0, 0, -0.5)
      const noseMesh = new THREE.Mesh(noseGeo, monoWhiteMat)
      nose.add(noseMesh)

      const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 1.12), monoEmeraldMat)
      noseStripe.position.set(0.28, 0.28, 0)
      nose.add(noseStripe)

      const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.96), monoGlassMat)
      cockpit.position.set(0.52, 0.78, 0)
      cockpit.rotation.z = 0.36
      nose.add(cockpit)

      const destStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.13), monoDestMat)
      destStrip.rotation.y = Math.PI / 2
      destStrip.position.set(0.56, 1.04, 0)
      nose.add(destStrip)

      for (const lz of [-0.34, 0.34]) {
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.1, 0.16),
          i === 3 ? monoHeadMat : monoTailMat,
        )
        light.position.set(0.68, 0.28, lz)
        nose.add(light)
      }
    }

    // Dark accordion gangway bellows between cars
    if (i < 3) {
      const bellow = new THREE.Mesh(new THREE.BoxGeometry(mGap + 0.06, 1.02, 0.98), monoDarkMat)
      bellow.position.set(cx + (mCarLen + mGap) * 0.5, 0.72, 0)
      monorailGroup.add(bellow)
    }
  }

  // ==================== 6. YANGTZE RIVER CABLEWAY (长江索道) ====================
  // X-braced steel lattice pylons at x = -8.6 and x = +8.6, z = -3.85, rising cleanly to y = 16.0
  // Catenary cables span from y = 15.65 at pylons down to y = 14.95 at mid-span (well clear above 14.32 roof neon!)
  const cablewayGroup = new THREE.Group()
  group.add(cablewayGroup)

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff3020,
    emissive: 0xff2214,
    emissiveIntensity: 1.55,
  })
  const beaconHaloMat = createHaloMaterial(0xff3020, 0.42)
  weatherBag.haloMaterials.push({
    material: beaconHaloMat,
    rainOpacity: 0.42,
    sunOpacity: 0.18,
    snowOpacity: 0.38,
  })
  const beacons: THREE.Mesh[] = []

  const buildPylon = (px: number, baseY: number) => {
    const pylon = new THREE.Group()
    pylon.position.set(px, baseY, -3.85)
    cablewayGroup.add(pylon)

    const h = 16.0 - baseY
    // 4 tapered corner steel legs
    for (const lx of [-0.38, 0.38]) {
      for (const lz of [-0.38, 0.38]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, h, 6), steelMat)
        leg.position.set(lx * 0.72, h * 0.5, lz * 0.72)
        leg.rotation.z = lx > 0 ? 0.04 : -0.04
        leg.rotation.x = lz > 0 ? -0.04 : 0.04
        pylon.add(leg)
      }
    }
    // Horizontal cross-girders & X-bracing bays
    const bays = Math.max(3, Math.floor(h / 1.55))
    const bayH = h / bays
    for (let b = 0; b < bays; b++) {
      const y0 = b * bayH
      const t = b / bays
      const span = 0.72 * (1 - t * 0.42)
      const ring = new THREE.Mesh(new THREE.BoxGeometry(span, 0.055, span), steelMat)
      ring.position.y = y0 + bayH
      pylon.add(ring)
      // Diagonal X braces on front & back faces
      const diagLen = Math.hypot(span, bayH)
      const diagAng = Math.atan2(span, bayH)
      for (const sz of [-span * 0.5, span * 0.5]) {
        const d1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, diagLen, 5), steelMat)
        d1.position.set(0, y0 + bayH * 0.5, sz)
        d1.rotation.z = diagAng
        pylon.add(d1)
        const d2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, diagLen, 5), steelMat)
        d2.position.set(0, y0 + bayH * 0.5, sz)
        d2.rotation.z = -diagAng
        pylon.add(d2)
      }
    }
    // Cross-arm saddle beam at top (y = 15.65 world)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 1.45), steelMat)
    arm.position.y = h - 0.35
    pylon.add(arm)

    // Red aviation warning beacon at apex
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.55, 6), steelMat)
    mast.position.y = h + 0.25
    pylon.add(mast)
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), beaconMat)
    beacon.position.y = h + 0.54
    pylon.add(beacon)
    beacons.push(beacon)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), beaconHaloMat)
    halo.position.y = h + 0.54
    pylon.add(halo)
  }

  buildPylon(-8.6, 5.2)
  buildPylon(8.6, 13.45)

  // Taut steel catenary cable helper
  const catenaryY = (x: number) => {
    const u = x / 8.6 // -1..+1
    return 14.95 + 0.72 * u * u
  }

  const cableMat = new THREE.MeshStandardMaterial({ color: 0x3b4249, roughness: 0.4, metalness: 0.8 })
  for (const cz of [-4.22, -3.48]) {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 32; i++) {
      const x = -8.6 + (i / 32) * 17.2
      pts.push(new THREE.Vector3(x, catenaryY(x), cz))
    }
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.026, 6, false),
      cableMat,
    )
    cablewayGroup.add(cable)
  }

  // Iconic Red-and-Cream Yangtze River Cableway Gondola Cabin (长江索道轿厢)
  const gondola = new THREE.Group()
  cablewayGroup.add(gondola)

  const gondolaRedMat = new THREE.MeshStandardMaterial({ color: 0xc82b24, roughness: 0.34, metalness: 0.22 })
  const gondolaCreamMat = new THREE.MeshStandardMaterial({ color: 0xf0e3c8, roughness: 0.42, metalness: 0.12 })
  const gondolaGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff0cc,
    emissive: 0xffc870,
    emissiveIntensity: 0.95,
    roughness: 0.35,
  })
  weatherBag.emissiveMaterials.push({
    material: gondolaGlowMat,
    rainIntensity: 0.95,
    sunIntensity: 0.4,
    snowIntensity: 0.9,
  })

  // 4-wheel roller trolley riding directly on the catenary cable (local y = 0)
  const trolleyBar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.16), ironMat)
  gondola.add(trolleyBar)
  for (const wx of [-0.34, -0.12, 0.12, 0.34]) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 10), steelMat)
    roller.rotation.x = Math.PI / 2
    roller.position.set(wx, 0.05, 0)
    gondola.add(roller)
  }

  // Curved steel hanger arm dropping from trolley to cabin roof
  const hangerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.04, 0),
    new THREE.Vector3(0, -0.32, 0.22),
    new THREE.Vector3(0, -0.78, 0.22),
    new THREE.Vector3(0, -0.94, 0),
  ])
  const hangerArm = new THREE.Mesh(new THREE.TubeGeometry(hangerCurve, 14, 0.04, 8, false), ironMat)
  gondola.add(hangerArm)

  // Cabin shell suspended below hanger (local y = -0.95 down to -2.02)
  const cabinGroup = new THREE.Group()
  cabinGroup.position.y = -1.48
  gondola.add(cabinGroup)

  const cabLower = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.86), gondolaRedMat)
  cabLower.position.y = -0.26
  cabinGroup.add(cabLower)
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 0.9), gondolaCreamMat)
  cabRoof.position.y = 0.48
  cabinGroup.add(cabRoof)
  // Warm glowing cabin interior + miniature passengers & vertical handrails
  const cabCore = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.56, 0.66), gondolaGlowMat)
  cabCore.position.y = 0.15
  cabinGroup.add(cabCore)
  for (const px of [-0.35, 0.08, 0.36]) {
    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), ironMat)
    pHead.position.set(px, 0.18, 0.12)
    cabinGroup.add(pHead)
    const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.24, 8), ironMat)
    pBody.position.set(px, 0.01, 0.12)
    cabinGroup.add(pBody)
  }
  // Wrap-around window frame mullions
  for (const mx of [-0.72, -0.24, 0.24, 0.72]) {
    for (const mz of [-0.42, 0.42]) {
      const mPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.05), gondolaCreamMat)
      mPost.position.set(mx, 0.16, mz)
      cabinGroup.add(mPost)
    }
  }
  // Side plaque on gondola
  const cabSignTex = textures.makeSign({
    w: 256,
    h: 64,
    bg: '#b92620',
    text: '长 江 索 道',
    color: '#fff3d6',
  })
  const cabSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.24),
    new THREE.MeshStandardMaterial({ map: cabSignTex, roughness: 0.4 }),
  )
  cabSign.position.set(0, -0.25, 0.435)
  cabinGroup.add(cabSign)

  // Warm interior point light inside gondola
  const gondolaLight = new THREE.PointLight(0xffb85c, 2.2, 4.5, 1.8)
  gondolaLight.position.set(0, 0.1, 0.4)
  cabinGroup.add(gondolaLight)

  // Warm accent light illuminating the Liziba tunnel portal
  const lizibaLight = new THREE.PointLight(0x66e6a8, 3.2, 6.5, 1.6)
  lizibaLight.position.set(0.6, 8.8, -2.45)
  group.add(lizibaLight)
  weatherBag.pointLights.push({
    light: lizibaLight,
    rainIntensity: 3.2,
    sunIntensity: 1.0,
    snowIntensity: 2.8,
  })

  // ==================== ANIMATION ====================
  let monoX = 1.6
  let cablePhase = 0.28
  let skyStatus = '+16m 单轨穿楼 · 索道凌空'

  const update = (time: number, dt: number, convergence: boolean, _weather: DioramaWeather) => {
    // 1. CRT Line 2 Monorail continuously glides through the Liziba tunnel with zero clipping
    if (convergence) {
      // Position train dramatically emerging half-way out of the Liziba building tunnel!
      const targetX = 1.15 + Math.sin(time * 0.85) * 1.1
      monoX += (targetX - monoX) * Math.min(1, dt * 3.5)
      skyStatus = '+16m 单轨穿楼 · 三层交汇'
    } else {
      monoX -= dt * 2.15
      if (monoX < -HALF_W - 6.2) monoX = HALF_W + 6.2
      skyStatus = monoX > -0.5 && monoX < 7.5 ? '+16m 单轨穿楼 · 穿越中' : '+16m 单轨穿楼 · 索道凌空'
    }
    monorailGroup.position.x = monoX

    // 2. Yangtze River Cableway gondola glides smoothly along the front catenary cable
    if (convergence) {
      cablePhase += dt * 0.18
      const gx = -3.4 + Math.sin(cablePhase) * 1.4
      gondola.position.set(gx, catenaryY(gx), -3.48)
    } else {
      cablePhase += dt * 0.22
      const gx = Math.sin(cablePhase) * 6.4
      gondola.position.set(gx, catenaryY(gx), -3.48)
    }
    // Gentle pendulum sway of the suspended cabin
    cabinGroup.rotation.z = Math.sin(time * 1.45) * 0.032

    // 3. Aviation beacon pulse on cableway pylons
    const pulse = 0.65 + 0.9 * Math.max(0, Math.sin(time * 3.2))
    beaconMat.emissiveIntensity = pulse
    for (const b of beacons) {
      b.scale.setScalar(0.95 + 0.12 * pulse)
    }
  }

  return {
    group,
    weatherBag,
    update,
    getSkyStatus: () => skyStatus,
  }
}
