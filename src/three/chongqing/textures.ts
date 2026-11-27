import * as THREE from 'three'

const FONT_ZH = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif'
const FONT_SERIF = '"Songti SC", "STSong", "Noto Serif SC", Georgia, serif'
const FONT_MONO = '"SF Mono", "JetBrains Mono", Consolas, monospace'

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  return [canvas, ctx]
}

function toTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace
  tex.wrapS = repeatX > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  tex.wrapT = repeatY > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  if (repeatX !== 1 || repeatY !== 1) tex.repeat.set(repeatX, repeatY)
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/** Deterministic PRNG for consistent procedural textures */
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

export interface ChongqingTextures {
  walnutWood: THREE.CanvasTexture
  brushedBrass: THREE.CanvasTexture
  plinthNameplate: THREE.CanvasTexture
  sandstoneMoss: THREE.CanvasTexture
  sandstoneStrata: THREE.CanvasTexture
  bluestoneSteps: THREE.CanvasTexture
  mosaicFacade: THREE.CanvasTexture
  subwayTile: THREE.CanvasTexture
  brickVault: THREE.CanvasTexture
  banyanLeafAlpha: THREE.CanvasTexture
  banyanBark: THREE.CanvasTexture
  tactilePaving: THREE.CanvasTexture
  stormGrate: THREE.CanvasTexture
  manholeCover: THREE.CanvasTexture
  makeSign: (opts: {
    w?: number
    h?: number
    bg: string
    border?: string
    text: string
    subtext?: string
    color?: string
    subColor?: string
    vertical?: boolean
    serif?: boolean
    glow?: string
    badge?: string
  }) => THREE.CanvasTexture
  dispose: () => void
}

export function createChongqingTextures(): ChongqingTextures {
  const owned: THREE.Texture[] = []
  const track = (t: THREE.CanvasTexture) => {
    owned.push(t)
    return t
  }

  // 1. Dark walnut exhibition plinth wood grain
  const walnutWood = (() => {
    const [c, ctx] = makeCanvas(512, 256)
    const rand = mulberry32(101)
    ctx.fillStyle = '#241711'
    ctx.fillRect(0, 0, 512, 256)
    for (let y = 0; y < 256; y += 2) {
      const wave = Math.sin(y * 0.08) * 14
      const shade = 28 + Math.floor(rand() * 20)
      ctx.strokeStyle = `rgba(${shade + 18}, ${shade + 5}, ${shade - 4}, 0.55)`
      ctx.lineWidth = 1.6 + rand() * 1.4
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(170, y + wave, 340, y - wave * 0.6, 512, y + wave * 0.3)
      ctx.stroke()
    }
    return track(toTexture(c, 2, 1))
  })()

  // 2. Brushed brass trim
  const brushedBrass = (() => {
    const [c, ctx] = makeCanvas(512, 128)
    const rand = mulberry32(202)
    const g = ctx.createLinearGradient(0, 0, 512, 0)
    g.addColorStop(0, '#a68344')
    g.addColorStop(0.5, '#d7b56d')
    g.addColorStop(1, '#9b793c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 128)
    for (let i = 0; i < 320; i++) {
      const y = rand() * 128
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,244,210,0.09)' : 'rgba(40,28,10,0.12)'
      ctx.fillRect(0, y, 512, 1)
    }
    return track(toTexture(c, 2, 1))
  })()

  // 3. Engraved brass plinth nameplate
  const plinthNameplate = (() => {
    const [c, ctx] = makeCanvas(1024, 192)
    const g = ctx.createLinearGradient(0, 0, 1024, 192)
    g.addColorStop(0, '#9d7c3f')
    g.addColorStop(0.35, '#d5b268')
    g.addColorStop(0.65, '#c29c52')
    g.addColorStop(1, '#8c6b32')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 1024, 192)
    // Fine brushed lines
    ctx.fillStyle = 'rgba(255,250,235,0.08)'
    for (let y = 0; y < 192; y += 3) ctx.fillRect(0, y, 1024, 1)
    // Engraved inner border
    ctx.strokeStyle = '#33240d'
    ctx.lineWidth = 4
    ctx.strokeRect(18, 18, 988, 156)
    ctx.strokeStyle = 'rgba(255,235,180,0.45)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(24, 24, 976, 144)
    // Corner rivets
    for (const [rx, ry] of [
      [38, 38],
      [986, 38],
      [38, 154],
      [986, 154],
    ]) {
      ctx.beginPath()
      ctx.arc(rx, ry, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#4a3514'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(rx - 1.5, ry - 1.5, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#efd597'
      ctx.fill()
    }
    ctx.fillStyle = '#241808'
    ctx.textAlign = 'center'
    ctx.font = `700 44px ${FONT_SERIF}`
    ctx.fillText('重 庆 8D 山 城 雨 夜 剖 面 沙 盘', 512, 92)
    ctx.font = `600 22px ${FONT_MONO}`
    ctx.fillText('CHONGQING 8D RAIN BOX  ·  SCALE 1 : 150  ·  ARCHIVAL CUTAWAY', 512, 140)
    return track(toTexture(c))
  })()

  // 4. Sandstone retaining wall with damp moss stains (青苔堡坎)
  const sandstoneMoss = (() => {
    const [c, ctx] = makeCanvas(512, 512)
    const rand = mulberry32(303)
    ctx.fillStyle = '#5c5448'
    ctx.fillRect(0, 0, 512, 512)
    const rows = 12
    const rowH = 512 / rows
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -32
      while (x < 512) {
        const w = 52 + rand() * 56
        const v = 78 + Math.floor(rand() * 34)
        ctx.fillStyle = `rgb(${v + 12}, ${v + 5}, ${v - 6})`
        ctx.fillRect(x + 2, r * rowH + 2, w - 4, rowH - 4)
        // subtle surface grain
        ctx.fillStyle = `rgba(30,26,20,${0.08 + rand() * 0.14})`
        ctx.fillRect(x + 2, r * rowH + rowH * 0.65, w - 4, rowH * 0.3)
        x += w
      }
      ctx.fillStyle = 'rgba(20, 22, 18, 0.65)'
      ctx.fillRect(0, r * rowH, 512, 3)
    }
    // Damp vertical rain streaks & green moss patches
    for (let i = 0; i < 65; i++) {
      const mx = rand() * 512
      const my = rand() * 512
      const mr = 14 + rand() * 36
      const mg = ctx.createRadialGradient(mx, my, 2, mx, my, mr)
      mg.addColorStop(0, `rgba(42, 74, 38, ${0.38 + rand() * 0.25})`)
      mg.addColorStop(1, 'rgba(32, 52, 28, 0)')
      ctx.fillStyle = mg
      ctx.beginPath()
      ctx.arc(mx, my, mr, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let i = 0; i < 40; i++) {
      const sx = rand() * 512
      const sw = 3 + rand() * 8
      const g = ctx.createLinearGradient(sx, 0, sx, 220 + rand() * 280)
      g.addColorStop(0, 'rgba(15, 20, 14, 0.45)')
      g.addColorStop(1, 'rgba(15, 20, 14, 0)')
      ctx.fillStyle = g
      ctx.fillRect(sx, 0, sw, 512)
    }
    return track(toTexture(c, 2, 1))
  })()

  // 5. Stratified Chongqing red-brown sandstone bedrock for cutaway flanks
  const sandstoneStrata = (() => {
    const [c, ctx] = makeCanvas(512, 512)
    const rand = mulberry32(404)
    ctx.fillStyle = '#3b2e26'
    ctx.fillRect(0, 0, 512, 512)
    const bands = ['#4a382d', '#3a2c24', '#584133', '#2e241f', '#4f3b2e', '#352922']
    for (let y = 0; y < 512; y += 16) {
      ctx.fillStyle = bands[Math.floor(rand() * bands.length)]!
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= 512; x += 32) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + y * 0.05) * 6 + (rand() - 0.5) * 4)
      }
      ctx.lineTo(512, y + 22)
      ctx.lineTo(0, y + 22)
      ctx.closePath()
      ctx.fill()
    }
    // Embedded pebbles & crevices
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(18,12,8,0.35)' : 'rgba(118,92,74,0.22)'
      ctx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 7, 1 + rand() * 3)
    }
    return track(toTexture(c, 2, 1))
  })()

  // 6. Bluestone slabs (青石板梯坎)
  const bluestoneSteps = (() => {
    const [c, ctx] = makeCanvas(512, 512)
    const rand = mulberry32(505)
    ctx.fillStyle = '#333b42'
    ctx.fillRect(0, 0, 512, 512)
    for (let r = 0; r < 10; r++) {
      const y = r * 51.2
      let x = (r % 2) * -40
      while (x < 512) {
        const w = 96 + rand() * 70
        const b = 52 + Math.floor(rand() * 24)
        ctx.fillStyle = `rgb(${b - 4}, ${b + 2}, ${b + 9})`
        ctx.fillRect(x + 2, y + 2, w - 4, 47)
        x += w
      }
      ctx.fillStyle = '#1d2228'
      ctx.fillRect(0, y, 512, 3)
    }
    // Moss in crevices
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(46, 78, 44, 0.25)'
      ctx.fillRect(rand() * 512, Math.floor(rand() * 10) * 51.2 - 2, 18 + rand() * 44, 5)
    }
    return track(toTexture(c, 2, 2))
  })()

  // 7. Weathered cream/terracotta Chongqing residential mosaic-tile facade (李子坝楼外墙)
  const mosaicFacade = (() => {
    const [c, ctx] = makeCanvas(512, 512)
    const rand = mulberry32(606)
    ctx.fillStyle = '#c8b498'
    ctx.fillRect(0, 0, 512, 512)
    // Terracotta waist bands & fine mosaic tiles
    const tileW = 16
    const tileH = 8
    for (let y = 0; y < 512; y += tileH) {
      const isBand = (y % 128) < 24
      for (let x = 0; x < 512; x += tileW) {
        const jitter = Math.floor((rand() - 0.5) * 16)
        if (isBand) {
          ctx.fillStyle = `rgb(${164 + jitter}, ${98 + jitter}, ${76 + jitter})`
        } else {
          ctx.fillStyle = `rgb(${198 + jitter}, ${180 + jitter}, ${152 + jitter})`
        }
        ctx.fillRect(x + 1, y + 1, tileW - 1.5, tileH - 1.5)
      }
    }
    // Rain-drip weathering streaks beneath horizontal joints
    for (let i = 0; i < 70; i++) {
      const sx = rand() * 512
      const sy = Math.floor(rand() * 4) * 128
      const len = 24 + rand() * 76
      const g = ctx.createLinearGradient(sx, sy, sx, sy + len)
      g.addColorStop(0, 'rgba(48, 40, 34, 0.36)')
      g.addColorStop(1, 'rgba(48, 40, 34, 0)')
      ctx.fillStyle = g
      ctx.fillRect(sx, sy, 3 + rand() * 6, len)
    }
    return track(toTexture(c, 2, 3))
  })()

  // 8. Glazed ceramic subway wall tiles with Chongqing Rail crimson/amber stripe
  const subwayTile = (() => {
    const [c, ctx] = makeCanvas(512, 512)
    const rand = mulberry32(707)
    ctx.fillStyle = '#d4d8dc'
    ctx.fillRect(0, 0, 512, 512)
    for (let y = 0; y < 512; y += 32) {
      for (let x = 0; x < 512; x += 64) {
        const v = 204 + Math.floor((rand() - 0.5) * 12)
        ctx.fillStyle = `rgb(${v}, ${v + 3}, ${v + 5})`
        ctx.fillRect(x + 2, y + 2, 60, 28)
      }
    }
    // Chongqing CRT signature crimson + warm amber horizontal stripe
    ctx.fillStyle = '#a92228'
    ctx.fillRect(0, 210, 512, 36)
    ctx.fillStyle = '#df9a34'
    ctx.fillRect(0, 250, 512, 12)
    // Lower dark dado plinth
    ctx.fillStyle = '#474f58'
    ctx.fillRect(0, 410, 512, 102)
    return track(toTexture(c, 3, 1))
  })()

  // 9. Air-raid shelter arched masonry brick vault (防空洞砖石拱顶)
  const brickVault = (() => {
    const [c, ctx] = makeCanvas(512, 512)
    const rand = mulberry32(808)
    ctx.fillStyle = '#2d241f'
    ctx.fillRect(0, 0, 512, 512)
    const bh = 22
    const bw = 54
    for (let row = 0; row < 24; row++) {
      const offset = (row % 2) * (bw * 0.5)
      for (let x = -bw; x < 512; x += bw) {
        const tone = 72 + Math.floor(rand() * 34)
        const warm = Math.floor(rand() * 24)
        ctx.fillStyle = `rgb(${tone + 26 + warm}, ${tone + 6}, ${tone - 6})`
        ctx.fillRect(x + offset + 2, row * bh + 2, bw - 4, bh - 4)
      }
    }
    // Damp soot / moisture gradient near arch crown
    for (let i = 0; i < 48; i++) {
      const gx = rand() * 512
      const gy = rand() * 512
      const r = 18 + rand() * 44
      const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, r)
      g.addColorStop(0, 'rgba(20, 14, 10, 0.38)')
      g.addColorStop(1, 'rgba(20, 14, 10, 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(gx, gy, r, 0, Math.PI * 2)
      ctx.fill()
    }
    return track(toTexture(c, 2, 2))
  })()

  // 10. Delicate botanical multi-leaf banyan foliage cluster (alpha-cutout, ZERO spheres!)
  const banyanLeafAlpha = (() => {
    const [c, ctx] = makeCanvas(256, 256)
    const rand = mulberry32(909)
    ctx.clearRect(0, 0, 256, 256)
    // Thin dark twig stems radiating from center-bottom
    ctx.strokeStyle = '#3b2e22'
    ctx.lineWidth = 3
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI * 0.8 + (i / 4) * Math.PI * 0.6
      ctx.beginPath()
      ctx.moveTo(128, 175)
      ctx.lineTo(128 + Math.cos(ang) * 76, 150 + Math.sin(ang) * 86)
      ctx.stroke()
    }
    // 18 delicate pointed banyan leaves in varied lush Chongqing greens
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2 + (rand() - 0.5) * 0.35
      const dist = 18 + rand() * 68
      const lx = 128 + Math.cos(ang) * dist
      const ly = 124 + Math.sin(ang) * dist * 0.92
      const len = 30 + rand() * 22
      const wid = 11 + rand() * 7
      ctx.save()
      ctx.translate(lx, ly)
      ctx.rotate(ang + (rand() - 0.5) * 0.5)
      const g = ctx.createLinearGradient(-len * 0.5, 0, len * 0.5, 0)
      const h = 112 + Math.floor(rand() * 24)
      const s = 38 + Math.floor(rand() * 22)
      const l = 24 + Math.floor(rand() * 18)
      g.addColorStop(0, `hsl(${h}, ${s}%, ${l - 5}%)`)
      g.addColorStop(0.65, `hsl(${h + 6}, ${s + 8}%, ${l + 6}%)`)
      g.addColorStop(1, `hsl(${h + 12}, ${s + 10}%, ${l + 12}%)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(-len * 0.5, 0)
      ctx.quadraticCurveTo(0, -wid, len * 0.5, 0)
      ctx.quadraticCurveTo(0, wid, -len * 0.5, 0)
      ctx.closePath()
      ctx.fill()
      // Subtle center midrib vein
      ctx.strokeStyle = 'rgba(200, 232, 164, 0.32)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-len * 0.42, 0)
      ctx.lineTo(len * 0.38, 0)
      ctx.stroke()
      ctx.restore()
    }
    return track(toTexture(c))
  })()

  // 11. Gnarly dark-bark banyan trunk texture
  const banyanBark = (() => {
    const [c, ctx] = makeCanvas(256, 256)
    const rand = mulberry32(1010)
    ctx.fillStyle = '#362d26'
    ctx.fillRect(0, 0, 256, 256)
    for (let x = 0; x < 256; x += 4) {
      ctx.strokeStyle = rand() > 0.45 ? 'rgba(20,16,12,0.55)' : 'rgba(86,74,60,0.3)'
      ctx.lineWidth = 2 + rand() * 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(x + (rand() - 0.5) * 14, 90, x + (rand() - 0.5) * 14, 170, x, 256)
      ctx.stroke()
    }
    return track(toTexture(c, 1, 2))
  })()

  // 12. Yellow bumpy subway tactile paving (盲道)
  const tactilePaving = (() => {
    const [c, ctx] = makeCanvas(256, 256)
    ctx.fillStyle = '#d6a425'
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = '#f2c94c'
    for (let x = 16; x < 256; x += 32) {
      for (let y = 16; y < 256; y += 32) {
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(110, 74, 10, 0.5)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
    return track(toTexture(c, 8, 1))
  })()

  // 13. Storm drain grate (雨水篦子)
  const stormGrate = (() => {
    const [c, ctx] = makeCanvas(256, 128)
    ctx.fillStyle = '#25292e'
    ctx.fillRect(0, 0, 256, 128)
    ctx.strokeStyle = '#484f57'
    ctx.lineWidth = 6
    ctx.strokeRect(4, 4, 248, 120)
    ctx.fillStyle = '#090b0d'
    for (let x = 18; x < 238; x += 22) {
      ctx.fillRect(x, 16, 11, 96)
    }
    return track(toTexture(c))
  })()

  // 14. Embossed cast-iron manhole cover
  const manholeCover = (() => {
    const [c, ctx] = makeCanvas(256, 256)
    ctx.clearRect(0, 0, 256, 256)
    ctx.beginPath()
    ctx.arc(128, 128, 120, 0, Math.PI * 2)
    ctx.fillStyle = '#2c3035'
    ctx.fill()
    ctx.strokeStyle = '#525860'
    ctx.lineWidth = 8
    ctx.stroke()
    ctx.strokeStyle = '#42474e'
    ctx.lineWidth = 3
    for (let r = 36; r <= 96; r += 26) {
      ctx.beginPath()
      ctx.arc(128, 128, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = '#6c737c'
    ctx.font = `700 26px ${FONT_ZH}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('渝 · 排水', 128, 128)
    return track(toTexture(c))
  })()

  const makeSign: ChongqingTextures['makeSign'] = (opts) => {
    const w = opts.w ?? 512
    const h = opts.h ?? 160
    const [c, ctx] = makeCanvas(w, h)
    ctx.fillStyle = opts.bg
    ctx.fillRect(0, 0, w, h)
    if (opts.border) {
      ctx.strokeStyle = opts.border
      ctx.lineWidth = Math.max(4, Math.min(w, h) * 0.04)
      ctx.strokeRect(8, 8, w - 16, h - 16)
    }
    const fontFamily = opts.serif ? FONT_SERIF : FONT_ZH
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (opts.glow) {
      ctx.shadowColor = opts.glow
      ctx.shadowBlur = 14
    }
    ctx.fillStyle = opts.color ?? '#fff5df'

    if (opts.vertical) {
      const chars = Array.from(opts.text)
      const step = (h - 44) / Math.max(chars.length, 1)
      const fSize = Math.min(w * 0.56, step * 0.8)
      ctx.font = `700 ${Math.round(fSize)}px ${fontFamily}`
      chars.forEach((ch, idx) => {
        ctx.fillText(ch, w * 0.5, 22 + step * (idx + 0.5))
      })
    } else if (opts.subtext) {
      const fMain = Math.round(Math.min(h * 0.42, (w * 0.84) / Math.max(opts.text.length * 0.82, 4)))
      ctx.font = `700 ${fMain}px ${fontFamily}`
      ctx.fillText(opts.text, w * 0.5, h * 0.38)
      ctx.shadowBlur = 0
      ctx.fillStyle = opts.subColor ?? 'rgba(255,240,210,0.88)'
      const fSub = Math.round(Math.min(h * 0.22, (w * 0.88) / Math.max(opts.subtext.length * 0.55, 6)))
      ctx.font = `600 ${fSub}px ${FONT_MONO}`
      ctx.fillText(opts.subtext, w * 0.5, h * 0.74)
    } else {
      const fMain = Math.round(Math.min(h * 0.52, (w * 0.86) / Math.max(opts.text.length * 0.85, 3)))
      ctx.font = `700 ${fMain}px ${fontFamily}`
      ctx.fillText(opts.text, w * 0.5, h * 0.52)
    }

    if (opts.badge) {
      ctx.shadowBlur = 0
      ctx.fillStyle = '#c92a2a'
      ctx.beginPath()
      ctx.arc(h * 0.5, h * 0.5, h * 0.28, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff5e4'
      ctx.font = `700 ${Math.round(h * 0.26)}px ${FONT_ZH}`
      ctx.fillText(opts.badge, h * 0.5, h * 0.51)
    }

    return track(toTexture(c))
  }

  return {
    walnutWood,
    brushedBrass,
    plinthNameplate,
    sandstoneMoss,
    sandstoneStrata,
    bluestoneSteps,
    mosaicFacade,
    subwayTile,
    brickVault,
    banyanLeafAlpha,
    banyanBark,
    tactilePaving,
    stormGrate,
    manholeCover,
    makeSign,
    dispose: () => {
      for (const tex of owned) tex.dispose()
      owned.length = 0
    },
  }
}
