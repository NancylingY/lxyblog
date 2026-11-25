/**
 * 首页新增模块文案：技术跑马灯 / 工作方式 / 创意实验室 / 项目筛选 / 回到顶部
 * 与 pangolin.ts 的写法一致：一个 computed 返回当前语言的整份文案。
 */
import { computed } from 'vue'
import { useI18n } from '../i18n'

export interface ProcessStep {
  title: string
  sub: string
  desc: string
  tags: string[]
}

export function useShowcaseCopy() {
  const { isZh } = useI18n()

  return computed(() =>
    isZh.value
      ? {
          marqueeLabel: '技术栈速览',

          processTitle: '工作方式',
          processSub:
            '从一个模糊的想法到稳定运行的产品，我习惯按这四步推进——每一步都有明确的产出，也随时可以回到上一步修正。',
          processSteps: [
            {
              title: '定义问题',
              sub: 'Define',
              desc: '拆解需求与使用场景，先弄清楚真正要解决的问题，以及怎样才算成功。',
              tags: ['需求拆解', '用户路径', '成功标准'],
            },
            {
              title: '设计体验',
              sub: 'Design',
              desc: '把信息层级、交互节奏与视觉语言放在一起推敲，尽早做出可以点击的原型。',
              tags: ['信息架构', '交互原型', '视觉规范'],
            },
            {
              title: '工程实现',
              sub: 'Build',
              desc: 'Vue 3 + TypeScript 前端，Spring Boot / FastAPI 后端，借助 AI 协作缩短从想法到可运行版本的距离。',
              tags: ['前后端开发', 'AI 协作', '接口设计'],
            },
            {
              title: '上线迭代',
              sub: 'Ship',
              desc: '容器化部署、小步上线，用真实反馈驱动下一轮迭代，而不是堆砌功能。',
              tags: ['Docker 部署', '真实反馈', '持续迭代'],
            },
          ] as ProcessStep[],

          labTitle: '创意实验室',
          labSub: '代码之外的 3D 微缩场景实验：Three.js、三渲二与程序化建模。拖动浏览，点击进入实时场景。',
          labEnter: '进入场景',
          labAll: '查看全部',
          labPrev: '上一个场景',
          labNext: '下一个场景',
          brickDesc: '奶油白底板、珊瑚橙屋顶与鼠尾草绿树冠，拼出一座可以转动的小花园。',
          brickTags: ['程序化建模', '实时光影', '自由旋转'],

          filterLabel: '按角色筛选项目',
          filterAll: '全部',
          hasDemo: '演示视频',

          backToTop: '回到顶部',
        }
      : {
          marqueeLabel: 'Tech stack at a glance',

          processTitle: 'How I Work',
          processSub:
            'From a fuzzy idea to a product that runs reliably, I move through four stages — each with a clear output, and always open to stepping back and revising.',
          processSteps: [
            {
              title: 'Define',
              sub: '定义问题',
              desc: 'Break down requirements and scenarios to pin down the real problem — and what success looks like.',
              tags: ['Requirements', 'User journeys', 'Success metrics'],
            },
            {
              title: 'Design',
              sub: '设计体验',
              desc: 'Work through hierarchy, interaction rhythm and visual language together, and reach a clickable prototype early.',
              tags: ['Info architecture', 'Prototyping', 'Visual system'],
            },
            {
              title: 'Build',
              sub: '工程实现',
              desc: 'Vue 3 + TypeScript on the front, Spring Boot / FastAPI on the back, with AI pairing shortening the path to a running build.',
              tags: ['Full-stack', 'AI pairing', 'API design'],
            },
            {
              title: 'Ship',
              sub: '上线迭代',
              desc: 'Containerised, incremental releases — real feedback drives the next iteration, not feature piling.',
              tags: ['Docker deploys', 'Real feedback', 'Iteration'],
            },
          ] as ProcessStep[],

          labTitle: 'Creative Lab',
          labSub:
            'Off-the-clock 3D diorama experiments — Three.js, cel shading and procedural modeling. Drag to browse, click to enter a live scene.',
          labEnter: 'Enter scene',
          labAll: 'View all',
          labPrev: 'Previous scene',
          labNext: 'Next scene',
          brickDesc: 'A cream baseplate, coral roofs and sage-green canopies snap together into a little garden you can spin.',
          brickTags: ['Procedural modeling', 'Real-time light', 'Free rotation'],

          filterLabel: 'Filter projects by role',
          filterAll: 'All',
          hasDemo: 'Demo video',

          backToTop: 'Back to top',
        },
  )
}
