/**
 * 微光之境 · 漂浮岛与水体
 * 草地、岩体、雪山、瀑布、溪流、湖泊、礁石。
 */
import * as THREE from 'three'
import {
  ISLAND_R,
  ISLAND_TOP,
  LAKE,
  MOUNTAIN,
  RIVER_POINTS,
  carvedHeight,
  groundHeight,
  lakeFactor,
  mulberry32,
  riverDistance,
  smoothstep,
} from './layout'
import { mistTexture } from './textures'

export interface TerrainSystem {
  group: THREE.Group
  update: (time: number, day: number) => void
}

/* ------------------------------------------------------------------ */
/* 草地                                                                */
/* ------------------------------------------------------------------ */

function buildGrassCap(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.015, ISLAND_R, 180, 32)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const c = new THREE.Color()
  const sand = new THREE.Color(0x8a7d58)

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let z = pos.getZ(i)
    const r = Math.hypot(x, z)
    const a = Math.atan2(z, x)
    // 不规则岛缘
    const edge = 1 + 0.03 * Math.sin(a * 5.3 + 0.7) + 0.018 * Math.sin(a * 9.1 - 1.4)
    x *= edge
    z *= edge
    pos.setXYZ(i, x, carvedHeight(x, z), z)

    const n =
      0.5 +
      0.3 * Math.sin(x * 3.1 + z * 1.7) +
      0.2 * Math.cos(x * 1.4 - z * 3.4 + 1.2)
    c.setHSL(0.3 + 0.045 * n, 0.35 + 0.12 * n, 0.25 + 0.09 * n)
    if (r > ISLAND_R * 0.9) c.multiplyScalar(0.82)

    // 河岸与湖岸过渡成湿润的沙土色
    c.lerp(sand, 0.52 * smoothstep(0.46, 0.1, riverDistance(x, z)))
    c.lerp(sand, 0.34 * smoothstep(1.3, 1.02, lakeFactor(x, z)))
    colors.push(c.r, c.g, c.b)
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  return mesh
}

/** 岛缘泥土 / 苔藓层 */
function buildRim(): THREE.Group {
  const group = new THREE.Group()

  const moss = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_R * 1.008, ISLAND_R * 1.012, 0.12, 128, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x324a2c, roughness: 1 }),
  )
  moss.position.y = ISLAND_TOP - 0.075
  moss.castShadow = true
  moss.receiveShadow = true
  group.add(moss)

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_R * 1.003, ISLAND_R * 0.96, 0.2, 128, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 1 }),
  )
  soil.position.y = ISLAND_TOP - 0.235
  soil.receiveShadow = true
  group.add(soil)

  return group
}

/* ------------------------------------------------------------------ */
/* 岩体底部                                                            */
/* ------------------------------------------------------------------ */

function buildUnderside(): THREE.Mesh {
  const rows = 18
  const seg = 96
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const bottomY = ISLAND_TOP - 0.28 - 1.2
  const c = new THREE.Color()

  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const y = ISLAND_TOP - 0.28 - 1.2 * t
    const baseR = ISLAND_R * Math.pow(1 - t, 0.62)

    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2
      const wobble =
        1 +
        0.1 * Math.sin(a * 4 + t * 6.2) +
        0.055 * Math.sin(a * 9 - t * 3.1) +
        0.03 * Math.sin(a * 17 + t * 9.5)
      const r = Math.max(0.012, baseR * wobble)
      positions.push(
        Math.cos(a) * r,
        y + 0.05 * Math.sin(a * 6 + t * 11) * (1 - t),
        Math.sin(a) * r,
      )

      const grit = 0.5 + 0.5 * Math.sin(a * 7.3 + t * 18.0)
      if (t < 0.18) {
        c.set(0x4d3d2b).lerp(new THREE.Color(0x5c4a33), grit * 0.7)
      } else {
        c.set(0x39434b).lerp(new THREE.Color(0x56626c), grit * 0.55)
        c.multiplyScalar(1 - 0.22 * t)
      }
      colors.push(c.r, c.g, c.b)
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let s = 0; s < seg; s++) {
      const a = i * (seg + 1) + s
      const b = a + 1
      const cc = a + seg + 1
      const d = cc + 1
      indices.push(a, b, cc, b, d, cc)
    }
  }

  const centerIndex = positions.length / 3
  positions.push(0, bottomY - 0.14, 0)
  c.set(0x2b343c)
  colors.push(c.r, c.g, c.b)
  const lastRing = rows * (seg + 1)
  for (let s = 0; s < seg; s++) {
    indices.push(lastRing + s, lastRing + s + 1, centerIndex)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.02,
      flatShading: true,
    }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/* ------------------------------------------------------------------ */
/* 雪山                                                                */
/* ------------------------------------------------------------------ */

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

function fbm(x: number, y: number): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < 4; i++) {
    value += amplitude * valueNoise(x * frequency, y * frequency)
    frequency *= 2.03
    amplitude *= 0.5
  }
  return value / 0.9375
}

function massifHeight(x: number, z: number): number {
  const env = smoothstep(1.95, 1.05, Math.hypot(x, (z + 0.7) * 0.92))
  if (env <= 0) return 0

  const main = Math.hypot(x - 0.02, z + 0.6)
  const left = Math.hypot(x + 0.95, z + 0.35)
  const right = Math.hypot(x - 0.98, z + 0.55)
  const back = Math.hypot(x + 0.2, z + 1.45)

  let h =
    2.85 * Math.pow(Math.max(0, 1 - main / 1.12), 1.0) +
    1.8 * Math.pow(Math.max(0, 1 - left / 0.9), 1.05) +
    1.6 * Math.pow(Math.max(0, 1 - right / 0.85), 1.05) +
    1.9 * Math.pow(Math.max(0, 1 - back / 1.0), 1.1)

  // 只保留低频起伏，避免山脊变成杂乱尖刺
  h *= 0.92 + 0.16 * fbm(x * 1.7 + 3.4, z * 1.7 - 2.2)

  // 在瀑布位置刻出浅冲沟，让水流真正嵌在山体里
  const notch = Math.exp(-Math.pow((x - 0.05) / 0.2, 2)) * smoothstep(1.0, 0.18, z)
  h *= 1 - 0.14 * notch

  h += 0.12 * (fbm(x * 4.5 - 2.1, z * 4.5 + 5.3) - 0.5) * env
  return Math.max(0, h) * env
}

function buildMountainMassif(): THREE.Group {
  const group = new THREE.Group()
  const rings = 78
  const segments = 160
  const radius = 2.26
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rings; i++) {
    const r = (i / rings) * radius + 0.008
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      // 山体从岛面长出来；没有山的地方沉在草地之下，被草地遮住
      positions.push(x, carvedHeight(x, z) + massifHeight(x, z) - 0.06, z)
    }
  }

  for (let i = 0; i < rings; i++) {
    for (let s = 0; s < segments; s++) {
      const a = i * (segments + 1) + s
      const b = a + 1
      const c = a + segments + 1
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute
  const colors: number[] = []
  const snow = new THREE.Color(0xf2f9ff)
  const ice = new THREE.Color(0xcfe0ed)
  const rockLow = new THREE.Color(0x293e51)
  const rockHigh = new THREE.Color(0x647a8e)
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const rel = Math.max(0, (y - carvedHeight(x, z)) / 3.0)
    const slope = 1 - nor.getY(i)
    const n1 = fbm(x * 3.1 + 11.7, z * 3.1 - 7.4)
    const n2 = fbm(x * 6.8 - 4.2, z * 6.8 + 9.1)

    const line = 0.42 + 0.1 * n1 - 0.08 * slope
    let snowFrac = smoothstep(line - 0.02, line + 0.09, rel)
    snowFrac = Math.max(snowFrac, smoothstep(0.64, 0.74, rel))
    snowFrac *= 0.92 + 0.08 * (1 - Math.min(1, slope))
    if (rel > 0.24 && n2 > 0.71) snowFrac = Math.min(1, snowFrac + 0.28)

    const rock = rockLow.clone().lerp(rockHigh, 0.2 + 0.55 * rel + 0.2 * n1)
    rock.multiplyScalar(0.8 + 0.2 * n2)
    c.copy(rock).lerp(snow, snowFrac)
    if (rel > 0.8) c.lerp(ice, (rel - 0.8) * 0.3)
    if (slope > 0.6 && snowFrac < 0.6) c.multiplyScalar(0.9)
    colors.push(c.r, c.g, c.b)
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.01,
      envMapIntensity: 0.35,
    }),
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  group.add(mesh)

  // 山坡上的岩脊与露头，打破过于光滑的轮廓
  const rng = mulberry32(771)
  const outcropMat = new THREE.MeshStandardMaterial({
    color: 0x4b5b66,
    roughness: 0.96,
    flatShading: true,
  })
  const outcrops = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16, 0), outcropMat, 16)
  let placed = 0
  let guard = 0
  const outDummy = new THREE.Object3D()
  while (placed < 16 && guard < 120) {
    guard++
    const a = rng() * Math.PI * 2
    const r = 0.45 + rng() * 0.95
    const x = 0.02 + Math.cos(a) * r
    const z = -0.6 + Math.sin(a) * r * 0.9
    if (z > 0.1) continue
    const h = massifHeight(x, z)
    if (h < 0.35 || h > 1.15) continue
    const s = 0.12 + rng() * 0.22
    outDummy.position.set(x, carvedHeight(x, z) + h - 0.035, z)
    outDummy.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    outDummy.scale.set(s * (0.8 + rng() * 0.7), s * 0.55, s * (0.8 + rng() * 0.7))
    outDummy.updateMatrix()
    outcrops.setMatrixAt(placed, outDummy.matrix)
    placed++
  }
  outcrops.count = placed
  outcrops.castShadow = true
  outcrops.receiveShadow = true
  group.add(outcrops)

  // 山脚碎石
  const rockGeo = new THREE.DodecahedronGeometry(0.1, 0)
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x66727b,
    roughness: 0.95,
    flatShading: true,
  })
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 18)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 18; i++) {
    const a = rng() * Math.PI * 2
    const r = MOUNTAIN.radius * (0.8 + rng() * 0.75)
    const px = MOUNTAIN.x + Math.cos(a) * r
    const pz = MOUNTAIN.z + Math.sin(a) * r * 0.85
    const s = 0.6 + rng() * 1.6
    dummy.position.set(px, groundHeight(px, pz) + 0.015, pz)
    dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    dummy.scale.set(s, s * 0.75, s)
    dummy.updateMatrix()
    rocks.setMatrixAt(i, dummy.matrix)
  }
  rocks.castShadow = true
  rocks.receiveShadow = true
  group.add(rocks)

  return group
}

/* ------------------------------------------------------------------ */
/* 瀑布                                                                */
/* ------------------------------------------------------------------ */

const WATERFALL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOpacity;
  uniform float uSeed;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    // 水流必须向 vUv.y 减小的方向（下方）移动
    float flow = vUv.y * 5.0 + uTime * uSpeed;
    float n = noise(vec2(vUv.x * 6.0 + uSeed, flow));
    float fine = noise(vec2(vUv.x * 22.0, flow * 1.8));
    float streak = smoothstep(0.34, 0.86, n * 0.72 + fine * 0.28);
    float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
    float head = smoothstep(1.0, 0.78, vUv.y);
    float alpha = (0.18 + streak * 0.62) * edge * (0.7 + head * 0.3) * uOpacity;
    float topFade = smoothstep(1.0, 0.72, vUv.y);
    alpha *= topFade;
    alpha *= smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    vec3 col = mix(uColorA, uColorB, streak * 0.8 + fine * 0.2);
    col = mix(col, vec3(0.92, 0.98, 1.0), (1.0 - edge) * 0.2);
    gl_FragColor = vec4(col, alpha);
  }
`

const WATERFALL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

function cascadeGeometry(
  widthTop: number,
  widthBottom: number,
  zTop: number,
  zBottom: number,
  seed: number,
  liftBase: number,
  liftGain: number,
  cols = 8,
): THREE.BufferGeometry {
  const segments = 64
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= segments; i++) {
    const v = i / segments
    const z = THREE.MathUtils.lerp(zTop, zBottom, v)
    // 越往下越向外探出，形成落水弧线，而不是贴在坡面上的贴花
    const zOut = z + 0.07 * v * v
    const centerX = 0.05 + 0.024 * Math.sin(v * 5.5 + seed)
    const width = THREE.MathUtils.lerp(widthTop, widthBottom, v)
    const lift = liftBase + liftGain * v * v

    for (let j = 0; j <= cols; j++) {
      const u = j / cols
      const x = centerX + (u - 0.5) * width
      const y = carvedHeight(x, z) + massifHeight(x, z) + lift
      positions.push(x, y, zOut)
      uvs.push(u, 1 - v)
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + 1
      const c = a + cols + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildCascadeLayer(
  widthTop: number,
  widthBottom: number,
  zTop: number,
  zBottom: number,
  seed: number,
  speed: number,
  opacity: number,
  colorA: number,
  colorB: number,
): THREE.Mesh {
  const geo = cascadeGeometry(widthTop, widthBottom, zTop, zBottom, seed, 0.012, 0.024)

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
      uSeed: { value: seed },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    },
    vertexShader: WATERFALL_VERT,
    fragmentShader: WATERFALL_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = 2
  return mesh
}

interface WaterDynamics {
  update: (time: number, day: number) => void
}

function buildWaterfall(): { group: THREE.Group; dynamics: WaterDynamics } {
  const group = new THREE.Group()

  // 瀑布贴着山体表面流下，从雪坡一路汇入河道
  const layers: THREE.Mesh[] = [
    buildCascadeLayer(0.38, 0.6, 0.1, 0.95, 3.1, 1.35, 0.9, 0x66b8d8, 0xf2fbff),
    buildCascadeLayer(0.58, 0.85, 0.12, 0.95, 9.7, 0.9, 0.26, 0x4ea8c8, 0xd8f4ff),
  ]
  for (const layer of layers) group.add(layer)

  // 瀑底落水潭，接住瀑布并让河流从这里出发
  const poolY = carvedHeight(0.05, 0.95) + 0.065
  const pool = new THREE.Mesh(
    irregularDisc(0.1, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x247f8f,
      roughness: 0.05,
      metalness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.7,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    }),
  )
  pool.rotation.x = -Math.PI / 2
  pool.scale.set(0.38, 0.3, 1)
  pool.position.set(0.06, poolY + 0.002, 0.98)
  pool.renderOrder = 1
  group.add(pool)

  // 瀑底与瀑身水雾
  const mist = mistTexture()
  const sprays: THREE.Sprite[] = []
  const sprayBase: THREE.Vector3[] = []
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({
      map: mist,
      color: 0xd8f4ff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const sprite = new THREE.Sprite(mat)
    const base = new THREE.Vector3(
      0.05 + (i - 2.5) * 0.1,
      i < 4 ? poolY + 0.06 + i * 0.03 : poolY + 0.32 + (i - 4) * 0.22,
      0.95 + (i % 2) * 0.05,
    )
    sprite.position.copy(base)
    sprite.scale.setScalar(i < 4 ? 0.6 + i * 0.12 : 0.36 + (i - 4) * 0.1)
    sprite.renderOrder = 3
    group.add(sprite)
    sprays.push(sprite)
    sprayBase.push(base)
  }

  const veils: THREE.Sprite[] = []
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.SpriteMaterial({
      map: mist,
      color: 0xcfeaff,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(0.05, poolY + 0.4 + i * 0.35, 0.58)
    sprite.scale.set(0.7, 1.1, 1)
    sprite.renderOrder = 3
    group.add(sprite)
    veils.push(sprite)
  }

  return {
    group,
    dynamics: {
      update(time, day) {
        for (const layer of layers) {
          const mat = layer.material as THREE.ShaderMaterial
          mat.uniforms.uTime.value = time
        }
        for (let i = 0; i < sprays.length; i++) {
          const s = sprays[i]
          const base = sprayBase[i]
          s.position.y = base.y + Math.sin(time * 0.7 + i) * 0.035
          s.position.x = base.x + Math.sin(time * 0.35 + i * 2.1) * 0.06
          s.material.opacity = (1 - day * 0.35) * (0.1 + 0.045 * Math.sin(time * 0.8 + i))
        }
        for (let i = 0; i < veils.length; i++) {
          const v = veils[i]
          v.material.opacity = (1 - day * 0.4) * (0.035 + 0.015 * Math.sin(time * 0.4 + i))
        }
      },
    },
  }
}

/* ------------------------------------------------------------------ */
/* 溪流与湖泊                                                          */
/* ------------------------------------------------------------------ */

function buildRibbon(
  curve: THREE.CatmullRomCurve3,
  widthAt: (t: number) => number,
  yOffset: number,
  segments = 72,
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const p = new THREE.Vector3()
  const tan = new THREE.Vector3()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    curve.getPoint(t, p)
    curve.getTangent(t, tan)
    const sideX = -tan.z
    const sideZ = tan.x
    const len = Math.hypot(sideX, sideZ) || 1
    const w = widthAt(t) * 0.5
    const sx = (sideX / len) * w
    const sz = (sideZ / len) * w
    const y = p.y + yOffset
    positions.push(p.x + sx, y, p.z + sz, p.x - sx, y, p.z - sz)
    uvs.push(0, t, 1, t)
    if (i < segments) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

const RIVER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    float flow = vUv.y * 10.0 - uTime * 0.85;
    float n = noise(vec2(vUv.x * 5.0, flow));
    float ripple = sin(vUv.y * 28.0 - uTime * 1.7 + n * 3.0) * 0.5 + 0.5;
    float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    vec3 col = mix(uDeep, uShallow, 0.2 + ripple * 0.38 + n * 0.2);
    float foam = smoothstep(0.93, 1.0, ripple) * edge * 0.22;
    col = mix(col, vec3(0.86, 0.97, 0.98), foam);
    float startFoam = smoothstep(0.09, 0.0, vUv.y) * (0.4 + 0.6 * n);
    col = mix(col, vec3(0.92, 1.0, 1.0), startFoam * 0.5);
    float mouthFoam = smoothstep(0.91, 1.0, vUv.y) * (0.4 + 0.6 * n);
    col = mix(col, vec3(0.9, 0.99, 1.0), mouthFoam * 0.22);
    float glint = pow(max(0.0, sin(vUv.y * 44.0 - uTime * 2.1 + vUv.x * 9.0)), 18.0);
    col += vec3(1.0, 0.94, 0.82) * glint * 0.16 * (1.0 - uNight * 0.5);
    col *= mix(0.68, 1.0, edge);
    col += vec3(0.03, 0.11, 0.13) * uNight;
    gl_FragColor = vec4(col, 0.72 + 0.2 * edge);
  }
`

const RIVER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

interface WaterUpdate {
  material: THREE.ShaderMaterial
}

function buildRiver(): { group: THREE.Group; water: WaterUpdate } {
  const group = new THREE.Group()
  const lakeY = groundHeight(LAKE.x, LAKE.z) - 0.005
  const curve = new THREE.CatmullRomCurve3(
    RIVER_POINTS.map(([x, z], i) => {
      // 末端抬到湖面高度，让河水平滑汇入湖泊
      const y =
        i === RIVER_POINTS.length - 1 ? lakeY - 0.059 : carvedHeight(x, z)
      return new THREE.Vector3(x, y, z)
    }),
    false,
    'centripetal',
    0.5,
  )

  // 湿润的河床与滩地；靠近湖口时收窄，避免土色横在湖面上
  const bankWidth = (t: number) =>
    THREE.MathUtils.lerp(0.4, 0.5, t) * (1 - smoothstep(0.62, 0.9, t))
  const bank = new THREE.Mesh(
    buildRibbon(curve, bankWidth, 0.035, 160),
    new THREE.MeshStandardMaterial({ color: 0x6b6048, roughness: 1 }),
  )
  bank.receiveShadow = true
  group.add(bank)

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uDeep: { value: new THREE.Color(0x0b5a68) },
      uShallow: { value: new THREE.Color(0x7fd0ca) },
    },
    vertexShader: RIVER_VERT,
    fragmentShader: RIVER_FRAG,
    transparent: true,
    depthWrite: false,
  })
  const waterWidth = (t: number) =>
    0.44 - 0.2 * smoothstep(0, 0.22, t) + 0.1 * smoothstep(0.82, 1, t)
  const river = new THREE.Mesh(buildRibbon(curve, waterWidth, 0.065, 160), mat)
  river.renderOrder = 1
  group.add(river)

  const rng = mulberry32(5501)
  const p = new THREE.Vector3()
  const tan = new THREE.Vector3()
  const dummy = new THREE.Object3D()

  // 河岸碎石
  const pebbleMat = new THREE.MeshStandardMaterial({
    color: 0x7c8378,
    roughness: 0.95,
    flatShading: true,
  })
  const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.05, 0), pebbleMat, 30)
  for (let i = 0; i < 30; i++) {
    const t = rng()
    curve.getPoint(t, p)
    curve.getTangent(t, tan)
    const len = Math.hypot(tan.x, tan.z) || 1
    const side = rng() > 0.5 ? 1 : -1
    const off = 0.22 + rng() * 0.12
    const px = p.x + (-tan.z / len) * off * side
    const pz = p.z + (tan.x / len) * off * side
    const s = 0.35 + rng() * 0.55
    dummy.position.set(px, p.y + 0.04 + rng() * 0.01, pz)
    dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    pebbles.setMatrixAt(i, dummy.matrix)
  }
  pebbles.castShadow = true
  pebbles.receiveShadow = true
  group.add(pebbles)

  // 水边芦苇
  const reedGeo = new THREE.ConeGeometry(0.009, 0.24, 4, 1)
  reedGeo.translate(0, 0.12, 0)
  const reeds = new THREE.InstancedMesh(
    reedGeo,
    new THREE.MeshStandardMaterial({ color: 0x506b44, roughness: 0.9 }),
    24,
  )
  for (let i = 0; i < 24; i++) {
    const t = rng()
    curve.getPoint(t, p)
    curve.getTangent(t, tan)
    const len = Math.hypot(tan.x, tan.z) || 1
    const side = rng() > 0.5 ? 1 : -1
    const off = 0.24 + rng() * 0.12
    dummy.position.set(
      p.x + (-tan.z / len) * off * side,
      p.y + 0.035,
      p.z + (tan.x / len) * off * side,
    )
    dummy.rotation.set((rng() - 0.5) * 0.25, rng() * 3, (rng() - 0.5) * 0.3)
    dummy.scale.set(1, 0.7 + rng() * 0.75, 1)
    dummy.updateMatrix()
    reeds.setMatrixAt(i, dummy.matrix)
  }
  reeds.castShadow = true
  group.add(reeds)

  // 溪流里的踏脚石
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6f7874,
    roughness: 0.95,
    flatShading: true,
  })
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.09, 0), stoneMat, 3)
  const stops = [0.32, 0.54, 0.74]
  for (let i = 0; i < stops.length; i++) {
    curve.getPoint(stops[i], p)
    curve.getTangent(stops[i], tan)
    const len = Math.hypot(tan.x, tan.z) || 1
    const off = i % 2 === 0 ? 0.04 : -0.035
    const s = 0.7 + (i % 2) * 0.15
    dummy.position.set(
      p.x + (-tan.z / len) * off,
      p.y + 0.07,
      p.z + (tan.x / len) * off,
    )
    dummy.rotation.set(0, rng() * 3, 0)
    dummy.scale.set(1.2 * s, 0.36 * s, 0.9 * s)
    dummy.updateMatrix()
    stones.setMatrixAt(i, dummy.matrix)
  }
  stones.receiveShadow = true
  group.add(stones)

  return { group, water: { material: mat } }
}

interface LakeDynamics {
  update: (time: number, day: number) => void
}

/** 带轻微轮廓起伏的圆盘，避免湖面像标准椭圆 */
function irregularDisc(wobble: number, segments = 64, lobeAngle = 0, lobeAmount = 0): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(1, segments)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const a = Math.atan2(y, x)
    const lobe = lobeAmount * Math.exp(-Math.pow((a - lobeAngle) / 0.35, 2))
    const r = 1 + wobble * Math.sin(a * 3 + 1.2) + wobble * 0.55 * Math.sin(a * 7 - 0.7) + lobe
    pos.setXY(i, x * r, y * r)
  }
  geo.computeVertexNormals()
  return geo
}

function buildLake(): { group: THREE.Group; dynamics: LakeDynamics } {
  const group = new THREE.Group()
  const waterY = groundHeight(LAKE.x, LAKE.z) - 0.005
  const shape = irregularDisc(0.08, 64, 0.55, 0.3)

  // 湖岸
  const shore = new THREE.Mesh(
    new THREE.RingGeometry(
      0.94,
      1.26,
      64,
      1,
      -0.55 + 0.5,
      Math.PI * 2 - 1.0,
    ),
    new THREE.MeshStandardMaterial({ color: 0x7a6c4a, roughness: 1 }),
  )
  shore.rotation.x = -Math.PI / 2
  shore.scale.set(LAKE.rx, LAKE.rz, 1)
  shore.position.set(LAKE.x, waterY - 0.02, LAKE.z)
  shore.receiveShadow = true
  group.add(shore)

  const basin = new THREE.Mesh(
    shape,
    new THREE.MeshStandardMaterial({ color: 0x1d3a36, roughness: 0.9 }),
  )
  basin.rotation.x = -Math.PI / 2
  basin.scale.set(LAKE.rx, LAKE.rz, 1)
  basin.position.set(LAKE.x, waterY - 0.015, LAKE.z)
  group.add(basin)

  const water = new THREE.Mesh(
    shape,
    new THREE.MeshPhysicalMaterial({
      color: 0x2a9fae,
      roughness: 0.04,
      metalness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.7,
      emissive: 0x0a3840,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.95,
    }),
  )
  water.rotation.x = -Math.PI / 2
  water.scale.set(LAKE.rx, LAKE.rz, 1)
  water.position.set(LAKE.x, waterY, LAKE.z)
  water.receiveShadow = true
  water.renderOrder = 1
  group.add(water)

  // 水面涟漪
  const ripples: THREE.Mesh[] = []
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xcdf4ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48, 1), mat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(LAKE.x, waterY + 0.006, LAKE.z)
    group.add(ring)
    ripples.push(ring)
  }

  // 睡莲与小花
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3d7a4d, roughness: 0.85 })
  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xf7c9d8,
    roughness: 0.6,
    emissive: 0x2a0f18,
  })
  const pads: Array<[number, number, number]> = [
    [0.12, 0.18, 0.9],
    [-0.16, -0.08, 0.7],
    [0.22, -0.12, 0.62],
  ]
  for (const [dx, dz, s] of pads) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), padMat)
    pad.rotation.x = -Math.PI / 2
    pad.position.set(LAKE.x + dx, waterY + 0.012, LAKE.z + dz)
    pad.scale.setScalar(s)
    group.add(pad)
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), flowerMat)
    flower.position.set(LAKE.x + dx + 0.018, waterY + 0.03, LAKE.z + dz - 0.01)
    group.add(flower)
  }

  // 芦苇
  const reedGeo = new THREE.ConeGeometry(0.012, 0.24, 4, 1)
  reedGeo.translate(0, 0.12, 0)
  const reeds = new THREE.InstancedMesh(
    reedGeo,
    new THREE.MeshStandardMaterial({ color: 0x4c6842, roughness: 0.9 }),
    26,
  )
  const dummy = new THREE.Object3D()
  const rng = mulberry32(1742)
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.15
    const r = 1.06 + rng() * 0.22
    const px = LAKE.x + Math.cos(a) * LAKE.rx * r
    const pz = LAKE.z + Math.sin(a) * LAKE.rz * r
    dummy.position.set(px, waterY - 0.02, pz)
    dummy.rotation.set((rng() - 0.5) * 0.3, rng() * 3, (rng() - 0.5) * 0.3)
    dummy.scale.set(1, 0.6 + rng() * 0.8, 1)
    dummy.updateMatrix()
    reeds.setMatrixAt(i, dummy.matrix)
  }
  reeds.castShadow = true
  group.add(reeds)

  return {
    group,
    dynamics: {
      update(time, day) {
        for (let i = 0; i < ripples.length; i++) {
          const ripple = ripples[i]
          const phase = (time * 0.16 + i / ripples.length) % 1
          const scale = 0.2 + phase * 0.95
          ripple.scale.set(LAKE.rx * scale, LAKE.rz * scale, 1)
          ;(ripple.material as THREE.MeshBasicMaterial).opacity =
            (1 - phase) * (0.18 + 0.22 * day) * (phase > 0.05 ? 1 : 0)
        }
      },
    },
  }
}

/* ------------------------------------------------------------------ */
/* 礁石 / 浮石                                                         */
/* ------------------------------------------------------------------ */

interface FloatingRock {
  mesh: THREE.Mesh
  baseY: number
  phase: number
  spin: number
}

function buildFloatingRocks(): { group: THREE.Group; rocks: FloatingRock[] } {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: 0x4d5a64,
    roughness: 0.92,
    flatShading: true,
  })
  const defs: Array<[number, number, number, number]> = [
    [2.55, 1.25, 0.85, 0.55],
    [-2.45, 0.95, -0.15, 0.5],
    [0.45, 0.72, 2.55, 0.4],
  ]
  const rocks: FloatingRock[] = []
  for (let i = 0; i < defs.length; i++) {
    const [x, y, z, s] = defs[i]
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), material)
    mesh.position.set(x, y, z)
    mesh.scale.setScalar(s)
    mesh.rotation.set(i * 1.3, i * 2.1, i * 0.7)
    mesh.castShadow = true
    group.add(mesh)
    rocks.push({ mesh, baseY: y, phase: i * 2.2, spin: 0.12 + i * 0.05 })
  }
  return { group, rocks }
}

/* ------------------------------------------------------------------ */
/* 组装                                                                */
/* ------------------------------------------------------------------ */

export function buildTerrain(): TerrainSystem {
  const group = new THREE.Group()
  group.add(buildGrassCap())
  group.add(buildRim())
  group.add(buildUnderside())
  group.add(buildMountainMassif())

  const waterfall = buildWaterfall()
  group.add(waterfall.group)
  const river = buildRiver()
  group.add(river.group)
  const lake = buildLake()
  group.add(lake.group)

  const floats = buildFloatingRocks()
  group.add(floats.group)

  // 散落的大块礁石
  const rng = mulberry32(8823)
  const boulderGeo = new THREE.DodecahedronGeometry(0.11, 0)
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0x6f7a79,
    roughness: 0.95,
    flatShading: true,
  })
  const boulders = new THREE.InstancedMesh(boulderGeo, boulderMat, 20)
  const dummy = new THREE.Object3D()
  let placed = 0
  let guard = 0
  while (placed < 20 && guard < 200) {
    guard++
    const a = rng() * Math.PI * 2
    const r = 1.45 + rng() * 0.78
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (riverDistance(x, z) < 0.42) continue
    if (lakeFactor(x, z) < 1.35) continue
    const s = 0.6 + rng() * 1.4
    dummy.position.set(x, groundHeight(x, z) - 0.01, z)
    dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    dummy.scale.set(s, s * 0.8, s)
    dummy.updateMatrix()
    boulders.setMatrixAt(placed, dummy.matrix)
    placed++
  }
  boulders.count = placed
  boulders.castShadow = true
  boulders.receiveShadow = true
  group.add(boulders)

  const update = (time: number, day: number) => {
    waterfall.dynamics.update(time, day)
    lake.dynamics.update(time, day)
    river.water.material.uniforms.uTime.value = time
    river.water.material.uniforms.uNight.value = 1 - day
    for (const rock of floats.rocks) {
      rock.mesh.position.y = rock.baseY + Math.sin(time * 0.45 + rock.phase) * 0.075
      rock.mesh.rotation.y = rock.phase + time * rock.spin
    }
  }

  return { group, update }
}
