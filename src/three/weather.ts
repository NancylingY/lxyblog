/**
 * 天气：持续降雨 / 积水涟漪 / 屋檐滴水 / 雨雾
 */
import * as THREE from 'three'
import { LAYOUT } from './environment'
import type { Puddle } from './environment'

const { x0: SX0, x1: SX1, z1: SZ1, floor: SY } = LAYOUT.store

export interface WeatherApi {
  update: (t: number) => void
}

/* ================= 雨丝（GPU 循环，零 CPU 开销） ================= */
function buildRain(root: THREE.Group, count = 900) {
  const height = 6.2
  const spread = 11

  const pos = new Float32Array(count * 2 * 3)
  const seed = new Float32Array(count * 2)
  const speed = new Float32Array(count * 2)
  const end = new Float32Array(count * 2)

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spread
    const z = (Math.random() - 0.5) * spread
    const y = Math.random() * height
    const s = Math.random()
    const sp = 7 + Math.random() * 7

    for (let v = 0; v < 2; v++) {
      const idx = i * 2 + v
      pos[idx * 3] = x
      pos[idx * 3 + 1] = y
      pos[idx * 3 + 2] = z
      seed[idx] = s
      speed[idx] = sp
      end[idx] = v
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: height },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uHeight;
      attribute float aSeed;
      attribute float aSpeed;
      attribute float aEnd;
      varying float vAlpha;

      void main() {
        vec3 p = position;

        // 循环下落
        float fall = mod(p.y - uTime * aSpeed, uHeight);
        p.y = fall;

        // 第二段顶点向后拖出雨丝长度
        float len = 0.10 + aSeed * 0.13;
        p.y -= aEnd * len;

        // 轻微风斜
        p.x += (uHeight - fall) * 0.035;
        p.z += (uHeight - fall) * 0.012;

        // 接近地面淡出，避免硬切
        vAlpha = smoothstep(0.0, 0.9, fall) * (0.22 + aSeed * 0.3);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;

      void main() {
        gl_FragColor = vec4(0.74, 0.87, 1.0, vAlpha * 0.24);
      }
    `,
  })

  const lines = new THREE.LineSegments(geo, mat)
  lines.frustumCulled = false
  root.add(lines)

  return mat
}

/* ================= 雨雾（贴近地面的低雾） ================= */
function buildMist(root: THREE.Group) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x4a6a92,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const layers: THREE.Mesh[] = []

  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), mat)
    m.rotation.x = -Math.PI / 2
    m.position.y = 0.35 + i * 0.5
    root.add(m)
    layers.push(m)
  }
  return layers
}

/* ================= 屋檐滴水 ================= */
function buildDrips(root: THREE.Group) {
  const drips: { mesh: THREE.Mesh; offset: number; speed: number; x: number }[] = []
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0xcfe8ff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })

  const awningY = SY + 1.98
  const awningZ = SZ1 + 0.64
  const count = 9

  for (let i = 0; i < count; i++) {
    const geo = new THREE.CapsuleGeometry(0.012, 0.1, 3, 6)
    const mesh = new THREE.Mesh(geo, dropMat)
    const x = SX0 + 0.3 + (i / (count - 1)) * (SX1 - SX0 - 0.6)
    mesh.position.set(x, awningY, awningZ)
    root.add(mesh)
    drips.push({
      mesh,
      offset: Math.random(),
      speed: 0.55 + Math.random() * 0.35,
      x,
    })
  }

  return { drips, awningY, awningZ }
}

/* ================= 积水涟漪 ================= */
function buildRipples(root: THREE.Group, puddles: Puddle[]) {
  const ripples: { mesh: THREE.Mesh; puddle: Puddle; offset: number; speed: number; x: number; z: number }[] = []

  const mat = new THREE.MeshBasicMaterial({
    color: 0x9fd4ff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })

  const geo = new THREE.RingGeometry(0.72, 0.8, 20)

  puddles.forEach((p) => {
    const n = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone())
      mesh.rotation.x = -Math.PI / 2
      const ox = (Math.random() - 0.5) * p.rx * 1.2
      const oz = (Math.random() - 0.5) * p.rz * 1.2
      mesh.position.set(p.x + ox, p.y + 0.004, p.z + oz)
      root.add(mesh)
      ripples.push({
        mesh,
        puddle: p,
        offset: Math.random(),
        speed: 0.32 + Math.random() * 0.28,
        x: p.x + ox,
        z: p.z + oz,
      })
    }
  })

  return ripples
}

export function buildWeather(root: THREE.Group, puddles: Puddle[]): WeatherApi {
  const rainMat = buildRain(root)
  const mist = buildMist(root)
  const { drips, awningY } = buildDrips(root)
  const ripples = buildRipples(root, puddles)

  function update(t: number) {
    rainMat.uniforms.uTime.value = t

    // 屋檐滴水：落到地面后重置
    drips.forEach((d) => {
      const p = ((t * d.speed + d.offset) % 1)
      const y = awningY - p * (awningY - 0.1)
      d.mesh.position.y = y
      // 拉长成水线
      const stretch = 1 + Math.min(p * 2.4, 1.2)
      d.mesh.scale.set(1, stretch, 1)

      // 落地瞬间的小水花（用透明度轻微闪一下）
      const near = p > 0.93
      ;(d.mesh.material as THREE.MeshBasicMaterial).opacity = near ? 0.25 : 0.6
    })

    // 涟漪扩散
    ripples.forEach((r) => {
      const phase = (t * r.speed + r.offset) % 1
      const s = 0.06 + phase * 0.7
      r.mesh.scale.set(s * (r.puddle.rx * 1.4), s * (r.puddle.rz * 1.4), 1)
      ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.34
    })

    // 雾层缓慢呼吸
    mist.forEach((m, i) => {
      m.position.y = 0.3 + i * 0.42 + Math.sin(t * 0.25 + i) * 0.06
    })
  }

  // 首次调用，避免初始状态异常
  update(0)

  return { update }
}
