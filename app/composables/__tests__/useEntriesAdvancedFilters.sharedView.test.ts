import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import type { Entry } from '../../types'
import type { EditableColumnDef } from '../useEntriesTableColumns'
import { decodeEntriesSharedView, encodeEntriesSharedView, ENTRIES_SHARED_VIEW_VERSION } from '../../utils/entriesSharedView'
import { ADVANCED_FILTER_FIELDS } from '../../utils/entriesTableConstants'
import { useEntriesAdvancedFilters, type ExportedAdvancedFilterState } from '../useEntriesAdvancedFilters'

function createEntry(id: string, definition = '需要檢查的釋義'): Entry {
  return {
    id,
    dialect: { name: '香港' },
    headword: { display: '測試詞', normalized: '測試詞', isPlaceholder: false },
    phonetic: { jyutping: ['cak1 si3 ci4'] },
    entryType: 'word',
    senses: [{ definition }],
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

function createComposable(entries = [createEntry('entry-1')]) {
  const editableColumns = computed(() => ADVANCED_FILTER_FIELDS.map(key => ({ key, label: key })) as EditableColumnDef[])
  return useEntriesAdvancedFilters({
    entries: ref(entries),
    aggregatedGroups: computed(() => []),
    lexemeGroups: computed(() => []),
    viewMode: ref('flat'),
    editableColumns,
    getCellDisplay: (entry, col) => {
      if (col.key === 'headword') return entry.headword.display
      if (col.key === 'dialect') return entry.dialect.name
      if (col.key === 'phonetic') return entry.phonetic?.jyutping?.join(' ') ?? ''
      if (col.key === 'entryType') return entry.entryType
      if (col.key === 'theme') return ''
      if (col.key === 'definition') return entry.senses?.[0]?.definition ?? ''
      if (col.key === 'register') return entry.meta?.register ?? ''
      if (col.key === 'status') return entry.status
      return ''
    }
  })
}

function createRestoredState(): ExportedAdvancedFilterState {
  return {
    formula: {
      input: '=CONTAINS(definition, "檢查")',
      applied: '=CONTAINS(definition, "檢查")'
    },
    globalRegex: {
      enabled: true,
      input: '測試',
      applied: '測試',
      flags: 'i'
    },
    columnRegex: {
      field: 'headword',
      pattern: '測試',
      flags: 'i'
    }
  }
}

describe('useEntriesAdvancedFilters shared view APIs', () => {
  it('restores input and applied formula and regex state atomically', () => {
    const advancedFilters = createComposable()
    advancedFilters.advancedFilterErrors.formula = { code: 'empty_formula', message: '請輸入公式。' }

    advancedFilters.restoreAdvancedFilterState(createRestoredState())

    expect(advancedFilters.formulaInput.value).toBe('=CONTAINS(definition, "檢查")')
    expect(advancedFilters.appliedFormula.value).toBe('=CONTAINS(definition, "檢查")')
    expect(advancedFilters.globalRegexEnabled.value).toBe(true)
    expect(advancedFilters.globalRegexInput.value).toBe('測試')
    expect(advancedFilters.appliedGlobalRegex.value).toBe('測試')
    expect(advancedFilters.globalRegexFlags.value).toBe('i')
    expect(advancedFilters.columnRegex).toMatchObject({ field: 'headword', pattern: '測試', flags: 'i' })
    expect(advancedFilters.appliedColumnRegex).toMatchObject({ field: 'headword', pattern: '測試', flags: 'i' })
    expect(advancedFilters.advancedFilterErrors.formula).toBeNull()
    expect(advancedFilters.hasActiveAdvancedFilters.value).toBe(true)
    expect(advancedFilters.filteredEntries.value).toHaveLength(1)
  })

  it('exports state that round-trips through the shared-view utility without mutating entries', () => {
    const entry = createEntry('entry-2')
    const advancedFilters = createComposable([entry])
    advancedFilters.restoreAdvancedFilterState(createRestoredState())

    const exported = advancedFilters.exportAdvancedFilterState()
    const encoded = encodeEntriesSharedView({
      version: ENTRIES_SHARED_VIEW_VERSION,
      filters: exported,
      rules: []
    })
    const decoded = decodeEntriesSharedView(encoded)

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.data.filters).toEqual(exported)
    expect(entry._isDirty).toBeUndefined()
    expect(entry).not.toHaveProperty('__sharedView')
    expect(entry).not.toHaveProperty('__ruleOverlayMeta')
  })

  it('exports applied column regex state instead of an unsaved draft', () => {
    const advancedFilters = createComposable()
    advancedFilters.restoreAdvancedFilterState(createRestoredState())
    advancedFilters.columnRegex.field = 'definition'
    advancedFilters.columnRegex.pattern = '未套用草稿'
    advancedFilters.columnRegex.flags = 'u'

    const exported = advancedFilters.exportAdvancedFilterState()

    expect(exported.columnRegex).toEqual({ field: 'headword', pattern: '測試', flags: 'i' })
    expect(advancedFilters.filteredEntries.value).toHaveLength(1)
  })

  it('returns defensive copies from export so callers cannot mutate composable state', () => {
    const advancedFilters = createComposable()
    advancedFilters.restoreAdvancedFilterState(createRestoredState())

    const exported = advancedFilters.exportAdvancedFilterState()
    exported.columnRegex.field = 'definition'
    exported.columnRegex.pattern = '已改變'

    expect(advancedFilters.appliedColumnRegex.field).toBe('headword')
    expect(advancedFilters.appliedColumnRegex.pattern).toBe('測試')
    const forbiddenMethodPattern = new RegExp(['sa', 've|dele', 'te|bu', 'lk|fe', 'tch'].join(''), 'i')
    expect(Object.keys(advancedFilters).some(key => forbiddenMethodPattern.test(key))).toBe(false)
  })
})
