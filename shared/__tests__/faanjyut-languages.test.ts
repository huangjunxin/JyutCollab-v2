import { describe, it, expect } from 'vitest'
import {
  FAANJYUT_LANGUAGE_LABEL_TO_CODE,
  FAANJYUT_LANGUAGE_LABELS,
  FAANJYUT_LANGUAGE_CODES,
  FAANJYUT_LANGUAGE_OPTIONS,
  isFaanJyutLanguageCode,
  getFaanJyutLanguageLabel
} from '../faanjyut-languages'

// 與 ETL PanJ2MongoDB.py LANGUAGE_CODE_MAP 逐項對應的 46 個列頭
const EXPECTED_LABELS = [
  '上古漢', '宜章一六', '東江惠', '汝', '客', '閩', '贛', '湘', '吳', '桂柳',
  '西官(餘)', '中官', '官(餘)', '晉', '藏羌', '緬彝', '薩', '英', '西羅',
  '原始偙', '北偙', '中偙', '西南偙', '臨高', '黎', '仡央', '仱水', '標-拉珈',
  '侗偙(餘)', '苗瑤', '原始南亞', '原始京', '京', '芒', '京(餘)', '戈都',
  '巴拿', '高棉', '佤德昂', '卡西', '克木', '孟', '南亞(餘)', '原始南島', '南島', '日'
]

describe('shared/faanjyut-languages 域外語言權威清單', () => {
  it('恰好 46 個 languageCode，與 ETL LANGUAGE_CODE_MAP 列頭一致', () => {
    expect(FAANJYUT_LANGUAGE_CODES).toHaveLength(46)
    expect(Object.keys(FAANJYUT_LANGUAGE_LABEL_TO_CODE)).toEqual(EXPECTED_LABELS)
  })

  it('code ↔ label 為雙射', () => {
    expect(new Set(FAANJYUT_LANGUAGE_CODES).size).toBe(46)
    for (const [label, code] of Object.entries(FAANJYUT_LANGUAGE_LABEL_TO_CODE)) {
      expect(FAANJYUT_LANGUAGE_LABELS[code]).toBe(label)
    }
  })

  it('抽查關鍵映射', () => {
    expect(FAANJYUT_LANGUAGE_LABEL_TO_CODE['上古漢']).toBe('och')
    expect(FAANJYUT_LANGUAGE_LABEL_TO_CODE['高棉']).toBe('khm')
    expect(FAANJYUT_LANGUAGE_LABEL_TO_CODE['日']).toBe('japonic')
    expect(FAANJYUT_LANGUAGE_LABEL_TO_CODE['西官(餘)']).toBe('southwestern_mandarin_other')
  })

  it('helper 行為', () => {
    expect(isFaanJyutLanguageCode('och')).toBe(true)
    expect(isFaanJyutLanguageCode('yue')).toBe(false)
    expect(getFaanJyutLanguageLabel('khm')).toBe('高棉')
    expect(getFaanJyutLanguageLabel('unknown')).toBe('unknown')
    expect(FAANJYUT_LANGUAGE_OPTIONS).toHaveLength(46)
    expect(FAANJYUT_LANGUAGE_OPTIONS[0]).toEqual({ value: 'och', label: '上古漢' })
  })
})
