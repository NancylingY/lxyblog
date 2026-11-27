import * as THREE from 'three'
import type { ChongqingTextures } from './textures'
import {
  DIORAMA_DEPTH,
  DIORAMA_WIDTH,
  HALF_W,
  createHaloMaterial,
  createWeatherBag,
  type DioramaWeather,
  type WeatherResponsive,
} from './types'

export interface StreetTierHandle {
  group: THREE.Group
  weatherBag: WeatherResponsive
  update: (time: number, dt: number, convergence: boolean, weather: DioramaWeather) => void
  getStreetStatus: () => string
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * TIER 0 (0m to +7m · 洪崖洞/十八梯雨夜梯坎老街 & 巴渝吊脚楼):
 * - GLSL Wet Bluestone & Asphalt with multi-octave micro-grain bump, glossy tire-track channels,
 *   shimmering neon puddle reflections, and 3-layer concentric raindrop ripples
 * - Multi-level weathered sandstone retaining wall with damp moss (青苔堡坎) + rain-slick bluestone stairs (青石板梯坎)
 * - Authentic multi-story Bayu Diaojiaolou (巴渝吊脚楼) with cantilevered stilt columns, 穿斗 braces, 美人靠 balustrades,
 *   斗拱 eave brackets, 3D instanced ribbed dark-grey Chinese small roof tiles (小青瓦), upturned eaves (飞檐翘角), gutters
 * - 3 deeply recessed warm 3D shop interiors: 重庆老火锅, 山城小面 · 冰粉, 山城茶馆
 * - Lush weeping Chongqing banyan trees (山城黄桷树) with gnarly aerial roots & 2,200+ GPU-instanced botanical leaf clusters
 * - Sculpted yellow Chongqing taxis (渝A), 10 articulated pedestrians with 8-ribbed translucent umbrellas, dense street props
 */
export function buildStreetTier(
  textures: ChongqingTextures,
  dioramaClipPlanes: THREE.Plane[],
): StreetTierHandle {
  const group = new THREE.Group()
  group.name = 'tier_street'
  const weatherBag = createWeatherBag()

  // ==================== SHARED MATERIALS ====================
  const sandstoneMat = new THREE.MeshStandardMaterial({
    map: textures.sandstoneMoss,
    roughness: 0.86,
    metalness: 0.04,
  })
  const bluestoneMat = new THREE.MeshStandardMaterial({
    map: textures.bluestoneSteps,
    roughness: 0.34,
    metalness: 0.12,
  })
  const darkTimberMat = new THREE.MeshStandardMaterial({
    color: 0x3b2318,
    roughness: 0.62,
    metalness: 0.06,
  })
  const warmTimberMat = new THREE.MeshStandardMaterial({
    color: 0x623b24,
    roughness: 0.58,
    metalness: 0.06,
  })
  const plasterWallMat = new THREE.MeshStandardMaterial({
    color: 0xd6cbb8,
    roughness: 0.85,
    metalness: 0.02,
  })
  const tileRoofMat = new THREE.MeshStandardMaterial({
    color: 0x2d3238,
    roughness: 0.44,
    metalness: 0.18,
  })
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x22262c,
    roughness: 0.48,
    metalness: 0.72,
  })
  const brassMat = new THREE.MeshStandardMaterial({
    map: textures.brushedBrass,
    roughness: 0.3,
    metalness: 0.82,
  })
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xd8e2ec,
    roughness: 0.94,
    metalness: 0.0,
  })
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xc98842,
    roughness: 0.32,
    metalness: 0.85,
  })

  // ==================== 1. GLSL WET ASPHALT & BLUESTONE ROADWAY ====================
  // Base deck plate sealing Tier 0 cleanly above Tier -1
  const streetBaseDeck = new THREE.Mesh(
    new THREE.BoxGeometry(DIORAMA_WIDTH, 0.24, DIORAMA_DEPTH),
    new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.78 }),
  )
  streetBaseDeck.position.set(0, -0.1, 0)
  streetBaseDeck.receiveShadow = true
  group.add(streetBaseDeck)

  const roadUniforms = {
    uTime: { value: 0 },
    uWetness: { value: 1.0 },
    uSnow: { value: 0.0 },
    uSun: { value: 0.0 },
  }

  const wetRoadMat = new THREE.ShaderMaterial({
    uniforms: roadUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uWetness;
      uniform float uSnow;
      uniform float uSun;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // 3-layer concentric raindrop ripples
      float rainRipples(vec2 p, float t) {
        float sum = 0.0;
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          vec2 uv = p * (3.2 + fi * 1.9) + vec2(fi * 17.3, fi * 9.1);
          vec2 id = floor(uv);
          vec2 gv = fract(uv) - 0.5;
          float rnd = hash21(id + fi * 31.7);
          float phase = fract(t * (0.72 + rnd * 0.45) + rnd);
          float d = length(gv);
          float ring = smoothstep(0.045, 0.0, abs(d - phase * 0.46));
          sum += ring * (1.0 - phase) * (0.55 + 0.45 * rnd);
        }
        return clamp(sum, 0.0, 1.0);
      }

      void main() {
        vec2 wp = vWorldPos.xz;

        // Multi-octave asphalt micro-grain
        float g1 = noise(wp * 11.0);
        float g2 = noise(wp * 34.0);
        float grain = g1 * 0.65 + g2 * 0.35;

        // Tire-track wetness channels along the two lanes (z ~ 4.15 & z ~ 5.85)
        float track1 = exp(-pow(max(abs(wp.y - 4.15), 1e-5) * 2.1, 2.0));
        float track2 = exp(-pow(max(abs(wp.y - 5.85), 1e-5) * 2.1, 2.0));
        float tireTrack = clamp(track1 + track2, 0.0, 1.0);

        // Puddle mask enhanced along gutters & tire tracks
        float puddleNoise = noise(wp * 0.65 + vec2(2.3, -1.7));
        float puddle = smoothstep(0.32, 0.72, puddleNoise + tireTrack * 0.34) * uWetness;

        // Base asphalt albedo
        vec3 dryAsphalt = vec3(0.11, 0.12, 0.135) * (0.82 + 0.34 * grain);
        vec3 wetAsphalt = vec3(0.045, 0.052, 0.065) * (0.85 + 0.3 * grain);
        vec3 baseCol = mix(dryAsphalt, wetAsphalt, clamp(uWetness * 0.85 + puddle * 0.15, 0.0, 1.0));

        // Double yellow center road divider at z = 5.0
        float centerLine = smoothstep(0.055, 0.02, abs(abs(wp.y - 5.0) - 0.08));
        float noCrosswalk = step(1.15, abs(wp.x - 0.15));
        baseCol = mix(baseCol, vec3(0.76, 0.58, 0.14), centerLine * noCrosswalk * 0.78);

        // Zebra crosswalk stripes at x in [-1.0, +1.3] connecting to the bluestone staircase
        float inCrossX = smoothstep(1.15, 1.02, abs(wp.x - 0.15));
        float stripe = step(0.45, fract(wp.y * 1.45));
        float inRoadZ = smoothstep(3.15, 3.28, wp.y) * smoothstep(6.88, 6.72, wp.y);
        float crosswalk = inCrossX * stripe * inRoadZ;
        baseCol = mix(baseCol, vec3(0.74, 0.76, 0.78), crosswalk * 0.68);

        // Shimmering crimson / amber / cyan neon puddle reflections across wet asphalt
        float rip = rainRipples(wp * 0.85, uTime) * uWetness;
        float shimmer = 0.76 + 0.24 * sin(wp.x * 3.8 + uTime * 2.2 + grain * 5.0) + rip * 0.45;

        // Hotpot crimson & lantern amber reflection pool on left-center (x ~ -3.8)
        float hotpotPool = exp(-pow(max(wp.x + 3.8, -50.0) * 0.24, 2.0)) * smoothstep(7.1, 3.0, wp.y);
        // Noodle shop warm amber reflection on far left (x ~ -7.2)
        float noodlePool = exp(-pow(max(wp.x + 7.2, -50.0) * 0.32, 2.0)) * smoothstep(6.8, 3.0, wp.y);
        // Teahouse amber & Liziba emerald/cyan reflection on right (x ~ +3.6)
        float cyanPool = exp(-pow(max(wp.x - 4.2, -50.0) * 0.22, 2.0)) * smoothstep(7.0, 3.1, wp.y);

        vec3 neonRefl =
          vec3(0.95, 0.22, 0.12) * hotpotPool * 0.52 +
          vec3(1.0, 0.64, 0.22) * (noodlePool * 0.42 + hotpotPool * 0.24) +
          vec3(0.18, 0.72, 0.62) * cyanPool * 0.36;

        float reflWeight = (0.32 + 0.68 * puddle) * uWetness * (1.0 - uSun * 0.82);
        vec3 col = baseCol + neonRefl * reflWeight * shimmer;

        // Subtle crisp raindrop ripple highlights
        col += vec3(0.55, 0.65, 0.78) * rip * (0.08 + 0.16 * puddle) * (1.0 - uSnow);

        // Warm golden-hour sunlit boost in sun climate
        col += vec3(0.14, 0.11, 0.08) * uSun * (0.6 + 0.4 * grain);

        // Soft matte snow dusting along curbs & puddles in snow climate (strictly capped <= 0.68, ZERO whiteout!)
        float curbSnow = smoothstep(3.65, 2.95, wp.y) + smoothstep(6.45, 7.05, wp.y);
        float snowPatch = clamp((curbSnow * 0.82 + smoothstep(0.45, 0.82, grain) * 0.38) * uSnow, 0.0, 0.78);
        vec3 matteSnow = vec3(0.56, 0.62, 0.69);
        col = mix(col, matteSnow, snowPatch);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const wetRoad = new THREE.Mesh(new THREE.PlaneGeometry(DIORAMA_WIDTH - 0.08, 4.35), wetRoadMat)
  wetRoad.rotation.x = -Math.PI / 2
  wetRoad.position.set(0, 0.03, 4.95)
  group.add(wetRoad)

  // Raised bluestone sidewalk apron along front of shops (z = +1.85 to +3.05, y = 0.02 to 0.16)
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(DIORAMA_WIDTH - 0.1, 0.14, 1.35), bluestoneMat)
  sidewalk.position.set(0, 0.09, 2.38)
  sidewalk.receiveShadow = true
  group.add(sidewalk)

  // Matte snow curb strips on sidewalk (visible ONLY in snow mode)
  const sidewalkSnow = new THREE.Mesh(new THREE.BoxGeometry(DIORAMA_WIDTH - 0.3, 0.04, 1.15), snowMat)
  sidewalkSnow.position.set(0, 0.175, 2.38)
  sidewalkSnow.visible = false
  group.add(sidewalkSnow)
  weatherBag.snowMeshes.push(sidewalkSnow)

  // ==================== 2. MULTI-LEVEL SANDSTONE RETAINING WALL (青苔堡坎) & BLUESTONE STAIRCASE (青石板梯坎) ====================
  // Back retaining terrace supporting Tier +1 Liziba podium (y = 0 to 4.18) on the rear/right
  const mainCliffBack = new THREE.Mesh(new THREE.BoxGeometry(DIORAMA_WIDTH - 0.1, 4.12, 3.8), sandstoneMat)
  mainCliffBack.position.set(0, 2.08, -5.2)
  mainCliffBack.receiveShadow = true
  mainCliffBack.castShadow = true
  group.add(mainCliffBack)

  // Mid-level retaining terrace on right side (x = +1.2 to +9.95, z = -3.3 to +0.55, y = 0 to 4.12)
  const rightCliffUpper = new THREE.Mesh(new THREE.BoxGeometry(8.75, 4.12, 3.95), sandstoneMat)
  rightCliffUpper.position.set(5.58, 2.08, -1.4)
  rightCliffUpper.receiveShadow = true
  rightCliffUpper.castShadow = true
  group.add(rightCliffUpper)

  // Lower right terrace stone parapet & bluestone walkway landing (y = 2.15)
  const midTerraceDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 2.2), bluestoneMat)
  midTerraceDeck.position.set(7.7, 2.25, 1.25)
  group.add(midTerraceDeck)
  const midTerraceWall = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.2, 2.05), sandstoneMat)
  midTerraceWall.position.set(7.75, 1.1, 1.2)
  midTerraceWall.castShadow = true
  group.add(midTerraceWall)

  // Rain-slick Bluestone Staircase (青石板梯坎) climbing from sidewalk (x=0.1, y=0.16, z=+2.65)
  // up along the retaining wall to the mid-terrace landing (y=2.25) and upper passage (y=4.15)
  const stairsGroup = new THREE.Group()
  group.add(stairsGroup)

  const stepCount1 = 11
  for (let i = 0; i < stepCount1; i++) {
    const t = i / (stepCount1 - 1)
    const sy = 0.22 + i * 0.19
    const sz = 2.6 - i * 0.26
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.18, 0.34), bluestoneMat)
    step.position.set(0.15, sy, sz)
    step.receiveShadow = true
    stairsGroup.add(step)
    // Flanking weathered stone stair cheeks
    for (const cx of [-0.95, 1.25]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.24, sy + 0.32, 0.34), sandstoneMat)
      cheek.position.set(cx, (sy + 0.32) * 0.5, sz)
      stairsGroup.add(cheek)
    }
    if (i % 3 === 0) {
      const railPost = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.72, 6), darkIronMat)
      railPost.position.set(-0.92, sy + 0.5, sz)
      stairsGroup.add(railPost)
    }
    // Subtle snow strip on stair nosings in snow mode
    if (t > 0.05) {
      const stepSnow = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.03, 0.12), snowMat)
      stepSnow.position.set(0.15, sy + 0.1, sz - 0.06)
      stepSnow.visible = false
      stairsGroup.add(stepSnow)
      weatherBag.snowMeshes.push(stepSnow)
    }
  }
  // Sloped iron handrail alongside lower bluestone stairs
  const railVec = new THREE.Vector3(0, 1.95, -2.65)
  const handrail1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, railVec.length(), 6),
    darkIronMat,
  )
  handrail1.position.set(-0.92, 1.82, 1.32)
  handrail1.rotation.x = Math.atan2(railVec.z, railVec.y)
  stairsGroup.add(handrail1)

  // Mid-landing platform at top of first flight (y = 2.25, z = -0.35 to -1.35)
  const stairLanding = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.25, 1.35), sandstoneMat)
  stairLanding.position.set(0.15, 1.12, -0.82)
  stairsGroup.add(stairLanding)
  const stairLandingTop = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.12, 1.4), bluestoneMat)
  stairLandingTop.position.set(0.15, 2.28, -0.82)
  stairsGroup.add(stairLandingTop)

  // Upper flight climbing rightwards to Liziba terrace (y = 2.3 -> 4.12)
  for (let i = 0; i < 8; i++) {
    const sy = 2.42 + i * 0.22
    const sx = 0.2 - i * 0.26
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 1.35), bluestoneMat)
    step.position.set(sx, sy, -1.95)
    stairsGroup.add(step)
  }

  // ==================== 3. AUTHENTIC BAYU DIAOJIAOLOU (巴渝吊脚楼) WITH 3D INSTANCED 小青瓦 ROOF TILES ====================
  // Footprint: x in [-8.7, -1.2], z in [-3.4, +1.75], rising 3 stories up to y = 7.1
  const diaoGroup = new THREE.Group()
  group.add(diaoGroup)

  // Cantilevered dark-lacquered timber stilt columns (吊脚立柱) & 穿斗 diagonal braces
  const stiltXs = [-8.45, -6.15, -3.75, -1.45]
  for (const sx of stiltXs) {
    for (const sz of [1.62, -1.15]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 6.4, 10), darkTimberMat)
      col.position.set(sx, 3.28, sz)
      col.castShadow = true
      diaoGroup.add(col)
      // Stone column plinth shoe (柱础)
      const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.22, 10), sandstoneMat)
      shoe.position.set(sx, 0.18, sz)
      diaoGroup.add(shoe)
    }
    // Diagonal timber cantilever brace (吊脚斜撑) supporting overhanging upper floor
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.09), darkTimberMat)
    brace.position.set(sx, 2.28, 1.88)
    brace.rotation.x = 0.55
    diaoGroup.add(brace)
  }

  // Horizontal 穿斗 timber tie beams across facade
  for (const by of [2.52, 4.62, 6.52]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.16, 0.18), darkTimberMat)
    beam.position.set(-4.95, by, 1.72)
    diaoGroup.add(beam)
  }

  // 2nd & 3rd floor wooden pavilion cores (recessed warm lit interior windows + traditional timber framing)
  const floor2Body = new THREE.Mesh(new THREE.BoxGeometry(7.1, 2.05, 4.35), plasterWallMat)
  floor2Body.position.set(-4.95, 3.56, -0.68)
  floor2Body.castShadow = true
  floor2Body.receiveShadow = true
  diaoGroup.add(floor2Body)

  const floor3Body = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.9, 3.65), plasterWallMat)
  floor3Body.position.set(-5.05, 5.56, -0.85)
  floor3Body.castShadow = true
  floor3Body.receiveShadow = true
  diaoGroup.add(floor3Body)

  // Warm illuminated wooden lattice windows on 2nd & 3rd floors of Diaojiaolou
  const warmWinMat = new THREE.MeshStandardMaterial({
    color: 0xffd28c,
    emissive: 0xff9b38,
    emissiveIntensity: 0.96,
    roughness: 0.32,
  })
  weatherBag.emissiveMaterials.push({
    material: warmWinMat,
    rainIntensity: 0.96,
    sunIntensity: 0.24,
    snowIntensity: 0.94,
  })

  const addLatticeWindow = (x: number, y: number, z: number, w: number, h: number) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.1), darkTimberMat)
    frame.position.set(x, y, z)
    diaoGroup.add(frame)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w, h), warmWinMat)
    glow.position.set(x, y, z + 0.055)
    diaoGroup.add(glow)
    // Carved wooden lattice mullion grid (木雕花窗)
    for (let lx = -w * 0.34; lx <= w * 0.35; lx += w * 0.34) {
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.032, h, 0.04), darkTimberMat)
      vBar.position.set(x + lx, y, z + 0.07)
      diaoGroup.add(vBar)
    }
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.032, 0.04), darkTimberMat)
    hBar.position.set(x, y, z + 0.07)
    diaoGroup.add(hBar)
  }

  for (const wx of [-7.35, -5.6, -3.85, -2.2]) {
    addLatticeWindow(wx, 3.62, 1.52, 1.12, 1.05)
  }
  for (const wx of [-6.7, -5.05, -3.4]) {
    addLatticeWindow(wx, 5.58, 0.98, 1.08, 0.96)
  }

  // Carved outward-canted 美人靠 (Meirenkao) balcony balustrades wrapping floors 2 & 3
  const buildMeirenkao = (cx: number, y: number, z: number, width: number) => {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.85), warmTimberMat)
    deck.position.set(cx, y, z)
    diaoGroup.add(deck)
    // Outward-canted top rail & curved seat back
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.07, 0.09), darkTimberMat)
    topRail.position.set(cx, y + 0.56, z + 0.44)
    diaoGroup.add(topRail)
    const seatBench = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, 0.06, 0.26), warmTimberMat)
    seatBench.position.set(cx, y + 0.22, z + 0.24)
    diaoGroup.add(seatBench)
    // Vertical carved balusters canted outward
    const count = Math.floor(width / 0.28)
    for (let i = 0; i <= count; i++) {
      const bx = cx - width * 0.5 + (i / count) * width
      const bal = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.54, 0.04), darkTimberMat)
      bal.position.set(bx, y + 0.3, z + 0.38)
      bal.rotation.x = 0.22
      diaoGroup.add(bal)
    }
    // Overhanging 斗拱 (Dougong) eave brackets beneath balcony deck
    for (let bx = cx - width * 0.44; bx <= cx + width * 0.45; bx += 1.15) {
      const dg1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), darkTimberMat)
      dg1.position.set(bx, y - 0.12, z + 0.18)
      diaoGroup.add(dg1)
      const dg2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.46), warmTimberMat)
      dg2.position.set(bx, y - 0.22, z + 0.08)
      diaoGroup.add(dg2)
    }
  }
  buildMeirenkao(-4.95, 2.58, 1.88, 7.6)
  buildMeirenkao(-5.05, 4.65, 1.38, 6.2)

  // Helper: Authentic curved Bayu Roof with 3D Instanced 小青瓦 (Small Dark-Grey Chinese Roof Tiles),
  // upturned eaves (飞檐翘角), ridge finials, warm amber under-eave glow & matte snow blanket!
  const tileCylGeo = new THREE.CylinderGeometry(0.055, 0.062, 1.0, 6, 1, false, 0, Math.PI)
  tileCylGeo.rotateX(Math.PI / 2)
  const underEaveGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffd280,
    emissive: 0xff9428,
    emissiveIntensity: 0.92,
  })
  weatherBag.emissiveMaterials.push({
    material: underEaveGlowMat,
    rainIntensity: 0.92,
    sunIntensity: 0.15,
    snowIntensity: 0.9,
  })

  const buildChineseTileRoof = (
    cx: number,
    baseY: number,
    cz: number,
    width: number,
    depth: number,
    ridgeH: number,
    hasBackSlope = true,
  ) => {
    const roofGrp = new THREE.Group()
    roofGrp.position.set(cx, baseY, cz)
    diaoGroup.add(roofGrp)

    const halfD = depth * 0.5
    const slopeLen = Math.hypot(halfD, ridgeH)
    const slopeAng = Math.atan2(ridgeH, halfD)

    // Base sloped roof sheathing (front + optional back)
    const frontSlab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.09, slopeLen), tileRoofMat)
    frontSlab.position.set(0, ridgeH * 0.5, halfD * 0.5)
    frontSlab.rotation.x = slopeAng
    frontSlab.castShadow = true
    frontSlab.receiveShadow = true
    roofGrp.add(frontSlab)

    if (hasBackSlope) {
      const backSlab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.09, slopeLen), tileRoofMat)
      backSlab.position.set(0, ridgeH * 0.5, -halfD * 0.5)
      backSlab.rotation.x = -slopeAng
      backSlab.castShadow = true
      roofGrp.add(backSlab)
    }

    // 3D Instanced ribbed 小青瓦 tiles across the roof slope(s)!
    const cols = Math.floor(width / 0.16)
    const sides = hasBackSlope ? 2 : 1
    const instTiles = new THREE.InstancedMesh(tileCylGeo, tileRoofMat, cols * sides)
    const dummy = new THREE.Object3D()
    let idx = 0
    for (let s = 0; s < sides; s++) {
      const dir = s === 0 ? 1 : -1
      for (let i = 0; i < cols; i++) {
        const tx = -width * 0.485 + (i / Math.max(cols - 1, 1)) * (width * 0.97)
        dummy.position.set(tx, ridgeH * 0.5 + 0.055, dir * halfD * 0.5)
        dummy.rotation.set(dir * slopeAng, 0, 0)
        dummy.scale.set(1, 1, slopeLen)
        dummy.updateMatrix()
        instTiles.setMatrixAt(idx++, dummy.matrix)
      }
    }
    instTiles.instanceMatrix.needsUpdate = true
    roofGrp.add(instTiles)

    // Ridge beam + upturned curved corner eaves (飞檐翘角) & ridge finials
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.16, 0.2), tileRoofMat)
    ridge.position.set(0, ridgeH + 0.06, 0)
    roofGrp.add(ridge)
    for (const sx of [-1, 1]) {
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 6), tileRoofMat)
      finial.position.set(sx * (width * 0.5 + 0.16), ridgeH + 0.2, 0)
      finial.rotation.z = -sx * 0.42
      roofGrp.add(finial)

      // Upturned 飞檐 corner sweep at front corners
      const cornerWing = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.52), tileRoofMat)
      cornerWing.position.set(sx * (width * 0.5 + 0.12), 0.16, halfD + 0.08)
      cornerWing.rotation.z = sx * 0.36
      cornerWing.rotation.x = -0.25
      roofGrp.add(cornerWing)
    }

    // Rain gutter & warm amber under-eave LED accent strip
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.07, 0.1), darkIronMat)
    gutter.position.set(0, -0.02, halfD + 0.04)
    roofGrp.add(gutter)
    const eaveGlow = new THREE.Mesh(new THREE.BoxGeometry(width - 0.35, 0.04, 0.06), underEaveGlowMat)
    eaveGlow.position.set(0, -0.05, halfD - 0.12)
    roofGrp.add(eaveGlow)

    // Soft matte snow blanket on roof slope (hidden unless snow climate)
    const snowSlope = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, 0.07, slopeLen - 0.1), snowMat)
    snowSlope.position.set(0, ridgeH * 0.5 + 0.095, halfD * 0.5)
    snowSlope.rotation.x = slopeAng
    snowSlope.visible = false
    roofGrp.add(snowSlope)
    weatherBag.snowMeshes.push(snowSlope)
  }

  // Lower shop canopy roof, mid-tier overhanging eave, and grand crowning Bayu double-slope roof
  buildChineseTileRoof(-4.95, 2.32, 2.28, 7.9, 1.35, 0.45, false)
  buildChineseTileRoof(-5.05, 4.46, 1.75, 6.9, 1.25, 0.42, false)
  buildChineseTileRoof(-5.05, 6.52, -0.75, 6.65, 4.85, 1.48, true)

  // Vertical rain downspout pipe running down Diaojiaolou corner
  const downspout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6.2, 8), darkIronMat)
  downspout.position.set(-1.32, 3.25, 1.74)
  diaoGroup.add(downspout)

  // ==================== 4. THREE REAL 3D RECESSED WARM SHOP INTERIORS ====================
  const warmShopWallMat = new THREE.MeshStandardMaterial({
    color: 0xe6be8a,
    emissive: 0xb86420,
    emissiveIntensity: 0.42,
    roughness: 0.72,
  })
  const steamWispMat = new THREE.MeshBasicMaterial({
    color: 0xfff0dc,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  })
  const streetSteamWisps: Array<{ mesh: THREE.Mesh; baseY: number; phase: number }> = []
  const swayingCurtains: Array<{ mesh: THREE.Mesh; phase: number }> = []
  const streetLanterns: THREE.Group[] = []

  // Helper: Silk Lantern (大红灯笼) with gold tassels & soft halo
  const redSilkMat = new THREE.MeshStandardMaterial({
    color: 0xd9241c,
    emissive: 0xff3b1c,
    emissiveIntensity: 1.24,
    roughness: 0.36,
  })
  weatherBag.emissiveMaterials.push({
    material: redSilkMat,
    rainIntensity: 1.24,
    sunIntensity: 0.5,
    snowIntensity: 1.18,
  })
  const redHaloMat = createHaloMaterial(0xff5226, 0.32)
  weatherBag.haloMaterials.push({
    material: redHaloMat,
    rainOpacity: 0.32,
    sunOpacity: 0.06,
    snowOpacity: 0.28,
  })

  const addSilkLantern = (x: number, y: number, z: number, scale = 1.0) => {
    const l = new THREE.Group()
    l.position.set(x, y, z)
    l.scale.setScalar(scale)
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.25, 5), darkIronMat)
    cord.position.y = -0.12
    l.add(cord)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), redSilkMat)
    body.scale.set(1, 1.26, 1)
    body.position.y = -0.4
    l.add(body)
    const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.04, 8), brassMat)
    capT.position.y = -0.18
    l.add(capT)
    const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.04, 8), brassMat)
    capB.position.y = -0.62
    l.add(capB)
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.04, 0.18, 6), brassMat)
    tassel.position.y = -0.74
    l.add(tassel)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), redHaloMat)
    halo.position.y = -0.4
    l.add(halo)
    group.add(l)
    streetLanterns.push(l)
  }

  // ---------- SHOP 1: 「重庆老火锅」 (x in [-5.6, -1.6], z in [-0.6, +1.65], y in [0.14, 2.35]) ----------
  const hotpotShop = new THREE.Group()
  group.add(hotpotShop)

  // Recessed warm 3D interior room box (back wall, side walls, warm wooden floor & ceiling — open front!)
  const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(3.85, 2.15), warmShopWallMat)
  hpBack.position.set(-3.6, 1.22, -0.55)
  hotpotShop.add(hpBack)
  const hpFloor = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 2.25), warmTimberMat)
  hpFloor.position.set(-3.6, 0.18, 0.55)
  hotpotShop.add(hpFloor)
  const hpCeil = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 2.25), darkTimberMat)
  hpCeil.position.set(-3.6, 2.26, 0.55)
  hotpotShop.add(hpCeil)
  for (const sx of [-5.55, -1.65]) {
    const sWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.15, 2.25), warmShopWallMat)
    sWall.position.set(sx, 1.22, 0.55)
    hotpotShop.add(sWall)
  }

  // Wall Menu inside 「重庆老火锅」: 鲜毛肚·冰球鹅肠·嫩鸭血
  const hpMenuTex = textures.makeSign({
    w: 512,
    h: 192,
    bg: '#3f160d',
    border: '#d6a44e',
    text: '鲜毛肚 · 冰球鹅肠 · 嫩鸭血',
    subtext: '九宫格牛油老锅 · 现炸酥肉 · 冰汤圆',
    color: '#ffeac0',
    subColor: '#ebbc7a',
    serif: true,
  })
  const hpMenu = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.85),
    new THREE.MeshStandardMaterial({
      map: hpMenuTex,
      emissive: 0xffffff,
      emissiveMap: hpMenuTex,
      emissiveIntensity: 0.45,
    }),
  )
  hpMenu.position.set(-3.6, 1.48, -0.5)
  hotpotShop.add(hpMenu)

  // 2 Round Wooden Tables with glowing crimson nine-grid copper hotpots, stools, warm pendant lamps & steam wisps!
  const brothGlowMat = new THREE.MeshStandardMaterial({
    color: 0xd42212,
    emissive: 0xff3b12,
    emissiveIntensity: 1.12,
  })
  const pendantMat = new THREE.MeshStandardMaterial({
    color: 0xffdf9e,
    emissive: 0xffa638,
    emissiveIntensity: 1.25,
  })
  for (const [idx, tx] of [-4.55, -2.65].entries()) {
    const tbl = new THREE.Group()
    tbl.position.set(tx, 0.22, 0.65)
    hotpotShop.add(tbl)
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 14), warmTimberMat)
    top.position.y = 0.54
    tbl.add(top)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 0.52, 10), darkTimberMat)
    leg.position.y = 0.26
    tbl.add(leg)
    // Nine-grid copper hotpot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.11, 14), copperMat)
    pot.position.y = 0.62
    tbl.add(pot)
    const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 14), brothGlowMat)
    broth.position.y = 0.68
    tbl.add(broth)
    for (const o of [-0.055, 0.055]) {
      const gx = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.012), brassMat)
      gx.position.set(0, 0.69, o)
      tbl.add(gx)
      const gz = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.34), brassMat)
      gz.position.set(o, 0.69, 0)
      tbl.add(gz)
    }
    // 3 wooden stools around table
    for (let s = 0; s < 3; s++) {
      const ang = s * 2.1 + 0.5
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.34, 8), darkTimberMat)
      stool.position.set(Math.cos(ang) * 0.66, 0.17, Math.sin(ang) * 0.66)
      tbl.add(stool)
    }
    // Warm hanging pendant lamp directly above each hotpot table
    const pCord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), darkIronMat)
    pCord.position.set(tx, 1.98, 0.65)
    hotpotShop.add(pCord)
    const pShade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 12, 1, true), darkTimberMat)
    pShade.position.set(tx, 1.72, 0.65)
    hotpotShop.add(pShade)
    const pBulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), pendantMat)
    pBulb.position.set(tx, 1.66, 0.65)
    hotpotShop.add(pBulb)
    // Rising hotpot steam wisp
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), steamWispMat)
    wisp.position.set(tx, 1.0, 0.65)
    hotpotShop.add(wisp)
    streetSteamWisps.push({ mesh: wisp, baseY: 0.96, phase: idx * 1.9 })
  }

  // Carved wooden lattice window bays (木雕花窗) framing the recessed front opening
  for (const wx of [-5.25, -3.6, -1.95]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.08, 0.12), darkTimberMat)
    post.position.set(wx, 1.2, 1.64)
    hotpotShop.add(post)
  }
  // Low wooden dado wainscot beneath the open lattice view
  for (const wx of [-4.42, -2.78]) {
    const dado = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.52, 0.09), darkTimberMat)
    dado.position.set(wx, 0.44, 1.64)
    hotpotShop.add(dado)
    // Top decorative carved wooden lattice transom
    const transom = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.24, 0.08), darkTimberMat)
    transom.position.set(wx, 2.1, 1.64)
    hotpotShop.add(transom)
  }

  // Main horizontal signboard: 「重庆老火锅」
  const hpSignTex = textures.makeSign({
    w: 640,
    h: 144,
    bg: '#4b0d09',
    border: '#f0b64e',
    text: '重 庆 老 火 锅',
    subtext: 'OLD CHONGQING NINE-GRID HOTPOT',
    color: '#ffebbf',
    subColor: '#f2ba74',
    serif: true,
    glow: '#ff521c',
  })
  const hpSignMat = new THREE.MeshStandardMaterial({
    map: hpSignTex,
    emissive: 0xffffff,
    emissiveMap: hpSignTex,
    emissiveIntensity: 0.96,
    roughness: 0.3,
  })
  weatherBag.emissiveMaterials.push({
    material: hpSignMat,
    rainIntensity: 0.96,
    sunIntensity: 0.42,
    snowIntensity: 0.9,
  })
  const hpSignBox = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.68, 0.14), darkTimberMat)
  hpSignBox.position.set(-3.6, 2.74, 2.58)
  hotpotShop.add(hpSignBox)
  const hpSignFace = new THREE.Mesh(new THREE.PlaneGeometry(3.26, 0.58), hpSignMat)
  hpSignFace.position.set(-3.6, 2.74, 2.66)
  hotpotShop.add(hpSignFace)

  // Vertical Neon Sign: 「毛肚鸭肠」 protruding over the alley
  const maoduTex = textures.makeSign({
    w: 128,
    h: 448,
    bg: '#380909',
    border: '#ff5a36',
    text: '毛肚鸭肠',
    color: '#ffe8c4',
    glow: '#ff341c',
    vertical: true,
    serif: true,
  })
  const maoduMat = new THREE.MeshStandardMaterial({
    map: maoduTex,
    emissive: 0xff5430,
    emissiveMap: maoduTex,
    emissiveIntensity: 1.15,
  })
  weatherBag.emissiveMaterials.push({
    material: maoduMat,
    rainIntensity: 1.15,
    sunIntensity: 0.35,
    snowIntensity: 1.05,
  })
  const maoduBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.25, 0.62), darkIronMat)
  maoduBox.position.set(-1.38, 3.85, 2.48)
  hotpotShop.add(maoduBox)
  for (const s of [-1, 1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 2.15), maoduMat)
    face.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2
    face.position.set(-1.38 + s * 0.08, 3.85, 2.48)
    hotpotShop.add(face)
  }

  // Crimson silk lanterns hanging along the Diaojiaolou eaves
  for (const lx of [-8.0, -6.5, -5.0, -3.5, -2.0]) {
    addSilkLantern(lx, 2.26, 2.75, 0.95)
  }
  for (const lx of [-7.0, -5.0, -3.0]) {
    addSilkLantern(lx, 4.38, 2.22, 0.82)
  }

  // Stacked green 山城啤酒 plastic crates & bottles outside hotpot entrance
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x1d753b, roughness: 0.55 })
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x2f8f46, roughness: 0.2 })
  for (let cy = 0; cy < 2; cy++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.36), crateMat)
    crate.position.set(-1.72, 0.31 + cy * 0.31, 2.18)
    crate.rotation.y = cy * 0.14
    hotpotShop.add(crate)
    if (cy === 1) {
      for (const bx of [-0.12, 0, 0.12]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 6), bottleMat)
        b.position.set(-1.72 + bx, 0.8, 2.18)
        hotpotShop.add(b)
      }
    }
  }

  // Illuminated sidewalk A-frame signboard
  const aFrameTex = textures.makeSign({
    w: 256,
    h: 320,
    bg: '#38120c',
    border: '#f0b650',
    text: '老火锅',
    subtext: '九宫格 · 鲜毛肚',
    color: '#ffe8be',
    subColor: '#f2b768',
    serif: true,
  })
  const aFrame = new THREE.Group()
  aFrame.position.set(-5.35, 0.16, 2.52)
  aFrame.rotation.y = 0.28
  const af1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.64, 0.04),
    new THREE.MeshStandardMaterial({
      map: aFrameTex,
      emissive: 0xffffff,
      emissiveMap: aFrameTex,
      emissiveIntensity: 0.68,
    }),
  )
  af1.position.set(0, 0.32, 0.08)
  af1.rotation.x = -0.18
  aFrame.add(af1)
  const af2 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.64, 0.04), darkTimberMat)
  af2.position.set(0, 0.32, -0.08)
  af2.rotation.x = 0.18
  aFrame.add(af2)
  hotpotShop.add(aFrame)

  // ---------- SHOP 2: 「山城小面 · 冰粉」 (x in [-8.75, -5.85], z in [-0.4, +1.65]) ----------
  const noodleShop = new THREE.Group()
  group.add(noodleShop)

  const nsBack = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 2.05), warmShopWallMat)
  nsBack.position.set(-7.3, 1.2, -0.35)
  noodleShop.add(nsBack)
  const nsCounter = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.82, 0.68), warmTimberMat)
  nsCounter.position.set(-7.3, 0.58, 0.95)
  noodleShop.add(nsCounter)
  // Stainless stockpot + 3-tier steaming bamboo 蒸笼 on counter
  const stockpot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.22, 0.32, 12),
    new THREE.MeshStandardMaterial({ color: 0xbac3cc, roughness: 0.28, metalness: 0.85 }),
  )
  stockpot.position.set(-7.9, 1.15, 0.95)
  noodleShop.add(stockpot)
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xc9a36a, roughness: 0.78 })
  for (let tier = 0; tier < 3; tier++) {
    const zhenglong = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.11, 12), bambooMat)
    zhenglong.position.set(-6.85, 1.05 + tier * 0.115, 0.95)
    noodleShop.add(zhenglong)
  }
  const noodleSteam = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), steamWispMat)
  noodleSteam.position.set(-6.85, 1.48, 0.95)
  noodleShop.add(noodleSteam)
  streetSteamWisps.push({ mesh: noodleSteam, baseY: 1.42, phase: 0.8 })

  // Striped red-and-cream shop awning
  for (let i = 0; i < 6; i++) {
    const stripeMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0xb82e24 : 0xe8dcc2,
      roughness: 0.82,
    })
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.92), stripeMat)
    strip.position.set(-8.45 + i * 0.46, 2.02, 1.98)
    strip.rotation.x = 0.28
    noodleShop.add(strip)
  }

  // Swaying multi-flap fabric doorway curtain (门帘)
  const curtainBlueMat = new THREE.MeshStandardMaterial({
    color: 0x243b55,
    roughness: 0.86,
    side: THREE.DoubleSide,
  })
  for (let f = 0; f < 4; f++) {
    const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), curtainBlueMat)
    flap.position.set(-7.95 + f * 0.45, 1.78, 1.62)
    noodleShop.add(flap)
    swayingCurtains.push({ mesh: flap, phase: f * 0.7 })
  }

  // Illuminated signboard: 「山城小面 · 冰粉」
  const noodleSignTex = textures.makeSign({
    w: 512,
    h: 128,
    bg: '#521b0c',
    border: '#f2b850',
    text: '山城小面 · 冰粉',
    subtext: '豌杂面 · 红糖冰粉 · 酸辣粉',
    color: '#fff1ce',
    subColor: '#f2c178',
    glow: '#ff8a28',
  })
  const noodleSignMat = new THREE.MeshStandardMaterial({
    map: noodleSignTex,
    emissive: 0xffffff,
    emissiveMap: noodleSignTex,
    emissiveIntensity: 0.88,
  })
  weatherBag.emissiveMaterials.push({
    material: noodleSignMat,
    rainIntensity: 0.88,
    sunIntensity: 0.4,
    snowIntensity: 0.84,
  })
  const noodleSign = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.54), noodleSignMat)
  noodleSign.position.set(-7.3, 2.72, 2.62)
  noodleShop.add(noodleSign)

  // Folding sidewalk table + red plastic stools outside noodle shop
  const redPlasticMat = new THREE.MeshStandardMaterial({ color: 0xc22a22, roughness: 0.42 })
  const foldTable = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.58), warmTimberMat)
  foldTable.position.set(-7.4, 0.62, 2.38)
  noodleShop.add(foldTable)
  for (const [lx, lz] of [
    [-0.32, -0.22],
    [0.32, -0.22],
    [-0.32, 0.22],
    [0.32, 0.22],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 5), darkIronMat)
    leg.position.set(-7.4 + lx!, 0.39, 2.38 + lz!)
    noodleShop.add(leg)
  }
  for (const [sx, sz] of [
    [-7.95, 2.38],
    [-6.85, 2.38],
    [-7.4, 2.82],
  ]) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.32, 8), redPlasticMat)
    stool.position.set(sx!, 0.32, sz!)
    noodleShop.add(stool)
  }

  // ---------- SHOP 3: 「山城茶馆」 (right of bluestone stairs, x in [+2.0, +5.5], z in [+0.4, +1.85]) ----------
  const teaShop = new THREE.Group()
  group.add(teaShop)

  const teaBack = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.02), warmShopWallMat)
  teaBack.position.set(3.75, 1.18, 0.42)
  teaShop.add(teaBack)
  // Recessed wooden tea shelves stocked with colorful ceramic tea canisters
  const canisterColors = [0xc94232, 0x2e7a5a, 0xd4a438, 0x3b6796, 0xe0d6c2]
  for (let row = 0; row < 3; row++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.05, 0.26), darkTimberMat)
    shelf.position.set(3.75, 0.72 + row * 0.42, 0.6)
    teaShop.add(shelf)
    for (let c = 0; c < 8; c++) {
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.19, 8),
        new THREE.MeshStandardMaterial({
          color: canisterColors[(row * 5 + c) % canisterColors.length]!,
          roughness: 0.35,
        }),
      )
      can.position.set(2.55 + c * 0.34, 0.85 + row * 0.42, 0.6)
      teaShop.add(can)
    }
  }
  // Wooden front counter & side mullions
  const teaCounter = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.62, 0.42), darkTimberMat)
  teaCounter.position.set(3.75, 0.47, 1.65)
  teaShop.add(teaCounter)
  for (const px of [2.05, 3.75, 5.45]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.08, 0.14), darkTimberMat)
    p.position.set(px, 1.2, 1.72)
    teaShop.add(p)
  }
  // Swaying 老茶馆 doorway curtain
  const teaCurtainTex = textures.makeSign({
    w: 192,
    h: 192,
    bg: '#6e3020',
    border: '#e0b872',
    text: '老茶馆',
    color: '#fff0d0',
    serif: true,
  })
  const teaCurtainMat = new THREE.MeshStandardMaterial({
    map: teaCurtainTex,
    roughness: 0.85,
    side: THREE.DoubleSide,
  })
  for (const cx of [2.62, 3.18]) {
    const cFlap = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.56), teaCurtainMat)
    cFlap.position.set(cx, 1.82, 1.78)
    teaShop.add(cFlap)
    swayingCurtains.push({ mesh: cFlap, phase: cx })
  }
  // 「山城茶馆」 glowing wooden plaque + tiled eave
  const teaSignTex = textures.makeSign({
    w: 512,
    h: 128,
    bg: '#261b12',
    border: '#d6a44e',
    text: '山 城 茶 馆',
    subtext: '盖碗老茶 · 沱茶 · 十八梯记忆',
    color: '#ffe9be',
    subColor: '#d9b57a',
    serif: true,
    glow: '#e69432',
  })
  const teaSignMat = new THREE.MeshStandardMaterial({
    map: teaSignTex,
    emissive: 0xffffff,
    emissiveMap: teaSignTex,
    emissiveIntensity: 0.78,
  })
  weatherBag.emissiveMaterials.push({
    material: teaSignMat,
    rainIntensity: 0.78,
    sunIntensity: 0.36,
    snowIntensity: 0.75,
  })
  const teaSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), teaSignMat)
  teaSign.position.set(3.75, 2.48, 1.86)
  teaShop.add(teaSign)
  buildChineseTileRoof(3.75, 2.26, 1.98, 3.85, 0.95, 0.34, false)
  addSilkLantern(2.25, 2.22, 2.38, 0.78)
  addSilkLantern(5.25, 2.22, 2.38, 0.78)

  // Retro blue Chongqing enamel street nameplate: 「十八梯 · 8D山城」
  const enamelTex = textures.makeSign({
    w: 384,
    h: 144,
    bg: '#14437a',
    border: '#f0f4fa',
    text: '十八梯 · 8D山城',
    subtext: 'SHIBATI OLD STREET · YUZHONG',
    color: '#ffffff',
    subColor: '#d6e6fa',
  })
  const enamelSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.4),
    new THREE.MeshStandardMaterial({
      map: enamelTex,
      roughness: 0.25,
      metalness: 0.2,
    }),
  )
  enamelSign.position.set(1.75, 1.85, 1.82)
  teaShop.add(enamelSign)

  // ==================== 5. LUSH WEEPING CHONGQING BANYAN TREES (山城黄桷树 · 2,200+ INSTANCED BOTANICAL LEAVES) ====================
  const banyanBarkMat = new THREE.MeshStandardMaterial({
    map: textures.banyanBark,
    roughness: 0.92,
    metalness: 0.02,
  })
  const banyanGroup = new THREE.Group()
  group.add(banyanGroup)

  interface CanopyCenter {
    pos: THREE.Vector3
    rx: number
    ry: number
    rz: number
    count: number
  }
  const canopyCenters: CanopyCenter[] = []

  const buildBanyanTree = (baseX: number, baseY: number, baseZ: number, scale: number, seed: number) => {
    const rand = mulberry32(seed)
    // Gnarly curving main trunk
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(baseX, baseY - 0.1, baseZ),
      new THREE.Vector3(baseX + 0.18 * scale, baseY + 0.95 * scale, baseZ + 0.28 * scale),
      new THREE.Vector3(baseX - 0.12 * scale, baseY + 1.95 * scale, baseZ + 0.45 * scale),
      new THREE.Vector3(baseX + 0.08 * scale, baseY + 2.75 * scale, baseZ + 0.25 * scale),
    ])
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 14, 0.24 * scale, 8, false), banyanBarkMat)
    trunk.castShadow = true
    banyanGroup.add(trunk)

    // Spreading primary boughs
    const boughOffsets = [
      new THREE.Vector3(-1.35, 0.85, 0.65),
      new THREE.Vector3(1.25, 0.95, 0.55),
      new THREE.Vector3(-0.35, 1.25, -0.75),
      new THREE.Vector3(0.75, 0.65, 1.1),
      new THREE.Vector3(-1.05, 0.5, -0.45),
    ]
    const crownBase = new THREE.Vector3(baseX, baseY + 2.35 * scale, baseZ + 0.35 * scale)
    boughOffsets.forEach((off, idx) => {
      const tip = crownBase.clone().add(off.clone().multiplyScalar(scale))
      const mid = crownBase.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, 0.25 * scale, 0))
      const bough = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([crownBase, mid, tip]), 10, 0.095 * scale, 6, false),
        banyanBarkMat,
      )
      bough.castShadow = true
      banyanGroup.add(bough)

      canopyCenters.push({
        pos: tip,
        rx: (1.05 + (idx % 2) * 0.25) * scale,
        ry: 0.68 * scale,
        rz: (0.95 + (idx % 3) * 0.15) * scale,
        count: Math.round(240 * scale),
      })
    })

    // Clinging aerial roots (黄桷树气根) draping down the sandstone retaining wall!
    for (let r = 0; r < 9; r++) {
      const startX = baseX + (rand() - 0.5) * 1.45 * scale
      const startY = baseY + (1.2 + rand() * 1.4) * scale
      const startZ = baseZ + (0.2 + rand() * 0.65) * scale
      const drop = (1.6 + rand() * 1.6) * scale
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, startY, startZ),
        new THREE.Vector3(startX + (rand() - 0.5) * 0.28, startY - drop * 0.5, startZ + 0.14),
        new THREE.Vector3(startX + (rand() - 0.5) * 0.35, Math.max(0.18, startY - drop), startZ + 0.22),
      ])
      const root = new THREE.Mesh(new THREE.TubeGeometry(rootCurve, 10, 0.022 * scale, 5, false), banyanBarkMat)
      banyanGroup.add(root)
    }
  }

  // Hero Weeping Banyan clinging to the sandstone retaining cliff above the staircase & teahouse
  buildBanyanTree(0.95, 2.35, 0.25, 1.08, 701)
  // Second lush banyan framing the right terrace corner
  buildBanyanTree(8.55, 2.35, 1.35, 0.92, 702)

  // 2,200+ GPU-Instanced delicate alpha-cutout multi-leaf foliage clusters with subtle vertex breeze sway!
  // STRICTLY ZERO chunky low-poly spheres/icosahedrons!
  const totalLeafCards = canopyCenters.reduce((acc, c) => acc + c.count, 0)
  const leafCardGeo = new THREE.PlaneGeometry(0.54, 0.54)
  const foliageTimeUniform = { value: 0 }
  const foliageSnowUniform = { value: 0 }

  const leafMat = new THREE.MeshStandardMaterial({
    map: textures.banyanLeafAlpha,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 0.62,
    metalness: 0.04,
  })
  leafMat.onBeforeCompile = (shader) => {
    shader.uniforms.uBreezeTime = foliageTimeUniform
    shader.uniforms.uSnowMix = foliageSnowUniform
    shader.vertexShader =
      `uniform float uBreezeTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        vec4 instWorld = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sway = sin(uBreezeTime * 1.85 + instWorld.x * 1.7 + instWorld.z * 1.3) * 0.045;
        transformed.x += sway * (uv.y);
        transformed.z += cos(uBreezeTime * 1.45 + instWorld.y * 2.1) * 0.032 * (uv.y);
        `,
      )
    shader.fragmentShader =
      `uniform float uSnowMix;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.68, 0.74, 0.8), uSnowMix * 0.42);
        `,
      )
  }

  const foliageInst = new THREE.InstancedMesh(leafCardGeo, leafMat, totalLeafCards)
  const fRand = mulberry32(888)
  const fDummy = new THREE.Object3D()
  const fColor = new THREE.Color()
  let fIdx = 0
  for (const c of canopyCenters) {
    for (let i = 0; i < c.count; i++) {
      // Ellipsoidal organic shell + inner fill distribution
      const u = fRand() * Math.PI * 2
      const v = Math.acos(2 * fRand() - 1)
      const r = Math.pow(fRand(), 0.42)
      const lx = c.pos.x + Math.sin(v) * Math.cos(u) * c.rx * r
      const ly = c.pos.y + Math.cos(v) * c.ry * r
      const lz = c.pos.z + Math.sin(v) * Math.sin(u) * c.rz * r

      fDummy.position.set(lx, ly, lz)
      fDummy.rotation.set(
        (fRand() - 0.5) * 1.8,
        fRand() * Math.PI * 2,
        (fRand() - 0.5) * 1.4,
      )
      const sc = 0.62 + fRand() * 0.68
      fDummy.scale.setScalar(sc)
      fDummy.updateMatrix()
      foliageInst.setMatrixAt(fIdx, fDummy.matrix)

      // Subtle botanical hue/lightness variation across clusters
      fColor.setHSL(0.31 + (fRand() - 0.5) * 0.06, 0.42 + fRand() * 0.16, 0.34 + fRand() * 0.18)
      foliageInst.setColorAt(fIdx, fColor)
      fIdx++
    }
  }
  foliageInst.instanceMatrix.needsUpdate = true
  if (foliageInst.instanceColor) foliageInst.instanceColor.needsUpdate = true
  banyanGroup.add(foliageInst)

  // Scattered wet fallen leaves along bluestone steps & road gutters (auto-hidden in snow!)
  const fallenLeafGeo = new THREE.CircleGeometry(0.055, 5)
  fallenLeafGeo.rotateX(-Math.PI / 2)
  const fallenLeafMat = new THREE.MeshStandardMaterial({
    color: 0x7c6828,
    roughness: 0.35,
    metalness: 0.08,
  })
  const fallenCount = 95
  const fallenLeaves = new THREE.InstancedMesh(fallenLeafGeo, fallenLeafMat, fallenCount)
  const flRand = mulberry32(999)
  for (let i = 0; i < fallenCount; i++) {
    const onStair = i < 25
    const x = onStair ? -0.6 + flRand() * 1.5 : -9.2 + flRand() * 18.4
    const z = onStair ? 0.4 + flRand() * 2.2 : 2.75 + flRand() * 0.55
    const y = onStair ? 0.32 + (2.6 - z) * 0.72 : 0.165
    fDummy.position.set(x, y, z)
    fDummy.rotation.set(0, flRand() * Math.PI * 2, 0)
    fDummy.scale.set(1 + flRand() * 0.5, 1, 0.65 + flRand() * 0.3)
    fDummy.updateMatrix()
    fallenLeaves.setMatrixAt(i, fDummy.matrix)
  }
  fallenLeaves.instanceMatrix.needsUpdate = true
  group.add(fallenLeaves)
  weatherBag.wetLeafMeshes.push(fallenLeaves)

  // ==================== 6. SCULPTED YELLOW CHONGQING TAXIS (重庆黄色“法拉利”出租车) ====================
  const taxiClip = [...dioramaClipPlanes]
  const taxiYellowMat = new THREE.MeshStandardMaterial({
    color: 0xf2b718,
    roughness: 0.24,
    metalness: 0.38,
    clippingPlanes: taxiClip,
  })
  const taxiGreenBeltMat = new THREE.MeshStandardMaterial({
    color: 0x167848,
    roughness: 0.32,
    metalness: 0.25,
    clippingPlanes: taxiClip,
  })
  const taxiGlassMat = new THREE.MeshStandardMaterial({
    color: 0x121d26,
    roughness: 0.1,
    metalness: 0.72,
    transparent: true,
    opacity: 0.58,
    clippingPlanes: taxiClip,
  })
  const taxiDarkMat = new THREE.MeshStandardMaterial({
    color: 0x181b20,
    roughness: 0.65,
    metalness: 0.25,
    clippingPlanes: taxiClip,
  })
  const taxiRimMat = new THREE.MeshStandardMaterial({
    color: 0xd0d8e0,
    roughness: 0.22,
    metalness: 0.88,
    clippingPlanes: taxiClip,
  })
  const taxiHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e2,
    emissive: 0xffe4a8,
    emissiveIntensity: 1.7,
    clippingPlanes: taxiClip,
  })
  const taxiTailMat = new THREE.MeshStandardMaterial({
    color: 0xff2c22,
    emissive: 0xff2218,
    emissiveIntensity: 1.5,
    clippingPlanes: taxiClip,
  })
  const taxiBeaconTex = textures.makeSign({
    w: 256,
    h: 96,
    bg: '#f7f4e8',
    border: '#197848',
    text: '出租 TAXI',
    color: '#c92218',
  })
  const taxiBeaconMat = new THREE.MeshStandardMaterial({
    map: taxiBeaconTex,
    emissive: 0xfff0c8,
    emissiveMap: taxiBeaconTex,
    emissiveIntensity: 1.05,
    clippingPlanes: taxiClip,
  })
  const plateTex = textures.makeSign({
    w: 192,
    h: 64,
    bg: '#164ea6',
    border: '#ffffff',
    text: '渝A·T8816',
    color: '#ffffff',
  })
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.3, clippingPlanes: taxiClip })
  const headlightConeMat = createHaloMaterial(0xffe9b0, 0.22)
  weatherBag.haloMaterials.push({
    material: headlightConeMat,
    rainOpacity: 0.22,
    sunOpacity: 0.03,
    snowOpacity: 0.2,
  })

  // Sculpted car body profile (beveled ExtrudeGeometry for curved hood, slanted windshield & cabin roof)
  const carShape = new THREE.Shape()
  carShape.moveTo(-1.02, 0.14)
  carShape.lineTo(1.04, 0.14)
  carShape.quadraticCurveTo(1.12, 0.22, 1.06, 0.44) // sculpted front bumper & nose
  carShape.lineTo(0.56, 0.5) // curved hood
  carShape.lineTo(0.26, 0.84) // slanted windshield A-pillar
  carShape.lineTo(-0.42, 0.84) // smooth cabin roof
  carShape.lineTo(-0.78, 0.52) // slanted rear glass C-pillar
  carShape.lineTo(-1.04, 0.46) // trunk deck
  carShape.quadraticCurveTo(-1.1, 0.26, -1.02, 0.14)
  const carBodyGeo = new THREE.ExtrudeGeometry(carShape, {
    depth: 0.78,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.045,
    bevelSegments: 3,
  })
  carBodyGeo.translate(0, 0, -0.39)

  interface TaxiInstance {
    group: THREE.Group
    laneZ: number
    dir: number
    speed: number
    x: number
    wheels: THREE.Object3D[]
  }
  const taxis: TaxiInstance[] = []

  const buildYellowTaxi = (startX: number, laneZ: number, dir: number, speed: number) => {
    const taxi = new THREE.Group()
    taxi.position.set(startX, 0.04, laneZ)
    if (dir < 0) taxi.rotation.y = Math.PI
    group.add(taxi)

    // Sculpted yellow body + Chongqing taxi lower green skirt belt
    const body = new THREE.Mesh(carBodyGeo, taxiYellowMat)
    body.castShadow = true
    taxi.add(body)
    const greenSkirt = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.14, 0.91), taxiGreenBeltMat)
    greenSkirt.position.set(0, 0.22, 0)
    taxi.add(greenSkirt)

    // Recessed cabin glass + visible interior seats & driver silhouette
    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.3, 0.8), taxiGlassMat)
    cabinGlass.position.set(-0.08, 0.68, 0)
    taxi.add(cabinGlass)
    const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), taxiDarkMat)
    driverHead.position.set(0.06, 0.68, -0.16)
    taxi.add(driverHead)
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.58), taxiDarkMat)
    seatBack.position.set(-0.08, 0.58, 0)
    taxi.add(seatBack)
    // Windshield & rear glass slopes + thin B-pillar + side mirrors
    const windGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.74), taxiGlassMat)
    windGlass.position.set(0.41, 0.68, 0)
    windGlass.rotation.y = Math.PI / 2
    windGlass.rotation.x = -0.78
    taxi.add(windGlass)
    for (const sz of [-0.46, 0.46]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12), taxiYellowMat)
      mirror.position.set(0.36, 0.56, sz)
      taxi.add(mirror)
    }

    // Dark front radiator grille & crisp blue 渝A license plates (front & rear)
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.42), taxiDarkMat)
    grille.position.set(1.09, 0.31, 0)
    taxi.add(grille)
    const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.08), plateMat)
    frontPlate.rotation.y = Math.PI / 2
    frontPlate.position.set(1.125, 0.2, 0)
    taxi.add(frontPlate)
    const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.08), plateMat)
    rearPlate.rotation.y = -Math.PI / 2
    rearPlate.position.set(-1.11, 0.24, 0)
    taxi.add(rearPlate)

    // Glowing roof 出租 / TAXI beacon
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.44), taxiBeaconMat)
    beacon.position.set(-0.05, 0.94, 0)
    taxi.add(beacon)

    // Dual headlights + crimson taillight clusters + soft Fresnel volumetric headlight cones
    for (const lz of [-0.31, 0.31]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.15), taxiHeadMat)
      hl.position.set(1.08, 0.38, lz)
      taxi.add(hl)
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.17), taxiTailMat)
      tl.position.set(-1.08, 0.38, lz)
      taxi.add(tl)

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.85, 10, 1, true), headlightConeMat)
      cone.rotation.z = Math.PI / 2
      cone.position.set(2.02, 0.32, lz)
      taxi.add(cone)
    }

    // 4 wheels with 5-spoke silver alloy rims
    const wheels: THREE.Object3D[] = []
    for (const wx of [-0.62, 0.64]) {
      for (const wz of [-0.43, 0.43]) {
        const wGrp = new THREE.Group()
        wGrp.position.set(wx, 0.17, wz)
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 14), taxiDarkMat)
        tire.rotation.x = Math.PI / 2
        wGrp.add(tire)
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.145, 10), taxiRimMat)
        rim.rotation.x = Math.PI / 2
        wGrp.add(rim)
        taxi.add(wGrp)
        wheels.push(wGrp)
      }
    }

    taxis.push({ group: taxi, laneZ, dir, speed, x: startX, wheels })
  }

  buildYellowTaxi(-3.8, 4.15, 1, 2.35)
  buildYellowTaxi(5.2, 4.15, 1, 2.35)
  buildYellowTaxi(2.4, 5.85, -1, 2.55)

  // ==================== 7. ARTICULATED MINIATURE PEDESTRIANS WITH 8-RIBBED TRANSLUCENT UMBRELLAS ====================
  interface Pedestrian {
    group: THREE.Group
    umbrella: THREE.Group
    baseX: number
    baseZ: number
    baseY: number
    walkSpan: number
    speed: number
    phase: number
    axis: 'x' | 'stair'
  }
  const pedestrians: Pedestrian[] = []
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6be9e, roughness: 0.68 })
  const pedPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e232a, roughness: 0.8 })
  const umbrellaColors = [
    { color: 0xd8ecff, opacity: 0.56 }, // translucent vinyl umbrella
    { color: 0xd93a32, opacity: 0.88 },
    { color: 0xe8b638, opacity: 0.86 },
    { color: 0x2e788a, opacity: 0.85 },
    { color: 0xeaf4ff, opacity: 0.54 }, // translucent vinyl
  ]
  const coatPalette = [0x2f435a, 0x8f3832, 0x3b5848, 0xb89668, 0x4b425c, 0x2a2e36]

  const buildPedestrian = (
    x: number,
    y: number,
    z: number,
    idx: number,
    axis: 'x' | 'stair',
    walkSpan: number,
  ) => {
    const p = new THREE.Group()
    p.position.set(x, y, z)
    group.add(p)

    const coatMat = new THREE.MeshStandardMaterial({
      color: coatPalette[idx % coatPalette.length]!,
      roughness: 0.72,
    })
    for (const lx of [-0.045, 0.045]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.42, 6), pedPantsMat)
      leg.position.set(lx, 0.21, 0)
      p.add(leg)
    }
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.115, 0.44, 8), coatMat)
    coat.position.y = 0.6
    p.add(coat)
    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.022, 6, 10),
      new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0xc83e32 : 0xdcc498, roughness: 0.85 }),
    )
    scarf.rotation.x = Math.PI / 2
    scarf.position.y = 0.82
    p.add(scarf)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.078, 8, 8), skinMat)
    head.position.y = 0.91
    p.add(head)
    // Shoulder bag
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.12), darkTimberMat)
    bag.position.set(0.11, 0.52, 0.02)
    p.add(bag)

    // 8-ribbed translucent vinyl or colored umbrella with curved handle (auto-tucked in sun!)
    const umb = new THREE.Group()
    umb.position.set(0.09, 0.96, 0.04)
    p.add(umb)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.44, 5), darkIronMat)
    shaft.position.y = 0.1
    umb.add(shaft)
    const uSpec = umbrellaColors[idx % umbrellaColors.length]!
    const canopyMat = new THREE.MeshStandardMaterial({
      color: uSpec.color,
      roughness: 0.22,
      metalness: 0.08,
      transparent: uSpec.opacity < 0.8,
      opacity: uSpec.opacity,
      side: THREE.DoubleSide,
    })
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.13, 8, 1, true),
      canopyMat,
    )
    canopy.position.y = 0.28
    umb.add(canopy)
    // 8 thin metal umbrella ribs radiating outward
    for (let r = 0; r < 8; r++) {
      const ang = (r / 8) * Math.PI * 2
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.33, 4), darkIronMat)
      rib.position.set(Math.cos(ang) * 0.15, 0.27, Math.sin(ang) * 0.15)
      rib.rotation.z = -Math.cos(ang) * 1.18
      rib.rotation.x = Math.sin(ang) * 1.18
      umb.add(rib)
    }

    pedestrians.push({
      group: p,
      umbrella: umb,
      baseX: x,
      baseZ: z,
      baseY: y,
      walkSpan,
      speed: 0.35 + (idx % 3) * 0.12,
      phase: idx * 1.1,
      axis,
    })
  }

  buildPedestrian(-6.4, 0.16, 2.55, 0, 'x', 1.4)
  buildPedestrian(-3.1, 0.16, 2.62, 1, 'x', 1.8)
  buildPedestrian(-1.2, 0.16, 2.48, 2, 'x', 1.1)
  buildPedestrian(2.6, 0.16, 2.52, 3, 'x', 1.7)
  buildPedestrian(5.6, 0.16, 2.45, 4, 'x', 1.5)
  buildPedestrian(0.05, 0.65, 1.95, 5, 'stair', 0.85)
  buildPedestrian(0.35, 1.48, 0.85, 6, 'stair', 0.72)
  buildPedestrian(-4.6, 0.16, 2.75, 7, 'x', 1.3)

  // ==================== 8. DENSE FOREGROUND STREET PROPS ====================
  // Flush dark-iron storm-drain grates (雨水篦子) & embossed cast-iron manhole covers
  const grateMat = new THREE.MeshStandardMaterial({ map: textures.stormGrate, roughness: 0.45, metalness: 0.75 })
  const manholeMat = new THREE.MeshStandardMaterial({
    map: textures.manholeCover,
    transparent: true,
    roughness: 0.48,
    metalness: 0.72,
  })
  for (const gx of [-7.5, -2.2, 3.2, 7.6]) {
    const grate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), grateMat)
    grate.rotation.x = -Math.PI / 2
    grate.position.set(gx, 0.045, 3.18)
    group.add(grate)
  }
  for (const [mx, mz] of [
    [-4.8, 4.95],
    [4.4, 4.95],
    [-0.9, 6.1],
  ]) {
    const mh = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18), manholeMat)
    mh.rotation.x = -Math.PI / 2
    mh.position.set(mx!, 0.045, mz!)
    group.add(mh)
  }

  // Black-and-yellow roadside bollards & pedestrian guardrails along sidewalk curb (z = 2.98)
  const bollardYellowMat = new THREE.MeshStandardMaterial({ color: 0xe6b220, roughness: 0.42 })
  for (const bx of [-8.8, -6.2, -3.9, -1.35, 1.55, 4.2, 6.8, 8.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.64, 8), darkIronMat)
    post.position.set(bx, 0.46, 2.96)
    group.add(post)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.14, 8), bollardYellowMat)
    band.position.set(bx, 0.62, 2.96)
    group.add(band)
  }
  // Guardrail segments flanking the crosswalk
  for (const [x1, x2] of [
    [-8.7, -1.4],
    [1.6, 8.8],
  ]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(x2! - x1!, 0.04, 0.04), bollardYellowMat)
    rail.position.set((x1! + x2!) * 0.5, 0.66, 2.96)
    group.add(rail)
  }

  // Red cast-iron fire hydrant on sidewalk
  const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xc2221c, roughness: 0.36, metalness: 0.25 })
  const hydrant = new THREE.Group()
  hydrant.position.set(6.15, 0.16, 2.75)
  const hyBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.46, 10), hydrantMat)
  hyBody.position.y = 0.23
  hydrant.add(hyBody)
  const hyCap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), hydrantMat)
  hyCap.position.y = 0.48
  hydrant.add(hyCap)
  const hyNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 8), hydrantMat)
  hyNozzle.rotation.z = Math.PI / 2
  hyNozzle.position.y = 0.34
  hydrant.add(hyNozzle)
  group.add(hydrant)

  // 2 Parked delivery e-scooters (外卖电瓶车) with yellow & blue insulated boxes
  const buildScooter = (sx: number, sz: number, rotY: number, boxColor: number) => {
    const sc = new THREE.Group()
    sc.position.set(sx, 0.16, sz)
    sc.rotation.y = rotY
    group.add(sc)
    for (const wx of [-0.28, 0.28]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 10), darkIronMat)
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(wx, 0.12, 0)
      sc.add(wheel)
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.22), darkIronMat)
    deck.position.set(0, 0.2, 0)
    sc.add(deck)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.52, 6), darkIronMat)
    stem.position.set(0.24, 0.44, 0)
    stem.rotation.z = 0.2
    sc.add(stem)
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 6), darkIronMat)
    bar.rotation.x = Math.PI / 2
    bar.position.set(0.2, 0.68, 0)
    sc.add(bar)
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.3, 0.28),
      new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.45 }),
    )
    box.position.set(-0.22, 0.48, 0)
    sc.add(box)
  }
  buildScooter(-5.85, 2.55, 0.35, 0xf2b718) // Yellow Meituan-style insulated box
  buildScooter(5.65, 2.48, -0.45, 0x2088e6) // Blue Ele.me-style insulated box

  // 3 Detailed Utility Poles with ceramic insulators, pole-mounted transformers, streetlamps + Fresnel halos & sagging overhead wires!
  const polePositions: Array<[number, number]> = [
    [-8.6, 2.86],
    [-0.95, 2.86],
    [7.4, 2.86],
  ]
  const insulatorMat = new THREE.MeshStandardMaterial({ color: 0xdce4ea, roughness: 0.25 })
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe6b0,
    emissive: 0xffb84d,
    emissiveIntensity: 1.55,
  })
  weatherBag.emissiveMaterials.push({
    material: lampBulbMat,
    rainIntensity: 1.55,
    sunIntensity: 0.22,
    snowIntensity: 1.42,
  })
  const lampHaloMat = createHaloMaterial(0xffb858, 0.36)
  weatherBag.haloMaterials.push({
    material: lampHaloMat,
    rainOpacity: 0.36,
    sunOpacity: 0.04,
    snowOpacity: 0.32,
  })

  polePositions.forEach(([px, pz], idx) => {
    const pole = new THREE.Group()
    pole.position.set(px, 0.16, pz)
    group.add(pole)

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 5.2, 10), darkIronMat)
    mast.position.y = 2.6
    mast.castShadow = true
    pole.add(mast)

    // Cross-arm & ceramic insulators
    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.15), darkIronMat)
    crossArm.position.set(0, 4.55, 0)
    pole.add(crossArm)
    for (const iz of [-0.46, -0.18, 0.18, 0.46]) {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.11, 8), insulatorMat)
      ins.position.set(0, 4.64, iz)
      pole.add(ins)
    }

    // Pole-mounted cylindrical transformer on outer poles
    if (idx !== 1) {
      const trans = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.56, 12), darkIronMat)
      trans.position.set(0.16, 3.85, -0.18)
      pole.add(trans)
    }

    // Streetlamp arm & warm glowing luminaire + Fresnel volumetric halo
    const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.95), darkIronMat)
    lampArm.position.set(0, 4.98, 0.45)
    pole.add(lampArm)
    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.42), darkIronMat)
    lampHead.position.set(0, 4.96, 0.9)
    pole.add(lampHead)
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), lampBulbMat)
    bulb.position.set(0, 4.9, 0.9)
    pole.add(bulb)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 10), lampHaloMat)
    halo.position.set(0, 4.88, 0.9)
    pole.add(halo)

    // Warm downward streetlamp pool light
    const sLight = new THREE.PointLight(0xffb55c, 5.2, 9.5, 1.5)
    sLight.position.set(px, 4.7, pz + 0.9)
    group.add(sLight)
    weatherBag.pointLights.push({
      light: sLight,
      rainIntensity: 5.2,
      sunIntensity: 0.4,
      snowIntensity: 4.8,
    })
  })

  // Sagging tangled overhead utility wires crisscrossing the alley
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x16191e, roughness: 0.7 })
  const addSagWire = (a: THREE.Vector3, b: THREE.Vector3, sag: number) => {
    const mid = a.clone().lerp(b, 0.5)
    mid.y -= sag
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b]), 16, 0.012, 4, false),
      wireMat,
    )
    group.add(mesh)
  }
  for (const iz of [-0.46, 0.18, 0.46]) {
    addSagWire(new THREE.Vector3(-8.6, 4.78, 2.86 + iz), new THREE.Vector3(-0.95, 4.78, 2.86 + iz), 0.34 + Math.abs(iz) * 0.22)
    addSagWire(new THREE.Vector3(-0.95, 4.78, 2.86 + iz), new THREE.Vector3(7.4, 4.78, 2.86 + iz), 0.38 + Math.abs(iz) * 0.25)
  }
  // Cross-alley service drops into the Diaojiaolou & Teahouse eaves
  addSagWire(new THREE.Vector3(-0.95, 4.75, 2.4), new THREE.Vector3(-3.8, 4.55, 1.65), 0.24)
  addSagWire(new THREE.Vector3(-0.95, 4.75, 2.4), new THREE.Vector3(3.6, 2.95, 1.75), 0.28)

  // Warm recessed shop interior point lights so interiors glow genuinely from inside!
  const hpInteriorLight = new THREE.PointLight(0xff7228, 7.8, 7.5, 1.5)
  hpInteriorLight.position.set(-3.6, 1.6, 0.75)
  group.add(hpInteriorLight)
  const noodleLight = new THREE.PointLight(0xffa442, 4.8, 6.0, 1.5)
  noodleLight.position.set(-7.3, 1.6, 1.1)
  group.add(noodleLight)
  const teaLight = new THREE.PointLight(0xffb454, 5.2, 6.2, 1.5)
  teaLight.position.set(3.75, 1.55, 1.15)
  group.add(teaLight)
  weatherBag.pointLights.push(
    { light: hpInteriorLight, rainIntensity: 7.8, sunIntensity: 3.0, snowIntensity: 7.4 },
    { light: noodleLight, rainIntensity: 4.8, sunIntensity: 2.0, snowIntensity: 4.5 },
    { light: teaLight, rainIntensity: 5.2, sunIntensity: 2.2, snowIntensity: 5.0 },
  )

  // ==================== ANIMATION ====================
  const update = (time: number, dt: number, convergence: boolean, weather: DioramaWeather) => {
    roadUniforms.uTime.value = time
    const targetWet = weather === 'rain' ? 1.0 : weather === 'snow' ? 0.32 : 0.08
    const targetSnow = weather === 'snow' ? 1.0 : 0.0
    const targetSun = weather === 'sun' ? 1.0 : 0.0
    const k = Math.min(1, dt * 4.0)
    roadUniforms.uWetness.value += (targetWet - roadUniforms.uWetness.value) * k
    roadUniforms.uSnow.value += (targetSnow - roadUniforms.uSnow.value) * k
    roadUniforms.uSun.value += (targetSun - roadUniforms.uSun.value) * k

    foliageTimeUniform.value = time
    foliageSnowUniform.value += (targetSnow - foliageSnowUniform.value) * k

    // Yellow taxis gliding along wet road (in convergence, stage them dramatically across the alley center!)
    taxis.forEach((t, idx) => {
      if (convergence) {
        const targetX = idx === 0 ? -2.2 + Math.sin(time * 0.9) * 0.8 : idx === 1 ? 4.4 : 1.1 - Math.sin(time * 0.9) * 0.8
        t.x += (targetX - t.x) * Math.min(1, dt * 3.0)
      } else {
        t.x += t.dir * t.speed * dt
        if (t.x > HALF_W + 1.8) t.x = -HALF_W - 1.8
        if (t.x < -HALF_W - 1.8) t.x = HALF_W + 1.8
      }
      t.group.position.x = t.x
      for (const w of t.wheels) {
        w.rotation.z -= t.speed * dt * 4.2
      }
    })

    // Miniature pedestrians walking gently with umbrellas (tucked away on sunny afternoons)
    const showUmbrella = weather !== 'sun'
    for (const ped of pedestrians) {
      ped.umbrella.visible = showUmbrella
      const osc = Math.sin(time * ped.speed + ped.phase)
      const bob = Math.abs(Math.sin(time * ped.speed * 5.2 + ped.phase)) * 0.03
      if (ped.axis === 'x') {
        ped.group.position.x = ped.baseX + osc * ped.walkSpan
        ped.group.position.y = ped.baseY + bob
        ped.group.rotation.y = Math.cos(time * ped.speed + ped.phase) > 0 ? Math.PI / 2 : -Math.PI / 2
      } else {
        const u = osc * 0.5 + 0.5
        ped.group.position.z = ped.baseZ - u * ped.walkSpan
        ped.group.position.y = ped.baseY + u * ped.walkSpan * 0.72 + bob
        ped.group.rotation.y = Math.cos(time * ped.speed + ped.phase) > 0 ? Math.PI : 0
      }
    }

    // Swaying fabric doorway curtains (门帘) & silk lanterns
    for (const c of swayingCurtains) {
      c.mesh.rotation.x = Math.sin(time * 2.1 + c.phase) * 0.14
    }
    streetLanterns.forEach((l, idx) => {
      l.rotation.z = Math.sin(time * 1.5 + idx * 0.9) * 0.055
    })

    // Rising shop steam wisps
    for (const s of streetSteamWisps) {
      const cyc = (time * 0.45 + s.phase) % 1
      s.mesh.position.y = s.baseY + cyc * 0.9
      const sc = 0.6 + cyc * 1.15
      s.mesh.scale.set(sc, sc * 1.1, sc)
    }
  }

  return {
    group,
    weatherBag,
    update,
    getStreetStatus: () => '0m 梯坎老街 · 烟火正浓',
  }
}
