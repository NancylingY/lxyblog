import { computed } from 'vue'
import { useI18n } from '../i18n'

export function usePangolinCopy() {
  const { isZh } = useI18n()
  return computed(() => isZh.value ? {
    title: '平衡的艺术', subtitle: 'THE LITTLE BALANCING ACT',
    description: '一只穿山甲，一辆独轮车，一场恰到好处的平衡。',
    enter: '进入林间舞台', tags: ['程序化建模', '动态平衡', '自由环视'],
    back: '返回其他', speed: '骑行速度', pause: '暂停', play: '继续骑行',
    cameras: ['自由镜头', '侧面观察', '近距离'], reset: '重置视角',
    hint: '拖拽环视 · 滚轮缩放 · 双指缩放', loading: '正在布置林间舞台…',
    failed: '暂时无法启动 3D 场景，请检查浏览器是否支持 WebGL。', retry: '重新加载',
    note: '慢一点，也能稳稳向前。', motion: '实时 3D · 程序化动画',
  } : {
    title: 'The balancing act', subtitle: 'THE LITTLE BALANCING ACT',
    description: 'One little pangolin. One wheel. A beautifully delicate balance.',
    enter: 'Enter the woodland stage', tags: ['Procedural modeling', 'Dynamic balance', 'Orbit freely'],
    back: 'Back to Other', speed: 'Riding speed', pause: 'Pause', play: 'Keep riding',
    cameras: ['Free orbit', 'Side view', 'Close-up'], reset: 'Reset view',
    hint: 'Drag to orbit · Scroll to zoom · Pinch to zoom', loading: 'Setting the woodland stage…',
    failed: 'Unable to start the 3D scene. Please check WebGL support in your browser.', retry: 'Try again',
    note: 'Finding a little balance, one pedal at a time.', motion: 'LIVE 3D · PROCEDURAL ANIMATION',
  })
}
