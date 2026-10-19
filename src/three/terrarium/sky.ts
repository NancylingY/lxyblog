/**
 * 微光之境 · 大气
 * 云、雾、体积光、尘埃与镜头前的散景光斑。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ISLAND_R, mulberry32 } from './layout'
import { glowTexture, mistTexture } from './textures'

export interface SkySystem {
  group: THREE.Group
  update: (time: number, day: number) => void
}

const RAY_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const RAY_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    float edge = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewW))), 1.35);
    float fade = smoothstep(0.0, 0.5, vUv.y);
    float bands = 0.8 + 0.2 * sin(vUv.y * 22.0 + uTime * 0.35);
    float alpha = uOpacity * edge * fade * bands;
    gl_FragColor = vec4(uColor, alpha);
  }
`

function buildCloudGeometry(rng: () => number, puffCount: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < puffCount; i++) {
    const radius = 0.12 + rng() * 0.15
    const puff = new THREE.SphereGeometry(radius, 9, 7)
    puff.scale(1.15, 0.78, 1)
    puff.translate(
      (rng() - 0.5) * 0.62,
      (rng() - 0.5) * 0.16,
      (rng() - 0.5) * 0.34,
    )
    parts.push(puff)
  }
  const merged = mergeGeometries(parts)
  if (!merged) throw new Error('failed to merge cloud geometry')
  return merged
}

function buildClouds(): { group: THREE.Group; meshes: THREE.Mesh[]; material: THREE.MeshStandardMaterial; bases: THREE.Vector3[] } {
  const group = new THREE.Group()
  const rng = mulberry32(66123)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0,
    transparent: true,
    opacity: 0.95,
  })

  const defs: Array<[number, number, number, number]> = [
    [0.02, 5.02, -0.38, 1.0],
    [-1.4, 5.22, 0.62, 0.72],
    [1.55, 4.78, 0.18, 0.58],
    [0.95, 5.58, 0.55, 0.48],
    [-1.25, 4.85, 0.95, 0.36],
  ]

  const meshes: THREE.Mesh[] = []
  const bases: THREE.Vector3[] = []

  for (let i = 0; i < defs.length; i++) {
    const [x, y, z, scale] = defs[i]
    const cloud = new THREE.Mesh(buildCloudGeometry(rng, 7 + Math.floor(rng() * 4)), material)
    cloud.position.set(x, y, z)
    cloud.scale.setScalar(scale)
    cloud.castShadow = false
    cloud.receiveShadow = false
    group.add(cloud)
    meshes.push(cloud)
    bases.push(new THREE.Vector3(x, y, z))
  }

  return { group, meshes, material, bases }
}

function buildMist(): { group: THREE.Group; sprites: THREE.Sprite[]; bases: THREE.Vector3[] } {
  const group = new THREE.Group()
  const map = mistTexture()
  const rng = mulberry32(31415)
  const sprites: THREE.Sprite[] = []
  const bases: THREE.Vector3[] = []

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng() * 0.3
    const r = ISLAND_R * (0.72 + rng() * 0.45)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const y = 1.95 + rng() * 0.55
    const mat = new THREE.SpriteMaterial({
      map,
      color: 0xd6ecff,
      transparent: true,
      opacity: 0.06 + rng() * 0.05,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(x, y, z)
    sprite.scale.setScalar(1.15 + rng() * 1.7)
    sprite.renderOrder = 3
    group.add(sprite)
    sprites.push(sprite)
    bases.push(new THREE.Vector3(x, y, z))
  }

  // 岛底的一层薄雾
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.SpriteMaterial({
      map,
      color: 0xaad4ea,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(mat)
    const a = (i / 5) * Math.PI * 2
    sprite.position.set(Math.cos(a) * 1.1, 2.0, Math.sin(a) * 1.1)
    sprite.scale.set(2.8, 0.8, 1)
    sprite.renderOrder = 3
    group.add(sprite)
    sprites.push(sprite)
    bases.push(sprite.position.clone())
  }

  return { group, sprites, bases }
}

function buildDust(): { points: THREE.Points; base: Float32Array; phases: Float32Array; material: THREE.PointsMaterial } {
  const rng = mulberry32(8080)
  const count = 96
  const positions = new Float32Array(count * 3)
  const base = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 5.4
    const z = (rng() - 0.5) * 5.4
    const y = 1.9 + rng() * 4.5
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    base[i * 3] = x
    base[i * 3 + 1] = y
    base[i * 3 + 2] = z
    phases[i] = rng() * Math.PI * 2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    map: glowTexture(),
    color: 0xffeccd,
    size: 0.024,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geo, material)
  points.frustumCulled = false
  points.renderOrder = 2
  return { points, base, phases, material }
}

function buildRays(): { group: THREE.Group; materials: THREE.ShaderMaterial[] } {
  const group = new THREE.Group()
  const materials: THREE.ShaderMaterial[] = []
  const defs: Array<[number, number, number, number, number, number]> = [
    [0.02, 4.75, -0.24, 1.05, 0.12, 0.05],
    [0.95, 4.7, 0.48, 0.7, -0.16, 0.035],
  ]
  for (const [x, y, z, bottomRadius, tilt, opacity] of defs) {
    const geo = new THREE.CylinderGeometry(0.16, bottomRadius, 4.1, 24, 1, true)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: opacity },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xcfeaff) },
      },
      vertexShader: RAY_VERT,
      fragmentShader: RAY_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.rotation.z = tilt
    mesh.rotation.x = -0.05
    mesh.renderOrder = 3
    group.add(mesh)
    materials.push(mat)
  }
  return { group, materials }
}

export function buildSky(): SkySystem {
  const group = new THREE.Group()
  const clouds = buildClouds()
  const mist = buildMist()
  const dust = buildDust()
  const rays = buildRays()
  group.add(clouds.group, mist.group, dust.points, rays.group)

  const dayCloud = new THREE.Color(0xffffff)
  const nightCloud = new THREE.Color(0x94a9c9)
  const dayDust = new THREE.Color(0xffeccd)
  const nightDust = new THREE.Color(0xbfe2ff)

  const update = (time: number, day: number) => {
    // 云：缓慢漂移
    for (let i = 0; i < clouds.meshes.length; i++) {
      const mesh = clouds.meshes[i]
      const base = clouds.bases[i]
      mesh.position.x = base.x + Math.sin(time * 0.11 + i * 1.7) * 0.12
      mesh.position.y = base.y + Math.sin(time * 0.27 + i * 0.9) * 0.035
      mesh.position.z = base.z + Math.cos(time * 0.09 + i * 2.1) * 0.08
    }
    clouds.material.color.copy(nightCloud).lerp(dayCloud, day)
    clouds.material.opacity = 0.86 + 0.08 * day

    // 雾：绕着岛缘轻轻呼吸
    for (let i = 0; i < mist.sprites.length; i++) {
      const sprite = mist.sprites[i]
      const base = mist.bases[i]
      const phase = time * 0.09 + i * 1.3
      sprite.position.x = base.x + Math.sin(phase) * 0.1
      sprite.position.z = base.z + Math.cos(phase * 0.8) * 0.1
      sprite.position.y = base.y + Math.sin(phase * 1.4) * 0.035
      ;(sprite.material as THREE.SpriteMaterial).opacity =
        (0.035 + 0.035 * day) * (0.7 + 0.3 * Math.sin(time * 0.35 + i))
    }

    // 尘埃
    dust.material.opacity = 0.1 + 0.12 * day
    dust.material.color.copy(nightDust).lerp(dayDust, day)
    const attr = dust.points.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < dust.phases.length; i++) {
      const ph = dust.phases[i]
      attr.setY(
        i,
        dust.base[i * 3 + 1] + Math.sin(time * 0.16 + ph) * 0.18,
      )
      attr.setX(i, dust.base[i * 3] + Math.sin(time * 0.1 + ph * 1.4) * 0.06)
    }
    attr.needsUpdate = true

    // 体积光
    for (const mat of rays.materials) {
      mat.uniforms.uTime.value = time
      mat.uniforms.uOpacity.value = 0.003 + day * 0.022
      ;(mat.uniforms.uColor.value as THREE.Color).setHSL(0.56, 0.35, 0.82)
    }
  }

  return { group, update }
}
