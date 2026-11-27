import * as THREE from 'three'
import type { ChongqingTextures } from './textures'
import {
  DIORAMA_DEPTH,
  DIORAMA_WIDTH,
  HALF_D,
  HALF_W,
  createAcrylicCutawayMaterial,
  createHaloMaterial,
  createWeatherBag,
  type WeatherResponsive,
} from './types'

export interface UndergroundTierHandle {
  group: THREE.Group
  plinthGroup: THREE.Group
  weatherBag: WeatherResponsive
  update: (time: number, dt: number, convergence: boolean) => void
  getMetroStatus: () => string
}

/**
 * Builds:
 * - Dark-walnut & brushed-brass exhibition plinth with engraved brass nameplate
 * - Stratified sandstone bedrock cutaway + brass-flanged drainage conduits
 * - TIER -1 Left/Center: Deep Mountain Subway Station (穿山地铁 · 洪崖雨巷站) + 3-car aerodynamic red/silver metro train
 * - TIER -1 Right: Air-Raid Shelter Underground Hotpot Cave (防空洞地下老火锅) with 4 boiling nine-grid tables & diners
 * - Crystal-clear Fresnel acrylic cutaway front panel (transmission: 0)
 */
export function buildUndergroundTier(
  textures: ChongqingTextures,
  clipPlanes: THREE.Plane[],
): UndergroundTierHandle {
  const group = new THREE.Group()
  group.name = 'tier_underground'
  const plinthGroup = new THREE.Group()
  plinthGroup.name = 'exhibition_plinth'
  const weatherBag = createWeatherBag()

  // ==================== 1. WALNUT & BRUSHED BRASS EXHIBITION PLINTH ====================
  const walnutMat = new THREE.MeshStandardMaterial({
    map: textures.walnutWood,
    roughness: 0.42,
    metalness: 0.08,
  })
  const brassMat = new THREE.MeshStandardMaterial({
    map: textures.brushedBrass,
    roughness: 0.28,
    metalness: 0.85,
  })
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x22262b,
    roughness: 0.55,
    metalness: 0.65,
  })

  // Lower stepped walnut plinth foot (y = -7.35 to -6.55)
  const plinthFoot = new THREE.Mesh(
    new THREE.BoxGeometry(DIORAMA_WIDTH + 1.5, 0.8, DIORAMA_DEPTH + 1.5),
    walnutMat,
  )
  plinthFoot.position.y = -6.95
  plinthFoot.receiveShadow = true
  plinthGroup.add(plinthFoot)

  // Upper walnut plinth deck (y = -6.55 to -5.65)
  const plinthDeck = new THREE.Mesh(
    new THREE.BoxGeometry(DIORAMA_WIDTH + 0.75, 0.9, DIORAMA_DEPTH + 0.75),
    walnutMat,
  )
  plinthDeck.position.y = -6.1
  plinthDeck.receiveShadow = true
  plinthGroup.add(plinthDeck)

  // Brushed-brass inlay strips around plinth bevels
  const brassTrimTop = new THREE.Mesh(
    new THREE.BoxGeometry(DIORAMA_WIDTH + 0.86, 0.09, DIORAMA_DEPTH + 0.86),
    brassMat,
  )
  brassTrimTop.position.y = -5.68
  plinthGroup.add(brassTrimTop)

  const brassTrimMid = new THREE.Mesh(
    new THREE.BoxGeometry(DIORAMA_WIDTH + 1.58, 0.07, DIORAMA_DEPTH + 1.58),
    brassMat,
  )
  brassTrimMid.position.y = -6.56
  plinthGroup.add(brassTrimMid)

  // Engraved brass exhibition nameplate on front of plinth
  const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.04, 0.14), brassMat)
  plateFrame.position.set(0, -6.28, HALF_D + 0.44)
  plateFrame.rotation.x = -0.14
  plinthGroup.add(plateFrame)

  const nameplateFace = new THREE.Mesh(
    new THREE.PlaneGeometry(6.18, 0.92),
    new THREE.MeshStandardMaterial({
      map: textures.plinthNameplate,
      roughness: 0.3,
      metalness: 0.72,
    }),
  )
  nameplateFace.position.set(0, -6.27, HALF_D + 0.515)
  nameplateFace.rotation.x = -0.14
  plinthGroup.add(nameplateFace)

  // Corner brass clasps at plinth top corners
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.32), brassMat)
      clasp.position.set(sx * (HALF_W + 0.34), -5.68, sz * (HALF_D + 0.34))
      plinthGroup.add(clasp)
    }
  }

  group.add(plinthGroup)

  // ==================== 2. STRATIFIED SANDSTONE BEDROCK & DRAINAGE CONDUITS ====================
  const bedrockMat = new THREE.MeshStandardMaterial({
    map: textures.sandstoneStrata,
    roughness: 0.88,
    metalness: 0.04,
  })
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x4b5158,
    roughness: 0.84,
    metalness: 0.08,
  })

  // Subterranean structural floor slab (y = -5.65 to -5.35)
  const subFloor = new THREE.Mesh(new THREE.BoxGeometry(DIORAMA_WIDTH, 0.3, DIORAMA_DEPTH), bedrockMat)
  subFloor.position.y = -5.5
  group.add(subFloor)

  // Structural rock ceiling slab separating Tier -1 and Tier 0 (y = -0.75 to -0.05)
  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(DIORAMA_WIDTH, 0.7, DIORAMA_DEPTH), bedrockMat)
  ceilingSlab.position.y = -0.4
  group.add(ceilingSlab)

  // Rear bedrock retaining mass
  const backRock = new THREE.Mesh(new THREE.BoxGeometry(DIORAMA_WIDTH, 4.7, 2.2), bedrockMat)
  backRock.position.set(0, -3.05, -HALF_D + 1.1)
  group.add(backRock)

  // Left & Right cutaway rock flanks
  const leftFlank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.7, DIORAMA_DEPTH), bedrockMat)
  leftFlank.position.set(-HALF_W + 0.45, -3.05, 0)
  group.add(leftFlank)

  const rightFlank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.7, DIORAMA_DEPTH), bedrockMat)
  rightFlank.position.set(HALF_W - 0.4, -3.05, 0)
  group.add(rightFlank)

  // Center bedrock partition wall dividing Subway Station (left) from Air-Raid Hotpot Cave (right)
  const dividerRock = new THREE.Mesh(new THREE.BoxGeometry(1.05, 4.7, DIORAMA_DEPTH - 0.15), bedrockMat)
  dividerRock.position.set(1.95, -3.05, -0.05)
  group.add(dividerRock)

  // Brass-flanged subterranean drainage conduits embedded in bedrock cutaway faces
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3b4852, roughness: 0.48, metalness: 0.65 })
  for (const px of [-9.35, 1.95, 9.45]) {
    for (const py of [-1.25, -4.75]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.6, 14), pipeMat)
      pipe.rotation.x = Math.PI / 2
      pipe.position.set(px, py, HALF_D - 0.22)
      group.add(pipe)
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), brassMat)
      flange.rotation.x = Math.PI / 2
      flange.position.set(px, py, HALF_D + 0.04)
      group.add(flange)
    }
  }
  // Horizontal drainage conduit tucked under the ceiling rock lip
  const horizPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, DIORAMA_WIDTH - 0.8, 12), pipeMat)
  horizPipe.rotation.z = Math.PI / 2
  horizPipe.position.set(0, -0.58, HALF_D - 0.06)
  group.add(horizPipe)
  for (let x = -8; x <= 8; x += 4) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), brassMat)
    collar.rotation.z = Math.PI / 2
    collar.position.set(x, -0.58, HALF_D - 0.06)
    group.add(collar)
  }

  // ==================== 3. SUBWAY STATION (穿山地铁 · 洪崖雨巷站) ====================
  // Bounds: x in [-9.1, +1.4], z in [-5.0, +7.0], y in [-5.35, -0.75]
  const subwayGroup = new THREE.Group()
  group.add(subwayGroup)

  const tileWallMat = new THREE.MeshStandardMaterial({
    map: textures.subwayTile,
    roughness: 0.32,
    metalness: 0.06,
  })
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x626a73,
    roughness: 0.45,
    metalness: 0.08,
  })
  const platformDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b4048,
    roughness: 0.6,
    metalness: 0.12,
  })

  // Glazed ceramic tile back wall
  const stationBackWall = new THREE.Mesh(new THREE.PlaneGeometry(10.55, 4.6), tileWallMat)
  stationBackWall.position.set(-3.82, -3.05, -4.92)
  subwayGroup.add(stationBackWall)

  // Side walls with recessed tunnel portals for the train (track at z = -1.15 for hero visibility)
  for (const sideX of [-9.08, 1.41]) {
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x101317, roughness: 0.9 })
    const tunnelHole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.75, 2.75), portalMat)
    tunnelHole.position.set(sideX, -3.8, -1.15)
    subwayGroup.add(tunnelHole)
    // Concrete portal surround frame
    const topLintel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 3.1), concreteMat)
    topLintel.position.set(sideX, -2.35, -1.15)
    subwayGroup.add(topLintel)
  }

  // Station platform deck (foreground z = +0.95 to +7.0, y = -5.35 to -4.65)
  const platformDeck = new THREE.Mesh(new THREE.BoxGeometry(10.52, 0.7, 6.05), platformMat)
  platformDeck.position.set(-3.82, -5.0, 3.97)
  platformDeck.receiveShadow = true
  subwayGroup.add(platformDeck)

  // Yellow bumpy tactile paving strip (盲道) along platform edge
  const tactileStrip = new THREE.Mesh(
    new THREE.BoxGeometry(10.45, 0.04, 0.56),
    new THREE.MeshStandardMaterial({
      map: textures.tactilePaving,
      roughness: 0.55,
      metalness: 0.05,
    }),
  )
  tactileStrip.position.set(-3.82, -4.64, 1.45)
  subwayGroup.add(tactileStrip)

  // Crimson safety warning edge line
  const safetyLine = new THREE.Mesh(
    new THREE.BoxGeometry(10.45, 0.03, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xc93030, roughness: 0.4 }),
  )
  safetyLine.position.set(-3.82, -4.64, 1.05)
  subwayGroup.add(safetyLine)

  // Recessed trackbed (z = -4.9 to +0.95, y = -5.35)
  const ballast = new THREE.Mesh(new THREE.BoxGeometry(10.52, 0.14, 5.85), platformDarkMat)
  ballast.position.set(-3.82, -5.28, -1.98)
  subwayGroup.add(ballast)

  // Sleepers & twin steel rails at z = -1.15
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x3b3530, roughness: 0.85 })
  const railMat = new THREE.MeshStandardMaterial({ color: 0xaab4be, roughness: 0.3, metalness: 0.88 })
  for (let x = -8.7; x <= 1.1; x += 0.55) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 1.85), sleeperMat)
    sleeper.position.set(x, -5.18, -1.15)
    subwayGroup.add(sleeper)
  }
  for (const rz of [-1.77, -0.53]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.12, 0.08), railMat)
    rail.position.set(-3.82, -5.09, rz)
    subwayGroup.add(rail)
  }

  // Unobstructed Tunnel Vault Ribs — hug ONLY the back wall & ceiling, stopping cleanly at top-front lip (z = +6.9)!
  // They NEVER drop down in front of the cutaway!
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x3e464f, roughness: 0.72, metalness: 0.18 })
  for (let x = -8.2; x <= 0.6; x += 2.2) {
    // Back vertical pillar hugging z = -4.82
    const backPost = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.45, 0.28), ribMat)
    backPost.position.set(x, -3.05, -4.78)
    subwayGroup.add(backPost)

    // Ceiling haunch rib curving smoothly across the roof ONLY (y = -1.0 to -0.82), ending at z = +6.85
    const ceilBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 11.65), ribMat)
    ceilBeam.position.set(x, -0.92, 1.02)
    subwayGroup.add(ceilBeam)

    // Upper back corner gusset
    const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 0.75), ribMat)
    gusset.position.set(x, -1.25, -4.45)
    gusset.rotation.x = Math.PI / 4
    subwayGroup.add(gusset)
  }

  // Recessed ceiling louver light coves (well-calibrated so ZERO whiteout!)
  const coveHousingMat = new THREE.MeshStandardMaterial({ color: 0x2b323a, roughness: 0.5, metalness: 0.3 })
  const coveLightMat = new THREE.MeshStandardMaterial({
    color: 0xf4f0e4,
    emissive: 0xfff0d4,
    emissiveIntensity: 0.72,
    roughness: 0.3,
  })
  weatherBag.emissiveMaterials.push({
    material: coveLightMat,
    rainIntensity: 0.72,
    sunIntensity: 0.52,
    snowIntensity: 0.66,
  })

  for (const lz of [-1.2, 2.2, 5.1]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.12, 0.68), coveHousingMat)
    housing.position.set(-3.82, -0.86, lz)
    subwayGroup.add(housing)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.05, 0.44), coveLightMat)
    strip.position.set(-3.82, -0.92, lz)
    subwayGroup.add(strip)
    // Louver slats across the light cove
    for (let sx = -8.0; sx <= 0.4; sx += 0.7) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.48), coveHousingMat)
      slat.position.set(sx, -0.94, lz)
      subwayGroup.add(slat)
    }
  }

  // Crisp calibrated Chinese Station Signboards
  const stationSignTex = textures.makeSign({
    w: 768,
    h: 160,
    bg: '#152332',
    border: '#d6a438',
    text: '洪崖雨巷站',
    subtext: 'HONGYA YUXIANG STA. · CHONGQING RAIL',
    color: '#fff6e4',
    subColor: '#d9c6a3',
    badge: '渝',
  })
  const stationSignMat = new THREE.MeshStandardMaterial({
    map: stationSignTex,
    emissive: 0xffffff,
    emissiveMap: stationSignTex,
    emissiveIntensity: 0.48,
    roughness: 0.35,
  })
  const mainBoardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.96, 0.12), darkIronMat)
  mainBoardFrame.position.set(-3.85, -1.65, 1.35)
  subwayGroup.add(mainBoardFrame)
  const mainBoardFace = new THREE.Mesh(new THREE.PlaneGeometry(4.24, 0.84), stationSignMat)
  mainBoardFace.position.set(-3.85, -1.65, 1.42)
  subwayGroup.add(mainBoardFace)
  // Hanger rods for main sign
  for (const hx of [-5.6, -2.1]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8), darkIronMat)
    rod.position.set(hx, -1.05, 1.35)
    subwayGroup.add(rod)
  }

  // Secondary directional wayfinding signboards on back wall & platform edge
  const dirLeftTex = textures.makeSign({
    w: 512,
    h: 112,
    bg: '#144432',
    border: '#4fd18b',
    text: '← 2号线 · 李子坝',
    color: '#eefcf4',
  })
  const dirLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.5),
    new THREE.MeshStandardMaterial({
      map: dirLeftTex,
      emissive: 0xffffff,
      emissiveMap: dirLeftTex,
      emissiveIntensity: 0.44,
    }),
  )
  dirLeft.position.set(-6.9, -2.15, -4.86)
  subwayGroup.add(dirLeft)

  const dirRightTex = textures.makeSign({
    w: 512,
    h: 112,
    bg: '#591c18',
    border: '#f0b65c',
    text: '防空洞老街出口 →',
    color: '#fff2dc',
  })
  const dirRight = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.5),
    new THREE.MeshStandardMaterial({
      map: dirRightTex,
      emissive: 0xffffff,
      emissiveMap: dirRightTex,
      emissiveIntensity: 0.48,
    }),
  )
  dirRight.position.set(-0.7, -2.15, -4.86)
  subwayGroup.add(dirRight)

  // Back wall illuminated station medallion sign
  const backMedallion = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.72), stationSignMat)
  backMedallion.position.set(-3.85, -2.15, -4.86)
  subwayGroup.add(backMedallion)

  // Platform wooden & steel benches + waiting commuters
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c5334, roughness: 0.62 })
  for (const bx of [-6.3, -1.5]) {
    const bench = new THREE.Group()
    bench.position.set(bx, -4.64, 4.15)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.52), benchWoodMat)
    seat.position.y = 0.42
    bench.add(seat)
    const backRest = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.34, 0.07), benchWoodMat)
    backRest.position.set(0, 0.68, 0.22)
    bench.add(backRest)
    for (const lx of [-0.68, 0.68]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.44), darkIronMat)
      leg.position.set(lx, 0.21, 0)
      bench.add(leg)
    }
    subwayGroup.add(bench)
  }

  // Waiting commuters on the subway platform
  const commuterSpecs: Array<{ x: number; z: number; rot: number; coat: number; seated?: boolean }> = [
    { x: -7.2, z: 2.15, rot: Math.PI, coat: 0x2f435a },
    { x: -5.2, z: 2.4, rot: Math.PI - 0.15, coat: 0x8b3a3a },
    { x: -3.6, z: 2.05, rot: Math.PI + 0.12, coat: 0xc29e6c },
    { x: -1.8, z: 2.25, rot: Math.PI - 0.08, coat: 0x3b4d42 },
    { x: -6.1, z: 4.02, rot: Math.PI, coat: 0x4b425c, seated: true },
  ]
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6be9e, roughness: 0.65 })
  const darkPantsMat = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.8 })
  for (const c of commuterSpecs) {
    const person = new THREE.Group()
    person.position.set(c.x, -4.64, c.z)
    person.rotation.y = c.rot
    const coatMat = new THREE.MeshStandardMaterial({ color: c.coat, roughness: 0.72 })
    const yOff = c.seated ? -0.18 : 0
    // Legs
    for (const lx of [-0.07, 0.07]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, c.seated ? 0.36 : 0.56, 8), darkPantsMat)
      leg.position.set(lx, (c.seated ? 0.22 : 0.28), c.seated ? 0.12 : 0)
      person.add(leg)
    }
    // Torso / Coat
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.145, 0.52, 10), coatMat)
    torso.position.y = 0.78 + yOff
    person.add(torso)
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), skinMat)
    head.position.y = 1.16 + yOff
    person.add(head)
    // Hair cap
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.104, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      darkPantsMat,
    )
    hair.position.y = 1.18 + yOff
    person.add(hair)
    subwayGroup.add(person)
  }

  // ==================== 4. AERODYNAMIC RED-AND-SILVER CHONGQING METRO TRAIN ====================
  // Clip planes restricted cleanly to the subway chamber x in [-9.02, +1.35]
  const subwayClipPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 9.0),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1.35),
    ...clipPlanes,
  ]
  const metroTrain = new THREE.Group()
  metroTrain.position.set(-4.0, -4.95, -1.15)
  subwayGroup.add(metroTrain)

  const metroSilverMat = new THREE.MeshStandardMaterial({
    color: 0xd5dce3,
    roughness: 0.26,
    metalness: 0.62,
    clippingPlanes: subwayClipPlanes,
  })
  const metroCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0xb92228,
    roughness: 0.3,
    metalness: 0.35,
    clippingPlanes: subwayClipPlanes,
  })
  const metroDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e2228,
    roughness: 0.45,
    metalness: 0.4,
    clippingPlanes: subwayClipPlanes,
  })
  const metroGlassMat = new THREE.MeshStandardMaterial({
    color: 0x16222c,
    roughness: 0.12,
    metalness: 0.7,
    transparent: true,
    opacity: 0.52,
    clippingPlanes: subwayClipPlanes,
  })
  const metroInteriorMat = new THREE.MeshStandardMaterial({
    color: 0xfff0d4,
    emissive: 0xffd594,
    emissiveIntensity: 0.85,
    roughness: 0.4,
    clippingPlanes: subwayClipPlanes,
  })
  const metroHeadlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e4,
    emissive: 0xffe4aa,
    emissiveIntensity: 1.55,
    clippingPlanes: subwayClipPlanes,
  })
  const metroTailMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2b20,
    emissiveIntensity: 1.35,
    clippingPlanes: subwayClipPlanes,
  })
  const metroLedTex = textures.makeSign({
    w: 384,
    h: 64,
    bg: '#120f0b',
    text: '洪崖雨巷 · 方向',
    color: '#ffb938',
    glow: '#ff9500',
  })
  const metroLedMat = new THREE.MeshStandardMaterial({
    map: metroLedTex,
    emissive: 0xffffff,
    emissiveMap: metroLedTex,
    emissiveIntensity: 0.9,
    clippingPlanes: subwayClipPlanes,
  })

  // Build 3 articulated cars (length 3.3 each + 0.24 accordion bellows)
  const carLen = 3.25
  const carGap = 0.24
  for (let c = 0; c < 3; c++) {
    const cx = (c - 1) * (carLen + carGap)
    const car = new THREE.Group()
    car.position.x = cx
    metroTrain.add(car)

    // Lower chassis & crimson livery belt
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(carLen, 0.56, 1.38), metroSilverMat)
    lowerBody.position.y = 0.62
    car.add(lowerBody)

    const crimsonStripe = new THREE.Mesh(new THREE.BoxGeometry(carLen + 0.01, 0.22, 1.4), metroCrimsonMat)
    crimsonStripe.position.y = 0.72
    car.add(crimsonStripe)

    // Roof crown (chamfered)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(carLen, 0.24, 1.3), metroSilverMat)
    roof.position.y = 1.66
    car.add(roof)

    // Louvered rooftop HVAC pods
    for (const hx of [-0.75, 0.75]) {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.88), metroDarkMat)
      hvac.position.set(hx, 1.84, 0)
      car.add(hvac)
    }

    // Recessed lit passenger cabin interior (NEVER flat glowing rectangles!)
    const cabinBack = new THREE.Mesh(new THREE.BoxGeometry(carLen - 0.16, 0.74, 0.12), metroInteriorMat)
    cabinBack.position.set(0, 1.24, -0.52)
    car.add(cabinBack)
    const cabinCeil = new THREE.Mesh(new THREE.BoxGeometry(carLen - 0.16, 0.06, 1.08), metroInteriorMat)
    cabinCeil.position.set(0, 1.54, 0)
    car.add(cabinCeil)
    // Interior seats & hanging handstraps (扶手吊环)
    const seatBench = new THREE.Mesh(new THREE.BoxGeometry(carLen - 0.4, 0.16, 0.24), metroCrimsonMat)
    seatBench.position.set(0, 0.94, -0.34)
    car.add(seatBench)
    const handrailBar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, carLen - 0.5, 6), metroSilverMat)
    handrailBar.rotation.z = Math.PI / 2
    handrailBar.position.set(0, 1.44, 0.14)
    car.add(handrailBar)
    for (let sx = -1.1; sx <= 1.1; sx += 0.44) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.01, 6, 10), metroSilverMat)
      strap.position.set(sx, 1.35, 0.14)
      car.add(strap)
    }

    // Window mullions & etched sliding-door seams on front face (z = +0.7)
    for (const px of [-1.52, -0.82, -0.22, 0.22, 0.82, 1.52]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.72, 0.06), metroSilverMat)
      pillar.position.set(px, 1.25, 0.69)
      car.add(pillar)
    }
    // Etched sliding door seams
    for (const dx of [-0.52, 0.52]) {
      const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.15, 0.03), metroDarkMat)
      doorSeam.position.set(dx, 1.02, 0.71)
      car.add(doorSeam)
    }
    // Translucent flush window band
    const winBand = new THREE.Mesh(new THREE.BoxGeometry(carLen - 0.14, 0.66, 0.03), metroGlassMat)
    winBand.position.set(0, 1.25, 0.68)
    car.add(winBand)

    // Underbody bogies & wheelsets
    for (const bx of [-1.0, 1.0]) {
      const bogieFrame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 1.18), metroDarkMat)
      bogieFrame.position.set(bx, 0.24, 0)
      car.add(bogieFrame)
      for (const wx of [-0.24, 0.24]) {
        const wheelset = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.28, 12), metroDarkMat)
        wheelset.rotation.x = Math.PI / 2
        wheelset.position.set(bx + wx, 0.16, 0)
        car.add(wheelset)
      }
    }

    // Aerodynamic beveled fiberglass cab nose on leading (c === 2) and trailing (c === 0) cars
    if (c === 0 || c === 2) {
      const dir = c === 2 ? 1 : -1
      const noseGroup = new THREE.Group()
      noseGroup.position.set(dir * (carLen * 0.5), 0.34, 0)
      if (dir < 0) noseGroup.rotation.y = Math.PI
      car.add(noseGroup)

      const noseShape = new THREE.Shape()
      noseShape.moveTo(0, 0)
      noseShape.lineTo(0.55, 0.06)
      noseShape.quadraticCurveTo(0.78, 0.38, 0.52, 1.18)
      noseShape.lineTo(0, 1.44)
      noseShape.closePath()
      const noseGeo = new THREE.ExtrudeGeometry(noseShape, {
        depth: 1.22,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 3,
      })
      noseGeo.translate(0, 0, -0.61)
      const noseMesh = new THREE.Mesh(noseGeo, metroCrimsonMat)
      noseGroup.add(noseMesh)

      // Flush panoramic cab windshield
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 1.16), metroGlassMat)
      visor.position.set(0.54, 0.94, 0)
      visor.rotation.z = 0.28
      noseGroup.add(visor)

      // Glowing amber LED destination display
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.15), metroLedMat)
      led.rotation.y = Math.PI / 2
      led.position.set(0.58, 1.25, 0)
      noseGroup.add(led)

      // Dual warm headlights & red markers
      for (const hz of [-0.42, 0.42]) {
        const hl = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.11, 0.18),
          c === 2 ? metroHeadlightMat : metroTailMat,
        )
        hl.position.set(0.68, 0.36, hz)
        noseGroup.add(hl)
      }
    }

    // Articulated dark accordion gangway bellows between cars
    if (c < 2) {
      const bellow = new THREE.Mesh(new THREE.BoxGeometry(carGap + 0.06, 1.24, 1.16), metroDarkMat)
      bellow.position.set(cx + (carLen + carGap) * 0.5, 1.06, 0)
      metroTrain.add(bellow)
    }
  }

  // ==================== 5. AIR-RAID SHELTER UNDERGROUND HOTPOT CAVE (防空洞地下老火锅) ====================
  // Bounds: x in [+2.48, +9.2], z in [-5.0, +7.0], y in [-5.35, -0.75]
  const caveGroup = new THREE.Group()
  group.add(caveGroup)

  const brickMat = new THREE.MeshStandardMaterial({
    map: textures.brickVault,
    roughness: 0.85,
    metalness: 0.05,
  })
  const caveFloorMat = new THREE.MeshStandardMaterial({
    color: 0x3b3530,
    roughness: 0.62,
    metalness: 0.08,
  })

  // Cave floor slab
  const caveFloor = new THREE.Mesh(new THREE.BoxGeometry(6.75, 0.28, 11.9), caveFloorMat)
  caveFloor.position.set(5.84, -5.22, 1.0)
  caveFloor.receiveShadow = true
  caveGroup.add(caveFloor)

  // Arched brick-and-stone barrel vault (open front at z = +7.0, closed back at z = -4.9)
  const vaultRadius = 3.36
  const vaultLen = 11.8
  const vaultGeo = new THREE.CylinderGeometry(vaultRadius, vaultRadius, vaultLen, 24, 1, true, 0, Math.PI)
  vaultGeo.rotateZ(Math.PI / 2)
  vaultGeo.rotateY(Math.PI / 2)
  const vaultMat = new THREE.MeshStandardMaterial({
    map: textures.brickVault,
    roughness: 0.86,
    side: THREE.BackSide,
  })
  const vaultMesh = new THREE.Mesh(vaultGeo, vaultMat)
  vaultMesh.position.set(5.84, -4.15, 1.0)
  caveGroup.add(vaultMesh)

  // Side vertical masonry base walls under vault springline
  for (const wx of [2.52, 9.16]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, vaultLen), brickMat)
    sideWall.position.set(wx, -4.55, 1.0)
    caveGroup.add(sideWall)
  }

  // Back brick wall closing the shelter cave
  const caveBackWall = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.6), brickMat)
  caveBackWall.position.set(5.84, -3.05, -4.85)
  caveGroup.add(caveBackWall)

  // Arched masonry ribs hugging ONLY the interior vault wall/crown (stopping cleanly at z = +6.75)
  for (let rz = -3.8; rz <= 6.2; rz += 2.5) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(vaultRadius - 0.08, 0.11, 8, 22, Math.PI), brickMat)
    rib.position.set(5.84, -4.15, rz)
    caveGroup.add(rib)
  }

  // Front arch lintel plaques: ★ 人防防空洞 · 1969 ★ + glowing 防空洞老火锅 signboard
  const shelterPlaqueTex = textures.makeSign({
    w: 512,
    h: 96,
    bg: '#3f3830',
    border: '#b59a6a',
    text: '★ 人防防空洞 · 1969 ★',
    color: '#efe1c2',
    serif: true,
  })
  const shelterPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.56),
    new THREE.MeshStandardMaterial({
      map: shelterPlaqueTex,
      emissive: 0xffffff,
      emissiveMap: shelterPlaqueTex,
      emissiveIntensity: 0.35,
      roughness: 0.6,
    }),
  )
  shelterPlaque.position.set(5.84, -1.04, 6.82)
  caveGroup.add(shelterPlaque)

  const caveSignTex = textures.makeSign({
    w: 512,
    h: 128,
    bg: '#4b0f0b',
    border: '#f0b650',
    text: '防空洞老火锅',
    subtext: '九宫格 · 老油 · 巴渝地道风味',
    color: '#ffe8b6',
    subColor: '#f2b974',
    serif: true,
    glow: '#ff6420',
  })
  const caveSignMat = new THREE.MeshStandardMaterial({
    map: caveSignTex,
    emissive: 0xffffff,
    emissiveMap: caveSignTex,
    emissiveIntensity: 0.88,
    roughness: 0.3,
  })
  weatherBag.emissiveMaterials.push({
    material: caveSignMat,
    rainIntensity: 0.88,
    sunIntensity: 0.65,
    snowIntensity: 0.86,
  })
  const caveSign = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 0.78), caveSignMat)
  caveSign.position.set(5.84, -1.85, -4.78)
  caveGroup.add(caveSign)

  // Wall menu plaque inside cave
  const caveMenuTex = textures.makeSign({
    w: 384,
    h: 224,
    bg: '#3a1a10',
    border: '#cfa052',
    text: '鲜毛肚 · 冰球鹅肠',
    subtext: '嫩鸭血 · 现炸酥肉 · 唯怡豆奶',
    color: '#ffe9be',
    subColor: '#e8b976',
    serif: true,
  })
  const caveMenu = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.1),
    new THREE.MeshStandardMaterial({
      map: caveMenuTex,
      emissive: 0xffffff,
      emissiveMap: caveMenuTex,
      emissiveIntensity: 0.36,
    }),
  )
  caveMenu.position.set(5.84, -3.15, -4.78)
  caveGroup.add(caveMenu)

  // Draped Edison festoon string lights along the vault + 4 glowing red 渝 silk lanterns
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe4aa,
    emissive: 0xffaa44,
    emissiveIntensity: 1.35,
  })
  weatherBag.emissiveMaterials.push({
    material: bulbMat,
    rainIntensity: 1.35,
    sunIntensity: 0.85,
    snowIntensity: 1.3,
  })
  for (const fx of [3.9, 7.75]) {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const z = -4.2 + t * 10.2
      const sag = Math.sin((t * 3) * Math.PI) * 0.24
      pts.push(new THREE.Vector3(fx, -1.95 - Math.abs(sag), z))
    }
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.015, 6, false),
      darkIronMat,
    )
    caveGroup.add(wire)
    for (let i = 1; i < 12; i++) {
      const p = pts[i]!
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), bulbMat)
      bulb.position.copy(p).add(new THREE.Vector3(0, -0.08, 0))
      caveGroup.add(bulb)
    }
  }

  // 4 glowing crimson silk lanterns with gold tassels
  const caveLanterns: THREE.Group[] = []
  const lanternSilkMat = new THREE.MeshStandardMaterial({
    color: 0xd6241c,
    emissive: 0xff3b1f,
    emissiveIntensity: 1.18,
    roughness: 0.4,
  })
  weatherBag.emissiveMaterials.push({
    material: lanternSilkMat,
    rainIntensity: 1.18,
    sunIntensity: 0.72,
    snowIntensity: 1.12,
  })
  const lanternHaloMat = createHaloMaterial(0xff5228, 0.34)
  weatherBag.haloMaterials.push({
    material: lanternHaloMat,
    rainOpacity: 0.34,
    sunOpacity: 0.14,
    snowOpacity: 0.32,
  })

  for (const [lx, lz] of [
    [4.45, 4.6],
    [7.25, 4.6],
    [4.45, -1.2],
    [7.25, -1.2],
  ]) {
    const lGroup = new THREE.Group()
    lGroup.position.set(lx!, -1.55, lz!)
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), darkIronMat)
    cord.position.y = -0.25
    lGroup.add(cord)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), lanternSilkMat)
    body.scale.set(1.0, 1.24, 1.0)
    body.position.y = -0.66
    lGroup.add(body)
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 10), brassMat)
    capTop.position.y = -0.37
    lGroup.add(capTop)
    const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.06, 10), brassMat)
    capBot.position.y = -0.95
    lGroup.add(capBot)
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.24, 8), brassMat)
    tassel.position.y = -1.1
    lGroup.add(tassel)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), lanternHaloMat)
    halo.position.y = -0.66
    lGroup.add(halo)
    caveGroup.add(lGroup)
    caveLanterns.push(lGroup)
  }

  // 4 Wooden Round Tables with boiling crimson nine-grid copper hotpots, bowls/bottles, rising steam & seated diners!
  const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b3e24, roughness: 0.58 })
  const stoolRedMat = new THREE.MeshStandardMaterial({ color: 0xb02822, roughness: 0.46 })
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc98842, roughness: 0.3, metalness: 0.85 })
  const brothMat = new THREE.MeshStandardMaterial({
    color: 0xc92212,
    emissive: 0xff3b12,
    emissiveIntensity: 1.05,
    roughness: 0.25,
  })
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xf0eadf, roughness: 0.3 })
  const beerGreenMat = new THREE.MeshStandardMaterial({ color: 0x2b7a3d, roughness: 0.22, metalness: 0.1 })

  const caveSteamWisps: Array<{ sprite: THREE.Sprite; baseY: number; phase: number }> = []
  const steamCanvas = document.createElement('canvas')
  steamCanvas.width = 64
  steamCanvas.height = 64
  const stCtx = steamCanvas.getContext('2d')!
  const stGrad = stCtx.createRadialGradient(32, 32, 2, 32, 32, 30)
  stGrad.addColorStop(0, 'rgba(255, 244, 226, 0.42)')
  stGrad.addColorStop(0.55, 'rgba(255, 236, 210, 0.16)')
  stGrad.addColorStop(1, 'rgba(255, 236, 210, 0)')
  stCtx.fillStyle = stGrad
  stCtx.fillRect(0, 0, 64, 64)
  const steamTex = new THREE.CanvasTexture(steamCanvas)
  const steamMat = new THREE.SpriteMaterial({
    map: steamTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  })

  const tableCoords: Array<[number, number]> = [
    [4.35, 3.85],
    [7.35, 3.85],
    [4.35, 0.4],
    [7.35, 0.4],
  ]
  const dinerCoats = [0x3d546b, 0x994238, 0x4b634b, 0x6b5344, 0x52456b, 0x8a6d3b]

  tableCoords.forEach(([tx, tz], tIdx) => {
    const tbl = new THREE.Group()
    tbl.position.set(tx, -5.08, tz)
    caveGroup.add(tbl)

    // Round table top + pedestal legs
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 18), tableWoodMat)
    top.position.y = 0.62
    tbl.add(top)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.6, 12), tableWoodMat)
    leg.position.y = 0.3
    tbl.add(leg)

    // Boiling crimson nine-grid copper hotpot (九宫格)
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.14, 16), copperMat)
    pot.position.y = 0.72
    tbl.add(pot)
    const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.02, 16), brothMat)
    broth.position.y = 0.79
    tbl.add(broth)
    // Nine-grid brass dividers inside the copper pot
    for (const gOff of [-0.075, 0.075]) {
      const barX = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.015), brassMat)
      barX.position.set(0, 0.805, gOff)
      tbl.add(barX)
      const barZ = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.46), brassMat)
      barZ.position.set(gOff, 0.805, 0)
      tbl.add(barZ)
    }

    // Bowls & beer bottles around the hotpot
    for (let b = 0; b < 4; b++) {
      const ang = (b / 4) * Math.PI * 2 + 0.4
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.05, 10), bowlMat)
      bowl.position.set(Math.cos(ang) * 0.44, 0.685, Math.sin(ang) * 0.44)
      tbl.add(bowl)
    }
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.22, 8), beerGreenMat)
    bottle.position.set(0.36, 0.77, -0.22)
    tbl.add(bottle)

    // Rising soft steam wisps
    for (let s = 0; s < 3; s++) {
      const wisp = new THREE.Sprite(steamMat)
      wisp.position.set(tx + (s - 1) * 0.08, -4.15 + s * 0.3, tz)
      wisp.scale.set(0.45, 0.55, 1)
      caveGroup.add(wisp)
      caveSteamWisps.push({ sprite: wisp, baseY: -4.15, phase: tIdx * 1.3 + s * 2.1 })
    }

    // 4 Red stools + 2–3 seated diners per table
    for (let s = 0; s < 4; s++) {
      const ang = (s / 4) * Math.PI * 2 + Math.PI * 0.25
      const sx = Math.cos(ang) * 0.92
      const sz = Math.sin(ang) * 0.92
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.38, 10), stoolRedMat)
      stool.position.set(sx, 0.19, sz)
      tbl.add(stool)

      if ((tIdx + s) % 3 !== 0) {
        const diner = new THREE.Group()
        diner.position.set(sx, 0.36, sz)
        diner.rotation.y = Math.atan2(-sx, -sz)
        const dCoat = new THREE.MeshStandardMaterial({
          color: dinerCoats[(tIdx * 3 + s) % dinerCoats.length]!,
          roughness: 0.72,
        })
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 10), dCoat)
        torso.position.y = 0.24
        diner.add(torso)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), skinMat)
        head.position.y = 0.55
        diner.add(head)
        const hair = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
          darkPantsMat,
        )
        hair.position.y = 0.57
        diner.add(hair)
        tbl.add(diner)
      }
    }
  })

  // ==================== 6. DEDICATED TIER -1 INTERIOR LIGHTS ====================
  const subwayLightL = new THREE.PointLight(0xe6f0ff, 5.5, 11, 1.5)
  subwayLightL.position.set(-6.0, -1.6, 2.2)
  subwayGroup.add(subwayLightL)

  const subwayLightR = new THREE.PointLight(0xffe8cc, 5.2, 11, 1.5)
  subwayLightR.position.set(-1.4, -1.6, 2.2)
  subwayGroup.add(subwayLightR)

  // Warm inviting cave lighting so the underground hotpot glows even from the Hero Key 1 angle!
  const caveLightFront = new THREE.PointLight(0xff7e30, 11.5, 12, 1.4)
  caveLightFront.position.set(5.84, -2.2, 4.2)
  caveGroup.add(caveLightFront)

  const caveLightBack = new THREE.PointLight(0xff6222, 8.8, 10, 1.5)
  caveLightBack.position.set(5.84, -2.4, -1.0)
  caveGroup.add(caveLightBack)

  weatherBag.pointLights.push(
    { light: subwayLightL, rainIntensity: 5.5, sunIntensity: 4.0, snowIntensity: 5.2 },
    { light: subwayLightR, rainIntensity: 5.2, sunIntensity: 3.8, snowIntensity: 5.0 },
    { light: caveLightFront, rainIntensity: 11.5, sunIntensity: 7.5, snowIntensity: 11.0 },
    { light: caveLightBack, rainIntensity: 8.8, sunIntensity: 5.8, snowIntensity: 8.4 },
  )

  // ==================== 7. CRYSTAL-CLEAR ANTI-REFLECTIVE FRESNEL ACRYLIC CUTAWAY PANEL ====================
  const acrylicMat = createAcrylicCutawayMaterial()
  const acrylicPanel = new THREE.Mesh(new THREE.PlaneGeometry(DIORAMA_WIDTH - 0.16, 4.78), acrylicMat)
  acrylicPanel.position.set(0, -3.12, HALF_D + 0.04)
  acrylicPanel.renderOrder = 12
  group.add(acrylicPanel)

  // Thin brushed-brass acrylic mounting pins at corners & midpoints
  for (const px of [-HALF_W + 0.35, 1.95, HALF_W - 0.35]) {
    for (const py of [-0.92, -5.28]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), brassMat)
      pin.rotation.x = Math.PI / 2
      pin.position.set(px, py, HALF_D + 0.06)
      group.add(pin)
    }
  }

  // ==================== ANIMATION STATE ====================
  let metroPhase = 0.25
  let metroStatusText = '-10m 穿山地铁 · 进站停靠'

  const update = (time: number, dt: number, convergence: boolean) => {
    // Smooth periodic metro arrival -> dwell -> departure cycle
    const speed = convergence ? 0.16 : 0.075
    metroPhase = (metroPhase + dt * speed) % 1

    // Map phase [0..1] to train X position with smooth station dwell around x = -3.8
    let trainX = -3.8
    if (convergence) {
      // During peak convergence, glide smoothly right into center of station cutaway
      const target = -3.8 + Math.sin(time * 0.9) * 1.4
      trainX = target
      metroStatusText = '-10m 穿山地铁 · 三层交汇'
    } else if (metroPhase < 0.28) {
      const t = metroPhase / 0.28
      const eased = 1 - Math.pow(1 - t, 3)
      trainX = -15.0 + eased * 11.2
      metroStatusText = '-10m 穿山地铁 · 进站减速'
    } else if (metroPhase < 0.62) {
      trainX = -3.8
      metroStatusText = '-10m 穿山地铁 · 站台停靠'
    } else if (metroPhase < 0.9) {
      const t = (metroPhase - 0.62) / 0.28
      const eased = t * t * t
      trainX = -3.8 + eased * 12.2
      metroStatusText = '-10m 穿山地铁 · 离站穿山'
    } else {
      trainX = -15.0
      metroStatusText = '-10m 穿山地铁 · 即将进站'
    }
    metroTrain.position.x = trainX

    // Gentle lantern sway in air-raid shelter
    caveLanterns.forEach((l, idx) => {
      l.rotation.z = Math.sin(time * 1.3 + idx * 1.4) * 0.045
    })

    // Rising hotpot steam wisps
    for (const s of caveSteamWisps) {
      const cycle = (time * 0.36 + s.phase) % 1
      s.sprite.position.y = s.baseY + cycle * 1.15
      const sc = 0.35 + cycle * 0.45
      s.sprite.scale.set(sc, sc * 1.25, 1)
    }

    // Subtle warm boiling flicker on cave lights
    const flicker = 1 + Math.sin(time * 5.2) * 0.035 + Math.cos(time * 8.1) * 0.02
    caveLightFront.position.y = -2.2 + (flicker - 1) * 0.2
  }

  return {
    group,
    plinthGroup,
    weatherBag,
    update,
    getMetroStatus: () => metroStatusText,
  }
}
