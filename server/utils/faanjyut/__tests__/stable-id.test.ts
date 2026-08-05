import { describe, it, expect } from 'vitest'
import {
  stableId,
  commentIdentity,
  isStableId,
  lexemeId,
  entryId,
  externalEtymonId,
  columnId,
  cellStateId,
  commentId,
  linkId,
  STABLE_ID_TEST_VECTORS
} from '../stable-id'

describe('faanjyut/stable-id', () => {
  it('契約 §4 測試向量全部通過（與 ETL Python 共用）', () => {
    for (const { prefix, parts, expected } of STABLE_ID_TEST_VECTORS) {
      expect(stableId(prefix, ...parts)).toBe(expected)
    }
  })

  it('真實導出 NDJSON 的 id 對拍（與 ETL 輸出逐項一致）', () => {
    expect(lexemeId('>416461483360343')).toBe('fjl_20527ec801886102efff50bb')
    expect(entryId('>416461483360343', 'guangzhou')).toBe('fj_20255cd0e675c51e962089d7')
    expect(externalEtymonId('>416461483360343', 'och', 1)).toBe('fje_813a5eacb69a4ac425169c1f')
    // 真實導出：columns.ndjson 第 1 列
    expect(columnId('主表-睇真尐註解', 1, '綜')).toBe('fjcol_1478b674510ef2fc3ad60446')
    // 真實導出：cell_states 首條
    expect(cellStateId('fjl_20527ec801886102efff50bb', 'fjcol_8055490373b29272cca1dc78')).toBe('fjcell_b3be103d18316c9eceab297c')
    // 真實導出：comments 首條（legacyMeta.sourceCell + ordinal:1）
    expect(commentId('主表-睇真尐註解', '主表-睇真尐註解!I1', { ordinal: 1 })).toBe('fjcom_8475f9d7b5502ba322da59a9')
    // 真實導出：links 首條（DR ordinal=1）
    expect(linkId('fjl_89d0e7198bd57317fae166c5', 'DR', 1)).toBe('fjlink_5e7089163c5d7006553e6b4f')
    expect(linkId('fjl_89d0e7198bd57317fae166c5', 'DQ', 1)).toBe('fjlink_fd96eca8891eebd322753625')
  })

  it('commentIdentity 帶標籤：comment:/thread:/ordinal:', () => {
    expect(commentIdentity('c1', 't1', 2)).toBe('comment:c1')
    expect(commentIdentity(undefined, 't1', 2)).toBe('thread:t1:2')
    expect(commentIdentity(undefined, undefined, 5)).toBe('ordinal:5')
    expect(commentIdentity('', 't1', 3)).toBe('thread:t1:3')
  })

  it('穩定 ID 格式：prefix + 24 位 hex', () => {
    expect(isStableId('fjl_20527ec801886102efff50bb', 'fjl_')).toBe(true)
    expect(isStableId('fj_20255cd0e675c51e962089d7', 'fj_')).toBe(true)
    expect(isStableId('fjl_ZZZZZZZZZZZZZZZZZZZZZZZZ', 'fjl_')).toBe(false)
    expect(isStableId('abc_20527ec801886102efff50bb', 'fjl_')).toBe(false)
  })

  it('整數 part 無前導零；null/undefined 轉空字符串；trim() 但大小寫不轉換', () => {
    // 35（int）與 '35' 一致
    expect(stableId('p_', 'a', 35)).toBe(stableId('p_', 'a', '35'))
    // null → ''
    expect(stableId('p_', 'a', null)).toBe(stableId('p_', 'a', ''))
    // trim 生效
    expect(stableId('p_', 'a', '  穗  ')).toBe(stableId('p_', 'a', '穗'))
    // 大小寫敏感
    expect(stableId('p_', 'A')).not.toBe(stableId('p_', 'a'))
  })

  it('linkId ordinal 影響結果（同一 from+rawSource 不同序號不同 ID）', () => {
    expect(linkId('fjl_x', 'DR', 1)).not.toBe(linkId('fjl_x', 'DR', 2))
    expect(linkId('fjl_x', 'DR', 1)).not.toBe(linkId('fjl_x', 'DQ', 1))
  })
})
