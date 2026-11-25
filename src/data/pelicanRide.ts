import { computed } from 'vue'
import { useI18n } from '../i18n'

export const pelicanPoster = `${import.meta.env.BASE_URL}thumbs/pelican-express.webp`

const zh = {
  title: '车顶上的骑手',
  format: '循环动画',
  summary: '蒸汽火车穿过向日葵花海。一只白鹈鹕张开双翼，在车顶把一辆红色老单车蹬得飞快。',
  alt: '白鹈鹕展翅骑着红色复古自行车，两轮紧贴车厢顶。前方机车喷出白烟，金色花田和雪山从身后掠过。',
  enter: '观看动画',
  back: '返回其他作品',
  still: '查看封面',
  animate: '返回动画',
  pause: '暂停动画',
  play: '播放动画',
  notes: [
    { title: '贴着车顶跟拍', text: '镜头降到车顶的高度，从侧面和骑手并行。红车架稳在画面里，铁皮接缝从轮胎下滑过。近处的向日葵向左拖成一道道金线，远处的雪峰退得慢一些，山脊仍有起伏。' },
    { title: '两只蹼足，一圈踏板', text: '一只蹼足压下踏板，另一只随曲柄抬起。鹈鹕的身体跟着蹬踏轻轻起伏，两翼一高一低地调整，让重心始终落在窄窄的车顶上。' },
    { title: '风里的白烟', text: '前方烟囱吐出一团厚白的烟，刚升起便被迎面风折向车尾。低斜的阳光把烟团边缘和翼尖照成暖金色，背光处留着雪山映来的冷蓝；红漆车架上的亮线，随车身颠簸忽明忽暗。' },
  ],
}

const en = {
  title: 'The Rooftop Rider',
  format: 'Animated loop',
  summary: 'A steam train cuts through a field of sunflowers. On its roof, a white pelican spreads its wings and pedals a vintage red bicycle.',
  alt: 'A white pelican balances on a red bicycle atop a moving carriage. Steam streams back from the engine as sunflowers and snowy peaks sweep past.',
  enter: 'Watch the ride',
  back: 'Back to Other',
  still: 'View cover',
  animate: 'Back to animation',
  pause: 'Pause animation',
  play: 'Play animation',
  notes: [
    { title: 'Tracking at roof level', text: 'The camera runs beside the rider at carriage height. The red frame holds steady as roof seams slip beneath the tires. Nearby sunflowers streak left in bands of gold. Farther away, the snowy ridgeline slides by slowly enough to keep its shape.' },
    { title: 'One turn of the crank', text: 'One webbed foot presses down as the opposite pedal lifts the other. The pelican rises and settles with each stroke, tipping one wing higher and then the other to keep its weight over the narrow roof.' },
    { title: 'Steam in the slipstream', text: 'A dense puff of white steam rises from the engine before the headwind folds it back toward the carriages. Low sunlight gilds the plume and the wingtips, while the snowy peaks cast a cool blue into the shadows. A thin highlight catches the red enamel as the bicycle bobs.' },
  ],
}

export function usePelicanRideCopy() {
  const { isZh } = useI18n()
  return computed(() => isZh.value ? zh : en)
}
