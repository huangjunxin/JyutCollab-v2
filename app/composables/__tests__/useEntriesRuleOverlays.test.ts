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
      tooltipText: '',
      formattingTooltipText: '',
      validationTooltipText: ''
    })
  })
})
