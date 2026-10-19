# 个人博客项目 · 文件用途与修改指南

> 项目：Vue 3 + TypeScript + Vite 个人博客（作品集）
> 部署：GitHub Pages → `https://nancylingy.github.io/lxyblog/`
> 修改流程：**改 `src/` 下的文件 → 运行 `npm run build` 验证 → `git push`（自动部署）**

---

## 一、目录总览

```
blog-frontend/
├── .github/workflows/    # GitHub Actions 自动部署配置
├── public/               # 静态资源（不经过打包，原样发布）
├── src/                  # 全部源代码（主要修改区域）
│   ├── assets/           # 本地图片资源
│   ├── components/       # 页面组件（每个区块一个）
│   ├── data/             # ★ 内容数据（改内容改这里）
│   ├── router/           # 路由配置
│   ├── three/            # 3D 场景
│   │   ├── konbini.ts    # 雨夜便利店
│   │   ├── hospital/     # 白天综合医院
│   │   └── terrarium/    # 微光之境（玻璃立方体生态）
│   ├── utils/            # 工具函数
│   ├── views/            # 页面级组件
│   ├── App.vue           # 应用外壳
│   ├── main.ts           # 应用入口
│   └── style.css         # 全局样式（颜色/字体变量）
├── index.html            # 入口 HTML（含 no-cache 声明）
├── vite.config.ts        # 构建配置（base: './'）
└── package.json          # 依赖与脚本
```

---

## 二、逐文件用途标注

### 1. 内容数据（改文字/项目/技能 → 只改这里）

| 文件 | 用途 | 负责的页面内容 |
|---|---|---|
| **`src/data/resume.ts`** | ★ 全站唯一数据源 | 个人信息、个人优势、教育经历、技能分组、4 个项目、导航链接 |

> 页面上的**文字内容全部来自这个文件**，改它即可，无需动组件。

### 2. 页面组件（改布局/样式 → 这里）

| 文件 | 用途 | 对应页面区块 |
|---|---|---|
| `src/views/HomeView.vue` | 首页容器 | 依次组合 Hero / About / Skills / Contact 四个区块 |
| `src/views/OtherView.vue` | 其他页容器 | 三张 3D 微缩场景卡片（便利店 / 医院 / 微光之境） |
| `src/views/KonbiniView.vue` | 便利店 3D 页 | 全屏雨夜便利店场景 |
| `src/views/HospitalView.vue` | 医院 3D 页 | 全屏白天综合医院场景 |
| `src/views/TerrariumView.vue` | 微光之境 3D 页 | 深空玻璃立方体生态、昼夜切换与图标控件 |
| `src/views/ProjectsView.vue` | 项目页容器 | 项目卡片网格（4 张卡片） |
| `src/components/HeroSection.vue` | 首页首屏 | 大标题、slogan、统计区（20+ 技术栈 / 4 全栈项目 / 3 技术方向）、粒子背景 |
| `src/components/AboutSection.vue` | 关于我区块 | 个人优势列表、教育经历卡片 |
| `src/components/SkillsSection.vue` | 技术栈区块 | 三组技能卡片（后端/前端/数据&工程） |
| `src/components/ContactSection.vue` | 联系区块 | 发邮件、拨打电话、复制邮箱、联系方式卡片 |
| `src/components/NavBar.vue` | 顶部导航栏 | 回到首页、关于、技能、项目、联系 |
| `src/components/ParticleField.vue` | 创意小组件 | Hero 右侧的粒子星空动画 |

### 3. 全局配置与样式

| 文件 | 用途 |
|---|---|
| `src/style.css` | 全局主题：`--bg`（背景色）、`--accent`（强调色）、字体、按钮、卡片等通用样式 |
| `src/router/index.ts` | 路由：`#/` 首页、`#/other` 其他页、`#/konbini`、`#/hospital`、`#/terrarium`（hash 模式） |
| `src/utils/scroll.ts` | 锚点平滑滚动工具（导航偏移 72px） |
| `src/main.ts` | 应用入口：挂载 Vue 与路由 |
| `src/App.vue` | 外壳：导航栏 + 路由出口 |
| `index.html` | 入口 HTML、标题、favicon、禁止缓存 meta |
| `vite.config.ts` | 构建配置（`base: './'` 适配子路径部署） |
| `.github/workflows/deploy.yml` | 每次 push 自动构建并发布到 GitHub Pages |

### 4. 静态资源与部署文件

| 文件 | 用途 |
|---|---|
| `public/favicon.svg` | 浏览器标签页图标 |
| `public/icons.svg` | 页面内 SVG 图标集 |
| `public/.nojekyll` | 告诉 GitHub Pages 不要用 Jekyll 处理（保留下划线文件） |
| `src/assets/` | 本地图片（hero.png 等，logo 目前用 CDN 链接，不在本地） |

### 5. 其他页的三张 3D 卡片

| 卡片 | 路由 | 场景代码 |
|---|---|---|
| 日式便利店 | `#/konbini` | `src/three/konbini.ts` |
| 现代综合医院 | `#/hospital` | `src/three/hospital/` |
| 微光之境 | `#/terrarium` | `src/three/terrarium/`（terrain / flora / fauna / sky / scene） |

微光之境进入后可拖拽旋转、滚轮缩放；点击场景或按 `D` 切换昼夜，按 `Esc` 返回其他页。

---

## 三、常见修改指引

### 改个人资料（电话/邮箱/名字/简介）
打开 `src/data/resume.ts` 顶部 `profile` 对象：
```ts
export const profile = {
  name: '李家骏',
  phone: '14749334143',
  email: 'water792383@qq.com',
  role: '后端开发',
  slogan: '用代码把想法变成产品',
  intro: '...',
}
```
直接改对应字段的值即可，联系区、导航眉标、首页标题全部自动更新。

### 改首页统计区数字（如"20+ 技术栈"）
打开 `src/components/HeroSection.vue`，搜索 `hero__stat-num`：
```html
<span class="hero__stat-num">20+</span>
<span class="hero__stat-label">技术栈</span>
```
改数字或标签文字即可（共 3 组）。

### 改项目卡片（新增/删除/修改项目）
打开 `src/data/resume.ts` 的 `projects` 数组，每个项目一个对象：
```ts
{
  id: 'smartread',          // 唯一标识
  name: '智阅',              // 中文名
  nameEn: 'SmartRead',      // 英文名
  role: '全栈开发',           // 职责
  period: '2026.04 - 2026.05',  // 时间（留空 '' 则不显示）
  summary: ['描述1', '描述2'],   // 项目描述（卡片展开后的要点）
  tags: ['Flask', '混合推荐'],   // 卡片上的标签
  stack: [                    // 技术栈分组
    { group: '后端', items: ['Python 3.9', 'Flask'] },
  ],
  color: '#3ddc84',           // 卡片主题色
  logo: 'https://...',        // Logo 图片链接
}
```
- **新增项目**：复制一个对象改内容，追加到数组末尾
- **删除项目**：删掉对应对象；同时首页统计区"4 全栈项目"的数字要手动改
- **换 Logo**：替换 `logo` 字段的图片链接

### 改技能分组
打开 `src/data/resume.ts` 的 `skills` 数组：
```ts
export const skills = [
  { group: '后端', icon: 'server', items: ['Java', 'Spring Boot 2.7', ...] },
]
```
改 `group`（分组名）、`items`（技能项）即可。

### 改全局主题颜色
打开 `src/style.css`，顶部有 CSS 变量定义：
```css
:root {
  --bg: #0a0e14;      /* 页面背景（深色） */
  --accent: #22d3ee;  /* 主强调色（青色） */
  ...
}
```
改色值即可全局生效。

### 改导航栏菜单项
打开 `src/data/resume.ts` 底部 `navLinks`：
```ts
export const navLinks = [
  { href: '#about', label: '关于' },
  { href: '#skills', label: '技能' },
  { href: '#projects', label: '项目' },
  { href: '#contact', label: '联系' },
]
```

### 新增一个页面区块（高级）
1. 在 `src/components/` 新建 `XxxSection.vue`（复制现有区块改内容）
2. 在 `src/views/HomeView.vue` 中 import 并加入模板
3. 需要独立路由页面时，在 `src/router/index.ts` 的 `routes` 里加一条路由

---

## 四、常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发预览（http://localhost:5173） |
| `npm run build` | 构建检查（类型 + 打包，报错会失败） |
| `npm run preview` | 本地预览构建产物 |
| `git push` | 推送后 GitHub Actions 自动部署线上 |

## 五、部署注意

- 路由是 **hash 模式**（`#/`），刷新或直达子路径不会 404，不要改成 history 模式
- 构建配置 `base: './'` 不能删，否则子路径部署资源加载失败
- 手机看更新慢是 GitHub Pages 缓存（约 10 分钟），发版后下拉刷新或稍等即可
