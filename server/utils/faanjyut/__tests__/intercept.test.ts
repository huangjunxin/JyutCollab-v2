/**
 * 泛粵寫入口攔截 helper 單元測試（FaanjyutV1Design.md §9）：
 * assertNotFaanJyutEntry —— 認 Entry 頂層 sourceBook；
 * assertNotFaanJyutExternalEtymon —— 認 meta.sourceBook（頂層無 sourceBook）。
 * 覆蓋 Mongoose document 與 .lean() plain object 兩種形態（isFaanJyutEntry 只讀 sourceBook）。
 */
import { describe, expect, it } from 'vitest'
import { assertNotFaanJyutEntry, assertNotFaanJyutExternalEtymon } from '../intercept'

const BLOCK_MESSAGE = '泛粵字表數據請前往泛粵模組編輯'

/** 斷言函數拋出 409 攔截錯誤 */
function expectBlocked(fn: () => void): void {
  try {
    fn()
  } catch (e: any) {
    expect(e.statusCode).toBe(409)
    expect(e.message).toBe(BLOCK_MESSAGE)
    return
  }
  expect.unreachable('預期拋出 409 攔截錯誤，但未拋出')
}

describe('assertNotFaanJyutEntry', () => {
  it('泛粵 Entry（頂層 sourceBook === faanjyut）拋出 409 攔截錯誤', () => {
    expectBlocked(() => assertNotFaanJyutEntry({ id: 'fjb_1', sourceBook: 'faanjyut', headword: { display: '劘' } }))
  })

  it('兼容 .lean() plain object（無 Mongoose 方法）', () => {
    const leanEntry = { id: 'fjb_2', sourceBook: 'faanjyut' }
    expectBlocked(() => assertNotFaanJyutEntry(leanEntry))
  })

  it('普通 Entry（無 sourceBook）直接通過', () => {
    expect(() => assertNotFaanJyutEntry({ id: 'e1', headword: { display: '你好' } })).not.toThrow()
  })

  it('普通 Entry（非泛粵 sourceBook）直接通過', () => {
    expect(() => assertNotFaanJyutEntry({ id: 'e2', sourceBook: 'user_generated' })).not.toThrow()
  })

  it('null / undefined 直接通過', () => {
    expect(() => assertNotFaanJyutEntry(null)).not.toThrow()
    expect(() => assertNotFaanJyutEntry(undefined)).not.toThrow()
  })
})

describe('assertNotFaanJyutExternalEtymon', () => {
  it('泛粵 ExternalEtymon（meta.sourceBook === faanjyut）拋出 409 攔截錯誤', () => {
    expectBlocked(() =>
      assertNotFaanJyutExternalEtymon({ id: 'fjb_ext_1', lexemeId: 'fjl_1', meta: { sourceBook: 'faanjyut', sourceRow: 3 } })
    )
  })

  it('無 meta 的普通 ExternalEtymon 直接通過', () => {
    expect(() =>
      assertNotFaanJyutExternalEtymon({ id: 'ext_1', lexemeId: 'l1', meta: {} })
    ).not.toThrow()
    expect(() =>
      assertNotFaanJyutExternalEtymon({ id: 'ext_2', lexemeId: 'l2' })
    ).not.toThrow()
  })

  it('null / undefined 直接通過', () => {
    expect(() => assertNotFaanJyutExternalEtymon(null)).not.toThrow()
    expect(() => assertNotFaanJyutExternalEtymon(undefined)).not.toThrow()
  })
})
