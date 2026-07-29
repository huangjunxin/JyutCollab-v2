import { describe, it, expect } from 'vitest'
import { FAANJYUT_SOURCE_BOOK, isFaanJyutEntry } from '../faanjyut'

describe('shared/faanjyut 來源判別', () => {
  it('sourceBook 常數為 faanjyut', () => {
    expect(FAANJYUT_SOURCE_BOOK).toBe('faanjyut')
  })

  it('頂層 sourceBook === faanjyut 判定為泛粵 Entry', () => {
    expect(isFaanJyutEntry({ sourceBook: 'faanjyut' })).toBe(true)
  })

  it('其他來源或缺欄位均為 false', () => {
    expect(isFaanJyutEntry({ sourceBook: 'jyutdict' })).toBe(false)
    expect(isFaanJyutEntry({ sourceBook: '' })).toBe(false)
    expect(isFaanJyutEntry({})).toBe(false)
    expect(isFaanJyutEntry(null)).toBe(false)
    expect(isFaanJyutEntry(undefined)).toBe(false)
  })

  it('不看 meta.sourceBook（機器來源只看頂層，見 NewTablesDesign.md §5.1）', () => {
    expect(isFaanJyutEntry({ sourceBook: undefined })).toBe(false)
  })
})
