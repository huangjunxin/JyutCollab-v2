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
    buildRowContext
  }
}
