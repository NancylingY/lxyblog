// All moving parts share the same clock so a paused frame retains its pose.
type Brush = CanvasRenderingContext2D
type Paint = string | CanvasGradient
const tau = Math.PI * 2
const paths = new Map<string, Path2D>()

function shape(c: Brush, d: string, color: Paint, outline?: string, width = 1) {
  let path = paths.get(d)
  if (!path) {
    path = new Path2D(d)
    paths.set(d, path)
  }
  c.fillStyle = color
  c.fill(path)
  if (outline) {
    c.strokeStyle = outline
    c.lineWidth = width
    c.stroke(path)
  }
}

function stroke(c: Brush, color: string, width: number, ...points: number[]) {
  c.beginPath()
  c.moveTo(points[0]!, points[1]!)
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i]!, points[i + 1]!)
  c.lineWidth = width
  c.strokeStyle = color
  c.stroke()
}

function oval(c: Brush, x: number, y: number, rx: number, ry: number, color: Paint, angle = 0) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, angle, 0, tau)
  c.fillStyle = color
  c.fill()
}

function ramp(c: Brush, y: number, end: number, ...colors: string[]) {
  const g = c.createLinearGradient(0, y, 0, end)
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color))
  return g
}

function surface(w: number, h: number) {
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  return { el, c: el.getContext('2d')! }
}

// Painted panoramas are blurred once, then scrolled at different tracking speeds.
const ridgeWidth = 1800
function paintRidge(distant: boolean) {
  const { el, c } = surface(ridgeWidth, 435)
  const peaks = [
    [0, 208], [124, 170], [200, 112], [280, 174], [375, 134], [451, 159],
    [555, 63], [607, 115], [677, 153], [716, 127], [794, 187],
    [936, 105], [981, 149], [1067, 78], [1171, 167], [1270, 125],
    [1344, 145], [1453, 83], [1516, 147], [1590, 119], [1695, 184], [1800, 208],
  ] as const
  c.translate(0, distant ? 6 : 60)
  c.scale(1, distant ? 0.95 : 1)
  c.fillStyle = distant ? '#a0b8ba' : '#7e9898'
  c.beginPath()
  c.moveTo(0, 435)
  for (const [x, y] of peaks) c.lineTo(x, y)
  c.lineTo(ridgeWidth, 435)
  c.fill()
  for (let i = 1; i < peaks.length - 1; i++) {
    const [x, y] = peaks[i]!
    const [lx, ly] = peaks[i - 1]!
    const [rx, ry] = peaks[i + 1]!
    if (y >= ly || y >= ry) continue
    const h = distant ? 90 : 110
    const dx = rx - x
    const left = x - lx
    c.save()
    c.translate(x, y)
    const face = (color: string, points: number[][]) => {
      c.beginPath()
      c.moveTo(0, 0)
      for (const p of points) c.lineTo(p[0]!, p[1]!)
      c.closePath()
      c.fillStyle = color
      c.fill()
    }
    face(distant ? '#c5d4ce' : '#a6bab4',
      [[-left, ly-y], [-left*1.35, h*1.8], [-left*.7, h*1.15], [-left*.63, h*1.36], [7, h*.53]])
    face(distant ? '#8ea9af' : '#667f89',
      [[dx, ry-y], [dx*1.35, h*1.9], [dx*.59, h*1.35], [dx*.36, h*1.43], [-3, h*.46]])
    face(distant ? '#f4f0dd' : '#fff7dd',
      [[-left, ly-y], [-left*.62, (ly-y)*.81], [-left*.83, h*.66], [-left*.24,h*.33], [-left*.32,h*.54], [4,h*.22], [dx*.36,h*.43], [dx*.24,h*.21]])
    face(distant ? '#dbe5de' : '#dae7e0',
      [[dx, ry-y], [dx*.68, (ry-y)*.82], [dx*.72,h*.55], [dx*.29,h*.24], [dx*.34,h*.4], [dx*.11,h*.23]])
    c.restore()
  }
  const haze = ramp(c, 170, 364, '#bfd3c600', distant ? '#dfdcc1' : '#a0b2a4')
  c.fillStyle = haze
  c.fillRect(0, 170, ridgeWidth, 245)
  return el
}

function sunflowerField() {
  const { el, c } = surface(1400, 215)
  c.fillStyle = ramp(c, 0, 215, '#bcc28b', '#e7be57', '#9f9b40', '#64713a')
  c.fillRect(0, 0, el.width, el.height)
  let seed = 912705
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const greens = ['#728150', '#586f4e', '#a49b4e', '#8e9854']
  const golds = ['#edd05d', '#eeb940', '#f4c653', '#e8ad3e', '#f7d779']
  for (let n = 0; n < 1300; n++) {
    const y = (n / 1300) ** 1.5 * 225
    const x = random() * 1440 - 20
    const size = 1.4 + y * .037 + random() * 1.6
    const green = greens[n % greens.length]!
    const gold = golds[n % golds.length]!
    const stem = size * 2.9
    stroke(c, green, size * .3, x - 3, y + stem, x, y)
    oval(c, x - 4, y + stem * .65, size * 1.2, size * .25, green, .22)
    c.globalAlpha = .5
    oval(c, x + size*1.6, y, size*3.6, size*.62, gold)
    c.globalAlpha = 1
    if (size > 5) {
      for (let petal = 0; petal < 8; petal++) {
        const a = petal * tau / 8
        oval(c, x + Math.cos(a)*size*.64, y + Math.sin(a)*size*.58, size*.57, size*.23, gold, a)
      }
    } else oval(c, x, y, size * 1.8, size * .8, gold)
    oval(c, x, y, size*.54, size*.44, n % 3 ? '#976f36' : '#775735')
  }
  return el
}

function sunflowerClumps() {
  const { el, c } = surface(1400, 167)
  // Some blooms cross the camera's focal plane. Their centres and ray florets
  // stay readable above the trailing colour of the denser, more distant rows.
  const heads = [
    [14, 76, 9], [40, 66, 12], [70, 90, 8], [151, 98, 15], [180, 77, 10],
    [249, 43, 8], [280, 52, 9], [347, 86, 15], [378, 65, 10], [401, 91, 12],
    [529, 44, 9], [544, 58, 8], [633, 89, 13], [666, 66, 15], [706, 80, 10],
    [827, 61, 11], [859, 79, 14], [959, 42, 9], [978, 56, 8], [1071, 84, 16],
    [1101, 59, 12], [1142, 87, 10], [1237, 57, 9], [1328, 78, 13], [1351, 91, 9],
  ] as const
  for (const [x, y, radius] of heads) {
    c.save()
    c.translate(x,y)
    // Stems lean in the slipstream, with a second leaf below each blossom.
    stroke(c,'#687943',radius*.19,-radius*.72,radius*3.5,-radius*.45,radius,0,0)
    oval(c,-radius*.9,radius*1.5,radius*.78,radius*.25,'#748246',.52)
    oval(c,radius*.18,radius*2.25,radius*.9,radius*.29,'#648045',-.46)
    c.scale(.86,1)
    for (let i=0;i<13;i++) {
      const angle=i*tau/13+x
      const length=radius*(.51+Math.cos(i*3.13)*.045)
      oval(c,Math.cos(angle)*radius*.71,Math.sin(angle)*radius*.71,length,radius*.22,
        i%3 ? '#fbd344' : '#eeb431',angle)
    }
    oval(c,0,0,radius*.55,radius*.53,'#8c622e')
    oval(c,0,-radius*.045,radius*.4,radius*.38,'#6b522c')
    for (let i=0;i<5;i++) {
      const a=i*tau/5+.6
      oval(c,Math.cos(a)*radius*.32,Math.sin(a)*radius*.32,.85,.8,'#ad8745')
    }
    c.restore()
  }
  return el
}

// A horizontal shutter smear preserves the mountain and flower silhouettes.
function smear(image: HTMLCanvasElement, distance: number) {
  const { el, c } = surface(image.width, image.height)
  const n = 9
  c.globalCompositeOperation = 'lighter'
  c.globalAlpha = 1 / n
  for (let i = 0; i < n; i++) {
    const x = Math.round(i * distance / (n - 1))
    c.drawImage(image, x, 0)
    if (x) c.drawImage(image, x - image.width, 0)
  }
  return el
}

function repeatLayer(c: Brush, image: HTMLCanvasElement, y: number, shift: number) {
  const x = -(shift % image.width)
  for (let pos = x - image.width; pos < 1600; pos += image.width) c.drawImage(image, pos, y)
}

function steam(c: Brush, t: number, stackX: number, stackY: number) {
  c.save()
  for (let i = 27; i >= 0; i--) {
    const age = ((t * .26 + i / 28) % 1)
    const x = stackX - age * 710
    const y = stackY - (1 - Math.exp(-age*6)) * 126 - age * 70 + Math.sin(age*11 - t)*7
    const size = 10 + Math.sin(age * Math.PI *.75) * 38
    c.globalAlpha = (1 - age ** 2) * .85
    const billow = ramp(c, y-size, y+size, '#fffbea', '#f6efdc', '#c5d4d0')
    oval(c, x, y, size*1.29, size*.73, billow, -.03)
    oval(c, x+size*.31, y-size*.3, size*.81, size*.77, billow)
    oval(c, x-size*.48, y-size*.18, size*.83, size*.6, billow)
  }
  c.restore()
}

function trainWheel(c: Brush, x: number, y: number, t: number) {
  oval(c,x,y,41,41,'#273e3b')
  oval(c,x,y,37,37,'#adb1a0')
  oval(c,x,y,34,34,'#613f35')
  c.save()
  c.translate(x,y)
  c.rotate(t*5)
  for(let n=0;n<8;n++){
    stroke(c,'#b67b59',4,-30,0,30,0)
    c.rotate(Math.PI/8)
  }
  c.restore()
  oval(c,x,y,7,7,'#c5bb94')
}

const railY = 604

function track(c: Brush, t: number) {
  c.fillStyle='#87816b'
  c.fillRect(-450,railY+2,2050,30)
  for (let x=-450-(t*240)%31; x<1600; x+=31) {
    stroke(c,'#655e4b',5,x,railY+19,x+16,railY+5)
  }
  c.fillStyle='#515b56'
  c.fillRect(-450,railY,2050,6)
  c.fillStyle='#b8bbab'
  c.fillRect(-450,railY,2050,2)
}

function locomotive(c: Brush, t: number) {
  for(const x of [852,939,1026,1113]) trainWheel(c,x,537,t)
  const pinX = Math.cos(t*5)*19, pinY = Math.sin(t*5)*19
  stroke(c,'#a6a58d',7,851+pinX,537+pinY,1113+pinX,537+pinY)
  shape(c,'M793 497H1168L1186 517H785Z','#253c3c')
  shape(c,'M825 390H1100Q1151 391 1152 431V475Q1150 493 1122 496H827Z',ramp(c,387,498,'#52685e','#56675c','#2b4544','#203536'))
  shape(c,'M819 416H1129V423H819Z','#98a185')
  for(const x of [910,978,1052,1122]) {
    c.fillStyle='#344c48'
    c.fillRect(x,394,6,100)
    c.fillStyle='#9e9b78'
    c.fillRect(x+1,395,1.8,95)
  }
  shape(c,'M1057 396L1062 386 1067 339 1061 330 1061 318 1099 318 1099 330 1093 339 1098 386 1104 396Z',ramp(c,318,396,'#273f41','#4e6159','#2a403f'),'#2c4443',2)
  shape(c,'M1059 318L1062 311H1098L1101 318Z','#d5bc86')
  shape(c,'M953 392V378Q954 361 965 361H970Q981 361 983 377V392Z','#a39a71','#546457',2)
  shape(c,'M799 376H878V486H799Z','#415950','#2d4644',3)
  shape(c,'M808 388Q820 381 834 387V417H808ZM842 387Q855 383 867 386V417H842Z','#a9bbb1','#bca77b',3)
  shape(c,'M784 376Q833 361 890 371L888 378Q830 373 784 382Z','#324b49','#c1aa79',2)
  shape(c,'M1148 479H1172L1199 512H1152Z','#435853')
  for(let j=0;j<4;j++) stroke(c,'#b6a783',2,1152+j*5,483,1160+j*9,508)
  stroke(c,'#b4a98a',3,880,466,1130,466)
}

function coachBogie(c: Brush, x: number, t: number) {
  const radius = 17
  const axleY = railY - radius
  for (const wheelX of [x - 31, x + 31]) {
    oval(c,wheelX,axleY,radius,radius,'#293c39')
    oval(c,wheelX,axleY,radius-3,radius-3,'#69716a')
    c.save()
    c.translate(wheelX,axleY)
    c.rotate(t*10)
    for (let n=0;n<4;n++) {
      stroke(c,'#3d4c46',2.5,-12,0,12,0)
      c.rotate(Math.PI/4)
    }
    c.restore()
  }
  stroke(c,'#34423e',8,x-30,axleY-1,x-20,axleY-11,x+20,axleY-11,x+30,axleY-1)
  stroke(c,'#62675b',3,x-17,axleY-5,x+17,axleY-5)
  for (const axleX of [x-31,x+31]) oval(c,axleX,axleY,4,4,'#b3a583')
}

function carriage(c: Brush, t: number) {
  for (const x of [115,667]) coachBogie(c,x,t)
  shape(c,'M-450 549H765V565H702L693 574H642L630 565H153L145 574H87L77 565H-450Z','#334640')
  shape(c,'M-450 479Q-330 473 -170 474H735Q764 474 778 490L776 505H-450Z',
    ramp(c,472,505,'#dcc799','#a7a58e','#667672','#394e4c'),'#6c7365',2)
  shape(c,'M-450 501H775V556H-450Z',ramp(c,501,556,'#526c60','#435e53','#314a47'))
  shape(c,'M755 503H775V556H755Z','#364d44')
  stroke(c,'#bec2a5',2,-450,508,775,508)
  stroke(c,'#b8a36e',2,-450,550,775,550)
  for(let x=-400;x+66<755;x+=89){
    c.fillStyle='#304744'
    c.fillRect(x-2,512,69,34)
    c.fillStyle='#b8a881'
    c.fillRect(x,513,65,31)
    c.fillStyle=ramp(c,515,542,'#c2cdc0','#8bada8','#577e7d')
    c.fillRect(x+2,515,61,27)
    c.fillStyle='#a89f83'
    c.fillRect(x+31,515,2,27)
    c.fillStyle='rgba(255,245,202,.17)'
    c.beginPath()
    c.moveTo(x+4,529);c.lineTo(x+16,515);c.lineTo(x+26,515);c.lineTo(x+4,540);c.fill()
  }
  for(let x=-200;x<774;x+=28) oval(c,x,500,1.8,1.4,'#bcb99a')
  for(let x=-90-(t*13)%116;x<758;x+=116) stroke(c,'#958f79',1.5,x,476,x-11,488,x-14,495)
}

function train(c: Brush, t: number) {
  track(c,t)
  c.save()
  c.translate(Math.sin(t*.31)*9,0)
  // Locomotive drawing coordinates are anchored at its rear edge and wheel contact.
  const engineLeft = 800
  const engineScale = .72
  const rearEdge = 784
  const wheelContact = 578
  steam(c,t,engineLeft+(1080-rearEdge)*engineScale,railY+(311-wheelContact)*engineScale)

  // The same drawbar runs behind both end beams at chassis height.
  const couplerY = railY+(511-wheelContact)*engineScale
  stroke(c,'#2c3c37',7,758,couplerY,engineLeft+24,couplerY)
  stroke(c,'#afa080',2,761,couplerY-2,engineLeft+22,couplerY-2)
  for (const x of [774,engineLeft+1]) {
    c.fillStyle='#526258'
    c.fillRect(x-2,couplerY-6,5,12)
  }
  c.save()
  c.translate(engineLeft,railY)
  c.scale(engineScale,engineScale)
  c.translate(-rearEdge,-wheelContact)
  locomotive(c,t)
  c.restore()
  carriage(c,t)
  c.restore()
}

function bicycleWheel(c: Brush, x: number, angle: number) {
  c.save()
  c.translate(x,421)
  c.beginPath()
  c.arc(0,0,52,0,tau)
  c.lineWidth=8
  c.strokeStyle='#343d3a'
  c.stroke()
  c.beginPath()
  c.arc(0,0,48.8,0,tau)
  c.lineWidth=4.5
  c.strokeStyle='#ebd5ab'
  c.stroke()
  c.rotate(angle)
  for(let n=0;n<24;n++){
    const a=tau*n/24
    stroke(c,n%2 ? '#8a9690' : '#d5d1b7',1.1,0,0,Math.cos(a)*46.8,Math.sin(a)*46.8)
  }
  oval(c,0,0,5,5,'#6c7972')
  c.restore()
}

function pedal(c: Brush, phase: number, far: boolean, bob: number) {
  const footX=473+Math.cos(phase)*23
  const footY=406+Math.sin(phase)*23
  const hipX=448+(far ? 6 : -1), hipY=312+bob
  const dx=footX-hipX, dy=footY-hipY
  const length=Math.hypot(dx,dy)
  const upper=64, lower=63
  const mid=(length*length+upper*upper-lower*lower)/(2*length)
  const offset=Math.sqrt(Math.max(0,upper*upper-mid*mid))
  const ankleX=hipX+(mid*dx-offset*dy)/length
  const ankleY=hipY+(mid*dy+offset*dx)/length
  const skin=far ? '#b87643' : '#db974a'
  stroke(c,far ? '#895d40' : '#a16b3e',9,hipX,hipY,ankleX,ankleY,footX-4,footY-4)
  stroke(c,skin,6.3,hipX,hipY,ankleX,ankleY,footX-4,footY-4)
  oval(c,ankleX,ankleY,4.5,4.2,skin)
  stroke(c,'#727c71',4,473,406,footX,footY)
  stroke(c,'#364640',5,footX-10,footY+1,footX+11,footY+1)
  c.save()
  c.translate(footX,footY)
  shape(c,'M-7 -7Q-4 -8 0 -5L14 -3 16 -1 9 -1 18 1Q9 2 4 0L-7 -1Z',
    far ? '#c68950' : '#e8a453','#a16c3e',1)
  c.restore()
}

function bike(c: Brush, t: number, phase: number, bob: number) {
  bicycleWheel(c,363,t*5.8)
  bicycleWheel(c,580,t*5.8)
  // Enamel mudguards, curved step-through tubes and a leather touring saddle.
  shape(c,'M310 411Q326 352 379 365Q399 369 408 384L406 387Q371 348 331 380L312 414Z',
    '#ac4f3e','#784639',1.3)
  shape(c,'M530 394Q551 359 584 365Q613 367 632 404L630 408Q614 374 583 370Q550 365 533 397Z',
    '#c3654a','#8b4d3c',1.3)
  stroke(c,'#6f7972',2,316,405,363,421,402,382)
  stroke(c,'#6f7972',2,536,389,580,421,627,401)
  stroke(c,'#9b533d',4,317,369,388,369,400,371)
  stroke(c,'#676e63',1.8,319,371,363,421,384,371)
  pedal(c,phase+Math.PI,true,bob)
  shape(c,'M361 417L435 343 438 349 372 418 470 402 474 408 363 425Z','#b34c3c','#864a3a',1)
  shape(c,'M432 342L440 340 477 403 470 410Z','#b94836','#864233',1.5)
  shape(c,'M469 402Q505 396 546 341L555 346Q516 407 474 412Z','#bc4b37','#884130',1.5)
  shape(c,'M436 347Q475 390 495 381Q519 366 544 332L551 337Q527 373 498 387Q469 398 437 358Z',
    '#c2563d','#974132',1.3)
  shape(c,'M541 330L549 328 558 350 551 353Z','#be553b','#924837',1.4)
  stroke(c,'#ee9563',1.8,441,351,465,375,484,384)
  stroke(c,'#713e32',6,550,350,565,398,580,421)
  stroke(c,'#cc6245',3.2,551,350,567,398,580,421)
  stroke(c,'#677970',4.2,544,330,538,315,551,306,569,305)
  stroke(c,'#dddfc5',1.6,544,328,540,315,551,308,567,306)
  stroke(c,'#76513d',6.7,551,306,568,305)
  shape(c,'M550 310Q588 338 564 373Q578 342 550 312Z','#626f65')
  stroke(c,'#697870',5,437,347,429,326)
  shape(c,'M410 320Q419 319 429 323Q439 324 452 322Q457 323 455 326Q445 332 431 332Q414 331 408 326Q405 322 410 320Z',
    '#845338','#553f32',1.5)
  stroke(c,'#b88751',1.8,412,322,426,325,448,324)
  shape(c,'M363 414L472 394Q483 394 485 404Q485 416 474 417L364 427Q356 425 355 421Q355 416 363 414Z',
    '#a84735','#813f32',1.4)
  stroke(c,'#db8a60',1.2,368,416,470,398)
  oval(c,473,406,10,10,'#d3bc87')
  oval(c,473,406,6,6,'#717c6c')
  oval(c,363,421,4,4,'#d6c79c')
  pedal(c,phase,false,bob)
}

function pelican(c: Brush, t: number, phase: number, bob: number) {
  c.save()
  c.translate(0,bob)
  // The far wing rises away from the camera. Its cooler underside sets it behind the neck.
  c.save()
  c.translate(438,248)
  c.rotate(-.08+Math.sin(t*2.4+.7)*.075)
  shape(c,'M-14 6Q-11 -32 8 -67Q31 -94 65 -124Q81 -139 98 -146Q96 -135 80 -116Q101 -133 115 -137Q111 -124 89 -101Q105 -110 118 -114Q114 -100 85 -78Q104 -84 112 -86Q100 -71 75 -56Q86 -58 96 -59Q86 -48 63 -36Q40 -12 12 14Z',
    ramp(c,-148,12,'#e7e4cb','#d3dfd4','#a6b7b2'),'#91a29d',1.5)
  shape(c,'M3 -19Q13 -65 73 -112Q30 -64 23 -31Q50 -67 88 -92Q47 -45 28 -17Z','#f3eed5')
  c.restore()

  // The compact body and long folded neck are separate from the articulated wing.
  shape(c,'M345 261Q321 257 296 247Q297 254 319 269L291 260Q299 272 329 282L309 278Q326 297 361 302Q392 324 427 325Q473 325 490 295Q505 274 499 252L475 233Q452 221 426 228Q382 233 345 261Z',
    ramp(c,231,326,'#fff8e1','#f1ecd8','#c6d0c5'),'#92a29a',1.7)
  shape(c,'M318 272Q357 290 385 283Q422 274 448 263Q416 287 398 295Q426 291 450 279Q420 303 389 309Q355 309 333 293L349 296Z','#d9dece')
  c.save()
  const tilt=Math.sin(phase)*.021+Math.sin(t*1.8)*.016
  c.translate(474,263)
  c.rotate(tilt)
  shape(c,'M-24 17Q-3 -3 -2 -28Q-3 -51 12 -78Q22 -94 42 -91Q60 -90 67 -76Q71 -63 62 -53Q52 -44 38 -44Q25 -39 26 -16Q27 5 15 26Q1 51 -26 56Q-8 43 -6 31Q-14 36 -23 35Z',
    ramp(c,-90,53,'#fffbe9','#f5efdc','#cad8d0'),'#98a69b',1.5)
  shape(c,'M27 -74Q18 -50 21 -34Q21 -8 9 8Q25 0 29 -25Q31 -48 43 -52Z','#dbe1d2')
  // Golden gular pouch hangs from a long, hooked bill.
  shape(c,'M49 -67Q67 -69 80 -65L167 -47Q174 -45 170 -40Q164 -34 149 -34Q103 -32 69 -40Q52 -44 47 -54Z',
    ramp(c,-66,-31,'#e4a34f','#eda44e','#d47f47'),'#ae794b',1.4)
  shape(c,'M48 -72Q66 -76 86 -69L167 -50Q176 -48 173 -42L169 -37 168 -43Q100 -51 54 -58Q48 -61 48 -72Z',
    '#f3c26d','#ad8050',1.3)
  stroke(c,'#f9d792',1.7,66,-69,112,-60,165,-48)
  shape(c,'M38 -76Q46 -82 56 -75L60 -70Q53 -67 44 -68Z','#e7c875')
  oval(c,45,-74,4.3,4.1,'#354540')
  oval(c,46,-75,1.2,1.2,'#ffffff')
  shape(c,'M14 -78Q11 -72 6 -70Q8 -76 12 -81Q7 -78 4 -78Q17 -91 32 -91Z','#fffae7')
  c.restore()

  // The near wing banks against the slipstream. Dark primaries fan out at the tip.
  c.save()
  c.translate(420,250)
  c.rotate(Math.sin(t*2.4)*.082+Math.sin(phase)*.012)
  shape(c,'M16 9Q-5 23 -38 4Q-74 -17 -107 -48Q-135 -75 -185 -111Q-199 -124 -206 -135Q-199 -136 -178 -124Q-200 -143 -205 -153Q-195 -155 -170 -139Q-192 -161 -193 -170Q-179 -165 -154 -145Q-171 -165 -171 -173Q-157 -169 -134 -146Q-142 -160 -142 -165Q-128 -159 -111 -143Q-79 -122 -63 -98Q-46 -68 -17 -49Q10 -30 24 -11Q31 3 16 9Z',
    ramp(c,-165,13,'#788782','#9aa8a0','#dde3d4','#fbf6df'),'#86958c',1.5)
  shape(c,'M18 1Q-18 8 -49 -17Q-90 -44 -127 -91Q-150 -116 -179 -139Q-151 -123 -127 -106Q-140 -124 -159 -145Q-135 -129 -109 -105Q-117 -119 -138 -142Q-109 -125 -91 -103Q-72 -81 -62 -76Q-72 -91 -83 -104Q-63 -92 -48 -69Q-22 -47 1 -35Q29 -17 23 -1Z',
    '#eeeeda')
  shape(c,'M21 -7Q0 -4 -23 -19Q-53 -36 -72 -61Q-52 -49 -43 -47Q-65 -63 -81 -86Q-58 -66 -39 -56Q-47 -67 -55 -78Q-40 -66 -26 -55Q-3 -42 11 -30Q24 -19 21 -7Z','#fff8e2')
  shape(c,'M-112 -92Q-151 -120 -178 -147Q-151 -130 -126 -108ZM-127 -92Q-163 -114 -187 -136Q-154 -117 -132 -101Z','#7f8d87')
  c.restore()
  c.restore()
}

export function createPelicanScene(canvas: HTMLCanvasElement) {
  const c=canvas.getContext('2d')!
  const distant=smear(paintRidge(true),9)
  const near=smear(paintRidge(false),17)
  const field=smear(sunflowerField(),25)
  const heads=sunflowerClumps()
  const flowerTrails=smear(heads,14)
  const sky=surface(1200,650)
  sky.c.fillStyle=ramp(sky.c,0,460,'#87b0ba','#bad1c7','#ffdeab')
  sky.c.fillRect(0,0,1200,650)
  const light=sky.c.createRadialGradient(209,110,4,209,110,220)
  light.addColorStop(0,'#fff5cd')
  light.addColorStop(.18,'#ffe7a76e')
  light.addColorStop(1,'#ffe4ab00')
  sky.c.fillStyle=light
  sky.c.fillRect(0,0,480,390)
  oval(sky.c,209,110,35,35,'#fff2c4')
  oval(sky.c,865,95,102,2,'#f3ead485')
  oval(sky.c,916,102,68,1.5,'#f3ead471')
  let time=.73, frame=0, last=0, playing=false, visible=true
  let width=1, height=1

  function paint() {
    c.setTransform(1,0,0,1,0,0)
    c.fillStyle='#c8cec0'
    c.fillRect(0,0,canvas.width,canvas.height)
    const scale=Math.min(width/1135,height/595)
    const scaleX=canvas.width/width, scaleY=canvas.height/height
    c.setTransform(scale*scaleX,0,0,scale*scaleY,canvas.width/2-595*scale*scaleX,canvas.height/2-304*scale*scaleY)
    c.lineCap='round'
    c.lineJoin='round'
    c.fillStyle='#89b2bb'
    c.fillRect(-400,-120,2000,120)
    c.drawImage(sky.el,0,0)
    repeatLayer(c,distant,13,time*13+678)
    repeatLayer(c,near,25,time*34+423)
    repeatLayer(c,field,354,time*265)
    c.globalAlpha=.55
    repeatLayer(c,flowerTrails,364,time*345)
    c.globalAlpha=.9
    repeatLayer(c,heads,364,time*345)
    c.globalAlpha=1
    c.fillStyle='#717b4b'
    c.fillRect(-400,569,2000,300)
    const jitter=Math.sin(time*12)*.67
    c.save()
    c.translate(0,jitter)
    train(c,time)
    c.translate(0,-.8+Math.sin(time*12)*.65)
    oval(c,458,476,152,3.2,'#4a514956')
    const phase=time*4.4
    const bob=Math.cos(phase*2)*1.7
    bike(c,time,phase,bob)
    pelican(c,time,phase,bob)
    c.restore()
  }
  function updateSize() {
    width=Math.max(1,canvas.clientWidth)
    height=Math.max(1,canvas.clientHeight)
    const pixelRatio=Math.min(window.devicePixelRatio || 1,2)
    canvas.width=Math.round(width*pixelRatio)
    canvas.height=Math.round(height*pixelRatio)
    paint()
  }
  function tick(stamp: number) {
    if(last) time+=Math.min((stamp-last)/1000,.05)
    last=stamp
    paint()
    frame=requestAnimationFrame(tick)
  }
  function sync() {
    cancelAnimationFrame(frame)
    last=0
    if(playing && visible && !document.hidden) frame=requestAnimationFrame(tick)
  }
  const resize=new ResizeObserver(updateSize)
  resize.observe(canvas)
  const viewport=new IntersectionObserver(([entry])=>{
    visible=Boolean(entry?.isIntersecting)
    sync()
  })
  viewport.observe(canvas)
  document.addEventListener('visibilitychange',sync)
  updateSize()
  return {
    setPlaying(value: boolean) { playing=value; sync() },
    dispose() {
      cancelAnimationFrame(frame)
      resize.disconnect()
      viewport.disconnect()
      document.removeEventListener('visibilitychange',sync)
    },
  }
}
