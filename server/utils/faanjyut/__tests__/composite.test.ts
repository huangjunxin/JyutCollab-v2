import { describe, it, expect } from 'vitest'
import {
  buildCompositePronunciation,
  compositeDisplayFromRaw,
  compositeMarkersFromRaw
} from '../composite'

describe('compositeDisplayFromRaw（ETL JyutpingConverter 規則移植）', () => {
  it('直接返回值與去除半形 ! ? 標記（全形 ？ 僅 markers 識別，display 保留——與 ETL 一致）', () => {
    expect(compositeDisplayFromRaw('jyut6')).toBe('jyut6')
    expect(compositeDisplayFromRaw('jyut6!')).toBe('jyut6')
    expect(compositeDisplayFromRaw('jyut6?')).toBe('jyut6')
    expect(compositeDisplayFromRaw('jyut6？')).toBe('jyut6？')
    expect(compositeDisplayFromRaw('jyut9! jyut6!')).toBe('jyut9 jyut6')
  })

  it('/ 分段去重（保留首現，與 ETL 一致）', () => {
    expect(compositeDisplayFromRaw('jyut6/jyut6')).toBe('jyut6')
    expect(compositeDisplayFromRaw('jyut6/mou5/jyut6')).toBe('jyut6/mou5')
  })

  it('替換規則（源自原 Excel 公式，與 ETL DEFAULT_SUBSTITUTIONS 逐條對齊）', () => {
    expect(compositeDisplayFromRaw('shou1')).toBe('sou1')          // sh → s
    expect(compositeDisplayFromRaw('zhei3')).toBe('zei3')          // zh → z
    expect(compositeDisplayFromRaw('n.gong4')).toBe('ngong4')      // n.g → ng
    expect(compositeDisplayFromRaw('n.baa1')).toBe('maa1')         // n.b → m
    expect(compositeDisplayFromRaw('n.dai6')).toBe('nai6')         // n.d → n
    expect(compositeDisplayFromRaw('eo1')).toBe('a1')              // eo → a
    expect(compositeDisplayFromRaw('eoi2')).toBe('ai2')            // 規則順序：eo→a 先於 eoi→ui（與 ETL 表序一致）
    expect(compositeDisplayFromRaw('geoi3/geoi3')).toBe('gai3')   // eo→a + 去重
    expect(compositeDisplayFromRaw('jyut6..sou1')).toBe('jyut6.sou1') // .. → .
  })

  it('規則順序：先 n. 系列再 n 系列（n. 優先於單 n 規則）', () => {
    // "n.j" → "nj"（n. 系列），而不是先被其他 n 規則吃掉
    expect(compositeDisplayFromRaw('n.jau5')).toBe('jau5') // nj → j（第二輪）
  })
})

describe('compositeMarkersFromRaw（與 ETL PanJ2MongoDB.py 一致）', () => {
  it('無標記', () => {
    expect(compositeMarkersFromRaw('jyut6')).toEqual({ hasQuestion: false, hasBang: false })
  })
  it('半形 ! / ?', () => {
    expect(compositeMarkersFromRaw('jyut6!')).toEqual({ hasQuestion: false, hasBang: true })
    expect(compositeMarkersFromRaw('jyut6?')).toEqual({ hasQuestion: true, hasBang: false })
  })
  it('全形 ？', () => {
    expect(compositeMarkersFromRaw('jyut6？')).toEqual({ hasQuestion: true, hasBang: false })
  })
})

describe('buildCompositePronunciation', () => {
  it('trim 後為空 → null（清空綜合音）', () => {
    expect(buildCompositePronunciation('')).toBeNull()
    expect(buildCompositePronunciation('   ')).toBeNull()
  })
  it('正常輸入 → raw/display/markers 完整重算', () => {
    expect(buildCompositePronunciation(' jyut6! ')).toEqual({
      raw: 'jyut6!',
      display: 'jyut6',
      markers: { hasQuestion: false, hasBang: true }
    })
  })
})
