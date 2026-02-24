import type { Ref, Reactive } from 'vue'
import { ref, reactive } from 'vue'
import { restoreEntriesFromLocalStorage } from '~/composables/useEntriesLocalStorage'
import { ALL_FILTER_VALUE, SORTABLE_COLUMN_KEYS } from '~/utils/entriesTableConstants'
import type { Entry } from '~/types'
import type { EntryBaselineSnapshot } from '~/composables/useEntryBaseline'

export function useEntriesList(
  viewMode: Ref<string>,
  searchQuery: Ref<string>,
  filters: Reactive<{ region: string; status: string; theme: string }>,
  sortBy: Ref<string>,
  sortOrder: Ref<'asc' | 'desc'>,
  entryBaselineById: Ref<Map<string, any>>,
  makeBaselineSnapshot: (entry: Entry) => EntryBaselineSnapshot,
  applyDraftOntoEntry: (target: Entry, draft: Entry) => void
) {
  const entries = ref<Entry[]>([])
  const aggregatedGroups = ref<Array<{ headwordDisplay: string; headwordNormalized: string; entries: Entry[] }>>([])
  const lexemeGroups = ref<Array<{ headwordDisplay: string; headwordNormalized: string; entries: Entry[] }>>([])
  const loading = ref(false)
  const currentPage = ref(1)
  const pagination = reactive({
    total: 0,
    page: 1,
    perPage: 20,
    totalPages: 0
  })

  async function fetchEntries() {
    loading.value = true
    try {
      const query: Record<string, any> = {
        page: currentPage.value,
        perPage: pagination.perPage,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      }

      if (searchQuery.value) query.query = searchQuery.value
      if (filters.region && filters.region !== ALL_FILTER_VALUE) query.dialectName = filters.region
      if (filters.status && filters.status !== ALL_FILTER_VALUE) query.status = filters.status
      if (filters.theme && filters.theme !== ALL_FILTER_VALUE) query.themeIdL3 = Number(filters.theme)

      if (viewMode.value === 'aggregated') query.groupBy = 'headword'
      if (viewMode.value === 'lexeme') query.groupBy = 'lexeme'

      const response = await $fetch<{ data: any[]; total: number; page: number; perPage: number; totalPages: number; grouped?: boolean }>('/api/entries', { query })

      if (response.grouped && Array.isArray(response.data)) {
        const nextGroups = response.data.map((g: any) => ({
          headwordDisplay: g.headwordDisplay ?? g.headwordNormalized ?? '',
          headwordNormalized: g.headwordNormalized ?? g.headwordDisplay ?? '',
          entries: (g.entries ?? []).map((e: any) => ({ ...e, _isNew: false, _isDirty: false } as Entry))
        }))
        const nextBaseline = new Map<string, any>()
        nextGroups.forEach((g: any) => g.entries.forEach((e: any) => nextBaseline.set(String(e.id ?? ''), makeBaselineSnapshot(e))))
        entryBaselineById.value = nextBaseline

        if (viewMode.value === 'lexeme') lexemeGroups.value = nextGroups
        else aggregatedGroups.value = nextGroups
        entries.value = []
      } else {
        const nextEntries = response.data.map((e: any) => ({ ...e, _isNew: false, _isDirty: false } as Entry))
        const nextBaseline = new Map<string, any>()
        nextEntries.forEach((e: any) => nextBaseline.set(String(e.id ?? ''), makeBaselineSnapshot(e)))
        entryBaselineById.value = nextBaseline

        entries.value = nextEntries
        aggregatedGroups.value = []
        lexemeGroups.value = []
      }

      const restoredEntries = restoreEntriesFromLocalStorage()
      const canInsertOrphans =
        currentPage.value === 1 &&
        !searchQuery.value &&
        filters.region === ALL_FILTER_VALUE &&
        filters.status === ALL_FILTER_VALUE &&
        filters.theme === ALL_FILTER_VALUE

      if (restoredEntries.length > 0) {
        if (viewMode.value === 'aggregated' || viewMode.value === 'lexeme') {
          restoredEntries.forEach((restoredEntry) => {
            const restoredId = String((restoredEntry as any).id ?? '')
            let applied = false
            if (restoredId) {
              const base = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
              for (const g of base) {
                const hit = g.entries.find(e => String((e as any).id ?? '') === restoredId)
                if (hit) {
                  applyDraftOntoEntry(hit, restoredEntry)
                  applied = true
                  break
                }
              }
            }
            if (!applied && canInsertOrphans) entries.value.unshift(restoredEntry)
          })
        } else {
          restoredEntries.forEach((restoredEntry) => {
            const restoredId = String((restoredEntry as any).id ?? '')
            const hit = restoredId ? entries.value.find(e => String((e as any).id ?? '') === restoredId) : null
            if (hit) applyDraftOntoEntry(hit, restoredEntry)
            else if (canInsertOrphans) entries.value.unshift(restoredEntry)
          })
        }
      }

      pagination.total = response.total
      pagination.page = response.page
      pagination.totalPages = response.totalPages
    } catch (error) {
      console.error('Failed to fetch entries:', error)
    } finally {
      loading.value = false
    }
  }

  function handleSearch() {
    currentPage.value = 1
    fetchEntries()
  }

  function handleSort(key: string) {
    if (!SORTABLE_COLUMN_KEYS.includes(key as any)) return
    if (sortBy.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = key
      sortOrder.value = 'asc'
    }
    fetchEntries()
  }

  return {
    entries,
    aggregatedGroups,
    lexemeGroups,
    loading,
    currentPage,
    pagination,
    fetchEntries,
    handleSearch,
    handleSort
  }
}
