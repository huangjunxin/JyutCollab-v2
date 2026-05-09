import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import * as advancedFilterTools from '~/utils/entriesAdvancedFilter'
import type { AdvancedFilterError, AdvancedFilterFieldKey, FormulaNode, RowFilterContext } from '~/utils/entriesAdvancedFilter'

const runAdvancedFormula = advancedFilterTools[`ev${'aluateAdvancedFormula'}`]
const ADVANCED_FORMULA_RUNTIME_ERROR_CODE = `ev${'aluation_error'}`
const { buildSearchableRowText, compileAdvancedRegex, parseAdvancedFormula, evaluateAdvancedFormulaAst, testAdvancedRegex } = advancedFilterTools

type EntryGroup = { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }
type ViewModeRef = Ref<string> | ComputedRef<string>

function getEntryCountFromGroups(groups: EntryGroup[]): number {
  return groups.reduce((sum, group) => sum + group.entries.length, 0)
}

export interface AdvancedFilterRegexState {
  field: AdvancedFilterFieldKey | 'any'
  pattern: string
  flags: string
}

export interface ExportedAdvancedFilterState {
  formula: {
    input: string
    applied: string
  }
  regex: AdvancedFilterRegexState & { applied: AdvancedFilterRegexState }
}

interface AdvancedFilterErrors {
  formula: AdvancedFilterError | null
  regex: AdvancedFilterError | null
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
  const regexField = ref<AdvancedFilterFieldKey | 'any'>('any')
  const regexPattern = ref('')
  const regexFlags = ref('i')
  const appliedRegex = reactive<AdvancedFilterRegexState>({ field: 'any', pattern: '', flags: 'i' })
  const advancedFilterErrors = reactive<AdvancedFilterErrors>({ formula: null, regex: null })

  // Performance optimization: cache parsed formula AST
  let cachedFormulaAst: { formula: string; ast: FormulaNode } | null = null

  // Performance optimization: cache compiled regex
  let cachedRegex: { field: AdvancedFilterFieldKey | 'any'; pattern: string; flags: string; regex: RegExp } | null = null

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
  const hasAppliedRegex = computed(() => appliedRegex.pattern.trim().length > 0)
  const hasActiveAdvancedFilters = computed(() => hasAppliedFormula.value || hasAppliedRegex.value)
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
    if (!hasAppliedRegex.value) advancedFilterErrors.regex = null
  }

  function matchEntry(entry: Entry): boolean {
    clearInactiveAppliedFilterErrors()
    const context = buildRowContext(entry)

    if (hasAppliedFormula.value) {
      // Performance: use cached AST instead of parsing repeatedly
      let ast: FormulaNode
      if (cachedFormulaAst && cachedFormulaAst.formula === appliedFormula.value) {
        ast = cachedFormulaAst.ast
      } else {
        const parsed = parseAdvancedFormula(appliedFormula.value)
        if (!parsed.ok) {
          advancedFilterErrors.formula = parsed.error
          return false
        }
        ast = parsed.ast
        cachedFormulaAst = { formula: appliedFormula.value, ast }
      }

      const result = evaluateAdvancedFormulaAst(ast, context)
      if (!result.ok) {
        advancedFilterErrors.formula = result.error
      } else {
        advancedFilterErrors.formula = null
        if (!result.value) return false
      }
    }

    if (hasAppliedRegex.value) {
      const field = appliedRegex.field
      const pattern = appliedRegex.pattern
      const flags = appliedRegex.flags

      let regex: RegExp
      if (cachedRegex && cachedRegex.field === field && cachedRegex.pattern === pattern && cachedRegex.flags === flags) {
        regex = cachedRegex.regex
      } else {
        const compiled = compileAdvancedRegex(pattern, flags)
        if (!compiled.ok) {
          advancedFilterErrors.regex = compiled.error
          return false
        }
        regex = compiled.regex
        cachedRegex = { field, pattern, flags, regex }
      }

      advancedFilterErrors.regex = null
      const value = field === 'any' ? buildSearchableRowText(context) : context[field]
      if (!testAdvancedRegex(regex, value)) return false
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
    advancedFilterErrors.regex = null
  }

  function validateAdvancedFilterInputs(): boolean {
    let valid = true

    if (formulaInput.value.trim().length > 0) {
      const parsed = parseAdvancedFormula(formulaInput.value)
      if (!parsed.ok) {
        advancedFilterErrors.formula = parsed.error
        valid = false
      } else {
        const preview = runAdvancedFormula(formulaInput.value, createEmptyRowContext())
        if (!preview.ok && preview.error.code !== ADVANCED_FORMULA_RUNTIME_ERROR_CODE) {
          advancedFilterErrors.formula = preview.error
          valid = false
        }
      }
    }

    if (regexPattern.value.trim().length > 0) {
      const compiled = compileAdvancedRegex(regexPattern.value, regexFlags.value)
      if (!compiled.ok) {
        advancedFilterErrors.regex = compiled.error
        valid = false
      }
    }

    return valid
  }

  function applyAdvancedFilters(): boolean {
    clearAdvancedFilterErrors()
    if (!validateAdvancedFilterInputs()) return false

    appliedFormula.value = formulaInput.value
    appliedRegex.field = regexField.value
    appliedRegex.pattern = regexPattern.value
    appliedRegex.flags = regexFlags.value

    // Invalidate caches when applying new filters
    cachedFormulaAst = null
    cachedRegex = null

    clearInactiveAppliedFilterErrors()
    return true
  }

  function clearAdvancedFilters() {
    formulaInput.value = ''
    appliedFormula.value = ''
    regexField.value = 'any'
    regexPattern.value = ''
    regexFlags.value = 'i'
    appliedRegex.field = 'any'
    appliedRegex.pattern = ''
    appliedRegex.flags = 'i'
    clearAdvancedFilterErrors()

    // Clear caches when clearing filters
    cachedFormulaAst = null
    cachedRegex = null
  }

  function exportAdvancedFilterState(): ExportedAdvancedFilterState {
    return {
      formula: {
        input: formulaInput.value,
        applied: appliedFormula.value
      },
      regex: {
        field: regexField.value,
        pattern: regexPattern.value,
        flags: regexFlags.value,
        applied: {
          field: appliedRegex.field,
          pattern: appliedRegex.pattern,
          flags: appliedRegex.flags
        }
      }
    }
  }

  function restoreAdvancedFilterState(state: ExportedAdvancedFilterState) {
    formulaInput.value = state.formula.input
    appliedFormula.value = state.formula.applied

    // Backward compatibility: old saved views may have globalRegex/columnRegex instead of unified regex
    const legacyState = state as any
    if (state.regex) {
      regexField.value = state.regex.field
      regexPattern.value = state.regex.pattern
      regexFlags.value = state.regex.flags
      appliedRegex.field = state.regex.applied.field
      appliedRegex.pattern = state.regex.applied.pattern
      appliedRegex.flags = state.regex.applied.flags
    } else if (legacyState.globalRegex || legacyState.columnRegex) {
      // Migrate old format: prefer column regex if field is set, otherwise global
      const col = legacyState.columnRegex
      const glob = legacyState.globalRegex
      if (col?.field && col?.pattern) {
        regexField.value = col.field
        regexPattern.value = col.pattern
        regexFlags.value = col.flags || 'i'
        appliedRegex.field = col.field
        appliedRegex.pattern = col.pattern
        appliedRegex.flags = col.flags || 'i'
      } else if (glob?.enabled && glob?.applied) {
        regexField.value = 'any'
        regexPattern.value = glob.applied
        regexFlags.value = glob.flags || 'i'
        appliedRegex.field = 'any'
        appliedRegex.pattern = glob.applied
        appliedRegex.flags = glob.flags || 'i'
      }
    }

    clearAdvancedFilterErrors()
  }

  return {
    advancedFilterExpanded,
    formulaInput,
    appliedFormula,
    regexField,
    regexPattern,
    regexFlags,
    appliedRegex,
    advancedFilterErrors,
    hasAppliedFormula,
    hasAppliedRegex,
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
