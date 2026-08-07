import { describe, expect, it } from 'vitest'
import { maskName } from '../mask-name'

describe('faanjyut/mask-name 批注作者脫敏（2026-08-07 拍板 M45）', () => {
  it('兩字 → 首字+星號', () => {
    expect(maskName('張三')).toBe('張*')
    expect(maskName('李四')).toBe('李*')
  })

  it('三字及以上 → 保留首尾，中間星號', () => {
    expect(maskName('歐陽修')).toBe('歐*修')
    expect(maskName('司徒美堂')).toBe('司**堂')
    expect(maskName('Anony')).toBe('A***y')
  })

  it('單字 → 原樣返回（規則未覆蓋，無法模糊化）', () => {
    expect(maskName('王')).toBe('王')
  })

  it('空值/空白 → null / 空串', () => {
    expect(maskName(null)).toBeNull()
    expect(maskName(undefined)).toBeNull()
    expect(maskName('')).toBe('')
    expect(maskName('   ')).toBe('')
  })

  it('按 Unicode 碼點處理（emoji/代理對不拆裂）', () => {
    expect(maskName('𠮷野家')).toBe('𠮷*家')
  })
})
