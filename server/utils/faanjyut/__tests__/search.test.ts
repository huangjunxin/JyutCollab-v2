/**
 * search 純函數單元測試（FaanjyutV1Design §6.1 六維度搜索）：
 * 正則轉義/構建（contains/prefix）、truncateText、mergeSearchHits 分組/限量/去重/排序。
 * 不連真庫，只測 server/utils/faanjyut/search.ts。
 */
import { describe, expect, it } from 'vitest'
import {
  SEARCH_DIMENSION_LABELS,
  buildSearchRegex,
  escapeRegExp,
  mergeSearchHits,
  truncateText
} from '../search'

describe('faanjyut/search 正則工具', () => {
  it('escapeRegExp 轉義全部特殊字符，使查詢詞按字面量匹配', () => {
    const specials = '.*+?^${}()|[]\\'
    expect(escapeRegExp(specials)).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\')

    // `>` 與 `.` 不作為正則元字符解釋
    const re = new RegExp(escapeRegExp('>416.5'))
    expect(re.test('abc >416.5 def')).toBe(true)
    expect(re.test('abc >416x5 def')).toBe(false)
    expect(re.test('abc >416.5x def')).toBe(true)
  })

  it('buildSearchRegex 預設 contains：命中任意位置且大小寫不敏感', () => {
    const re = buildSearchRegex('Jyut')
    expect(re.test('abc Jyut6 xyz')).toBe(true)
    expect(re.test('abc jyut6 xyz')).toBe(true) // 綜合音大小寫混寫（Jyut6）可被小寫命中
    expect(re.test('abc jyuu xyz')).toBe(false)
  })

  it('buildSearchRegex prefix 模式以 ^ 錨定開頭（key 維度精確或前綴）', () => {
    const re = buildSearchRegex('>416', { mode: 'prefix' })
    expect(re.test('>416461483360343')).toBe(true)
    expect(re.test('x >416461483360343')).toBe(false)
    // 完整 key 即精確匹配，同樣被前綴正則覆蓋
    const full = buildSearchRegex('>416461483360343', { mode: 'prefix' })
    expect(full.test('>416461483360343')).toBe(true)
    expect(full.test('>41646148336034x')).toBe(false)
  })

  it('truncateText 超長截斷並附省略號，短文本原樣返回', () => {
    expect(truncateText('短')).toBe('短')
    expect(truncateText('a'.repeat(81)).length).toBe(81)
    expect(truncateText('a'.repeat(81))).toMatch(/…$/)
    expect(truncateText('a'.repeat(80), 10)).toMatch(/^aaaaaaaaaa…$/)
  })
})

describe('faanjyut/search mergeSearchHits', () => {
  it('按維度分組、維內 lexeme 去重、每維限量、按 matrixOrder 排序', () => {
    const groups = mergeSearchHits([
      {
        dimension: 'key',
        hits: [
          { lexemeId: 'L1', snippet: '>416461483360343', extra: { matrixOrder: 2 } },
          { lexemeId: 'L1', snippet: '>416461483360343（重複）', extra: { matrixOrder: 2 } },
          { lexemeId: 'L2', snippet: '>541832300021785', extra: { matrixOrder: 1 } },
          { lexemeId: 'L3', snippet: '>998877665544', extra: { matrixOrder: 3 } }
        ]
      },
      {
        dimension: 'entry',
        hits: [
          { lexemeId: 'L4', snippet: '粵 jyut6' },
          { lexemeId: 'L5', snippet: '粵 juot9' },
          { lexemeId: 'L6', snippet: '好 hou2' }
        ]
      }
    ], { limitPerDimension: 2 })

    expect(groups).toHaveLength(2)
    expect(groups[0].dimension).toBe('key')
    expect(groups[0].dimensionLabel).toBe(SEARCH_DIMENSION_LABELS.key)
    // L1 去重只保留一次；matrixOrder 升序：L2(1) → L1(2)；限量 2 裁掉 L3
    expect(groups[0].hits.map((h) => h.lexemeId)).toEqual(['L2', 'L1'])
    // entry 維度無 matrixOrder，按 lexemeId 字典序 + 限量
    expect(groups[1].hits.map((h) => h.lexemeId)).toEqual(['L4', 'L5'])
    expect(groups[1].dimensionLabel).toBe(SEARCH_DIMENSION_LABELS.entry)
  })

  it('缺少 lexemeId 的命中被丟棄；空命中維度輸出空數組與正確標籤', () => {
    const groups = mergeSearchHits([
      {
        dimension: 'definition',
        hits: [
          { lexemeId: '', snippet: '無 id' },
          { snippet: '連 lexemeId 都沒有' }
        ]
      },
      { dimension: 'representativeChar', hits: [] }
    ], { limitPerDimension: 10 })

    expect(groups[0].hits).toEqual([])
    expect(groups[1].hits).toEqual([])
    expect(groups[1].dimensionLabel).toBe(SEARCH_DIMENSION_LABELS.representativeChar)
  })

  it('無 matrixOrder（或非數值）的命中排在帶數值的之後，字典序兜底', () => {
    const groups = mergeSearchHits([
      {
        dimension: 'externalEtymon',
        hits: [
          { lexemeId: 'B', snippet: 's', extra: { matrixOrder: 5 } },
          { lexemeId: 'A', snippet: 's' },
          { lexemeId: 'C', snippet: 's', extra: { matrixOrder: null } }
        ]
      }
    ], { limitPerDimension: 10 })

    expect(groups[0].hits.map((h) => h.lexemeId)).toEqual(['B', 'A', 'C'])
  })

  it('六維度標籤齊全且為繁體中文（設計 §6.4 顯示層標籤中文化）', () => {
    expect(SEARCH_DIMENSION_LABELS).toEqual({
      key: '詞條鍵',
      compositePronunciation: '綜合音',
      representativeChar: '代表字',
      definition: '釋義',
      entry: '地點方音',
      externalEtymon: '域外材料'
    })
  })
})
