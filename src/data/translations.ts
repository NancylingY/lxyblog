/**
 * 中英文翻译 —— 全站 UI 文案 + 内容数据的双语版本
 * 组件通过 t(key) 或 t(name/nameEn) 读取
 */
import type { Project } from './resume'

export interface Translation {
  /** 导航 */
  navAbout: string
  navSkills: string
  navProjects: string
  navContact: string
  navOther: string
  navHome: string
  navStats: string
  switchLang: string

  /** 实时看板页 */
  statsTitle: string
  statsSub: string
  statsHint: string
  statsLoading: string
  statsEmptyTitle: string
  statsEmptyTip: string

  /** Hero */
  heroHello: string
  heroViewWork: string
  heroAboutMe: string
  heroCaption: string
  heroDayCaption: string
  heroScroll: string
  statStacks: string
  statProjects: string
  statDirections: string

  /** About */
  aboutTitle: string
  aboutSub: string
  aboutAdvantages: string

  /** Skills */
  skillsTitle: string
  skillsSub: string

  /** Projects */
  projectsTitle: string
  projectsSub: string
  projectDetail: string
  projectCollapse: string

  /** Contact */
  contactTitle: string
  contactSub: string
  contactCmd: string
  contactBig1: string
  contactBig2: string
  contactDesc: string
  contactMail: string
  contactCall: string
  contactEmail: string
  contactPhone: string
  contactLocation: string
  contactStatus: string
  contactLocationValue: string
  contactStatusValue: string
  contactCopied: string
  contactCopy: string

  /** Other 页面 */
  otherTitle: string
  otherSub: string
  konbiniTitle: string
  konbiniTitleEn: string
  konbiniDesc: string
  konbiniStatus: string
  konbiniTags: string[]
  konbiniHint: string
  konbiniEnter: string
  back: string
  sceneLoading: string
  sceneFail: string

  /** Hospital 卡片 */
  hospitalTitle: string
  hospitalTitleEn: string
  hospitalDesc: string
  hospitalStatus: string
  hospitalTags: string[]
  hospitalEnter: string

  /** Terrarium 卡片 */
  terrariumTitle: string
  terrariumTitleEn: string
  terrariumDesc: string
  terrariumStatus: string
  terrariumTags: string[]
  terrariumEnter: string
  terrariumDay: string
  terrariumNight: string

  /** 小屋 3D 预览卡 */
  houseTitle: string
  houseTitleEn: string
  houseDesc: string
  houseStatus: string
  houseTags: string[]
  houseDrag: string
  houseEnter: string
  houseFail: string

  /** 海边灯塔夜景卡 */
  lighthouseTitle: string
  lighthouseTitleEn: string
  lighthouseDesc: string
  lighthouseStatus: string
  lighthouseTags: string[]
  lighthouseDrag: string
  lighthouseFail: string
  lighthouseEnter: string
  lighthouseBeamOff: string
  lighthouseBeamOn: string
  lighthouseLoadingEngine: string
  lighthouseLoadingScene: string
  lighthouseLoadingDecoder: string
  lighthouseLoadingModel: string
  lighthouseLoadingShader: string
  lighthouseLoadingReady: string
  lighthouseRetry: string

  footerBuilt: string

  /** 无障碍 / 结构化标签 */
  ariaMainNav: string
  ariaMenuToggle: string
  skipToContent: string
  railJump: string
  ariaSectionNav: string
  themeToDark: string
  themeToLight: string

  /** 看板加载失败 */
  statsFailTitle: string
  statsFailTip: string
  statsRetry: string

  /** 页脚法务说明 */
  legalPrivacy: string
  legalTerms: string
  legalPrivacyText: string
  legalTermsText: string
}

const zh: Translation = {
  navAbout: '关于',
  navSkills: '技能',
  navProjects: '项目',
  navContact: '联系',
  navOther: '其他',
  navHome: '回到首页',
  navStats: '看板',
  switchLang: '切换语言',

  statsTitle: 'Token 消耗看板',
  statsSub:
    '实时统计 AI 编程助手在本机的 token 消耗：请求级用量、缓存命中率、模型分布与预估成本，数据由本机采集端秒级推送。',
  statsHint: '数据来自本机采集端 · 秒级刷新',
  statsLoading: '正在连接看板…',
  statsEmptyTitle: '看板尚未上线',
  statsEmptyTip: '实时数据还在接通，稍后再来看看。',

  heroHello: '你好，我是',
  heroViewWork: '查看作品',
  heroAboutMe: '关于我',
  heroCaption: '// 代码之外，也有星空',
  heroDayCaption: '// 设计、代码与交付',
  heroScroll: 'scroll',
  statStacks: '技术栈',
  statProjects: '个人项目',
  statDirections: '技术方向',

  aboutTitle: '关于我',
  aboutSub: '独立产品工程师，负责从需求拆解、界面设计到上线交付的完整链路；已交付 6 个 Web 与移动端项目，覆盖医疗、教务、点餐与推荐系统。',
  aboutAdvantages: '工作方式',

  skillsTitle: '技术栈',
  skillsSub: '从后端服务到前端界面，再到数据处理，覆盖完整交付链路。',

  projectsTitle: '项目作品',
  projectsSub: '点击卡片查看项目详情与技术栈。',
  projectDetail: '查看详情',
  projectCollapse: '收起详情',

  contactTitle: '保持联系',
  contactSub: '欢迎交流技术、项目合作，或任何有趣的想法。',
  contactCmd: 'open contact --now',
  contactBig1: '期待与你一起',
  contactBig2: '把想法变成产品',
  contactDesc: '无论是技术交流、项目合作还是单纯的闲聊，都欢迎随时找我，回复通常在当天。',
  contactMail: '发送邮件',
  contactCall: '拨打电话',
  contactEmail: '邮箱',
  contactPhone: '电话',
  contactLocation: '坐标',
  contactStatus: '状态',
  contactLocationValue: '广东 · 广州',
  contactStatusValue: '开放远程协作 · 邮件优先',
  contactCopied: '已复制',
  contactCopy: '复制',

  otherTitle: '其他',
  otherSub: '工作与学习之外，还留了一块自留地——一些视觉实验、小玩意，和正在慢慢长出来的东西。',
  konbiniTitle: '日式便利店',
  konbiniTitleEn: 'Konbini',
  konbiniDesc:
    '雨夜街角的日式便利店微缩场景。三渲二卡通渲染，湿路面拉出灯光倒影，店内暖光与室外冷雨形成对比。货架、冷柜、关东煮、收银台一应俱全；雨丝、屋檐滴水、积水涟漪、自动门开合全部实时演算。拖拽旋转、滚轮缩放，可绕场景自由观察。',
  konbiniStatus: '可交互',
  konbiniTags: ['Three.js', '三渲二渲染', '雨夜街角', '自由视角', '微缩场景'],
  konbiniHint: '当前为占位预览 · 3D 模型制作中',
  konbiniEnter: '点击进入 3D 场景',
  back: '返回',
  sceneLoading: '正在准备 3D 场景…',
  sceneFail: '3D 场景加载失败，请返回上一页重试',

  hospitalTitle: '现代综合医院',
  hospitalTitleEn: 'General Hospital',
  hospitalDesc:
    '白天光下的现代化综合医院微缩场景。三渲二渲染，蓝玻璃幕墙映着天空，门前花园、水景与步道环绕四周。门诊大厅、候诊区、护士站、药房与自助设备全部建模，可透过落地玻璃看清室内。',
  hospitalStatus: '可交互',
  hospitalTags: ['Three.js', '日景渲染', '医疗建筑', '门前花园', '微缩场景'],
  hospitalEnter: '点击进入 3D 场景',

  terrariumTitle: '微光之境',
  terrariumTitleEn: 'Luminous Terrarium',
  terrariumDesc:
    '悬浮在深空中的透明玻璃立方体，里面是一方自成一体的微缩生态。雪山融水汇成蜿蜒溪流与瀑布，落进林间小湖；鹿群在草甸停驻，云影与薄雾缓缓流过。拖拽旋转、滚轮缩放，点击玻璃里的世界即可切换昼夜。',
  terrariumStatus: '可交互',
  terrariumTags: ['Three.js', '玻璃微缩', '昼夜过渡', '柔和光影', '生态场景'],
  terrariumEnter: '点击进入 3D 场景',
  terrariumDay: '白昼',
  terrariumNight: '夜晚',

  houseTitle: '小屋 3D 实例',
  houseTitleEn: 'Cozy House',
  houseDesc:
    '首屏同款小屋模型的实时 3D 预览：与首屏共用同一套加载与光照，跟随页面日夜切换，夜里窗户与门廊灯会亮起。',
  houseStatus: '实时渲染',
  houseTags: ['Three.js', 'KTX2', '昼夜灯光'],
  houseDrag: '拖拽旋转',
  houseEnter: '点击进入 3D 场景',
  houseFail: '3D 预览不可用',

  lighthouseTitle: '海边灯塔夜景',
  lighthouseTitleEn: 'Seaside Lighthouse',
  lighthouseDesc:
    '深夜海岸的实时 3D 场景：海面完全由着色器生成，三组不同方向与波长的正弦波叠加高频噪声，近岸碎浪与泡沫随浪滚动；灯塔光束以聚光灯加锥形加法外壳模拟体积光，每 8 秒扫过一圈，扫到镜头时有轻微耀斑。拖拽旋转、横向滑动，可绕灯塔自由观察。',
  lighthouseStatus: '实时渲染',
  lighthouseTags: ['Three.js', 'GLSL 海面', '体积光柱', '60 FPS'],
  lighthouseDrag: '拖拽旋转',
  lighthouseFail: '3D 预览不可用',
  lighthouseEnter: '点击进入灯塔 3D 场景',
  lighthouseBeamOff: '关闭光束',
  lighthouseBeamOn: '开启光束',
  lighthouseLoadingEngine: '正在加载 3D 引擎',
  lighthouseLoadingScene: '正在准备海面着色器',
  lighthouseLoadingDecoder: '正在准备纹理解码器',
  lighthouseLoadingModel: '正在加载灯塔模型',
  lighthouseLoadingShader: '正在编译着色器',
  lighthouseLoadingReady: '即将呈现',
  lighthouseRetry: '重试',

  footerBuilt: 'Built with Vue 3 + Vite',
  ariaMainNav: '主导航',
  ariaMenuToggle: '切换菜单',
  skipToContent: '跳到正文',
  railJump: '跳转到',
  ariaSectionNav: '章节导航',
  themeToDark: '切换到黑夜模式',
  themeToLight: '切换到日光模式',
  statsFailTitle: '看板加载失败',
  statsFailTip: '网络或嵌入设置异常，可稍后重试。',
  statsRetry: '重新加载',
  legalPrivacy: '隐私政策',
  legalTerms: '使用条款',
  legalPrivacyText:
    '本站仅记录必要的访问统计，不使用 Cookie 追踪个人身份；第三方嵌入内容（如 Token 看板）遵循其各自的数据政策。',
  legalTermsText:
    '本站内容为个人作品与学习记录，欢迎引用并注明来源；未经许可请勿用于商业用途。',
}

const en: Translation = {
  navAbout: 'About',
  navSkills: 'Skills',
  navProjects: 'Projects',
  navContact: 'Contact',
  navOther: 'Other',
  navHome: 'Back to home',
  navStats: 'Dashboard',
  switchLang: 'Switch language',

  statsTitle: 'Token Usage Dashboard',
  statsSub:
    'Live token usage of an AI coding assistant on this machine — request-level usage, cache hit rate, model split and estimated cost, pushed from the local collector in near real time.',
  statsHint: 'Data from the local collector · live',
  statsLoading: 'Connecting to dashboard…',
  statsEmptyTitle: 'Dashboard coming soon',
  statsEmptyTip: 'Live data is still being hooked up. Check back later.',

  heroHello: "Hi, I'm",
  heroViewWork: 'View Work',
  heroAboutMe: 'About Me',
  heroCaption: '// Beyond code, there are stars',
  heroDayCaption: '// Design, code, and shipping',
  heroScroll: 'scroll',
  statStacks: 'Tech Stack',
  statProjects: 'Projects',
  statDirections: 'Tracks',

  aboutTitle: 'About Me',
  aboutSub: 'Independent product engineer owning the full path from problem framing and UI design to shipping. Six web and mobile products delivered across healthcare, campus services, ordering, and recommendation systems.',
  aboutAdvantages: 'How I Work',

  skillsTitle: 'Tech Stack',
  skillsSub: 'From backend services to frontend UI and data processing — the full delivery chain.',

  projectsTitle: 'Projects',
  projectsSub: 'Click a card to view project details and tech stack.',
  projectDetail: 'Details',
  projectCollapse: 'Collapse',

  contactTitle: 'Get in Touch',
  contactSub: 'Welcome to discuss tech, projects, or any interesting ideas.',
  contactCmd: 'open contact --now',
  contactBig1: 'Looking forward to',
  contactBig2: 'turning ideas into products',
  contactDesc: 'Whether for tech talk, collaboration, or a casual chat, feel free to reach out. I usually reply the same day.',
  contactMail: 'Send Email',
  contactCall: 'Call Me',
  contactEmail: 'Email',
  contactPhone: 'Phone',
  contactLocation: 'Location',
  contactStatus: 'Status',
  contactLocationValue: 'Guangzhou, Guangdong',
  contactStatusValue: 'Open to remote work · email preferred',
  contactCopied: 'Copied',
  contactCopy: 'Copy',

  otherTitle: 'Other',
  otherSub: 'Beyond work and study — a little corner for visual experiments, small toys, and things slowly growing.',
  konbiniTitle: 'Japanese Konbini',
  konbiniTitleEn: '日式便利店',
  konbiniDesc:
    'A miniature konbini on a rainy night street corner. Cel-shaded, with wet asphalt pulling light into long reflections and warm interior glow against the cold rain outside. Shelves, coolers, oden pot and counter all modeled; rain, awning drips, puddle ripples and the sliding door are all real-time. Drag to orbit, scroll to zoom.',
  konbiniStatus: 'Interactive',
  konbiniTags: ['Three.js', 'Cel Shading', 'Rainy Night', 'Orbit View', 'Diorama'],
  konbiniHint: 'Placeholder preview · 3D model in progress',
  konbiniEnter: 'Enter the 3D scene',
  back: 'Back',
  sceneLoading: 'Preparing the 3D scene…',
  sceneFail: 'The 3D scene failed to load. Go back and try again.',

  hospitalTitle: 'General Hospital',
  hospitalTitleEn: '综合医院',
  hospitalDesc:
    'A modern general hospital diorama in daylight. Cel-shaded, with blue curtain-wall glass catching the sky and a landscaped forecourt of trees, benches and a reflecting pool. The outpatient lobby, waiting area, nurse station and pharmacy are all modeled and readable through the floor-to-ceiling glass.',
  hospitalStatus: 'Interactive',
  hospitalTags: ['Three.js', 'Daylight', 'Healthcare', 'Forecourt', 'Diorama'],
  hospitalEnter: 'Enter the 3D scene',

  terrariumTitle: 'Luminous Terrarium',
  terrariumTitleEn: '微光之境',
  terrariumDesc:
    'A transparent glass cube adrift in deep space, holding a self-contained miniature ecosystem. Snowmelt threads into a winding stream and a waterfall, spilling into a forest lake; deer rest on the meadow while clouds and mist drift through. Drag to orbit, scroll to zoom, click the world inside to shift from day to night.',
  terrariumStatus: 'Interactive',
  terrariumTags: ['Three.js', 'Glass Diorama', 'Day–Night', 'Soft Light', 'Ecosystem'],
  terrariumEnter: 'Enter the 3D scene',
  terrariumDay: 'Day',
  terrariumNight: 'Night',

  houseTitle: 'Cozy House',
  houseTitleEn: '小屋 3D 实例',
  houseDesc:
    'A live 3D preview of the same house model used in the hero, sharing one loader and lighting rig. It follows the site theme — windows and the porch lamp light up at night.',
  houseStatus: 'Live render',
  houseTags: ['Three.js', 'KTX2', 'Day–Night'],
  houseDrag: 'Drag to rotate',
  houseEnter: 'Enter the 3D scene',
  houseFail: '3D preview unavailable',

  lighthouseTitle: 'Seaside Lighthouse',
  lighthouseTitleEn: '海边灯塔夜景',
  lighthouseDesc:
    'A live 3D night scene on the coast: the ocean is generated entirely in a shader — three sine waves with different directions and wavelengths plus high-frequency noise, with breaking chop and scrolling foam near the shore. The lighthouse beam is a spotlight plus an additive cone shell standing in for volumetric light, sweeping once every 8 seconds with a subtle lens flare when it crosses the camera.',
  lighthouseStatus: 'Live render',
  lighthouseTags: ['Three.js', 'GLSL Ocean', 'Volumetric Beam', '60 FPS'],
  lighthouseDrag: 'Drag to rotate',
  lighthouseFail: '3D preview unavailable',
  lighthouseEnter: 'Enter the lighthouse 3D scene',
  lighthouseBeamOff: 'Turn beam off',
  lighthouseBeamOn: 'Turn beam on',
  lighthouseLoadingEngine: 'Loading the 3D engine',
  lighthouseLoadingScene: 'Preparing the ocean shader',
  lighthouseLoadingDecoder: 'Preparing the texture decoder',
  lighthouseLoadingModel: 'Loading the lighthouse model',
  lighthouseLoadingShader: 'Compiling shaders',
  lighthouseLoadingReady: 'Almost ready',
  lighthouseRetry: 'Retry',

  footerBuilt: 'Built with Vue 3 + Vite',
  ariaMainNav: 'Main navigation',
  ariaMenuToggle: 'Toggle menu',
  skipToContent: 'Skip to content',
  railJump: 'Jump to',
  ariaSectionNav: 'Section navigation',
  themeToDark: 'Switch to night mode',
  themeToLight: 'Switch to day mode',
  statsFailTitle: 'Dashboard failed to load',
  statsFailTip: 'The network or embed settings may be off. Please try again later.',
  statsRetry: 'Reload',
  legalPrivacy: 'Privacy',
  legalTerms: 'Terms',
  legalPrivacyText:
    'This site only keeps essential visit statistics and does not use cookies to track individuals. Embedded third-party content (such as the token dashboard) follows its own data policy.',
  legalTermsText:
    'Content here is personal work and study documentation. Quoting with attribution is welcome; commercial use requires permission.',
}

/** 英文内容数据（advantages / skills / projects 的英译） */
export const enContent = {
  role: 'Product Engineer',
  slogan: 'Designing and shipping products that hold up in use',
  intro:
    'Independent product engineer owning the full path from problem framing to shipped product. Six web and mobile products delivered across healthcare, campus services, ordering, and recommendation systems.',
  advantages: [
    'End-to-end ownership: framing the problem, shaping the experience, and shipping the product.',
    'Design engineering: interface, interaction, and code treated as one system—not separate handoffs.',
    'AI-assisted workflow: models help with research, prototyping, and code drafts, shortening the path from idea to a runnable prototype.',
    'Taste under constraint: hierarchy, rhythm, and motion in service of clarity and longevity.',
    'Outcome-driven: small releases, real feedback, and continuous iteration over feature volume.',
  ],
  skills: [
    {
      group: 'Backend',
      icon: 'server',
      items: ['Java', 'Spring Boot 2.7', 'MyBatis Plus', 'Spring Security', 'FastAPI', 'SQLAlchemy ORM', 'JWT', 'Python', 'RESTful API'],
    },
    {
      group: 'Frontend',
      icon: 'code',
      items: ['Vue 3 (Composition API)', 'TypeScript', 'Pinia', 'Vue Router', 'Element Plus', 'ECharts', 'Uni-app', 'SCSS', 'Vite'],
    },
    {
      group: 'Data & Engineering',
      icon: 'database',
      items: ['Pandas', 'NumPy', 'MySQL 8.0 / 9.1', 'Docker', 'Linux', 'Git', 'Postman', 'Swagger'],
    },
  ],
  projects: [
    {
      id: 'ehr',
      name: 'EHR Management System',
      nameEn: '电子医疗管理系统',
      role: 'Full-Stack',
      period: '',
      summary: [
        'An electronic management platform for the full hospital care flow from admission to discharge — medical records & e-signature, multi-department and multi-role collaboration, medical inventory, analytics, and an independent patient portal.',
        'Frontend SPA built with Vue 3 + TypeScript + Pinia + Element Plus; backend uses FastAPI + SQLAlchemy ORM with MySQL, JWT auth for nurse/doctor/admin three-tier roles, and ECharts for visualization and data dashboards.',
      ],
      tags: ['E-records', 'Multi-role', 'ECharts Dashboard', 'JWT Auth', 'Patient Portal'],
      stack: [
        { group: 'Backend', items: ['FastAPI', 'SQLAlchemy ORM', 'Python', 'JWT', 'bcrypt', 'MySQL 9.1.0'] },
        { group: 'Frontend', items: ['Vue 3 (Composition API)', 'TypeScript', 'Pinia', 'Element Plus', 'ECharts', 'Vite'] },
        { group: 'Tools', items: ['Git', 'RESTful API'] },
      ],
      color: '#4fbfb5',
      logo: 'https://aka.doubaocdn.com/s/MUdRjMVOC0',
      video: './videos/ehr-demo.mp4',
    },
    {
      id: 'smartread',
      name: 'SmartRead',
      nameEn: '智阅',
      role: 'Full-Stack',
      period: '2026.04 - 2026.05',
      summary: [
        'Built a high-performance RESTful API cluster with Python Flask — standardized interfaces, containerized deployment, service publishing, load balancing, and high-availability architecture.',
        'Led the full development of a smart book recommendation engine — a hybrid model combining collaborative filtering with content-similarity features over a large book dataset, covering cleaning, feature engineering, training iteration, and online serving, significantly improving recommendation accuracy.',
      ],
      tags: ['Flask', 'Hybrid Recommendation', 'Docker Cluster', 'Load Balancing'],
      stack: [
        { group: 'Backend', items: ['Python 3.9', 'Flask', 'Pandas', 'Scikit-learn', 'JWT', 'MySQL 9.1.0', 'Docker'] },
        { group: 'Frontend', items: ['Vue 3 (Composition API)', 'TypeScript', 'Element Plus', 'SCSS', 'Vite'] },
        { group: 'Collab & Test', items: ['Git', 'Postman'] },
      ],
      color: '#59bf8c',
      logo: 'https://aka.doubaocdn.com/s/yz7Oa4DMBL',
      video: './videos/smartread-demo.mp4',
    },
    {
      id: 'canteen',
      name: 'Campus Canteen',
      nameEn: '校园智慧食堂点餐平台',
      role: 'Full-Stack',
      period: '',
      summary: [
        'A campus dining management platform built with Spring Boot 3 + Vue 3, solving peak-hour queues and slow checkout, offering convenient online ordering for students and staff.',
        'Includes a student ordering side (Web) and a canteen admin panel — a complete business loop from browsing dishes, cart & checkout, and online payment to backend dish management and order processing.',
      ],
      tags: ['Online Ordering', 'Cart & Checkout', 'Online Payment', 'Admin Panel'],
      stack: [
        { group: 'Backend', items: ['Spring Boot 3.4', 'MyBatis', 'MySQL', 'Java 21'] },
        { group: 'Frontend', items: ['Vue 3', 'Vite', 'Pinia', 'Element Plus', 'Axios', 'Sass'] },
        { group: 'Tools', items: ['Maven', 'Git', 'RESTful API'] },
      ],
      color: '#5fa8c8',
      logo: 'https://aka.doubaocdn.com/s/SpZhnBu9Vl',
      video: './videos/canteen-demo.mp4',
    },
    {
      id: 'happywoo',
      name: 'HappyWOO',
      nameEn: '快乐小窝',
      role: 'AI-Assisted',
      period: '',
      summary: ['A pure frontend HTML5 Canvas casual pixel adventure game — no backend, no database.'],
      tags: ['Pixel Game', 'Canvas 2D', 'Procedural Art', 'Dual Platform', 'Planting System'],
      stack: [
        { group: 'Rendering', items: ['HTML5 Canvas 2D', 'Offscreen Double Buffer', 'Integer Scaling'] },
        { group: 'Language', items: ['Vanilla JavaScript (ES5)', 'No Framework', 'No Build Step'] },
        { group: 'Desktop', items: ['Neutralino', 'WebView2'] },
        { group: 'Testing', items: ['Playwright (dev)'] },
      ],
      color: '#8fbe6f',
      logo: 'https://aka.doubaocdn.com/s/rGgfVovKT0',
      video: './videos/happywoo-demo.mp4',
    },
    {
      id: 'foodtalk',
      name: 'Food Talk',
      nameEn: '美食说',
      role: 'Full-Stack',
      period: '2025.12',
      summary: [
        'Built a high-security API cluster with Spring Boot 2.7 + MyBatis Plus, integrating Spring Security + JWT for auth and standardized interfaces.',
        'Responsible for MySQL schema design, indexing, and deep SQL tuning.',
        'Independently delivered a componentized cross-platform frontend with Vue 3 + TS + Uni-app, with synchronized multi-platform adaptation.',
      ],
      tags: ['Spring Boot', 'Auth', 'SQL Tuning', 'Cross-Platform'],
      stack: [
        { group: 'Backend', items: ['Java', 'Spring Boot 2.7', 'MyBatis Plus', 'Spring Security', 'JWT', 'MySQL 8.0', 'Maven'] },
        { group: 'Frontend', items: ['Vue 3 (Composition API)', 'TypeScript', 'Uni-app', 'SCSS', 'Vite'] },
        { group: 'Tools', items: ['Git', 'Swagger', 'Postman'] },
      ],
      color: '#d9a05f',
      logo: 'https://aka.doubaocdn.com/s/Kl8pVQGL8i',
    },
    {
      id: 'campus-admin',
      name: 'Campus Admin',
      nameEn: '高校教务管理平台',
      role: 'Frontend',
      period: '',
      summary: [
        'A mobile academic-services app for faculty and students, solving the poor mobile experience of traditional academic systems.',
        'Covers timetable, grades, course selection, attendance check-in, and campus notices, serving thousands of users and making academic management mobile and convenient.',
      ],
      tags: ['Mobile', 'Course Selection', 'Attendance', 'Uni-app'],
      stack: [
        { group: 'Frontend Framework', items: ['Vue.js 2.x / 3.x', 'Uni-app'] },
        { group: 'UI Library', items: ['uView UI', 'Uni-ui'] },
        { group: 'Tools', items: ['HBuilderX', 'Git', 'Axios'] },
      ],
      color: '#a98cc4',
      logo: 'https://aka.doubaocdn.com/s/JF26gix0BC',
    },
  ] as Project[],
}

export function getTranslations(locale: 'zh' | 'en'): Translation {
  return locale === 'zh' ? zh : en
}
