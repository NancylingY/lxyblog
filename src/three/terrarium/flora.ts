/**
 * 微光之境 · 植被
 * 针叶林、灌木、草簇、野花、蘑菇与一段倒木。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  ISLAND_R,
  MOUNTAIN,
  groundHeight,
  isPlantable,
  lakeFactor,
  mulberry32,
  riverDistance,
  smoothstep,
} from './layout'

function buildTreeGeometry(): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } {
  const trunk = new THREE.CylinderGeometry(0.016, 0.028, 0.3, 5, 1)
  trunk.translate(0, 0.15, 0)

  const tiers: Array<[number, number, number]> = [
    [0.17, 0.3, 0.25],
    [0.14, 0.27, 0.4],
    [0.105, 0.23, 0.54],
    [0.065, 0.18, 0.67],
  ]
  const parts = tiers.map(([radius, height, base]) => {
    const cone = new THREE.ConeGeometry(radius, height, 6, 1)
    cone.translate(0, base + height / 2, 0)
    return cone
  })
  const foliage = mergeGeometries(parts)
  if (!foliage) throw new Error('failed to merge tree foliage geometry')
  return { trunk, foliage }
}

export function buildFlora(): THREE.Group {
  const group = new THREE.Group()
  const rng = mulberry32(20261019)
  const { trunk, foliage } = buildTreeGeometry()

  const trees: Array<{ x: number; z: number; scale: number; rot: number; color: THREE.Color }> = []
  let guard = 0

  while (trees.length < 108 && guard < 4000) {
    guard++
    const a = rng() * Math.PI * 2
    const r = 0.9 + Math.sqrt(rng()) * 1.28
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (!isPlantable(x, z, 0.04)) continue
    if (riverDistance(x, z) < 0.5) continue
    if (lakeFactor(x, z) < 1.6) continue

    // 前景草甸留白，给鹿群和镜头呼吸的空间
    if (x > 0.05 && x < 1.55 && z > 0.45 && z < 1.6) continue
    // 瀑布正前方留出视线
    if (x > -0.75 && x < 0.45 && z > 0.35) continue

    const md = Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z)
    const density = 0.3 + 0.7 * smoothstep(2.25, 1.32, md)
    if (rng() > density) continue

    const hero = rng() > 0.9
    const scale = (hero ? 1.25 : 0.7) + rng() * 0.5
    const roll = rng()
    let color: THREE.Color
    if (roll < 0.05) color = new THREE.Color(0xae7c42)
    else if (roll < 0.46) color = new THREE.Color(0x2d7362)
    else color = new THREE.Color(0x356e46)
    color.offsetHSL(0, 0, (rng() - 0.5) * 0.07)
    trees.push({ x, z, scale, rot: rng() * Math.PI * 2, color })
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 })
  const foliageMat = new THREE.MeshStandardMaterial({
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
  })

  const trunks = new THREE.InstancedMesh(trunk, trunkMat, trees.length)
  const canopies = new THREE.InstancedMesh(foliage, foliageMat, trees.length)
  const dummy = new THREE.Object3D()

  for (let i = 0; i < trees.length; i++) {
    const tree = trees[i]
    const y = groundHeight(tree.x, tree.z) - 0.025
    dummy.position.set(tree.x, y, tree.z)
    dummy.rotation.set(0, tree.rot, (rng() - 0.5) * 0.08)
    dummy.scale.set(tree.scale * (0.92 + rng() * 0.16), tree.scale, tree.scale * (0.92 + rng() * 0.16))
    dummy.updateMatrix()
    trunks.setMatrixAt(i, dummy.matrix)
    canopies.setMatrixAt(i, dummy.matrix)
    canopies.setColorAt(i, tree.color)
  }
  trunks.castShadow = true
  trunks.receiveShadow = true
  canopies.castShadow = true
  canopies.receiveShadow = true
  if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true
  group.add(trunks, canopies)

  // 灌木
  const bushGeo = new THREE.IcosahedronGeometry(0.1, 1)
  const bushMat = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    flatShading: true,
  })
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 52)
  let bushCount = 0
  guard = 0
  while (bushCount < 52 && guard < 900) {
    guard++
    const a = rng() * Math.PI * 2
    const r = 0.7 + rng() * 1.5
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (!isPlantable(x, z, 0.02)) continue
    if (x > 0.15 && x < 1.5 && z > 0.5 && z < 1.55) continue
    const s = 0.7 + rng() * 1.5
    dummy.position.set(x, groundHeight(x, z) + 0.035, z)
    dummy.rotation.set(rng() * 0.3, rng() * 3, rng() * 0.3)
    dummy.scale.set(s * 1.25, s * 0.72, s * 1.25)
    dummy.updateMatrix()
    bushes.setMatrixAt(bushCount, dummy.matrix)
    bushes.setColorAt(
      bushCount,
      new THREE.Color(0x2f6440).offsetHSL(0, 0, (rng() - 0.5) * 0.08),
    )
    bushCount++
  }
  bushes.count = bushCount
  bushes.castShadow = true
  bushes.receiveShadow = true
  if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true
  group.add(bushes)

  // 草簇
  const bladeGeo = new THREE.ConeGeometry(0.011, 0.11, 3, 1)
  bladeGeo.translate(0, 0.055, 0)
  const blades = new THREE.InstancedMesh(
    bladeGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    520,
  )
  let bladeCount = 0
  guard = 0
  while (bladeCount < 520 && guard < 2600) {
    guard++
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * (ISLAND_R - 0.1)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (!isPlantable(x, z, 0)) continue
    if (Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z) < 1.45) continue
    const s = 0.55 + rng() * 1.1
    dummy.position.set(x, groundHeight(x, z), z)
    dummy.rotation.set(0, rng() * 3, (rng() - 0.5) * 0.35)
    dummy.scale.set(1, s, 1)
    dummy.updateMatrix()
    blades.setMatrixAt(bladeCount, dummy.matrix)
    blades.setColorAt(
      bladeCount,
      new THREE.Color(0x4f8746).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.12),
    )
    bladeCount++
  }
  blades.count = bladeCount
  blades.receiveShadow = true
  if (blades.instanceColor) blades.instanceColor.needsUpdate = true
  group.add(blades)

  // 野花
  const flowerGeo = new THREE.SphereGeometry(0.013, 5, 4)
  const flowers = new THREE.InstancedMesh(
    flowerGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.55, emissive: 0x120d08 }),
    90,
  )
  const palette = [0xfff4d6, 0xffc2d4, 0xffe08a, 0xd7e9ff]
  let flowerCount = 0
  guard = 0
  while (flowerCount < 90 && guard < 900) {
    guard++
    const a = rng() * Math.PI * 2
    const r = 0.35 + Math.sqrt(rng()) * 1.7
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (!isPlantable(x, z, 0.02)) continue
    const s = 0.7 + rng() * 0.9
    dummy.position.set(x, groundHeight(x, z) + 0.065, z)
    dummy.rotation.set(0, 0, 0)
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    flowers.setMatrixAt(flowerCount, dummy.matrix)
    flowers.setColorAt(flowerCount, new THREE.Color(palette[Math.floor(rng() * palette.length)]))
    flowerCount++
  }
  flowers.count = flowerCount
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true
  group.add(flowers)

  // 蘑菇
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.011, 0.06, 5)
  stemGeo.translate(0, 0.03, 0)
  const capGeo = new THREE.SphereGeometry(0.026, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2)
  const stems = new THREE.InstancedMesh(
    stemGeo,
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }),
    9,
  )
  const caps = new THREE.InstancedMesh(
    capGeo,
    new THREE.MeshStandardMaterial({ color: 0xc4553f, roughness: 0.65 }),
    9,
  )
  let mushroomCount = 0
  guard = 0
  while (mushroomCount < 9 && guard < 200) {
    guard++
    const a = rng() * Math.PI * 2
    const r = 1.45 + rng() * 0.6
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (!isPlantable(x, z, 0.01)) continue
    const y = groundHeight(x, z)
    const s = 0.75 + rng() * 0.8
    dummy.position.set(x, y, z)
    dummy.rotation.set(0, rng() * 3, 0)
    dummy.scale.setScalar(s)
    dummy.updateMatrix()
    stems.setMatrixAt(mushroomCount, dummy.matrix)
    dummy.position.y = y + 0.055 * s
    dummy.scale.setScalar(s * 1.15)
    dummy.updateMatrix()
    caps.setMatrixAt(mushroomCount, dummy.matrix)
    mushroomCount++
  }
  stems.count = mushroomCount
  caps.count = mushroomCount
  stems.castShadow = true
  caps.castShadow = true
  group.add(stems, caps)

  // 倒木
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.048, 0.46, 7, 1),
    new THREE.MeshStandardMaterial({ color: 0x5d4732, roughness: 1 }),
  )
  log.rotation.z = Math.PI / 2
  log.rotation.y = 0.4
  log.position.set(-1.35, groundHeight(-1.35, 0.35) + 0.045, 0.35)
  log.castShadow = true
  log.receiveShadow = true
  group.add(log)

  return group
}
