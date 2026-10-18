/**
 * 医院场景专用程序化贴图
 *
 * 设计原则：**全部为图形符号，不含任何文字**。
 * 标识、导视、海报、叫号屏一律用红十字 / 箭头 / 图标表达，
 * 这样既符合"无文字"的要求，也更像卡通渲染里的简化标识。
 */
import { canvasTexture } from '../toon'

/* ================= 图标绘制 ================= */

export type PicoIcon =
  | 'cross'
  | 'capsule'
  | 'droplet'
  | 'bed'
  | 'wheelchair'
  | 'leaf'
  | 'heart'
  | 'stair'
  | 'person'
  | 'arrowL'
  | 'arrowR'
  | 'arrowUp'
  | 'plusCircle'

/** 在白底/蓝底上用路径画出一个图标 */
function drawIcon(
  ctx: CanvasRenderingContext2D,
  icon: PicoIcon,
  cx: number,
  cy: number,
  s: number,
  color: string,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (icon) {
    case 'cross': {
      const a = s * 0.28
      const b = s * 0.5
      ctx.fillRect(-a / 2, -b, a, b * 2)
      ctx.fillRect(-b, -a / 2, b * 2, a)
      break
    }
    case 'plusCircle': {
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      const a = s * 0.14
      const b = s * 0.28
      ctx.fillRect(-a / 2, -b, a, b * 2)
      ctx.fillRect(-b, -a / 2, b * 2, a)
      break
    }
    case 'capsule': {
      ctx.save()
      ctx.rotate(-Math.PI / 4)
      ctx.beginPath()
      ctx.roundRect(-s * 0.5, -s * 0.22, s, s * 0.44, s * 0.22)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, -s * 0.22, s * 0.5, s * 0.44)
      ctx.restore()
      break
    }
    case 'droplet': {
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.52)
      ctx.bezierCurveTo(s * 0.34, -s * 0.08, s * 0.38, s * 0.44, 0, s * 0.48)
      ctx.bezierCurveTo(-s * 0.38, s * 0.44, -s * 0.34, -s * 0.08, 0, -s * 0.52)
      ctx.fill()
      break
    }
    case 'bed': {
      ctx.fillRect(-s * 0.5, -s * 0.04, s, s * 0.14)
      ctx.fillRect(-s * 0.5, s * 0.1, s * 0.07, s * 0.26)
      ctx.fillRect(s * 0.43, s * 0.1, s * 0.07, s * 0.26)
      ctx.beginPath()
      ctx.arc(-s * 0.34, -s * 0.16, s * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-s * 0.2, -s * 0.16, s * 0.3, s * 0.12)
      break
    }
    case 'wheelchair': {
      ctx.beginPath()
      ctx.arc(0, s * 0.06, s * 0.3, 0, Math.PI * 2)
      ctx.lineWidth = s * 0.09
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(-s * 0.03, -s * 0.32, s * 0.11, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = s * 0.09
      ctx.beginPath()
      ctx.moveTo(-s * 0.03, -s * 0.18)
      ctx.lineTo(-s * 0.03, s * 0.06)
      ctx.lineTo(s * 0.3, s * 0.06)
      ctx.stroke()
      break
    }
    case 'leaf': {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.46)
      ctx.bezierCurveTo(-s * 0.55, s * 0.1, -s * 0.3, -s * 0.48, s * 0.06, -s * 0.5)
      ctx.bezierCurveTo(s * 0.5, -s * 0.44, s * 0.46, s * 0.1, 0, s * 0.46)
      ctx.fill()
      break
    }
    case 'heart': {
      ctx.beginPath()
      ctx.moveTo(0, s * 0.42)
      ctx.bezierCurveTo(-s * 0.62, -s * 0.04, -s * 0.3, -s * 0.52, 0, -s * 0.2)
      ctx.bezierCurveTo(s * 0.3, -s * 0.52, s * 0.62, -s * 0.04, 0, s * 0.42)
      ctx.fill()
      break
    }
    case 'stair': {
      ctx.lineWidth = s * 0.1
      ctx.beginPath()
      ctx.moveTo(-s * 0.42, s * 0.4)
      ctx.lineTo(-s * 0.42, s * 0.08)
      ctx.lineTo(-s * 0.14, s * 0.08)
      ctx.lineTo(-s * 0.14, -s * 0.2)
      ctx.lineTo(s * 0.14, -s * 0.2)
      ctx.lineTo(s * 0.14, -s * 0.4)
      ctx.lineTo(s * 0.42, -s * 0.4)
      ctx.stroke()
      break
    }
    case 'person': {
      ctx.beginPath()
      ctx.arc(0, -s * 0.28, s * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.1)
      ctx.lineTo(0, s * 0.16)
      ctx.lineTo(-s * 0.2, s * 0.46)
      ctx.moveTo(0, s * 0.16)
      ctx.lineTo(s * 0.2, s * 0.46)
      ctx.moveTo(-s * 0.2, 0)
      ctx.lineTo(s * 0.2, 0)
      ctx.lineWidth = s * 0.11
      ctx.stroke()
      break
    }
    case 'arrowL':
    case 'arrowR': {
      const d = icon === 'arrowR' ? 1 : -1
      ctx.lineWidth = s * 0.16
      ctx.beginPath()
      ctx.moveTo(-d * s * 0.42, 0)
      ctx.lineTo(d * s * 0.42, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(d * s * 0.16, -s * 0.26)
      ctx.lineTo(d * s * 0.44, 0)
      ctx.lineTo(d * s * 0.16, s * 0.26)
      ctx.stroke()
      break
    }
    case 'arrowUp': {
      ctx.lineWidth = s * 0.16
      ctx.beginPath()
      ctx.moveTo(0, s * 0.42)
      ctx.lineTo(0, -s * 0.42)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-s * 0.26, -s * 0.14)
      ctx.lineTo(0, -s * 0.44)
      ctx.lineTo(s * 0.26, -s * 0.14)
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

/* ================= 幕墙 ================= */

/** 蓝玻璃幕墙单元格：竖向渐变 + 一根竖框，横向平铺后形成整齐窗格 */
export function glassCellTexture() {
  return canvasTexture(64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#eaf6ff')
    g.addColorStop(0.4, '#a9d4f3')
    g.addColorStop(1, '#79afd9')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // 顶部高光（模拟天空反射到的亮边）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fillRect(0, 0, w, 6)

    // 竖向铝框
    ctx.fillStyle = 'rgba(96, 124, 150, 0.5)'
    ctx.fillRect(0, 0, 2, h)

    // 玻璃内侧的浅色反射块
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
    ctx.fillRect(w * 0.18, h * 0.1, w * 0.3, h * 0.46)
  })
}

/** 首层玻璃：几乎无色，只留一点天空反光条纹 */
export function clearGlassTexture() {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, 'rgba(255,255,255,0.42)')
    g.addColorStop(0.35, 'rgba(226,244,255,0.10)')
    g.addColorStop(0.62, 'rgba(255,255,255,0.22)')
    g.addColorStop(1, 'rgba(206,232,250,0.06)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

/* ================= 标识 ================= */

/** 医院主标识：白灯箱 + 红十字（无文字） */
export function crossEmblemTexture() {
  return canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#fbfdfe'
    ctx.fillRect(0, 0, w, h)

    // 上下细蓝条，作为品牌色收边
    ctx.fillStyle = '#3f8fd0'
    ctx.fillRect(0, 0, w, 10)
    ctx.fillStyle = '#7fbde8'
    ctx.fillRect(0, h - 10, w, 10)

    drawIcon(ctx, 'cross', w / 2, h / 2, 168, '#e0453f')

    // 十字两侧的短装饰线
    ctx.fillStyle = 'rgba(63,143,208,0.5)'
    ctx.fillRect(52, h / 2 - 3, 64, 6)
    ctx.fillRect(w - 116, h / 2 - 3, 64, 6)
  })
}

/** 雨棚前沿灯箱：横条 + 一枚红十字 + 两侧箭头 */
export function canopyBandTexture() {
  return canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f7fbfe'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#3f8fd0'
    ctx.fillRect(0, 0, w, 8)
    ctx.fillRect(0, h - 8, w, 8)

    drawIcon(ctx, 'cross', w / 2, h / 2, 62, '#e0453f')
    drawIcon(ctx, 'arrowL', w * 0.3, h / 2, 46, '#5aa6dd')
    drawIcon(ctx, 'arrowR', w * 0.7, h / 2, 46, '#5aa6dd')

    // 细分割线
    ctx.fillStyle = 'rgba(120,160,195,0.35)'
    ctx.fillRect(w * 0.42, 26, 3, h - 52)
    ctx.fillRect(w * 0.58, 26, 3, h - 52)
  })
}

/** 户外导视牌：蓝色底 + 白色箭头 + 小十字 */
export function wayfindingPictogramTexture() {
  return canvasTexture(320, 160, (ctx, w, h) => {
    ctx.fillStyle = '#2f7fc4'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 6
    ctx.strokeRect(9, 9, w - 18, h - 18)

    drawIcon(ctx, 'arrowL', w * 0.3, h / 2, 70, '#ffffff')
    drawIcon(ctx, 'cross', w * 0.72, h / 2, 62, '#ffffff')

    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(w * 0.52, 34)
    ctx.lineTo(w * 0.52, h - 34)
    ctx.stroke()
  })
}

/** 户外健康教育宣传栏：四张海报卡，全用图标 */
export function noticePictogramTexture() {
  return canvasTexture(448, 280, (ctx, w, h) => {
    ctx.fillStyle = '#f7fbfe'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#2f7fc4'
    ctx.fillRect(0, 0, w, 34)
    // 顶部一条白色小十字，替代标题文字
    drawIcon(ctx, 'cross', 24, 17, 18, '#ffffff')
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillRect(44, 14, 120, 6)
    ctx.fillRect(44, 24, 70, 4)

    const cards: {
      x: number
      y: number
      w: number
      h: number
      bg: string
      icon: PicoIcon
      ic: string
    }[] = [
      { x: 18, y: 52, w: 128, h: 96, bg: '#eaf6ff', icon: 'droplet', ic: '#4aa3d8' },
      { x: 160, y: 52, w: 128, h: 96, bg: '#eefaf2', icon: 'leaf', ic: '#4cba7f' },
      { x: 302, y: 52, w: 128, h: 96, bg: '#fff4e8', icon: 'heart', ic: '#e89a4c' },
      { x: 18, y: 162, w: 198, h: 100, bg: '#f2f6fa', icon: 'capsule', ic: '#7f9db5' },
      { x: 230, y: 162, w: 200, h: 100, bg: '#eaf6ff', icon: 'person', ic: '#4aa3d8' },
    ]

    cards.forEach((c) => {
      ctx.fillStyle = c.bg
      ctx.fillRect(c.x, c.y, c.w, c.h)
      ctx.strokeStyle = 'rgba(47,127,196,0.22)'
      ctx.lineWidth = 2
      ctx.strokeRect(c.x, c.y, c.w, c.h)
      drawIcon(ctx, c.icon, c.x + c.w / 2, c.y + c.h * 0.42, Math.min(c.w, c.h) * 0.5, c.ic)
      // 图标下方的两条灰线，代替正文
      ctx.fillStyle = 'rgba(90,120,145,0.32)'
      ctx.fillRect(c.x + c.w * 0.2, c.y + c.h * 0.76, c.w * 0.6, 5)
      ctx.fillRect(c.x + c.w * 0.3, c.y + c.h * 0.86, c.w * 0.4, 5)
    })
  })
}

/** 科室牌：色条 + 图标（无文字） */
export function deptPictogramTexture(icon: PicoIcon, accent = '#2f7fc4') {
  return canvasTexture(384, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = accent
    ctx.fillRect(0, 0, 16, h)
    drawIcon(ctx, icon, 82, h / 2, 74, accent)
    // 图标右侧的抽象信息条
    ctx.fillStyle = 'rgba(60,90,120,0.55)'
    ctx.fillRect(146, h * 0.34, 170, 12)
    ctx.fillStyle = 'rgba(120,150,175,0.55)'
    ctx.fillRect(146, h * 0.56, 110, 8)
  })
}

/** 楼层总平面图：平面示意 + 彩色区块（无文字） */
export function floorPlanTexture() {
  return canvasTexture(320, 420, (ctx, w, h) => {
    ctx.fillStyle = '#f7fbfe'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#2f7fc4'
    ctx.fillRect(0, 0, w, 40)
    drawIcon(ctx, 'cross', 26, 20, 20, '#ffffff')
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillRect(46, 17, 96, 6)

    // 平面示意
    ctx.strokeStyle = '#9fc0d8'
    ctx.lineWidth = 3
    ctx.strokeRect(24, 62, w - 48, 160)
    ctx.fillStyle = '#d9e9f5'
    ctx.fillRect(40, 80, 90, 54)
    ctx.fillRect(150, 80, 60, 54)
    ctx.fillStyle = '#c9e2f2'
    ctx.fillRect(40, 150, 60, 54)
    ctx.fillRect(120, 150, 90, 54)
    ctx.fillStyle = '#b7d6ea'
    ctx.fillRect(220, 80, 62, 124)
    // 入口箭头
    drawIcon(ctx, 'arrowUp', w / 2, 106, 30, '#4aa3d8')

    // 楼层色块列表（用色块代替文字行）
    const rows = ['#4aa3d8', '#4cba7f', '#e89a4c', '#8a76d0', '#5fb4e8', '#e0453f']
    rows.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(26, 250 + i * 26, 18, 14)
      ctx.fillStyle = 'rgba(90,120,145,0.35)'
      ctx.fillRect(56, 253 + i * 26, 150 - (i % 3) * 22, 8)
    })
  })
}

/** 电子叫号屏：色块行 + 高亮行（无文字） */
export function queueScreenTexture() {
  return canvasTexture(384, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0e2a44'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#1d4f78'
    ctx.fillRect(0, 0, w, 36)
    drawIcon(ctx, 'cross', 22, 18, 16, '#cfe9ff')
    ctx.fillStyle = 'rgba(207,233,255,0.5)'
    ctx.fillRect(40, 15, 90, 6)

    // 当前呼叫：一个大的高亮块
    ctx.fillStyle = 'rgba(127,216,255,0.16)'
    ctx.fillRect(18, 54, w - 36, 62)
    ctx.fillStyle = '#7fd8ff'
    ctx.fillRect(32, 70, 92, 30)
    ctx.fillStyle = '#0e2a44'
    ctx.fillRect(46, 80, 26, 10)
    ctx.fillRect(80, 80, 30, 10)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillRect(146, 76, 130, 8)
    ctx.fillRect(146, 90, 90, 6)

    // 队列行
    for (let i = 0; i < 3; i++) {
      const y = 136 + i * 34
      ctx.fillStyle = 'rgba(74,144,194,0.5)'
      ctx.fillRect(28, y, 46, 20)
      ctx.fillStyle = 'rgba(160,205,235,0.32)'
      ctx.fillRect(88, y + 6, 120 - i * 18, 8)
    }
  })
}

/** 健康科普海报：抽象构图 + 图标（无文字） */
export function healthPosterTexture(i: number) {
  const themes = [
    { bg: '#eaf6ff', accent: '#4aa3d8', icon: 'droplet' as PicoIcon },
    { bg: '#eefaf2', accent: '#4cba7f', icon: 'leaf' as PicoIcon },
    { bg: '#fff4e8', accent: '#e89a4c', icon: 'heart' as PicoIcon },
    { bg: '#f3eeff', accent: '#8a76d0', icon: 'capsule' as PicoIcon },
  ]
  const t = themes[i % themes.length]
  return canvasTexture(220, 300, (ctx, w, h) => {
    ctx.fillStyle = t.bg
    ctx.fillRect(0, 0, w, h)

    ctx.globalAlpha = 0.16
    ctx.fillStyle = t.accent
    ctx.beginPath()
    ctx.arc(w * 0.7, h * 0.28, 56, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(w * 0.3, h * 0.5, 70, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    drawIcon(ctx, t.icon, w / 2, h * 0.42, 92, t.accent)

    ctx.fillStyle = 'rgba(60,90,120,0.5)'
    ctx.fillRect(w * 0.16, h * 0.72, w * 0.68, 10)
    ctx.fillStyle = 'rgba(120,150,175,0.45)'
    ctx.fillRect(w * 0.24, h * 0.8, w * 0.5, 7)
    ctx.fillRect(w * 0.3, h * 0.87, w * 0.38, 7)
  })
}

/** 自助机 / 售货机屏幕：抽象界面 */
export function screenUiTexture(seed = 0) {
  return canvasTexture(256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#f2fbff'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#4aa3d8'
    ctx.fillRect(0, 0, w, 54)
    drawIcon(ctx, 'cross', 30, 27, 22, '#ffffff')

    const rows = [0, 1, 2, 3]
    rows.forEach((r) => {
      const y = 78 + r * 62
      ctx.fillStyle = ['#e3f2fb', '#e8f7ef', '#fdf1e4', '#eee9fb'][(r + seed) % 4]
      ctx.fillRect(20, y, w - 40, 48)
      ctx.fillStyle = ['#4aa3d8', '#4cba7f', '#e89a4c', '#8a76d0'][(r + seed) % 4]
      ctx.fillRect(32, y + 14, 20, 20)
      ctx.fillStyle = 'rgba(90,120,145,0.35)'
      ctx.fillRect(66, y + 16, 110, 7)
      ctx.fillRect(66, y + 29, 76, 6)
    })

    ctx.fillStyle = '#4aa3d8'
    ctx.fillRect(20, h - 54, w - 40, 32)
  })
}

/** 地面导向箭头（透明底，纯图形） */
export function floorArrowTexture(color = '#4aa3d8') {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    drawIcon(ctx, 'arrowUp', w / 2, h / 2, 92, color)
  })
}

/** 垃圾 / 医疗废物分类：只画符号 */
export function binLabelTexture(icon: PicoIcon, accent: string) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    drawIcon(ctx, icon, w / 2, h / 2, 76, accent)
  })
}
