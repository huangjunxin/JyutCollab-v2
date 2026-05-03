import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { buildSearchableRowText, compileAdvancedRegex, evaluateAdvancedFormula, testAdvancedRegex, type AdvancedFilterError, type AdvancedFilterFieldKey, type RowFilterContext } from '~/utils/entriesAdvancedFilter'

type EntryGroup = { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }
type ViewModeRef = Ref<string> | ComputedRef<string>

interface AdvancedFilterColumnRegexState {
  field: AdvancedFilterFieldKey | ''
  pattern: string
  flags: string
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
    return groups.reduce((sum, group) => sum + group.entries.length, 0)
  })

  function matchEntry(entry: Entry): boolean {
    const context = buildRowContext(entry)

    if (hasAppliedFormula.value) {
      const result = evaluateAdvancedFormula(appliedFormula.value, context)
      if (!result.ok) {
        advancedFilterErrors.formula = result.error
      } else if (!result.value) {
        return false
      }
    }

    if (hasAppliedGlobalRegex.value) {
      const compiled = compileAdvancedRegex(appliedGlobalRegex.value, globalRegexFlags.value)
      if (!compiled.ok) {
        advancedFilterErrors.globalRegex = compiled.error
      } else if (!testAdvancedRegex(compiled.regex, buildSearchableRowText(context))) {
        return false
      }
    }

    if (hasAppliedColumnRegex.value && appliedColumnRegex.field) {
      const compiled = compileAdvancedRegex(appliedColumnRegex.pattern, appliedColumnRegex.flags)
      if (!compiled.ok) {
        advancedFilterErrors.columnRegex = compiled.error
      } else if (!testAdvancedRegex(compiled.regex, context[appliedColumnRegex.field])) {
        return false
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
    return groups.reduce((sum, group) => sum + group.entries.length, 0)
  })
  const advancedEmptyStateActive = computed(() => hasActiveAdvancedFilters.value && loadedEntryCount.value > 0 && visibleEntryCount.value === 0)

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
    buildRowContext
  }
}
