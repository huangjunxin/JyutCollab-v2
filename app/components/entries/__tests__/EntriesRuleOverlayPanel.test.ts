import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const componentPath = resolve(process.cwd(), 'app/components/entries/EntriesRuleOverlayPanel.vue')
const source = readFileSync(componentPath, 'utf8')

describe('EntriesRuleOverlayPanel', () => {
  it('defines local-only typed props, emits, and accessible trigger shell', () => {
    expect(source).toContain('defineProps')
    expect(source).toContain('defineEmits')
    expect(source).toContain('EntriesRuleDraft')
    expect(source).toContain('EntriesRuleOverlay')
    expect(source).toContain('EntriesRuleOverlayErrors')
    expect(source).toContain('update:expanded')
    expect(source).toContain('update:draftRule')
    expect(source).toContain('apply')
    expect(source).toContain('clear')
    expect(source).toContain('toggle-rule')
    expect(source).toContain('remove-rule')
    expect(source).toContain('move-rule')
    expect(source).toContain('aria-label="規則"')
    expect(source).toContain('aria-expanded')
    expect(source).toContain('aria-controls')
    expect(source).toContain('<Teleport')
  })

  it('keeps the component presentational and free from entry mutations', () => {
    expect(source).not.toMatch(/\$fetch|save|delete|review|bulk|col\.set|_isDirty/)
  })

  it('renders draft controls, supported fields, and validation alert affordances', () => {
    expect(source).toContain('新增規則')
    expect(source).toContain('規則名稱')
    expect(source).toContain('規則類型')
    expect(source).toContain('條件格式')
    expect(source).toContain('驗證警告')
    expect(source).toContain('條件模式')
    expect(source).toContain('公式')
    expect(source).toContain('正則表達式')
    expect(source).toContain('目標欄位')
    expect(source).toContain('任何欄位')
    expect(source).toContain('套用規則')
    expect(source).toContain('清除規則')
    expect(source).toContain('此規則只會標示目前已載入的詞條，不會修改資料。')
    expect(source).toContain('role="alert"')
    expect(source).toMatch(/headword|dialect|phonetic|entryType|theme|definition|register|status/)
  })

  it('renders local rule list management controls and validation warning treatment', () => {
    expect(source).toContain('已啟用')
    expect(source).toContain('已停用')
    expect(source).toContain('上移')
    expect(source).toContain('下移')
    expect(source).toContain('移除')
    expect(source).toContain('i-heroicons-exclamation-triangle')
    expect(source).toContain("emit('toggle-rule'")
    expect(source).toContain("emit('move-rule'")
    expect(source).toContain("emit('remove-rule'")
  })
})
