import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { buildSearchableRowText, compileAdvancedRegex, evaluateAdvancedFormula, parseAdvancedFormula, testAdvancedRegex, type AdvancedFilterError, type AdvancedFilterFieldKey, type RowFilterContext } from '~/utils/entriesAdvancedFilter'

type EntryGroup = { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }
type ViewModeRef = Ref<string> | ComputedRef<string>

function getEntryCountFromGroups(groups: EntryGroup[]): number {
  return groups.reduce((sum, group) => sum + group.entries.length, 0)
}

export interface AdvancedFilterColumnRegexState {
  field: AdvancedFilterFieldKey | ''
  pattern: string
  flags: string
}

export interface ExportedAdvancedFilterState {
  formula: {
    input: string
    applied: string
  }
  globalRegex: {
    enabled: boolean
    input: string
    applied: string
    flags: string
  }
  columnRegex: AdvancedFilterColumnRegexState
}

interface AdvancedFilterErrors {
  formula: AdvancedFilterError | null
  globalRegex: AdvancedFilterError | null
  columnRegex: AdvancedFilterError | null
}

export function useEntriesAdvancedFilters(args: {
  entries: Ref<Entry[]> | ComputedRef<Entry[]>
  aggregatedGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>
  lexemeGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>
  viewMode: ViewModeRef
  editableColumns: ComputedRef<EditableColumnDef[]>
  getCellDisplay: (entry: Entry, col: EditableColumnDef) => string
}) {
  const advancedFilterExpanded = ref(false)
  const formulaInput = ref('')
  const appliedFormula = ref('')
  const globalRegexEnabled = ref(false)
  const globalRegexInput = ref('')
  const appliedGlobalRegex = ref('')
  const globalRegexFlags = ref('i')
  const columnRegex = reactive<AdvancedFilterColumnRegexState>({ field: '', pattern: '', flags: 'i' })
  const appliedColumnRegex = reactive<AdvancedFilterColumnRegexState>({ field: '', pattern: '', flags: 'i' })
  const advancedFilterErrors = reactive<AdvancedFilterErrors>({ formula: null, globalRegex: null, columnRegex: null })

  function isAdvancedFilterField(key: string): key is AdvancedFilterFieldKey {
    return ADVANCED_FILTER_FIELDS.includes(key as AdvancedFilterFieldKey)
  }

  function createEmptyRowContext(): RowFilterContext {
    return ADVANCED_FILTER_FIELDS.reduce((context, key) => {
      context[key] = ''
      return context
    }, {} as RowFilterContext)
  }

  function buildRowContext(entry: Entry): RowFilterContext {
    const context = createEmptyRowContext()
    for (const col of args.editableColumns.value) {
      if (!isAdvancedFilterField(col.key)) continue
      context[col.key] = args.getCellDisplay(entry, col).trim()
    }
    return context
  }

  const hasAppliedFormula = computed(() => appliedFormula.value.trim().length > 0)
  const hasAppliedGlobalRegex = computed(() => globalRegexEnabled.value && appliedGlobalRegex.value.trim().length > 0)
  const hasAppliedColumnRegex = computed(() => !!appliedColumnRegex.field && appliedColumnRegex.pattern.trim().length > 0)
  const hasActiveAdvancedFilters = computed(() => hasAppliedFormula.value || hasAppliedGlobalRegex.value || hasAppliedColumnRegex.value)
  const loadedEntryCount = computed(() => {
    if (args.viewMode.value === 'flat') return args.entries.value.length
    const groups = args.viewMode.value === 'lexeme' ? args.lexemeGroups.value : args.aggregatedGroups.value
    const groupedEntryKeys = new Set(groups.flatMap(group => group.entries.map(entry => String(entry.id ?? (entry as any)._tempId ?? ''))))
    const ungroupedNewEntryCount = args.entries.value.filter(entry => {
      if (!(entry as any)._isNew) return false
      const key = String(entry.id ?? (entry as any)._tempId ?? '')
      return !groupedEntryKeys.has(key)
    }).length
    return ungroupedNewEntryCount + getEntryCountFromGroups(groups)
  })

  function clearInactiveAppliedFilterErrors() {
    if (!hasAppliedFormula.value) advancedFilterErrors.formula = null
    if (!hasAppliedGlobalRegex.value) advancedFilterErrors.globalRegex = null
    if (!hasAppliedColumnRegex.value) advancedFilterErrors.columnRegex = null
  }

  function matchEntry(entry: Entry): boolean {
    clearInactiveAppliedFilterErrors()
    const context = buildRowContext(entry)

    if (hasAppliedFormula.value) {
      const result = evaluateAdvancedFormula(appliedFormula.value, context)
      if (!result.ok) {
        advancedFilterErrors.formula = result.error
      } else {
        advancedFilterErrors.formula = null
        if (!result.value) return false
      }
    }

    if (hasAppliedGlobalRegex.value) {
      const compiled = compileAdvancedRegex(appliedGlobalRegex.value, globalRegexFlags.value)
      if (!compiled.ok) {
        advancedFilterErrors.globalRegex = compiled.error
      } else {
        advancedFilterErrors.globalRegex = null
        if (!testAdvancedRegex(compiled.regex, buildSearchableRowText(context))) return false
      }
    }

    if (hasAppliedColumnRegex.value && appliedColumnRegex.field) {
      const compiled = compileAdvancedRegex(appliedColumnRegex.pattern, appliedColumnRegex.flags)
      if (!compiled.ok) {
        advancedFilterErrors.columnRegex = compiled.error
      } else {
        advancedFilterErrors.columnRegex = null
        if (!testAdvancedRegex(compiled.regex, context[appliedColumnRegex.field])) return false
      }
    }

    return true
  }

  function filterGroups(groups: EntryGroup[], matcher: (entry: Entry) => boolean): EntryGroup[] {
    return groups
      .map(group => ({
        ...group,
        entries: group.entries.filter(matcher)
      }))
      .filter(group => group.entries.length > 0)
  }

  const filteredEntries = computed(() => hasActiveAdvancedFilters.value ? args.entries.value.filter(matchEntry) : args.entries.value)
  const filteredAggregatedGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.aggregatedGroups.value, matchEntry) : args.aggregatedGroups.value)
  const filteredLexemeGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.lexemeGroups.value, matchEntry) : args.lexemeGroups.value)
  const visibleEntryCount = computed(() => {
    if (args.viewMode.value === 'flat') return filteredEntries.value.length
    const groups = args.viewMode.value === 'lexeme' ? filteredLexemeGroups.value : filteredAggregatedGroups.value
    const groupedEntryKeys = new Set(groups.flatMap(group => group.entries.map(entry => String(entry.id ?? (entry as any)._tempId ?? ''))))
    const ungroupedNewEntryCount = filteredEntries.value.filter(entry => {
      if (!(entry as any)._isNew) return false
      const key = String(entry.id ?? (entry as any)._tempId ?? '')
      return !groupedEntryKeys.has(key)
    }).length
    return ungroupedNewEntryCount + getEntryCountFromGroups(groups)
  })
  const advancedEmptyStateActive = computed(() => hasActiveAdvancedFilters.value && loadedEntryCount.value > 0 && visibleEntryCount.value === 0)

  function clearAdvancedFilterErrors() {
    advancedFilterErrors.formula = null
    advancedFilterErrors.globalRegex = null
    advancedFilterErrors.columnRegex = null
  }

  function validateAdvancedFilterInputs(): boolean {
    let valid = true

    if (formulaInput.value.trim().length > 0) {
      const parsed = parseAdvancedFormula(formulaInput.value)
      if (!parsed.ok) {
        advancedFilterErrors.formula = parsed.error
        valid = false
      } else {
        const preview = evaluateAdvancedFormula(formulaInput.value, createEmptyRowContext())
        if (!preview.ok && preview.error.code !== 'evaluation_error') {
          advancedFilterErrors.formula = preview.error
          valid = false
        }
      }
    }

    if (globalRegexEnabled.value && globalRegexInput.value.trim().length > 0) {
      const compiled = compileAdvancedRegex(globalRegexInput.value, globalRegexFlags.value)
      if (!compiled.ok) {
        advancedFilterErrors.globalRegex = compiled.error
        valid = false
      }
    }

    if (columnRegex.pattern.trim().length > 0) {
      if (!columnRegex.field) {
        advancedFilterErrors.columnRegex = {
          code: 'empty_pattern',
          message: '請先選擇欄位，再套用欄位正則篩選。'
        }
        valid = false
      } else {
        const compiled = compileAdvancedRegex(columnRegex.pattern, columnRegex.flags)
        if (!compiled.ok) {
          advancedFilterErrors.columnRegex = compiled.error
          valid = false
        }
      }
    }

    return valid
  }

  function applyAdvancedFilters(): boolean {
    clearAdvancedFilterErrors()
    if (!validateAdvancedFilterInputs()) return false

    appliedFormula.value = formulaInput.value
    appliedGlobalRegex.value = globalRegexInput.value
    appliedColumnRegex.field = columnRegex.field
    appliedColumnRegex.pattern = columnRegex.pattern
    appliedColumnRegex.flags = columnRegex.flags
    clearInactiveAppliedFilterErrors()
    return true
  }

  function clearAdvancedFilters() {
    formulaInput.value = ''
    appliedFormula.value = ''
    globalRegexEnabled.value = false
    globalRegexInput.value = ''
    appliedGlobalRegex.value = ''
    globalRegexFlags.value = 'i'
    columnRegex.field = ''
    columnRegex.pattern = ''
    columnRegex.flags = 'i'
    appliedColumnRegex.field = ''
    appliedColumnRegex.pattern = ''
    appliedColumnRegex.flags = 'i'
    clearAdvancedFilterErrors()
  }

  function exportAdvancedFilterState(): ExportedAdvancedFilterState {
    return {
      formula: {
        input: formulaInput.value,
        applied: appliedFormula.value
      },
      globalRegex: {
        enabled: globalRegexEnabled.value,
        input: globalRegexInput.value,
        applied: appliedGlobalRegex.value,
        flags: globalRegexFlags.value
      },
      columnRegex: {
        field: columnRegex.field,
        pattern: columnRegex.pattern,
        flags: columnRegex.flags
      }
    }
  }

  function restoreAdvancedFilterState(state: ExportedAdvancedFilterState) {
    formulaInput.value = state.formula.input
    appliedFormula.value = state.formula.applied
    globalRegexEnabled.value = state.globalRegex.enabled
    globalRegexInput.value = state.globalRegex.input
    appliedGlobalRegex.value = state.globalRegex.applied
    globalRegexFlags.value = state.globalRegex.flags
    columnRegex.field = state.columnRegex.field
    columnRegex.pattern = state.columnRegex.pattern
    columnRegex.flags = state.columnRegex.flags
    appliedColumnRegex.field = state.columnRegex.field
    appliedColumnRegex.pattern = state.columnRegex.pattern
    appliedColumnRegex.flags = state.columnRegex.flags
    clearAdvancedFilterErrors()
  }

  return {
    advancedFilterExpanded,
    formulaInput,
    appliedFormula,
    globalRegexEnabled,
    globalRegexInput,
    appliedGlobalRegex,
    globalRegexFlags,
    columnRegex,
    appliedColumnRegex,
    advancedFilterErrors,
    hasAppliedFormula,
    hasAppliedGlobalRegex,
    hasAppliedColumnRegex,
    hasActiveAdvancedFilters,
    loadedEntryCount,
    filteredEntries,
    filteredAggregatedGroups,
    filteredLexemeGroups,
    visibleEntryCount,
    advancedEmptyStateActive,
    buildRowContext,
    applyAdvancedFilters,
    clearAdvancedFilters,
    clearAdvancedFilterErrors,
    exportAdvancedFilterState,
    restoreAdvancedFilterState
  }
}
