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

type LegacyAdvancedFilterState = {
  regex?: AdvancedFilterRegexConditionPayload & { applied: AdvancedFilterRegexConditionPayload }
  globalRegex?: {
    enabled?: boolean
    input?: string
    applied?: string
    flags?: string
  }
  columnRegex?: {
    field?: string
    pattern?: string
    flags?: string
  }
}

function getEntryCountFromGroups(groups: EntryGroup[]): number {
  return groups.reduce((sum, group) => sum + group.entries.length, 0)
}

export interface AdvancedFilterRegexConditionPayload {
  field: AdvancedFilterFieldKey | 'any'
  pattern: string
  flags: string
}

export interface AdvancedFilterRegexRowState extends AdvancedFilterRegexConditionPayload {
  id: string
}

export interface ExportedAdvancedFilterState {
  formula: {
    input: string
    applied: string
  }
  regexRows: AdvancedFilterRegexConditionPayload[]
  appliedRegexRows: AdvancedFilterRegexConditionPayload[]
}

interface AdvancedFilterErrors {
  formula: AdvancedFilterError | null
  regex: AdvancedFilterError | null
  regexRows: Record<string, AdvancedFilterError | null>
}

let regexRowId = 0

function createRegexRowId(): string {
  regexRowId += 1
  return `regex-row-${regexRowId}`
}

function createRegexRow(overrides: Partial<AdvancedFilterRegexConditionPayload> = {}): AdvancedFilterRegexRowState {
  return {
    id: createRegexRowId(),
    field: overrides.field ?? 'any',
    pattern: overrides.pattern ?? '',
    flags: overrides.flags ?? 'i'
  }
}

function cloneRegexPayload(row: AdvancedFilterRegexConditionPayload): AdvancedFilterRegexConditionPayload {
  return {
    field: row.field,
    pattern: row.pattern,
    flags: row.flags
  }
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
  const regexRows = ref<AdvancedFilterRegexRowState[]>([createRegexRow()])
  const appliedRegexRows = ref<AdvancedFilterRegexConditionPayload[]>([])
  const advancedFilterErrors = reactive<AdvancedFilterErrors>({ formula: null, regex: null, regexRows: {} })

  // Performance optimization: cache parsed formula AST
  let cachedFormulaAst: { formula: string; ast: FormulaNode } | null = null

  // Performance optimization: cache compiled regexes
  const cachedRegexes = new Map<string, RegExp>()

  function isAdvancedFilterField(key: string): key is AdvancedFilterFieldKey {
    return ADVANCED_FILTER_FIELDS.includes(key as AdvancedFilterFieldKey)
  }

  function normalizeRegexField(field: unknown): AdvancedFilterFieldKey | 'any' {
    return typeof field === 'string' && (field === 'any' || isAdvancedFilterField(field)) ? field : 'any'
  }

  function normalizeRegexPayload(value: unknown): AdvancedFilterRegexConditionPayload | null {
    if (!value || typeof value !== 'object') return null
    const row = value as Partial<AdvancedFilterRegexConditionPayload>
    return {
      field: normalizeRegexField(row.field),
      pattern: String(row.pattern ?? ''),
      flags: String(row.flags || 'i')
    }
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
  const hasAppliedRegex = computed(() => appliedRegexRows.value.some(row => row.pattern.trim().length > 0))
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

  function clearRegexRowErrors() {
    advancedFilterErrors.regex = null
    for (const key of Object.keys(advancedFilterErrors.regexRows)) delete advancedFilterErrors.regexRows[key]
  }

  function clearInactiveAppliedFilterErrors() {
    if (!hasAppliedFormula.value) advancedFilterErrors.formula = null
    if (!hasAppliedRegex.value) clearRegexRowErrors()
  }

  function getCachedRegex(row: AdvancedFilterRegexConditionPayload): RegExp | AdvancedFilterError {
    const key = JSON.stringify([row.field, row.pattern, row.flags])
    const cached = cachedRegexes.get(key)
    if (cached) return cached

    const compiled = compileAdvancedRegex(row.pattern, row.flags)
    if (!compiled.ok) return compiled.error
    cachedRegexes.set(key, compiled.regex)
    return compiled.regex
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

    for (const row of appliedRegexRows.value) {
      if (!row.pattern.trim()) continue
      const regex = getCachedRegex(row)
      if (regex instanceof RegExp) {
        advancedFilterErrors.regex = null
        const value = row.field === 'any' ? buildSearchableRowText(context) : context[row.field]
        if (!testAdvancedRegex(regex, value)) return false
        continue
      }

      advancedFilterErrors.regex = regex
      return false
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
    clearRegexRowErrors()
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

    for (const row of regexRows.value) {
      if (!row.pattern.trim()) continue
      const compiled = compileAdvancedRegex(row.pattern, row.flags)
      if (!compiled.ok) {
        advancedFilterErrors.regexRows[row.id] = compiled.error
        advancedFilterErrors.regex ??= compiled.error
        valid = false
      }
    }

    return valid
  }

  function applyAdvancedFilters(): boolean {
    clearAdvancedFilterErrors()
    if (!validateAdvancedFilterInputs()) return false

    appliedFormula.value = formulaInput.value
    appliedRegexRows.value = regexRows.value
      .filter(row => row.pattern.trim().length > 0)
      .map(cloneRegexPayload)

    // Invalidate caches when applying new filters
    cachedFormulaAst = null
    cachedRegexes.clear()

    clearInactiveAppliedFilterErrors()
    return true
  }

  function clearAdvancedFilters() {
    formulaInput.value = ''
    appliedFormula.value = ''
    regexRows.value = [createRegexRow()]
    appliedRegexRows.value = []
    clearAdvancedFilterErrors()

    // Clear caches when clearing filters
    cachedFormulaAst = null
    cachedRegexes.clear()
  }

  function addRegexRow() {
    regexRows.value = [...regexRows.value, createRegexRow()]
  }

  function removeRegexRow(id: string) {
    regexRows.value = regexRows.value.filter(row => row.id !== id)
    if (regexRows.value.length === 0) regexRows.value = [createRegexRow()]
    delete advancedFilterErrors.regexRows[id]
  }

  function updateRegexRow(id: string, patch: Partial<AdvancedFilterRegexConditionPayload>) {
    regexRows.value = regexRows.value.map(row => row.id === id
      ? {
          ...row,
          ...(patch.field !== undefined ? { field: normalizeRegexField(patch.field) } : {}),
          ...(patch.pattern !== undefined ? { pattern: String(patch.pattern) } : {}),
          ...(patch.flags !== undefined ? { flags: String(patch.flags) } : {})
        }
      : row)
    delete advancedFilterErrors.regexRows[id]
    if (Object.keys(advancedFilterErrors.regexRows).length === 0) advancedFilterErrors.regex = null
  }

  function exportAdvancedFilterState(): ExportedAdvancedFilterState {
    return {
      formula: {
        input: formulaInput.value,
        applied: appliedFormula.value
      },
      regexRows: regexRows.value.map(cloneRegexPayload),
      appliedRegexRows: appliedRegexRows.value.map(cloneRegexPayload)
    }
  }

  function restoreAdvancedFilterState(state: ExportedAdvancedFilterState) {
    formulaInput.value = state.formula.input
    appliedFormula.value = state.formula.applied

    const legacyState = state as ExportedAdvancedFilterState & LegacyAdvancedFilterState
    if (Array.isArray(state.regexRows) || Array.isArray(state.appliedRegexRows)) {
      const restoredRows = Array.isArray(state.regexRows)
        ? state.regexRows.map(row => createRegexRow(normalizeRegexPayload(row) ?? undefined))
        : []
      const restoredAppliedRows = Array.isArray(state.appliedRegexRows)
        ? state.appliedRegexRows.map(normalizeRegexPayload).filter((row): row is AdvancedFilterRegexConditionPayload => !!row)
        : []
      regexRows.value = restoredRows.length > 0
        ? restoredRows
        : (restoredAppliedRows.length > 0 ? restoredAppliedRows.map(row => createRegexRow(row)) : [createRegexRow()])
      appliedRegexRows.value = restoredAppliedRows
    } else if (legacyState.regex) {
      const draft = normalizeRegexPayload(legacyState.regex) ?? createRegexRow()
      const applied = normalizeRegexPayload(legacyState.regex.applied)
      regexRows.value = [createRegexRow(draft)]
      appliedRegexRows.value = applied && applied.pattern.trim() ? [applied] : []
    } else if (legacyState.globalRegex || legacyState.columnRegex) {
      const col = legacyState.columnRegex
      const glob = legacyState.globalRegex
      if (col?.field && col?.pattern) {
        const row = {
          field: normalizeRegexField(col.field),
          pattern: String(col.pattern),
          flags: String(col.flags || 'i')
        }
        regexRows.value = [createRegexRow(row)]
        appliedRegexRows.value = [row]
      } else if (glob?.enabled && glob?.applied) {
        const row = {
          field: 'any' as const,
          pattern: String(glob.applied),
          flags: String(glob.flags || 'i')
        }
        regexRows.value = [createRegexRow(row)]
        appliedRegexRows.value = [row]
      } else {
        regexRows.value = [createRegexRow()]
        appliedRegexRows.value = []
      }
    }

    cachedFormulaAst = null
    cachedRegexes.clear()
    clearAdvancedFilterErrors()
  }

  return {
    advancedFilterExpanded,
    formulaInput,
    appliedFormula,
    regexRows,
    appliedRegexRows,
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
    addRegexRow,
    removeRegexRow,
    updateRegexRow,
    applyAdvancedFilters,
    clearAdvancedFilters,
    clearAdvancedFilterErrors,
    exportAdvancedFilterState,
    restoreAdvancedFilterState
  }
}
