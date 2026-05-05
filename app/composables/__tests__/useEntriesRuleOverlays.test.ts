import { describe, expect, it } from 'vitest'
import { computed } from 'vue'
import type { Entry } from '../../types'
import type { RowFilterContext } from '../../utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELDS } from '../../utils/entriesTableConstants'
import { createEmptyCellOverlayMeta, useEntriesRuleOverlays } from '../useEntriesRuleOverlays'

function createContext(overrides: Partial<RowFilterContext> = {}): RowFilterContext {
  return ADVANCED_FILTER_FIELDS.reduce((context, field) => {
    context[field] = overrides[field] ?? ''
    return context
  }, {} as RowFilterContext)
}

function createEntry(id: string): Entry {
  return {
    id,
    dialect: { name: '香港' },
    headword: { display: '測試', normalized: '測試', isPlaceholder: false },
    phonetic: { jyutping: ['cak1 si3'] },
    entryType: 'word',
    senses: [{ definition: '測試釋義' }],
    theme: {},
    meta: { register: '口語' },
    status: 'draft',
    createdBy: 'user-1',
    viewCount: 0,
    likeCount: 0,
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z'
  }
}

describe('useEntriesRuleOverlays metadata', () => {
  it('derives read-only per-cell formatting and validation metadata', () => {
    const entry = createEntry('entry-1')
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => [entry]),
      buildRowContext: () => createContext({ definition: '缺少例句，需要檢查', headword: '測試詞' })
    })

    overlay.draftRule.name = '缺少例句'
    overlay.draftRule.kind = 'formatting'
    overlay.draftRule.stylePreset = 'amber'
    overlay.draftRule.colorHex = '#f59e0b'
    overlay.draftRule.targetFields = ['definition']
    overlay.draftRule.condition.kind = 'formula'
    overlay.draftRule.condition.formula = '=CONTAINS(definition, "缺少")'
    expect(overlay.addRuleFromDraft()).toBe(true)

    overlay.draftRule.name = '詞頭警告'
    overlay.draftRule.kind = 'validation'
    overlay.draftRule.targetFields = ['headword']
    overlay.draftRule.condition.kind = 'regex'
    overlay.draftRule.condition.regex.field = 'headword'
    overlay.draftRule.condition.regex.pattern = '測試'
    expect(overlay.addRuleFromDraft()).toBe(true)

    const definitionMeta = overlay.getCellOverlayMeta(entry, 'definition')
    expect(definitionMeta.formattingMatches.map(match => match.ruleName)).toEqual(['缺少例句'])
    expect(definitionMeta.validationMatches).toHaveLength(0)
    expect(definitionMeta.formattingMatches[0].colorHex).toBe('#f59e0b')
    expect(definitionMeta.style.backgroundColor).toBe('#f59e0b24')
    expect(definitionMeta.style.boxShadow).toContain('#f59e0b80')
    expect(definitionMeta.tooltipText).toContain('缺少例句')

    const headwordMeta = overlay.getCellOverlayMeta(entry, 'headword')
    expect(headwordMeta.validationMatches.map(match => match.ruleName)).toEqual(['詞頭警告'])
    expect(headwordMeta.formattingMatches).toHaveLength(0)
    expect(headwordMeta.classNames).toContain('ring-amber-300')
    expect(entry).not.toHaveProperty('__ruleOverlayMeta')
    expect(entry._isDirty).toBeUndefined()
  })

  it('ignores disabled rules, unsupported fields, and non-target cells', () => {
    const entry = createEntry('entry-2')
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => [entry]),
      buildRowContext: () => createContext({ definition: '需要檢查' })
    })

    overlay.draftRule.name = '停用規則'
    overlay.draftRule.targetFields = ['definition']
    overlay.draftRule.condition.formula = '=TRUE'
    expect(overlay.addRuleFromDraft()).toBe(true)
    overlay.toggleRule(overlay.rules.value[0].id, false)

    expect(overlay.getCellOverlayMeta(entry, 'definition')).toEqual(createEmptyCellOverlayMeta())
    expect(overlay.getCellOverlayMeta(entry, 'status')).toEqual(createEmptyCellOverlayMeta())
    expect(overlay.cellOverlayMetaByEntryKey.value.size).toBe(0)
  })
})

describe('useEntriesRuleOverlays validation', () => {
  it('rejects invalid drafts with fail-closed HK Traditional errors', () => {
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => []),
      buildRowContext: () => createContext()
    })

    overlay.draftRule.name = '   '
    expect(overlay.addRuleFromDraft()).toBe(false)
    expect(overlay.ruleOverlayErrors.name).toBe('請輸入規則名稱。')
    expect(overlay.rules.value).toHaveLength(0)

    overlay.draftRule.name = '無目標欄位'
    overlay.draftRule.targetFields = []
    expect(overlay.addRuleFromDraft()).toBe(false)
    expect(overlay.ruleOverlayErrors.targetFields).toBe('請至少選擇一個目標欄位。')

    overlay.draftRule.targetFields = ['definition']
    overlay.draftRule.kind = 'formatting'
    overlay.draftRule.condition.kind = 'formula'
    overlay.draftRule.condition.formula = '=UNKNOWN(definition)'
    expect(overlay.addRuleFromDraft()).toBe(false)
    expect(overlay.ruleOverlayErrors.formula?.message).toContain('條件格式無法套用')

    overlay.draftRule.kind = 'validation'
    overlay.draftRule.condition.kind = 'regex'
    overlay.draftRule.condition.regex.pattern = '('
    expect(overlay.addRuleFromDraft()).toBe(false)
    expect(overlay.ruleOverlayErrors.regex?.message).toContain('正則表達式無法套用')
  })

  it('keeps formula target fields separate from regex input fields', () => {
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => [createEntry('entry-1')]),
      buildRowContext: () => createContext({ headword: '測試詞', definition: '釋義' })
    })

    overlay.draftRule.name = '詞頭檢查'
    overlay.draftRule.kind = 'validation'
    overlay.draftRule.targetFields = ['definition']
    overlay.draftRule.condition.kind = 'regex'
    overlay.draftRule.condition.regex.field = 'headword'
    overlay.draftRule.condition.regex.pattern = '測試'
    expect(overlay.addRuleFromDraft()).toBe(true)
    expect(overlay.rules.value[0].targetFields).toEqual(['definition'])
    expect(overlay.rules.value[0].condition.regex.field).toBe('headword')
  })
})

describe('useEntriesRuleOverlays local draft state', () => {
  it('creates enabled local rules with HK Traditional defaults and no entry mutation API', () => {
    const entries = computed(() => [createEntry('entry-1')])
    const overlay = useEntriesRuleOverlays({
      visibleEntries: entries,
      buildRowContext: () => createContext({ definition: '需要檢查' })
    })

    expect(overlay.draftRule.name).toBe('新規則')
    expect(overlay.draftRule.kind).toBe('formatting')
    expect(overlay.draftRule.condition.kind).toBe('formula')
    expect(overlay.draftRule.targetFields).toEqual(['definition'])
    expect(overlay.draftRule.enabled).toBe(true)
    expect(overlay.draftRule.colorHex).toBe('#22c55e')

    overlay.draftRule.condition.formula = '=CONTAINS(definition, "檢查")'
    expect(overlay.addRuleFromDraft()).toBe(true)
    expect(overlay.rules.value).toHaveLength(1)
    expect(overlay.rules.value[0]).toMatchObject({
      name: '新規則',
      kind: 'formatting',
      enabled: true,
      targetFields: ['definition']
    })
    expect(overlay.activeRuleCount.value).toBe(1)
    overlay.updateRuleColor(overlay.rules.value[0].id, '#ef4444')
    expect(overlay.rules.value[0].colorHex).toBe('#ef4444')
    expect(Object.keys(overlay).some(key => /save|delete|bulk|fetch/i.test(key))).toBe(false)
  })

  it('supports local toggle, move, remove, clear, and empty metadata helpers', () => {
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => []),
      buildRowContext: () => createContext()
    })

    overlay.draftRule.name = '第一條規則'
    overlay.draftRule.condition.formula = '=TRUE'
    expect(overlay.addRuleFromDraft()).toBe(true)
    overlay.draftRule.name = '第二條規則'
    overlay.draftRule.condition.formula = '=TRUE'
    expect(overlay.addRuleFromDraft()).toBe(true)

    const firstId = overlay.rules.value[0].id
    const secondId = overlay.rules.value[1].id
    overlay.toggleRule(firstId, false)
    expect(overlay.rules.value[0].enabled).toBe(false)
    overlay.moveRule(secondId, -1)
    expect(overlay.rules.value[0].id).toBe(secondId)
    overlay.removeRule(firstId)
    expect(overlay.rules.value.map(rule => rule.id)).toEqual([secondId])
    overlay.clearRules()
    expect(overlay.rules.value).toHaveLength(0)
    expect(createEmptyCellOverlayMeta()).toEqual({
      formattingMatches: [],
      validationMatches: [],
      classNames: [],
      style: {},
      tooltipText: '',
      formattingTooltipText: '',
      validationTooltipText: ''
    })
  })
})
