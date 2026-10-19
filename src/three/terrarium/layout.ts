/**
 * 微光之境 · 场景布局与地形函数
 * 山、河、湖、林的位置都在这里定义，植被/动物/水流共用同一套坐标。
 */

export const ISLAND_R = 2.3
export const ISLAND_TOP = 2.05

export const MOUNTAIN = { x: 0.05, z: -0.55, radius: 1.35 } as const

/** 溪流在 XZ 平面上的控制点（瀑布脚下 → 小湖） */
export const RIVER_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0.05, 0.95],
  [0.45, 1.08],
  [0.55, 1.4],
  [0.35, 1.68],
  [0.05, 1.85],
  [-0.55, 1.68],
]

export const LAKE = { x: -0.65, z: 1.6, rx: 0.5, rz: 0.34 } as const

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** 岛屿顶面的高度（含山脚缓坡与边缘微翘） */
export function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z)
  let y = ISLAND_TOP
  y += 0.045 * Math.sin(x * 2.35 + 1.1) * Math.cos(z * 2.7 - 0.6)
  y += 0.022 * Math.sin(x * 5.6 - z * 4.2 + 0.8)

  const md = Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z)
  y += 0.42 * Math.exp(-(md * md) / 1.35)

  // 边缘轻微收拢，避免草地像一张平板
  y -= 0.07 * smoothstep(1.9, ISLAND_R, r)
  return y
}

function segmentDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax
  const vz = bz - az
  const wx = px - ax
  const wz = pz - az
  const len = vx * vx + vz * vz
  const t = len > 0 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / len)) : 0
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t))
}

/** 到溪流中心线的最短距离 */
export function riverDistance(x: number, z: number): number {
  let best = Infinity
  for (let i = 0; i < RIVER_POINTS.length - 1; i++) {
    const [ax, az] = RIVER_POINTS[i]
    const [bx, bz] = RIVER_POINTS[i + 1]
    best = Math.min(best, segmentDistance(x, z, ax, az, bx, bz))
  }
  return best
}

/** 湖面椭圆归一化距离：<1 在湖内 */
export function lakeFactor(x: number, z: number): number {
  return Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz)
}

/** 地表高度：在基础地形上挖出河道与湖盆 */
export function carvedHeight(x: number, z: number): number {
  let y = groundHeight(x, z)
  y -= 0.085 * smoothstep(0.44, 0.05, riverDistance(x, z))
  y -= 0.055 * smoothstep(1.28, 0.98, lakeFactor(x, z))
  return y
}

/** 可落地植被的判定（避开水面、山体与主草甸） */
export function isPlantable(x: number, z: number, margin = 0): boolean {
  if (Math.hypot(x, z) > ISLAND_R - 0.12 - margin) return false
  if (Math.hypot(x - MOUNTAIN.x, z - MOUNTAIN.z) < MOUNTAIN.radius - 0.05 + margin) return false
  if (riverDistance(x, z) < 0.38 + margin) return false
  if (lakeFactor(x, z) < 1.45 + margin * 1.5) return false
  return true
}

/** 确定性伪随机，保证每次刷新地形与摆件一致 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
