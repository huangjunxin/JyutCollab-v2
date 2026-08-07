import { describe, it, expect } from 'vitest'
import {
  DIALECT_IDS,
  DIALECT_LABELS,
  DIALECT_REGION_CODES,
  DIALECT_OPTIONS,
  DIALECT_COLORS,
  getDialectLabel,
  getDialectLabelByRegionCode,
  getDialectColor
} from '../dialects'

// 泛粵字表 P0 新增（2026-07，見 BaselineManifest.md §4）
const NEW_DIALECTS: Array<[string, string, string]> = [
  ['jiangmen_baisha', '江門 白沙', 'JMBS'],
  ['jiangmen_jiaotou', '江門 滘頭', 'JMJT'],
  ['gaozhou_xieji', '高州 謝鷄', 'GZXJ'],
  ['guigang_shika', '貴港 石卡', 'GGSK'],
  ['lingui_yining', '臨桂 義寧', 'LGYN'],
  ['luchuan_mapo', '陸川 馬坡', 'LCMP'],
  ['rongxian_ziliang', '容縣 自良', 'RXZL'],
  ['tengxian_lingjing', '藤縣 嶺景', 'TXLJ'],
  ['tengxian_tandongzhonghe', '藤縣 潭東中和', 'TXTDZH'],
  ['xinli', '欽州［新立話］', 'XL'],
  ['zengcheng_xishanxinwei', '增城 西山新圍', 'ZCXSXW'],
  ['baiyun_banghuzhenhu', '白雲 蚌湖鎮湖', 'BYBHZH']
]

describe('shared/dialects 泛粵新增 DialectId', () => {
  it('總數 160 + 12 = 172', () => {
    expect(DIALECT_IDS).toHaveLength(172)
  })

  it.each(NEW_DIALECTS)('%s 已登記 ID、label、regionCode', (id, label, regionCode) => {
    expect(DIALECT_IDS).toContain(id)
    expect(DIALECT_LABELS[id as keyof typeof DIALECT_LABELS]).toBe(label)
    expect(DIALECT_REGION_CODES[id as keyof typeof DIALECT_REGION_CODES]).toBe(regionCode)
  })

  it('ID / label / regionCode 無重複', () => {
    expect(new Set(DIALECT_IDS).size).toBe(DIALECT_IDS.length)
    expect(new Set(Object.values(DIALECT_LABELS)).size).toBe(DIALECT_IDS.length)
    expect(new Set(Object.values(DIALECT_REGION_CODES)).size).toBe(DIALECT_IDS.length)
  })

  it('每個 ID 都有 label、regionCode、選項和顏色', () => {
    for (const id of DIALECT_IDS) {
      expect(DIALECT_LABELS[id]).toBeTruthy()
      expect(DIALECT_REGION_CODES[id]).toBeTruthy()
      expect(DIALECT_COLORS[id]).toBeTruthy()
    }
    expect(DIALECT_OPTIONS).toHaveLength(DIALECT_IDS.length)
  })

  it('helper 可查新方言', () => {
    expect(getDialectLabel('jiangmen_baisha')).toBe('江門 白沙')
    expect(getDialectLabelByRegionCode('JMBS')).toBe('江門 白沙')
    expect(getDialectLabelByRegionCode('jmbs')).toBe('江門 白沙')
    expect(getDialectColor('jiangmen_baisha')).not.toBe('')
    expect(getDialectColor('other')).toBe('gray')
  })

  it('審計 M35：混合大小寫 regionCode 亦可查（高州 GZhou / 廉州 LZhou / 賀州 HZhou / 儋州 DZhou）', () => {
    expect(getDialectLabelByRegionCode('GZhou')).toBe('高州')
    expect(getDialectLabelByRegionCode('LZhou')).toBe('廉州')
    expect(getDialectLabelByRegionCode('HZhou')).toBe('賀州')
    expect(getDialectLabelByRegionCode('DZhou')).toBe('儋州')
    expect(getDialectLabelByRegionCode('gzhou')).toBe('高州')
  })
})
