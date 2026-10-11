/**
 * 博客数据 —— 全部内容的单一数据源
 * 修改这里，页面内容会同步更新
 */

export interface Project {
  id: string
  name: string
  nameEn: string
  role: string
  period: string
  summary: string[]
  tags: string[]
  stack: { group: string; items: string[] }[]
  color: string
  logo: string
  /** 展示视频（展开卡片后自动播放） */
  video?: string
}

export const profile = {
  name: '李家骏',
  enName: 'Li Jiajun',
  age: 23,
  gender: '男',
  phone: '14749334143',
  email: 'water792383@qq.com',
  role: '后端开发',
  slogan: '用代码把想法变成产品',
  intro: '具备前后端全栈开发与大数据分析基础能力，喜欢从数据中挖掘价值，也享受把想法变成可用产品的过程。',
}

export const advantages: string[] = [
  '具备前后端全栈开发与大数据分析基础能力',
  '熟练使用 Copilot、Cursor 等 AI 辅助开发工具，提升编码调试与文档编写效率',
  '前端可基于 Vue 开发响应式交互页面',
  '后端熟悉 Spring Boot 与 MyBatis，可独立完成 RESTful API 设计与数据库开发',
  '掌握 Pandas、NumPy，可完成数据清洗、处理与分析任务',
]

export const education = {
  school: '广州软件学院',
  degree: '本科',
  major: '数据科学与大数据技术',
  period: '2023-2027',
  rank: '前 10%',
  courses: ['数据结构', 'Linux 操作系统', '数据可视化', '数据仓库与数据挖掘', '算法分析与设计'],
}

export const skills = [
  {
    group: '后端',
    icon: 'server',
    items: ['Java', 'Spring Boot 2.7', 'MyBatis Plus', 'Spring Security', 'JWT', 'Python 3.9', 'Flask', 'RESTful API'],
  },
  {
    group: '前端',
    icon: 'code',
    items: ['Vue 3 (Composition API)', 'TypeScript', 'Uni-app', 'Element Plus', 'SCSS', 'Vite'],
  },
  {
    group: '数据 & 工程',
    icon: 'database',
    items: ['Pandas', 'NumPy', 'MySQL 8.0 / 9.1', 'Docker', 'Git', 'Postman', 'Swagger'],
  },
]

export const projects: Project[] = [
  {
    id: 'smartread',
    name: '智阅',
    nameEn: 'SmartRead',
    role: '全栈开发',
    period: '2026.04 - 2026.05',
    summary: [
      '基于 Python Flask 搭建高性能 RESTful API 集群服务，完成接口规范化封装与容器化部署落地，实现服务标准化发布、负载均衡与高可用架构',
      '独立主导智能书籍推荐引擎全流程研发，基于海量图书数据集搭建协同过滤 + 内容特征相似度融合的混合推荐模型，完成数据清洗、特征工程、模型训练迭代与线上接口落地，有效提升推荐精准度',
    ],
    tags: ['Flask', '混合推荐', 'Docker 集群', '负载均衡'],
    stack: [
      { group: '后端', items: ['Python 3.9', 'Flask', 'Pandas', 'Scikit-learn', 'JWT', 'MySQL 9.1.0', 'Docker'] },
      { group: '前端', items: ['Vue 3 (Composition API)', 'TypeScript', 'Element Plus', 'SCSS', 'Vite'] },
      { group: '协作&测试', items: ['Git', 'Postman'] },
    ],
    color: '#3ddc84',
    logo: 'https://aka.doubaocdn.com/s/yz7Oa4DMBL',
    video: './videos/smartread-demo.mp4',
  },
  {
    id: 'foodtalk',
    name: '美食说',
    nameEn: 'Food Talk',
    role: '全栈开发',
    period: '2025.12',
    summary: [
      '基于 Spring Boot 2.7 + MyBatis Plus 构建高安全 API 集群，集成 Spring Security + JWT 完成权限鉴权与接口标准化',
      '负责 MySQL 库表设计、索引及 SQL 深度调优',
      '使用 Vue 3 + TS + Uni-app 独立完成组件化跨平台前端开发，实现多端同步适配',
    ],
    tags: ['Spring Boot', '权限鉴权', 'SQL 调优', '跨平台'],
    stack: [
      { group: '后端', items: ['Java', 'Spring Boot 2.7', 'MyBatis Plus', 'Spring Security', 'JWT', 'MySQL 8.0', 'Maven'] },
      { group: '前端', items: ['Vue 3 (Composition API)', 'TypeScript', 'Uni-app', 'SCSS', 'Vite'] },
      { group: '工具', items: ['Git', 'Swagger', 'Postman'] },
    ],
    color: '#ffb454',
    logo: 'https://aka.doubaocdn.com/s/Kl8pVQGL8i',
  },
  {
    id: 'canteen',
    name: '校园智慧食堂点餐平台',
    nameEn: 'Campus Canteen',
    role: '全栈开发',
    period: '',
    summary: [
      '基于 Spring Boot 3 + Vue 3 构建的校园餐饮服务管理平台，解决校园食堂高峰期排队拥堵、结算效率低等痛点，为师生提供便捷的在线点餐服务',
      '系统包含学生点餐端（Web 端）和食堂管理后台，实现从菜品浏览、购物车结算、在线支付到后台菜品管理、订单处理的完整业务闭环',
    ],
    tags: ['在线点餐', '购物车结算', '在线支付', '管理后台'],
    stack: [
      { group: '后端', items: ['Spring Boot 3.4', 'MyBatis', 'MySQL', 'Java 21'] },
      { group: '前端', items: ['Vue 3', 'Vite', 'Pinia', 'Element Plus', 'Axios', 'Sass'] },
      { group: '工具', items: ['Maven', 'Git', 'RESTful API'] },
    ],
    color: '#56c8ff',
    logo: 'https://aka.doubaocdn.com/s/SpZhnBu9Vl',
    video: './videos/canteen-demo.mp4',
  },
  {
    id: 'campus-admin',
    name: '高校教务管理平台',
    nameEn: 'Campus Admin',
    role: '前端开发',
    period: '',
    summary: [
      '面向高校师生的移动端教务服务应用，解决传统教务系统在移动设备上体验不佳、操作繁琐的问题',
      '涵盖课程表查询、成绩查询、选课系统、考勤签到及校园通知等核心功能，服务于全校数千名师生，实现教务管理的掌上化与便捷化',
    ],
    tags: ['移动端', '选课系统', '考勤签到', 'Uni-app'],
    stack: [
      { group: '前端框架', items: ['Vue.js 2.x / 3.x', 'Uni-app'] },
      { group: 'UI 组件库', items: ['uView UI', 'Uni-ui'] },
      { group: '工具', items: ['HBuilderX', 'Git', 'Axios'] },
    ],
    color: '#c792ea',
    logo: 'https://aka.doubaocdn.com/s/JF26gix0BC',
  },
  {
    id: 'happywoo',
    name: '快乐小窝',
    nameEn: 'HappyWOO',
    role: 'AI 辅助开发',
    period: '',
    summary: ['纯前端 HTML5 Canvas 休闲像素冒险游戏，无需后端、数据库'],
    tags: ['像素游戏', 'Canvas 2D', '程序化美术', '双端同源', '种植系统'],
    stack: [
      { group: '游戏渲染', items: ['HTML5 Canvas 2D', '离屏双缓冲', '整数倍放大'] },
      { group: '编程语言', items: ['原生 JavaScript（ES5）', '无框架', '无构建步骤'] },
      { group: '桌面端', items: ['Neutralino', 'WebView2'] },
      { group: '测试验证', items: ['Playwright（开发用）'] },
    ],
    color: '#8be04f',
    logo: 'https://aka.doubaocdn.com/s/rGgfVovKT0',
    video: './videos/happywoo-demo.mp4',
  },
]

export const navLinks = [
  { href: '#about', label: '关于' },
  { href: '#skills', label: '技能' },
  { href: '#projects', label: '项目' },
  { href: '#contact', label: '联系' },
]
