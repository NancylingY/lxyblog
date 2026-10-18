/**
 * 门前景观喷泉：圆形水池 + 多层水钵 + 细密水柱 + 抛物水线 + 飞沫 + 涟漪
 * 全部动画为连续函数驱动，无随机跳变、无频闪
 */
import * as THREE from 'three'
import { box, cyl, toon, glowMat } from '../toon'

const FP = {
  stone: 0xd5dbe1,
  stoneLight: 0xe8edf1,
  stoneDark: 0xb2bcc5,
  basinIn: 0xc4d2da,
  waterDeep: 0x3f7f9e,
  bowl: 0xdfe7ee,
}

export interface FountainApi {
  update: (t: number) => void
}

/** 池面 shader：同心涟漪 + 天光渐变 */
function waterSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;          // 0 中心 → 1 池边

        // 同心涟漪：三组不同频率叠加，越靠边越弱
        float w1 = sin(r * 34.0 - uTime * 2.1) * 0.5 + 0.5;
        float w2 = sin(r * 19.0 - uTime * 1.35 + 1.7) * 0.5 + 0.5;
        float w3 = sin(r * 62.0 - uTime * 3.2 + 0.6) * 0.5 + 0.5;
        float fade = smoothstep(1.0, 0.15, r);
        float ripple = (w1 * 0.5 + w2 * 0.32 + w3 * 0.18) * fade;

        vec3 deep = vec3(0.30, 0.58, 0.71);
        vec3 shallow = vec3(0.63, 0.85, 0.94);
        vec3 col = mix(deep, shallow, 0.30 + ripple * 0.55);

        // 天光在池面的均匀提亮
        col += vec3(0.06, 0.08, 0.09) * (0.6 + ripple * 0.6);

        // 中心水柱落点的高光
        float core = smoothstep(0.42, 0.0, r);
        col = mix(col, vec3(0.88, 0.96, 1.0), core * 0.45);

        // 池壁内侧的暗边，让水面有沉下去的感觉
        float rim = smoothstep(0.82, 1.0, r);
        col = mix(col, vec3(0.30, 0.47, 0.56), rim * 0.55);

        gl_FragColor = vec4(col, 0.94 - rim * 0.06);
      }
    `,
  })
}

/** 径向柔光小圆点贴图（飞沫用） */
function sprayTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.45, 'rgba(232,248,255,0.55)')
  g.addColorStop(1, 'rgba(210,238,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function buildFountain(
  parent: THREE.Object3D,
  px: number,
  pz: number,
  baseY = 0.1,
): FountainApi {
  const g = new THREE.Group()
  g.position.set(px, baseY, pz)
  parent.add(g)

  const R_OUT = 0.94
  const R_IN = 0.83
  const WALL_H = 0.22
  const WATER_Y = 0.185

  /* ---------- 池体 ---------- */
  // 池底
  const floor = cyl(R_OUT - 0.02, R_OUT - 0.04, 0.08, 40, FP.basinIn, { line: false })
  floor.position.y = 0.04
  g.add(floor)

  // 外壁：开口圆筒（不能用实心柱，否则顶盖会把水面封住）
  const outerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(R_OUT, R_OUT, WALL_H, 44, 1, true),
    toon(FP.stone, { side: THREE.DoubleSide }),
  )
  outerWall.position.y = WALL_H / 2
  g.add(outerWall)

  // 内壁：同样是开口圆筒
  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(R_IN, R_IN, WALL_H, 44, 1, true),
    toon(FP.stoneLight, { side: THREE.DoubleSide }),
  )
  innerWall.position.y = WALL_H / 2
  g.add(innerWall)

  // 池沿压顶
  const coping = new THREE.Mesh(
    new THREE.RingGeometry(R_IN - 0.005, R_OUT + 0.015, 48, 1),
    toon(FP.stoneLight, { side: THREE.DoubleSide }),
  )
  coping.rotation.x = -Math.PI / 2
  coping.position.y = WALL_H + 0.002
  g.add(coping)

  // 池沿外侧的深色收边，强调轮廓
  const copingEdge = new THREE.Mesh(
    new THREE.TorusGeometry(R_OUT + 0.004, 0.012, 6, 44),
    toon(FP.stoneDark),
  )
  copingEdge.rotation.x = Math.PI / 2
  copingEdge.position.y = WALL_H - 0.012
  g.add(copingEdge)

  /* ---------- 水面 ---------- */
  const waterMat = waterSurfaceMaterial()
  const water = new THREE.Mesh(new THREE.CircleGeometry(R_IN - 0.012, 48), waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.y = WATER_Y
  g.add(water)

  // 水体侧壁（从池沿往下看能看到一点厚度）
  const waterSide = new THREE.Mesh(
    new THREE.CylinderGeometry(R_IN - 0.012, R_IN - 0.012, WATER_Y - 0.02, 40, 1, true),
    toon(FP.waterDeep, { transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  )
  waterSide.position.y = (WATER_Y - 0.02) / 2
  g.add(waterSide)

  /* ---------- 中央水钵 ---------- */
  const pedestal = new THREE.Group()
  g.add(pedestal)

  // 底座
  const pedBase = cyl(0.3, 0.34, 0.12, 24, FP.stone, { line: true })
  pedBase.position.y = 0.08
  pedestal.add(pedBase)

  // 柱身
  const pedCol = cyl(0.12, 0.16, 0.34, 20, FP.stoneLight, { line: true })
  pedCol.position.y = 0.33
  pedestal.add(pedCol)

  // 柱身腰线
  const pedRing = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.01, 6, 20), toon(FP.stoneDark))
  pedRing.rotation.x = Math.PI / 2
  pedRing.position.y = 0.28
  pedestal.add(pedRing)

  // 下层水钵
  const bowlLow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.40, 0.19, 0.13, 36, 1, true),
    toon(FP.bowl, { side: THREE.DoubleSide }),
  )
  bowlLow.position.y = 0.55
  pedestal.add(bowlLow)

  // 钵底（承接水面，略高于钵体下沿）
  const bowlLowBottom = cyl(0.23, 0.22, 0.02, 32, FP.stoneLight, { line: false })
  bowlLowBottom.position.y = 0.5
  pedestal.add(bowlLowBottom)

  const bowlLowRim = new THREE.Mesh(new THREE.TorusGeometry(0.396, 0.012, 6, 32), toon(FP.stoneLight))
  bowlLowRim.rotation.x = Math.PI / 2
  bowlLowRim.position.y = 0.615
  pedestal.add(bowlLowRim)

  // 下层钵内的水
  const bowlLowWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.375, 36),
    new THREE.MeshBasicMaterial({ color: 0x7fbdd8, transparent: true, opacity: 0.95 }),
  )
  bowlLowWater.rotation.x = -Math.PI / 2
  bowlLowWater.position.y = 0.575
  pedestal.add(bowlLowWater)

  // 中柱
  const pedCol2 = cyl(0.085, 0.11, 0.26, 16, FP.stoneLight, { line: true })
  pedCol2.position.y = 0.74
  pedestal.add(pedCol2)

  // 上层水钵
  const bowlHigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.11, 0.1, 32, 1, true),
    toon(FP.bowl, { side: THREE.DoubleSide }),
  )
  bowlHigh.position.y = 0.89
  pedestal.add(bowlHigh)

  const bowlHighBottom = cyl(0.135, 0.13, 0.018, 28, FP.stoneLight, { line: false })
  bowlHighBottom.position.y = 0.84
  pedestal.add(bowlHighBottom)

  const bowlHighRim = new THREE.Mesh(new THREE.TorusGeometry(0.247, 0.011, 6, 28), toon(FP.stoneLight))
  bowlHighRim.rotation.x = Math.PI / 2
  bowlHighRim.position.y = 0.945
  pedestal.add(bowlHighRim)

  const bowlHighWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.225, 32),
    new THREE.MeshBasicMaterial({ color: 0x9fd2e6, transparent: true, opacity: 0.95 }),
  )
  bowlHighWater.rotation.x = -Math.PI / 2
  bowlHighWater.position.y = 0.905
  pedestal.add(bowlHighWater)

  // 顶部喷嘴
  const nozzleBody = cyl(0.055, 0.075, 0.09, 14, FP.stoneDark, { line: true })
  nozzleBody.position.y = 0.995
  pedestal.add(nozzleBody)

  /* ---------- 主水柱（中央细柱 + 顶部散开） ---------- */
  const jetMat = new THREE.MeshBasicMaterial({
    color: 0xf2fbff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    toneMapped: false,
  })

  const jetGroup = new THREE.Group()
  jetGroup.position.y = 1.02
  pedestal.add(jetGroup)

  // 主柱：细长、上细下粗
  const mainJet = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.017, 0.34, 10, 1, true), jetMat)
  mainJet.position.y = 0.17
  jetGroup.add(mainJet)

  // 水柱内芯（更亮的一条，制造通透感）
  const jetCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.007, 0.34, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  jetCore.position.y = 0.17
  jetGroup.add(jetCore)

  // 柱顶散开的水花：6 根极细的斜向水线，做出"炸开"的形状
  const burst: THREE.Mesh[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.16, 5, 1, true), jetMat)
    jet.position.set(Math.cos(a) * 0.024, 0.38, Math.sin(a) * 0.024)
    jet.rotation.z = Math.cos(a) * 0.42
    jet.rotation.x = -Math.sin(a) * 0.42
    jetGroup.add(jet)
    burst.push(jet)
  }

  // 主柱周围的 6 根细水线
  const fineJets: THREE.Mesh[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.006, 0.32, 5, 1, true), jetMat)
    jet.position.set(Math.cos(a) * 0.042, 0.16, Math.sin(a) * 0.042)
    jetGroup.add(jet)
    fineJets.push(jet)
  }

  /* ---------- 抛物水线：上层钵 → 池面 ---------- */
  const arcMat = new THREE.MeshBasicMaterial({
    color: 0xf4fcff,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    toneMapped: false,
  })

  const arcs: THREE.Mesh[] = []
  const ARC_N = 8
  for (let i = 0; i < ARC_N; i++) {
    const a = (i / ARC_N) * Math.PI * 2 + 0.2
    const start = new THREE.Vector3(Math.cos(a) * 0.235, 0.94, Math.sin(a) * 0.235)
    const end = new THREE.Vector3(Math.cos(a) * 0.6, WATER_Y + 0.01, Math.sin(a) * 0.6)
    const mid = new THREE.Vector3(Math.cos(a) * 0.44, 0.8, Math.sin(a) * 0.44)
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 22, 0.011, 5, false), arcMat)
    g.add(tube)
    arcs.push(tube)
  }

  /* ---------- 下层钵的短水线：向池面垂落 ---------- */
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0xe6f7ff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    toneMapped: false,
  })

  const drops: THREE.Mesh[] = []
  const DROP_N = 16
  for (let i = 0; i < DROP_N; i++) {
    const a = (i / DROP_N) * Math.PI * 2 + 0.1
    const h = 0.42
    const fall = cyl(0.0045, 0.0045, h, 5, 0xffffff, { line: false })
    fall.material = dropMat as unknown as THREE.MeshToonMaterial
    fall.position.set(Math.cos(a) * 0.385, 0.6 - h / 2, Math.sin(a) * 0.385)
    g.add(fall)
    drops.push(fall)
  }

  /* ---------- 飞沫（Points） ---------- */
  const SPRAY_N = 320
  const sprayPos = new Float32Array(SPRAY_N * 3)
  const spraySeed = new Float32Array(SPRAY_N)
  for (let i = 0; i < SPRAY_N; i++) {
    spraySeed[i] = Math.random()
    const a = Math.random() * Math.PI * 2
    const r = 0.3 + Math.random() * 0.42
    sprayPos[i * 3] = Math.cos(a) * r
    sprayPos[i * 3 + 1] = 0.2 + Math.random() * 0.75
    sprayPos[i * 3 + 2] = Math.sin(a) * r
  }

  const sprayGeo = new THREE.BufferGeometry()
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3))

  const sprayMat = new THREE.PointsMaterial({
    map: sprayTexture(),
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.NormalBlending,
  })

  const spray = new THREE.Points(sprayGeo, sprayMat)
  g.add(spray)

  /* ---------- 落点涟漪环 ---------- */
  const rings: THREE.Mesh[] = []
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.56, 40),
      new THREE.MeshBasicMaterial({
        color: 0xdff4ff,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = WATER_Y + 0.004
    g.add(ring)
    rings.push(ring)
  }

  /* ---------- 池边小灯（静态亮度，不闪） ---------- */
  ;[0, Math.PI].forEach((a) => {
    const lamp = box(0.1, 0.1, 0.1, 0xd8e0e8, { line: true })
    lamp.position.set(Math.cos(a) * (R_OUT + 0.09), 0.1, Math.sin(a) * (R_OUT + 0.09))
    g.add(lamp)

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 10), glowMat(0xfff2d6, 0.9))
    lens.lookAt(0, 0.1, 0)
    lens.position.set(Math.cos(a) * (R_OUT + 0.142), 0.1, Math.sin(a) * (R_OUT + 0.142))
    g.add(lens)
  })

  /* ================= 动画 ================= */
  function update(t: number) {
    waterMat.uniforms.uTime.value = t

    // 主水柱：高度与粗细做极缓慢的呼吸，像水流自身的脉动
    const breathe = Math.sin(t * 1.6)
    mainJet.scale.y = 1 + breathe * 0.03
    mainJet.scale.x = 1 + Math.sin(t * 2.3) * 0.07
    mainJet.scale.z = mainJet.scale.x
    jetCore.scale.copy(mainJet.scale)

    burst.forEach((j, i) => {
      const k = 1 + Math.sin(t * 2.4 + i * 1.2) * 0.1
      j.scale.y = k
      j.scale.x = 1 / Math.sqrt(k)
      j.scale.z = 1 / Math.sqrt(k)
    })

    fineJets.forEach((j, i) => {
      const k = 1 + Math.sin(t * 2.6 + i * 1.1) * 0.09
      j.scale.y = k
      j.scale.x = 1 / Math.sqrt(k)
      j.scale.z = 1 / Math.sqrt(k)
    })

    // 抛物水线：透明度轻微起伏，模拟水流粗细变化
    arcs.forEach((a, i) => {
      const m = a.material as THREE.MeshBasicMaterial
      m.opacity = 0.68 + Math.sin(t * 1.5 + i * 0.7) * 0.07
    })

    drops.forEach((d, i) => {
      const m = d.material as THREE.MeshBasicMaterial
      m.opacity = 0.5 + Math.sin(t * 2.0 + i * 0.9) * 0.08
      d.scale.y = 1 + Math.sin(t * 2.2 + i) * 0.06
    })

    // 飞沫：匀速下落 + 落地重置，个体速度略有差异
    const arr = sprayGeo.attributes.position.array as Float32Array
    for (let i = 0; i < SPRAY_N; i++) {
      const s = spraySeed[i]
      arr[i * 3 + 1] -= (0.45 + s * 0.5) * 0.016
      if (arr[i * 3 + 1] < WATER_Y + 0.01) {
        const a = s * Math.PI * 2 + t * 0.35
        const r = 0.3 + ((s * 7.13) % 1) * 0.42
        arr[i * 3] = Math.cos(a) * r
        arr[i * 3 + 1] = 0.86 + ((s * 3.71) % 1) * 0.16
        arr[i * 3 + 2] = Math.sin(a) * r
      }
    }
    sprayGeo.attributes.position.needsUpdate = true

    // 落点涟漪：三圈相位错开的扩散
    rings.forEach((ring, i) => {
      const p = (t * 0.32 + i / 3) % 1
      const s = 0.55 + p * 0.55
      ring.scale.set(s, s, s)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.26 * (1 - p) * (1 - p)
    })
  }

  return { update }
}
