import type { Ref, ComputedRef } from 'vue'
import { ref } from 'vue'
import { getEntryIdString } from '~/utils/entryKey'
import { queryJyutdict, getSuggestedPronunciation } from '~/composables/useJyutdict'
import { getDialectLabel, getDialectLabelByRegionCode, DIALECT_CODE_TO_NAME } from '~/utils/dialects'
import { DEFINITION_SUMMARY_MAX_LEN, STATUS_LABELS } from '~/utils/entriesTableConstants'
import { deepCopy } from '~/composables/useEntryBaseline'
import type { Entry } from '~/types'
import type { CharPronunciationData } from '~/types/jyutdict'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'

export interface OtherDialectEntryRaw {
  id: string
  headword?: { display?: string }
  dialect?: { name?: string }
  status?: string
  createdAt?: string
  senses?: Array<{ definition?: string }>
  theme?: { level1?: string; level2?: string; level3?: string }
  meta?: { pos?: string; register?: string }
}

export interface FormattedDuplicateEntry {
  id: string
  headwordDisplay: string
  dialectLabel: string
  status: string
  statusLabel: string
  createdAtLabel: string
  definitionSummary: string
  themeLabel: string
  senseCount: number
  metaLabel: string
}

export interface JyutjyuRefFormattedItem {
  id: string
  headwordDisplay: string
  jyutping: string
  dialectLabel: string
  sourceBook: string
  definitionSummary: string
}

export interface UseEntriesRowHintsOptions {
  editableColumns: ComputedRef<EditableColumnDef[]>
  editingCell: Ref<{ entryId: string; field: string } | null>
  editValue: Ref<any>
}

export function useEntriesRowHints(options: UseEntriesRowHintsOptions) {
  const { editableColumns, editingCell, editValue } = options

  const jyutdictData = ref<Map<string, CharPronunciationData[]>>(new Map())
  const jyutdictLoading = ref<Map<string, boolean>>(new Map())
  const jyutdictSuggested = ref<Map<string, string>>(new Map())
  const jyutdictVisible = ref<Map<string, boolean>>(new Map())
  const jyutdictHandled = ref<Set<string>>(new Set())

  const duplicateCheckResult = ref<Map<string, {
    loading: boolean
    entries?: OtherDialectEntryRaw[]
    otherDialects?: OtherDialectEntryRaw[]
  }>>(new Map())

  const jyutjyuRefResult = ref<Map<string, {
    loading: boolean
    q: string
    total: number | null
    results: any[]
    errorMessage: string
  }>>(new Map())
  const jyutjyuRefVisible = ref<Map<string, boolean>>(new Map())
  const jyutjyuRefHandled = ref<Set<string>>(new Set())

  function getJyutdictData(entryId: string): CharPronunciationData[] {
    return jyutdictData.value.get(entryId) || []
  }

  function getJyutdictLoading(entryId: string): boolean {
    return jyutdictLoading.value.get(entryId) || false
  }

  function getJyutdictSuggested(entryId: string): string {
    return jyutdictSuggested.value.get(entryId) || ''
  }

  function getJyutdictVisible(entryId: string): boolean {
    if (jyutdictHandled.value.has(entryId)) return false
    return jyutdictVisible.value.get(entryId) || false
  }

  function getJyutjyuHandledKey(entryId: string, q: string): string {
    return `${entryId}::${q}`
  }

  function getJyutjyuRowVisible(entryId: string): boolean {
    return jyutjyuRefVisible.value.get(entryId) || false
  }

  function getJyutjyuVisible(entryId: string): boolean {
    const state = jyutjyuRefResult.value.get(entryId)
    const q = state?.q || ''
    if (!q) return false
    if (jyutjyuRefHandled.value.has(getJyutjyuHandledKey(entryId, q))) return false
    return jyutjyuRefVisible.value.get(entryId) || false
  }

  function getJyutjyuLoading(entryId: string): boolean {
    return jyutjyuRefResult.value.get(entryId)?.loading || false
  }

  function getJyutjyuError(entryId: string): string {
    return jyutjyuRefResult.value.get(entryId)?.errorMessage || ''
  }

  function getJyutjyuTotal(entryId: string): number | null {
    return jyutjyuRefResult.value.get(entryId)?.total ?? null
  }

  function getJyutjyuQuery(entryId: string): string {
    return jyutjyuRefResult.value.get(entryId)?.q || ''
  }

  function formatJyutjyuResults(list: any[]): JyutjyuRefFormattedItem[] {
    if (!Array.isArray(list) || list.length === 0) return []
    return list.map((r: any) => ({
      id: String(r.id || ''),
      headwordDisplay: r?.headword?.display || '-',
      jyutping: r?.phonetic?.jyutping?.[0] || '',
      dialectLabel: getDialectLabelByRegionCode(r?.dialect?.region_code || ''),
      sourceBook: r?.source_book || '',
      definitionSummary: r?.senses?.[0]?.definition || ''
    }))
  }

  async function runJyutjyuRef(entry: Entry) {
    const entryId = getEntryIdString(entry)
    const q = entry.headword?.display?.trim() || ''
    if (!entryId || !q) return

    const handledKey = getJyutjyuHandledKey(entryId, q)
    if (jyutjyuRefHandled.value.has(handledKey)) return

    const existing = jyutjyuRefResult.value.get(entryId)
    if (existing && existing.q === q && existing.loading === false && (existing.total !== null || existing.results.length > 0 || existing.errorMessage)) {
      jyutjyuRefVisible.value.set(entryId, true)
      jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)
      return
    }

    jyutjyuRefResult.value.set(entryId, {
      loading: true,
      q,
      total: null,
      results: [],
      errorMessage: ''
    })
    jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
    jyutjyuRefVisible.value.set(entryId, true)
    jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)

    try {
      const res = await $fetch<any>('/api/jyutjyu/search', { query: { q } })
      jyutjyuRefResult.value.set(entryId, {
        loading: false,
        q,
        total: typeof res?.total === 'number' ? res.total : (Array.isArray(res?.results) ? res.results.length : 0),
        results: Array.isArray(res?.results) ? res.results : [],
        errorMessage: ''
      })
    } catch (e) {
      jyutjyuRefResult.value.set(entryId, {
        loading: false,
        q,
        total: null,
        results: [],
        errorMessage: '查詢 Jyutjyu 時出現問題，請稍後再試。'
      })
    }
    jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
  }

  async function queryJyutdictForEntry(entry: Entry) {
    const entryId = getEntryIdString(entry)
    const headword = entry.headword?.display || entry.text || ''
    const dialectId = entry.dialect?.name || ''
    const dialectLabel = getDialectLabel(dialectId) || dialectId

    if (!headword || !dialectLabel) return

    jyutdictLoading.value.set(entryId, true)
    jyutdictVisible.value.set(entryId, true)

    try {
      const data = await queryJyutdict(headword, dialectLabel)
      jyutdictData.value.set(entryId, data)
      const suggested = getSuggestedPronunciation(data, dialectLabel)
      jyutdictSuggested.value.set(entryId, suggested)
    } catch (error) {
      console.error('Failed to query jyutdict:', error)
    } finally {
      jyutdictLoading.value.set(entryId, false)
    }
  }

  async function runDuplicateCheck(entry: Entry) {
    const entryId = getEntryIdString(entry)
    const headword = entry.headword?.display?.trim() || ''
    const dialect = entry.dialect?.name || ''
    if (!headword || !dialect) return

    duplicateCheckResult.value.set(entryId, { loading: true })
    duplicateCheckResult.value = new Map(duplicateCheckResult.value)

    try {
      const res = await $fetch<{ sameDialect: OtherDialectEntryRaw[]; otherDialects: OtherDialectEntryRaw[] }>('/api/entries/check-duplicate', {
        query: { headword, dialect }
      })
      duplicateCheckResult.value.set(entryId, {
        loading: false,
        entries: res.sameDialect || [],
        otherDialects: res.otherDialects || []
      })
    } catch (e) {
      duplicateCheckResult.value.set(entryId, { loading: false, entries: [], otherDialects: [] })
    }
    duplicateCheckResult.value = new Map(duplicateCheckResult.value)
  }

  function formatDuplicateEntries(list: OtherDialectEntryRaw[]): FormattedDuplicateEntry[] {
    if (!list?.length) return []
    return list.map(e => {
      const firstDef = e.senses?.[0]?.definition?.trim() || ''
      const definitionSummary = firstDef
        ? (firstDef.length <= DEFINITION_SUMMARY_MAX_LEN ? firstDef : firstDef.slice(0, DEFINITION_SUMMARY_MAX_LEN) + '…')
        : '（無釋義）'
      const themeParts = [e.theme?.level1, e.theme?.level2, e.theme?.level3].filter(Boolean) as string[]
      const themeLabel = themeParts.length ? themeParts.join(' → ') : '（未分類）'
      const senseCount = e.senses?.length ?? 0
      const metaParts = [e.meta?.pos, e.meta?.register].filter(Boolean) as string[]
      const metaLabel = metaParts.length ? metaParts.join(' · ') : ''
      return {
        id: e.id,
        headwordDisplay: e.headword?.display || '-',
        dialectLabel: DIALECT_CODE_TO_NAME[e.dialect?.name || ''] || e.dialect?.name || '-',
        status: e.status || 'draft',
        statusLabel: STATUS_LABELS[e.status || 'draft'] || e.status || '-',
        createdAtLabel: e.createdAt ? new Date(e.createdAt).toLocaleString('zh-HK', { dateStyle: 'short', timeStyle: 'short' }) : '-',
        definitionSummary,
        themeLabel,
        senseCount,
        metaLabel
      }
    })
  }

  function formatOtherDialectsEntries(list: OtherDialectEntryRaw[]): FormattedDuplicateEntry[] {
    if (!list?.length) return []
    return list.map(e => {
      const firstDef = e.senses?.[0]?.definition?.trim() || ''
      const definitionSummary = firstDef
        ? (firstDef.length <= DEFINITION_SUMMARY_MAX_LEN ? firstDef : firstDef.slice(0, DEFINITION_SUMMARY_MAX_LEN) + '…')
        : '（無釋義）'
      const themeParts = [e.theme?.level1, e.theme?.level2, e.theme?.level3].filter(Boolean) as string[]
      const themeLabel = themeParts.length ? themeParts.join(' → ') : '（未分類）'
      const senseCount = e.senses?.length ?? 0
      const metaParts = [e.meta?.pos, e.meta?.register].filter(Boolean) as string[]
      const metaLabel = metaParts.length ? metaParts.join(' · ') : ''
      return {
        id: e.id,
        headwordDisplay: e.headword?.display || '-',
        dialectLabel: DIALECT_CODE_TO_NAME[e.dialect?.name || ''] || e.dialect?.name || '-',
        status: e.status || 'draft',
        statusLabel: STATUS_LABELS[e.status || 'draft'] || e.status || '-',
        createdAtLabel: e.createdAt ? new Date(e.createdAt).toLocaleString('zh-HK', { dateStyle: 'short', timeStyle: 'short' }) : '-',
        definitionSummary,
        themeLabel,
        senseCount,
        metaLabel
      }
    })
  }

  function getDuplicateCheckEntriesFormatted(entryId: string) {
    return formatDuplicateEntries(duplicateCheckResult.value.get(entryId)?.entries || [])
  }

  function getOtherDialectsFormatted(entryId: string) {
    return formatOtherDialectsEntries(duplicateCheckResult.value.get(entryId)?.otherDialects || [])
  }

  async function applyOtherDialectTemplate(targetEntry: Entry, sourceId: string) {
    const sid = String(sourceId)
    try {
      const response = await $fetch<{ success: boolean; data?: any }>(`/api/entries/${sid}`)
      if (!response?.success || !response.data) return
      const source = response.data as any
      const clonedSenses = source.senses?.length ? deepCopy(source.senses) : [{ definition: '', examples: [] }]
      const clonedTheme = source.theme ? deepCopy(source.theme) : {}
      const clonedMeta = source.meta ? deepCopy(source.meta) : {}
      const clonedRefs = source.refs?.length ? deepCopy(source.refs) : undefined
      const clonedEntryType = source.entryType ?? 'word'
      targetEntry.entryType = clonedEntryType as any
      targetEntry.senses = clonedSenses as any
      if (clonedRefs) (targetEntry as any).refs = clonedRefs
      targetEntry.theme = clonedTheme as any
      targetEntry.meta = clonedMeta as any
      if (source.lexemeId) (targetEntry as any).lexemeId = source.lexemeId
      ;(targetEntry as any)._isDirty = true
    } catch (e) {
      console.error('Failed to apply other dialect template', e)
    }
  }

  function applyJyutjyuTemplate(targetEntry: Entry, sourceId: string) {
    const entryId = getEntryIdString(targetEntry)
    if (!entryId) return
    const state = jyutjyuRefResult.value.get(entryId)
    const rawList = state?.results || []
    const sid = String(sourceId)
    const source = Array.isArray(rawList) ? rawList.find((r: any) => String(r?.id || '') === sid) : null
    if (!source) return
    try {
      const rawSenses = Array.isArray(source?.senses) ? source.senses : []
      const nextSenses = rawSenses.length
        ? rawSenses
          .map((s: any) => {
            const definition = String(s?.definition || '').trim()
            if (!definition) return null
            const rawExamples = Array.isArray(s?.examples) ? s.examples : []
            const examples = rawExamples
              .map((ex: any) => {
                const text = String(ex?.text || '').trim()
                if (!text) return null
                return {
                  text,
                  jyutping: ex?.jyutping ? String(ex.jyutping) : undefined,
                  translation: ex?.translation ? String(ex.translation) : undefined
                }
              })
              .filter(Boolean) as any
            return {
              definition,
              label: s?.label ? String(s.label) : undefined,
              examples: examples.length ? examples : []
            }
          })
          .filter(Boolean)
        : [{ definition: '', examples: [] }]
      targetEntry.senses = deepCopy(nextSenses as any)
      const currentJyutping = targetEntry.phonetic?.jyutping || []
      const sourceJyutping = source?.phonetic?.jyutping
      if ((!currentJyutping || currentJyutping.length === 0) && Array.isArray(sourceJyutping) && sourceJyutping.length > 0) {
        targetEntry.phonetic = targetEntry.phonetic || {}
        targetEntry.phonetic!.jyutping = deepCopy(sourceJyutping)
      }
      ;(targetEntry as any)._isDirty = true
    } catch (e) {
      console.error('Failed to apply Jyutjyu template', e)
    }
  }

  function dismissDuplicateCheck(entry: Entry) {
    const entryId = getEntryIdString(entry)
    duplicateCheckResult.value.delete(entryId)
    duplicateCheckResult.value = new Map(duplicateCheckResult.value)
  }

  function getDuplicateCheckVisible(entryId: string): boolean {
    const r = duplicateCheckResult.value.get(entryId)
    return !!(r && (r.loading || (r.entries && r.entries.length > 0) || (r.otherDialects && r.otherDialects.length > 0)))
  }

  function getDuplicateCheckLoading(entryId: string): boolean {
    return duplicateCheckResult.value.get(entryId)?.loading ?? false
  }

  function getDuplicateCheckRowVisible(entryId: string): boolean {
    return getDuplicateCheckLoading(entryId) || getDuplicateCheckEntriesFormatted(entryId).length > 0
  }

  function getOtherDialectsRowVisible(entryId: string): boolean {
    return getOtherDialectsFormatted(entryId).length > 0 && getDuplicateCheckEntriesFormatted(entryId).length === 0
  }

  function acceptJyutdict(entry: Entry, pronunciation: string) {
    const entryId = getEntryIdString(entry)
    const col = editableColumns.value.find(c => c.key === 'phonetic')
    if (col) {
      col.set(entry, pronunciation as never)
      ;(entry as any)._isDirty = true
    }
    if (editingCell.value && String(editingCell.value.entryId) === entryId && editingCell.value.field === 'phonetic') {
      editValue.value = pronunciation
    }
    jyutdictHandled.value.add(entryId)
    jyutdictHandled.value = new Set(jyutdictHandled.value)
    jyutdictVisible.value.set(entryId, false)
  }

  function dismissJyutdict(entry: Entry) {
    const entryId = getEntryIdString(entry)
    jyutdictHandled.value.add(entryId)
    jyutdictHandled.value = new Set(jyutdictHandled.value)
    jyutdictVisible.value.set(entryId, false)
  }

  function dismissJyutjyuRef(entry: Entry) {
    const entryId = getEntryIdString(entry)
    const q = getJyutjyuQuery(entryId).trim()
    if (!entryId || !q) return
    const key = getJyutjyuHandledKey(entryId, q)
    jyutjyuRefHandled.value.add(key)
    jyutjyuRefHandled.value = new Set(jyutjyuRefHandled.value)
    jyutjyuRefVisible.value.set(entryId, false)
    jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)
  }

  return {
    jyutdictData,
    jyutdictLoading,
    jyutdictSuggested,
    jyutdictVisible,
    jyutdictHandled,
    duplicateCheckResult,
    jyutjyuRefResult,
    jyutjyuRefVisible,
    jyutjyuRefHandled,
    getJyutdictData,
    getJyutdictLoading,
    getJyutdictSuggested,
    getJyutdictVisible,
    getJyutjyuHandledKey,
    getJyutjyuRowVisible,
    getJyutjyuVisible,
    getJyutjyuLoading,
    getJyutjyuError,
    getJyutjyuTotal,
    getJyutjyuQuery,
    formatJyutjyuResults,
    runJyutjyuRef,
    queryJyutdictForEntry,
    runDuplicateCheck,
    formatDuplicateEntries,
    formatOtherDialectsEntries,
    getDuplicateCheckEntriesFormatted,
    getOtherDialectsFormatted,
    applyOtherDialectTemplate,
    applyJyutjyuTemplate,
    dismissDuplicateCheck,
    getDuplicateCheckVisible,
    getDuplicateCheckLoading,
    getDuplicateCheckRowVisible,
    getOtherDialectsRowVisible,
    acceptJyutdict,
    dismissJyutdict,
    dismissJyutjyuRef
  }
}
