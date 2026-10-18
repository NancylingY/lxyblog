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
  navHome: string
  switchLang: string

  /** Hero */
  heroHello: string
  heroViewWork: string
  heroAboutMe: string
  heroCaption: string
  heroScroll: string
  statStacks: string
  statProjects: string
  statDirections: string

  /** About */
  aboutTitle: string
  aboutSub: string
  aboutAdvantages: string
  aboutEducation: string
  eduRankLabel: string
  eduCoursesLabel: string

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

  footerBuilt: string
}

const zh: Translation = {
  navAbout: '关于',
  navSkills: '技能',
  navProjects: '项目',
  navContact: '联系',
  navHome: '回到首页',
  switchLang: '切换语言',

  heroHello: '你好，我是',
  heroViewWork: '查看作品',
  heroAboutMe: '关于我',
  heroCaption: '// 代码之外，也有星空',
  heroScroll: 'scroll',
  statStacks: '技术栈',
  statProjects: '个人项目',
  statDirections: '技术方向',

  aboutTitle: '关于我',
  aboutSub: '一名正在成长的全栈开发者，后端方向为主，兼具前端与大数据分析能力。',
  aboutAdvantages: '个人优势',
  aboutEducation: '教育经历',
  eduRankLabel: '专业排名',
  eduCoursesLabel: '主修课程',

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
  contactStatusValue: '在线 · 乐于交流',
  contactCopied: '已复制',
  contactCopy: '复制',

  footerBuilt: 'Built with Vue 3 + Vite',
}

const en: Translation = {
  navAbout: 'About',
  navSkills: 'Skills',
  navProjects: 'Projects',
  navContact: 'Contact',
  navHome: 'Back to home',
  switchLang: 'Switch language',

  heroHello: "Hi, I'm",
  heroViewWork: 'View Work',
  heroAboutMe: 'About Me',
  heroCaption: '// Beyond code, there are stars',
  heroScroll: 'scroll',
  statStacks: 'Tech Stack',
  statProjects: 'Projects',
  statDirections: 'Tracks',

  aboutTitle: 'About Me',
  aboutSub: 'A growing full-stack developer with a backend focus, plus frontend and big-data analysis skills.',
  aboutAdvantages: 'Strengths',
  aboutEducation: 'Education',
  eduRankLabel: 'Major Rank',
  eduCoursesLabel: 'Core Courses',

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
  contactStatusValue: 'Online · Open to chat',
  contactCopied: 'Copied',
  contactCopy: 'Copy',

  footerBuilt: 'Built with Vue 3 + Vite',
}

/** 英文内容数据（education / advantages / skills / projects 的英译） */
export const enContent = {
  role: 'Full-Stack Developer',
  slogan: 'Turning ideas into products with code',
  intro:
    'Full-stack development and big-data analysis skills — mining value from data, creating with AI, and enjoying the process of turning ideas into usable products.',
  advantages: [
    'Independent 0-to-1 full-stack delivery — from DB design and backend APIs to frontend UI, shipping complete production-ready products single-handedly.',
    'Skilled in AI-assisted development with Copilot, DeepSeek, and Codex, multiplying coding, debugging, and documentation efficiency.',
    'Hands-on dual-backend experience — complete projects with both Spring Boot and FastAPI, including RESTful API design, auth & authorization, and SQL tuning.',
    'Vue 3 reactive frontend with Composition API + TypeScript, covering Web and Uni-app multi-platform adaptation.',
    'Data-driven decisions — data cleaning and modeling with Pandas / NumPy, visualized with ECharts.',
    'Familiar with containerized deployment — Docker packaging and GitHub Pages static hosting, handling launch and iteration independently.',
  ],
  education: {
    school: 'Guangzhou Software College',
    degree: 'Bachelor',
    major: 'Data Science & Big Data Technology',
    period: '2023-2027',
    rank: 'TOP 10%',
    courses: ['Data Structures', 'Linux OS', 'Data Visualization', 'Data Warehousing & Mining', 'Algorithm Analysis & Design'],
  },
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
      color: '#38d9c9',
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
      color: '#3ddc84',
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
      color: '#56c8ff',
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
      color: '#8be04f',
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
      color: '#ffb454',
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
      color: '#c792ea',
      logo: 'https://aka.doubaocdn.com/s/JF26gix0BC',
    },
  ] as Project[],
}

export function getTranslations(locale: 'zh' | 'en'): Translation {
  return locale === 'zh' ? zh : en
}
