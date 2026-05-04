import { describe, expect, it } from 'vitest'
import { computed } from 'vue'
import type { Entry } from '../../types'
import type { RowFilterContext } from '../../utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELDS } from '../../utils/entriesTableConstants'
import { useEntriesRuleOverlays, type SharedEntriesRuleOverlay } from '../useEntriesRuleOverlays'

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
    headword: { display: '測試詞', normalized: '測試詞', isPlaceholder: false },
    phonetic: { jyutping: ['cak1 si3 ci4'] },
    entryType: 'word',
    senses: [{ definition: '缺少例句，需要檢查' }],
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

function createSharedRules(): SharedEntriesRuleOverlay[] {
  return [
    {
      name: '缺少例句',
      kind: 'formatting',
      enabled: true,
      targetFields: ['definition'],
      condition: {
        kind: 'formula',
        formula: '=CONTAINS(definition, "缺少")',
        regex: { pattern: '', flags: 'i', field: 'any' }
      },
      stylePreset: 'amber',
      colorHex: '#f59e0b'
    },
    {
      name: '詞頭警告',
      kind: 'validation',
      enabled: true,
      targetFields: ['headword'],
      condition: {
        kind: 'regex',
        formula: '',
        regex: { pattern: '測試', flags: 'i', field: 'headword' }
      },
      stylePreset: 'purple',
      colorHex: '#a855f7'
    }
  ]
}

describe('useEntriesRuleOverlays shared view APIs', () => {
  it('exports rule payloads without local IDs', () => {
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => []),
      buildRowContext: () => createContext()
    })
    overlay.replaceRuleOverlayState(createSharedRules())

    const exported = overlay.exportRuleOverlayState()
    expect(exported.map(rule => rule.name)).toEqual(['缺少例句', '詞頭警告'])
    expect(exported.every(rule => !('id' in rule))).toBe(true)
    expect(JSON.stringify(exported)).not.toMatch(/randomUUID|rule-/)
  })

  it('preserves order and regenerates IDs that work with local lifecycle methods', () => {
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => []),
      buildRowContext: () => createContext()
    })
    const incomingRules = createSharedRules()
    ;(incomingRules[0] as any).id = 'external-id-1'

    overlay.replaceRuleOverlayState(incomingRules)

    expect(overlay.rules.value.map(rule => rule.name)).toEqual(['缺少例句', '詞頭警告'])
    expect(overlay.rules.value.map(rule => rule.id)).not.toContain('external-id-1')
    expect(new Set(overlay.rules.value.map(rule => rule.id)).size).toBe(2)

    const firstId = overlay.rules.value[0].id
    const secondId = overlay.rules.value[1].id
    overlay.toggleRule(firstId, false)
    expect(overlay.rules.value[0].enabled).toBe(false)
    overlay.moveRule(secondId, -1)
    expect(overlay.rules.value[0].id).toBe(secondId)
    overlay.removeRule(firstId)
    expect(overlay.rules.value.map(rule => rule.name)).toEqual(['詞頭警告'])
    overlay.clearRules()
    expect(overlay.rules.value).toHaveLength(0)
  })

  it('defensively clones target fields and nested regex state', () => {
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => []),
      buildRowContext: () => createContext()
    })
    const incomingRules = createSharedRules()
    overlay.replaceRuleOverlayState(incomingRules)

    incomingRules[0].targetFields.push('headword')
    incomingRules[1].condition.regex.pattern = '已改變'

    expect(overlay.rules.value[0].targetFields).toEqual(['definition'])
    expect(overlay.rules.value[1].condition.regex.pattern).toBe('測試')
  })

  it('keeps conditional formatting and validation metadata read-only', () => {
    const entry = createEntry('entry-1')
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => [entry]),
      buildRowContext: () => createContext({ headword: '測試詞', definition: '缺少例句，需要檢查' })
    })
    overlay.replaceRuleOverlayState(createSharedRules())

    const definitionMeta = overlay.getCellOverlayMeta(entry, 'definition')
    const headwordMeta = overlay.getCellOverlayMeta(entry, 'headword')

    expect(definitionMeta.formattingMatches.map(match => match.ruleName)).toEqual(['缺少例句'])
    expect(headwordMeta.validationMatches.map(match => match.ruleName)).toEqual(['詞頭警告'])
    expect(entry._isDirty).toBeUndefined()
    expect(entry).not.toHaveProperty('__ruleOverlayMeta')
    expect(Object.keys(overlay).some(key => /save|delete|bulk|fetch/i.test(key))).toBe(false)
  })
})
