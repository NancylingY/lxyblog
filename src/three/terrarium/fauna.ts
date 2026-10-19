/**
 * 微光之境 · 微型动物
 * 鹿、狐狸、盘旋的小鸟，以及夜里浮起的萤火。
 */
import * as THREE from 'three'
import { LAKE, groundHeight, isPlantable, mulberry32 } from './layout'
import { glowTexture } from './textures'

export interface FaunaSystem {
  group: THREE.Group
  update: (time: number, day: number) => void
}

interface DeerRig {
  root: THREE.Group
  head: THREE.Group
  ears: THREE.Object3D[]
  tail: THREE.Object3D
  baseY: number
  phase: number
  grazing: boolean
}

interface FoxRig {
  root: THREE.Group
  head: THREE.Group
  tail: THREE.Object3D
  baseY: number
}

interface BirdRig {
  root: THREE.Group
  wings: THREE.Object3D[]
  radius: number
  height: number
  speed: number
  phase: number
}

function mat(color: number, roughness = 0.8): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}

function mesh(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/* ------------------------------------------------------------------ */
/* 鹿                                                                  */
/* ------------------------------------------------------------------ */

function createDeer(scale: number, antlers: boolean): DeerRig {
  const root = new THREE.Group()
  const coat = mat(0xba8455, 0.82)
  const cream = mat(0xe4c9a1, 0.9)
  const dark = mat(0x3a2a20, 0.9)
  const bone = mat(0xd9c5a2, 0.7)

  const body = mesh(new THREE.CapsuleGeometry(0.088, 0.17, 4, 8), coat, 0, 0.3, 0)
  body.rotation.x = Math.PI / 2
  body.scale.set(1, 0.95, 1)
  root.add(body)

  const belly = mesh(new THREE.SphereGeometry(0.062, 8, 6), cream, 0, 0.255, 0.02)
  belly.scale.set(0.8, 0.55, 1.3)
  root.add(belly)

  const chest = mesh(new THREE.SphereGeometry(0.062, 8, 6), cream, 0, 0.32, 0.14)
  chest.scale.set(0.72, 0.78, 0.95)
  root.add(chest)

  const neck = mesh(new THREE.CapsuleGeometry(0.036, 0.1, 3, 6), coat, 0, 0.4, 0.135)
  neck.rotation.x = 0.32
  root.add(neck)

  const head = new THREE.Group()
  head.position.set(0, 0.495, 0.19)
  root.add(head)

  const skull = mesh(new THREE.SphereGeometry(0.054, 9, 7), coat)
  skull.scale.set(0.92, 0.95, 1.25)
  head.add(skull)

  const snout = mesh(new THREE.SphereGeometry(0.03, 7, 5), cream, 0, -0.015, 0.062)
  snout.scale.set(0.9, 0.75, 1.35)
  head.add(snout)

  const nose = mesh(new THREE.SphereGeometry(0.009, 5, 4), dark, 0, -0.012, 0.1)
  head.add(nose)

  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.008, 5, 4), dark, side * 0.029, 0.015, 0.042)
    head.add(eye)
  }

  const ears: THREE.Object3D[] = []
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.032, 0.048, -0.005)
    pivot.rotation.z = side * -0.42
    pivot.rotation.x = -0.2
    const ear = mesh(new THREE.ConeGeometry(0.021, 0.07, 5), coat, 0, 0.032, 0)
    ear.scale.set(0.65, 1, 1)
    pivot.add(ear)
    head.add(pivot)
    ears.push(pivot)
  }

  if (antlers) {
    for (const side of [-1, 1]) {
      const antler = new THREE.Group()
      antler.position.set(side * 0.022, 0.055, -0.005)
      antler.rotation.z = side * 0.28

      const beam = mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.11, 4), bone, 0, 0.055, 0)
      antler.add(beam)

      const tineA = mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.075, 4), bone, side * 0.024, 0.1, 0.01)
      tineA.rotation.z = side * -0.75
      antler.add(tineA)

      const tineB = mesh(new THREE.CylinderGeometry(0.0025, 0.0035, 0.06, 4), bone, side * 0.008, 0.13, -0.01)
      tineB.rotation.z = side * -0.3
      tineB.rotation.x = 0.35
      antler.add(tineB)

      head.add(antler)
    }
  }

  const legGeo = new THREE.CylinderGeometry(0.008, 0.011, 0.24, 5)
  const legPositions: Array<[number, number]> = [
    [-0.052, 0.115],
    [0.052, 0.115],
    [-0.058, -0.11],
    [0.058, -0.11],
  ]
  for (const [x, z] of legPositions) {
    const leg = mesh(legGeo, coat, x, 0.12, z)
    leg.rotation.x = z > 0 ? -0.04 : 0.04
    root.add(leg)
    const hoof = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.03, 5), dark, x, 0.014, z)
    root.add(hoof)
  }

  const tailPivot = new THREE.Group()
  tailPivot.position.set(0, 0.34, -0.17)
  tailPivot.rotation.x = -0.65
  const tail = mesh(new THREE.ConeGeometry(0.022, 0.07, 5), cream, 0, 0.035, 0)
  tailPivot.add(tail)
  root.add(tailPivot)

  // 梅花斑点
  const spotGeo = new THREE.SphereGeometry(0.0105, 4, 3)
  for (const [x, z] of [
    [-0.032, 0.06],
    [0.036, 0.02],
    [-0.038, -0.03],
    [0.03, -0.075],
    [-0.012, -0.105],
  ]) {
    const spot = mesh(spotGeo, cream, x, 0.372, z)
    spot.scale.set(1, 0.3, 1)
    spot.castShadow = false
    root.add(spot)
  }

  root.scale.setScalar(scale)
  return {
    root,
    head,
    ears,
    tail: tailPivot,
    baseY: 0,
    phase: 0,
    grazing: false,
  }
}

function createFox(): FoxRig {
  const root = new THREE.Group()
  const orange = mat(0xcf6f36, 0.85)
  const cream = mat(0xf0dfc4, 0.9)
  const dark = mat(0x2e211a, 0.9)

  const body = mesh(new THREE.CapsuleGeometry(0.052, 0.1, 3, 7), orange, 0, 0.155, 0)
  body.rotation.x = Math.PI / 2
  root.add(body)

  const chest = mesh(new THREE.SphereGeometry(0.044, 7, 5), cream, 0, 0.16, 0.08)
  chest.scale.set(0.78, 0.8, 0.9)
  root.add(chest)

  const head = new THREE.Group()
  head.position.set(0, 0.24, 0.1)
  root.add(head)

  const skull = mesh(new THREE.SphereGeometry(0.04, 8, 6), orange)
  skull.scale.set(0.95, 0.9, 1.05)
  head.add(skull)

  const snout = mesh(new THREE.ConeGeometry(0.022, 0.07, 6), cream, 0, -0.008, 0.055)
  snout.rotation.x = Math.PI / 2
  head.add(snout)

  const nose = mesh(new THREE.SphereGeometry(0.007, 4, 3), dark, 0, -0.008, 0.092)
  head.add(nose)

  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.021, 0.07, 4), orange, side * 0.026, 0.045, -0.002)
    ear.rotation.z = side * -0.18
    head.add(ear)
    const eye = mesh(new THREE.SphereGeometry(0.006, 4, 3), dark, side * 0.023, 0.01, 0.036)
    head.add(eye)
  }

  const legs: Array<[number, number]> = [
    [-0.035, 0.055],
    [0.035, 0.055],
    [-0.038, -0.06],
    [0.038, -0.06],
  ]
  for (const [x, z] of legs) {
    const leg = mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.13, 4), dark, x, 0.065, z)
    root.add(leg)
  }

  const tailPivot = new THREE.Group()
  tailPivot.position.set(0, 0.18, -0.09)
  tailPivot.rotation.x = 0.7
  const tail = mesh(new THREE.CapsuleGeometry(0.032, 0.13, 3, 6), orange, 0, 0.07, 0)
  tail.scale.set(0.85, 1, 0.85)
  tailPivot.add(tail)
  const tip = mesh(new THREE.SphereGeometry(0.03, 6, 5), cream, 0, 0.145, 0)
  tailPivot.add(tip)
  root.add(tailPivot)

  return { root, head, tail: tailPivot, baseY: 0 }
}

/* ------------------------------------------------------------------ */
/* 小鸟                                                                */
/* ------------------------------------------------------------------ */

function buildWingGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(
    [0, 0, 0, 0.15, 0.015, -0.02, 0.025, 0, -0.075],
    3,
  ))
  geo.computeVertexNormals()
  return geo
}

function createBird(): BirdRig {
  const root = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x273741,
    roughness: 0.75,
    side: THREE.DoubleSide,
  })
  const body = mesh(new THREE.SphereGeometry(0.022, 6, 5), bodyMat)
  body.scale.set(0.85, 0.8, 2.2)
  body.castShadow = false
  root.add(body)

  const wingGeo = buildWingGeometry()
  const wings: THREE.Object3D[] = []
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.008, 0.006, 0)
    pivot.scale.x = side
    const wing = new THREE.Mesh(wingGeo, bodyMat)
    wing.castShadow = false
    pivot.add(wing)
    root.add(pivot)
    wings.push(pivot)
  }

  root.scale.setScalar(1)
  return {
    root,
    wings,
    radius: 1.4,
    height: 4.8,
    speed: 0.24,
    phase: 0,
  }
}

/* ------------------------------------------------------------------ */
/* 组装                                                                */
/* ------------------------------------------------------------------ */

export function buildFauna(): FaunaSystem {
  const group = new THREE.Group()
  const deerRigs: DeerRig[] = []
  const birdRigs: BirdRig[] = []

  const placements: Array<{ scale: number; antlers: boolean; x: number; z: number; rot: number; grazing: boolean }> = [
    { scale: 1.1, antlers: true, x: 0.82, z: 0.98, rot: -0.7, grazing: false },
    { scale: 0.98, antlers: true, x: 1.45, z: 1.2, rot: 2.35, grazing: true },
    { scale: 0.64, antlers: false, x: 1.05, z: 0.6, rot: -0.35, grazing: false },
  ]

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i]
    const rig = createDeer(p.scale, p.antlers)
    const y = groundHeight(p.x, p.z) + 0.005
    rig.root.position.set(p.x, y, p.z)
    rig.root.rotation.y = p.rot
    rig.baseY = y
    rig.phase = i * 1.8
    rig.grazing = p.grazing
    group.add(rig.root)
    deerRigs.push(rig)
  }

  // 狐狸：靠林缘，面向溪水
  const fox = createFox()
  const fx = 0.55
  const fz = 2.02
  fox.root.position.set(fx, groundHeight(fx, fz) + 0.005, fz)
  fox.root.rotation.y = 0.55
  fox.baseY = groundHeight(fx, fz) + 0.005
  group.add(fox.root)

  // 鸟群
  const birdMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3a44,
    roughness: 0.8,
    side: THREE.DoubleSide,
  })
  for (let i = 0; i < 6; i++) {
    const bird = createBird()
    // 共享材质，减少 draw call 之外的重复
    bird.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.material = birdMaterial
    })
    bird.radius = 1.35 + i * 0.22
    bird.height = 4.55 + (i % 3) * 0.28
    bird.speed = 0.2 + i * 0.012
    bird.phase = (i / 6) * Math.PI * 2
    group.add(bird.root)
    birdRigs.push(bird)
  }

  // 萤火虫
  const rng = mulberry32(4567)
  const count = 56
  const base = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    let x = 0
    let z = 0
    let ok = false
    for (let tries = 0; tries < 30 && !ok; tries++) {
      const a = rng() * Math.PI * 2
      const r = 0.35 + Math.sqrt(rng()) * 1.75
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      ok = isPlantable(x, z, -0.05) || Math.hypot(x - LAKE.x, z - LAKE.z) < 0.6
    }
    const y = groundHeight(x, z) + 0.12 + rng() * 0.55
    base[i * 3] = x
    base[i * 3 + 1] = y
    base[i * 3 + 2] = z
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    phases[i] = rng() * Math.PI * 2
  }
  const fireflyGeo = new THREE.BufferGeometry()
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const fireflyMat = new THREE.PointsMaterial({
    map: glowTexture(),
    color: 0xffe3a2,
    size: 0.085,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  const fireflies = new THREE.Points(fireflyGeo, fireflyMat)
  fireflies.frustumCulled = false
  group.add(fireflies)

  // 夜里湖面的一点幽光
  const lakeLight = new THREE.PointLight(0x5fe0d8, 0, 2.4, 2)
  lakeLight.position.set(LAKE.x, groundHeight(LAKE.x, LAKE.z) + 0.28, LAKE.z)
  group.add(lakeLight)

  const update = (time: number, day: number) => {
    for (const rig of deerRigs) {
      rig.root.position.y = rig.baseY + Math.sin(time * 0.9 + rig.phase) * 0.004
      if (rig.grazing) {
        rig.head.rotation.x = 0.82 + Math.sin(time * 0.55 + rig.phase) * 0.06
        rig.head.rotation.y = Math.sin(time * 0.33 + rig.phase) * 0.14
      } else {
        rig.head.rotation.x = -0.06 + Math.sin(time * 0.7 + rig.phase) * 0.045
        rig.head.rotation.y = Math.sin(time * 0.28 + rig.phase) * 0.5
      }
      for (let i = 0; i < rig.ears.length; i++) {
        const ear = rig.ears[i]
        const twitch = Math.max(0, Math.sin(time * 2.3 + rig.phase + i * 1.7) - 0.86)
        ear.rotation.z = (i === 0 ? 1 : -1) * (0.42 + twitch * 1.2)
      }
      rig.tail.rotation.z = Math.sin(time * 1.15 + rig.phase) * 0.16
    }

    fox.head.rotation.y = Math.sin(time * 0.45) * 0.42
    fox.head.rotation.x = Math.sin(time * 0.62 + 0.8) * 0.1
    fox.tail.rotation.z = Math.sin(time * 1.3) * 0.32

    for (const bird of birdRigs) {
      const a = time * bird.speed + bird.phase
      const x = Math.cos(a) * bird.radius
      const z = Math.sin(a) * bird.radius * 0.82
      bird.root.position.set(
        x,
        bird.height + Math.sin(time * 0.7 + bird.phase * 1.6) * 0.14,
        z,
      )
      bird.root.rotation.y = -a
      bird.root.rotation.z = Math.sin(a) * 0.16
      const flap = Math.sin(time * 7.5 + bird.phase) * 0.55
      bird.wings[0].rotation.z = 0.35 + flap
      bird.wings[1].rotation.z = -0.35 - flap
    }

    const night = 1 - day
    fireflyMat.opacity = night * (0.72 + 0.18 * Math.sin(time * 2.1))
    lakeLight.intensity = night * 1.35
    const attr = fireflyGeo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      const ph = phases[i]
      attr.setXYZ(
        i,
        base[i * 3] + Math.sin(time * 0.42 + ph) * 0.06,
        base[i * 3 + 1] + Math.sin(time * 0.75 + ph * 1.7) * 0.07,
        base[i * 3 + 2] + Math.cos(time * 0.36 + ph) * 0.06,
      )
    }
    attr.needsUpdate = true
  }

  return { group, update }
}
