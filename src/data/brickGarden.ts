/**
 * 积木花园 / Brick Garden 文案
 * 卡片与详情页共用，避免两处标题、按钮名称漂移。
 */
export const BRICK_GARDEN_PATH = '/brick-garden'

export const brickGardenCopy = {
  /** 详情页可见标题（验收要求固定为中文） */
  title: '积木花园',
  titleEn: 'Brick Garden',
  eyebrow: 'BRICK GARDEN · 007',
  /** 卡片简介 */
  description: '奶油白底板、珊瑚橙屋顶与鼠尾草绿树冠，拼出一座可以转动的小花园。',
  /** 详情页导语 */
  intro: '方形积木底板、带凸点的拼搭积木、小屋、树木与花朵，还有一条通向门口的小步道。',
  enter: '进入积木花园',
  status: '3D 可交互',
  tags: ['程序化建模', '实时光影', '自由旋转'],
  sceneAria: '积木花园 3D 场景',
  hint: '拖动旋转 · 鼠标与触屏均可',
  autoRotate: '自动旋转',
  resetView: '重置视角',
  back: '返回其他',
  loading: '正在拼搭积木花园…',
  fallbackTitle: '积木花园暂时无法显示',
  fallback:
    '当前浏览器没有启用 WebGL，无法渲染 3D 场景。你仍可以使用左上角的「返回其他」按钮离开本页。',
  retry: '重新加载',
} as const
