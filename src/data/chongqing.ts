import { computed } from 'vue'
import { useI18n } from '../i18n'

export const CHONGQING_PATH = '/chongqing'

export function useChongqingCopy() {
  const { isZh } = useI18n()
  return computed(() =>
    isZh.value
      ? {
          title: '重庆雨城',
          titleEn: 'Chongqing 8D Rain Box',
          status: '1:150 立体剖面',
          enter: '进入山城沙盘',
          description:
            '1:150 博物馆级三层立体剖面沙盘：高空李子坝单轨穿楼与长江索道、中层巴渝吊脚楼雨夜梯坎老街、地下穿山地铁与防空洞老火锅。',
          tags: ['8D 立体剖面', '三气候切换', '单轨穿楼', '程序化音效'],
          back: '返回其他',
          alt: '胡桃木与拉丝黄铜底座上的重庆 8D 山城雨夜三层剖面微缩沙盘，展示单轨穿楼、吊脚楼老街与地下防空洞火锅。',
        }
      : {
          title: 'Chongqing Rain City',
          titleEn: 'Chongqing 8D Rain Box',
          status: '1:150 Cutaway',
          enter: 'Enter 8D Diorama',
          description:
            'A 1:150 museum-grade three-tier cutaway diorama of Chongqing: Liziba monorail & cableway above, Bayu diaojiaolou rainy alley at mid-level, and subterranean subway & air-raid shelter hotpot below.',
          tags: ['8D Cutaway', '3 Climates', 'Liziba Monorail', 'Procedural Audio'],
          back: 'Back to Other',
          alt: 'A 1:150 scale three-tier architectural cutaway diorama of Chongqing mounted on a walnut and brass plinth.',
        },
  )
}
