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
import type { ReferenceHelperActionPayload, ReferenceHelperEventPayload } from '~/composables/useReferenceHelperTracking'

type ReferenceHelperEventLogger = (payload: ReferenceHelperEventPayload) => Promise<string | null> | string | null
type ReferenceHelperActionLogger = (id: string | null | undefined, action: 'accepted' | 'rejected' | 'modified', payload?: ReferenceHelperActionPayload) => void

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
  onReferenceHelperEvent?: ReferenceHelperEventLogger
  onReferenceHelperAction?: ReferenceHelperActionLogger
}

export function useEntriesRowHints(options: UseEntriesRowHintsOptions) {
  const { editableColumns, editingCell, editValue, onReferenceHelperEvent, onReferenceHelperAction } = options

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

  /** 參考詞頭手動搜尋 loading 狀態（結果直接覆蓋 duplicateCheckResult / jyutjyuRefResult） */
  const referenceSearchLoading = ref<Map<string, boolean>>(new Map())
  /** 參考詞頭輸入框內容（不影響 Jyutjyu 展示的 query） */
  const referenceSearchQuery = ref<Map<string, string>>(new Map())

  const jyutjyuRefResult = ref<Map<string, {
    loading: boolean
    q: string
    total: number | null
    results: any[]
    errorMessage: string
  }>>(new Map())
  const jyutjyuRefVisible = ref<Map<string, boolean>>(new Map())
  const jyutjyuRefHandled = ref<Set<string>>(new Set())
  const referenceHelperEventIds = ref<Map<string, string>>(new Map())

  function getTrackingEntryId(entry: Entry): string | undefined {
    return (entry as any)._isNew ? undefined : getEntryIdString(entry)
  }

  function setReferenceEventId(key: string, id: string | null | undefined) {
    if (!id) return
    referenceHelperEventIds.value.set(key, id)
    referenceHelperEventIds.value = new Map(referenceHelperEventIds.value)
  }

  function createReferenceEvent(key: string, payload: ReferenceHelperEventPayload) {
    if (!onReferenceHelperEvent) return
    const result = onReferenceHelperEvent(payload)
    if (result && typeof result === 'object' && 'then' in result) {
      void result.then(id => setReferenceEventId(key, id))
      return
    }
    setReferenceEventId(key, result)
  }

  function updateReferenceEvent(key: string, action: 'accepted' | 'rejected' | 'modified', payload?: ReferenceHelperActionPayload) {
    const id = referenceHelperEventIds.value.get(key)
    onReferenceHelperAction?.(id, action, payload)
    if (id) {
      referenceHelperEventIds.value.delete(key)
      referenceHelperEventIds.value = new Map(referenceHelperEventIds.value)
    }
  }

  function getJyutdictEventKey(entryId: string) {
    return `jyutdict:${entryId}`
  }

  function getJyutjyuEventKey(entryId: string, q: string) {
    return `jyutjyu:${entryId}:${q}`
  }

  function getInternalTemplateEventKey(entryId: string) {
    return `internal-template:${entryId}`
  }

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
      const results = Array.isArray(res?.results) ? res.results : []
      const total = typeof res?.total === 'number' ? res.total : results.length
      jyutjyuRefResult.value.set(entryId, {
        loading: false,
        q,
        total,
        results,
        errorMessage: ''
      })
      if (total > 0) {
        createReferenceEvent(getJyutjyuEventKey(entryId, q), {
          entryId: getTrackingEntryId(entry),
          clientEntryKey: entryId,
          helperType: 'jyutjyu_template',
          sourceProvider: 'jyutjyu',
          query: q,
          resultCount: total,
          suggestedContent: results.slice(0, 5).map((item: any) => ({
            id: String(item?.id || ''),
            headword: item?.headword?.display,
            jyutping: item?.phonetic?.jyutping,
            definition: item?.senses?.[0]?.definition
          }))
        })
      }
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
      if (suggested) {
        createReferenceEvent(getJyutdictEventKey(entryId), {
          entryId: getTrackingEntryId(entry),
          clientEntryKey: entryId,
          helperType: 'jyutdict_pronunciation',
          sourceProvider: 'jyutdict',
          field: 'phonetic.jyutping',
          query: headword,
          resultCount: data.length,
          suggestedContent: {
            pronunciation: suggested,
            headword,
            dialect: dialectLabel
          }
        })
      }
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
      const query: { headword: string; dialect: string; excludeId?: string } = { headword, dialect }
      if (!(entry as any)._isNew) {
        query.excludeId = entryId
      }
      const res = await $fetch<{ sameDialect: OtherDialectEntryRaw[]; otherDialects: OtherDialectEntryRaw[] }>('/api/entries/check-duplicate', {
        query
      })
      const sameDialect = res.sameDialect || []
      const otherDialects = res.otherDialects || []
      duplicateCheckResult.value.set(entryId, {
        loading: false,
        entries: sameDialect,
        otherDialects
      })
      if (otherDialects.length > 0) {
        createReferenceEvent(getInternalTemplateEventKey(entryId), {
          entryId: getTrackingEntryId(entry),
          clientEntryKey: entryId,
          helperType: 'internal_dialect_template',
          sourceProvider: 'internal',
          query: headword,
          resultCount: otherDialects.length,
          suggestedContent: otherDialects.map(item => ({
            id: item.id,
            headword: item.headword?.display,
            dialect: item.dialect?.name,
            definition: item.senses?.[0]?.definition
          }))
        })
      }
    } catch (e) {
      duplicateCheckResult.value.set(entryId, { loading: false, entries: [], otherDialects: [] })
    }
    duplicateCheckResult.value = new Map(duplicateCheckResult.value)
  }

  /**
   * 以「另一個參考詞頭」搜尋可用作範本的詞條。
   * - 復用 /api/entries/check-duplicate 查本數據庫，結果覆蓋 duplicateCheckResult
   * - 同時查 /api/jyutjyu/search，結果覆蓋 jyutjyuRefResult（沿用現有 Jyutjyu 展示）
   */
  async function runReferenceSearchForEntry(entry: Entry, rawHeadword: string) {
    const entryId = getEntryIdString(entry)
    const q = rawHeadword?.trim() || ''
    const dialect = entry.dialect?.name || ''
    if (!entryId || !q || !dialect) return

    referenceSearchLoading.value.set(entryId, true)
    referenceSearchLoading.value = new Map(referenceSearchLoading.value)

    try {
      const duplicateQuery: { headword: string; dialect: string; excludeId?: string } = { headword: q, dialect }
      if (!(entry as any)._isNew) {
        duplicateQuery.excludeId = entryId
      }
      const [dbRes, jyutjyuRes] = await Promise.all([
        $fetch<{ sameDialect: OtherDialectEntryRaw[]; otherDialects: OtherDialectEntryRaw[] }>('/api/entries/check-duplicate', {
          query: duplicateQuery
        }),
        $fetch<any>('/api/jyutjyu/search', { query: { q } })
      ])

      const sameDialect = dbRes.sameDialect || []
      const otherDialects = dbRes.otherDialects || []
      const jyutjyuList = Array.isArray(jyutjyuRes?.results) ? jyutjyuRes.results : []

      // 覆蓋重複檢測結果，讓現有 Duplicate / OtherDialects 提示顯示新詞頭的數據
      duplicateCheckResult.value.set(entryId, {
        loading: false,
        entries: sameDialect,
        otherDialects: otherDialects
      })
      duplicateCheckResult.value = new Map(duplicateCheckResult.value)

      // 覆蓋 Jyutjyu 結果，讓現有 Jyutjyu 提示顯示新詞頭的數據
      jyutjyuRefResult.value.set(entryId, {
        loading: false,
        q,
        total: typeof jyutjyuRes?.total === 'number'
          ? jyutjyuRes.total
          : (Array.isArray(jyutjyuList) ? jyutjyuList.length : 0),
        results: jyutjyuList,
        errorMessage: ''
      })
      jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
      jyutjyuRefVisible.value.set(entryId, true)
      jyutjyuRefVisible.value = new Map(jyutjyuRefVisible.value)

      const jyutjyuTotal = typeof jyutjyuRes?.total === 'number' ? jyutjyuRes.total : jyutjyuList.length
      void onReferenceHelperEvent?.({
        entryId: getTrackingEntryId(entry),
        clientEntryKey: entryId,
        helperType: 'manual_reference_search',
        sourceProvider: 'manual',
        query: q,
        resultCount: sameDialect.length + otherDialects.length + jyutjyuTotal,
        userAction: 'accepted',
        metadata: {
          sameDialectCount: sameDialect.length,
          otherDialectCount: otherDialects.length,
          jyutjyuCount: jyutjyuTotal
        }
      })
      if (otherDialects.length > 0) {
        createReferenceEvent(getInternalTemplateEventKey(entryId), {
          entryId: getTrackingEntryId(entry),
          clientEntryKey: entryId,
          helperType: 'internal_dialect_template',
          sourceProvider: 'internal',
          query: q,
          resultCount: otherDialects.length,
          suggestedContent: otherDialects.map(item => ({
            id: item.id,
            headword: item.headword?.display,
            dialect: item.dialect?.name,
            definition: item.senses?.[0]?.definition
          })),
          metadata: { initiatedBy: 'manual_reference_search' }
        })
      }
      if (jyutjyuTotal > 0) {
        createReferenceEvent(getJyutjyuEventKey(entryId, q), {
          entryId: getTrackingEntryId(entry),
          clientEntryKey: entryId,
          helperType: 'jyutjyu_template',
          sourceProvider: 'jyutjyu',
          query: q,
          resultCount: jyutjyuTotal,
          suggestedContent: jyutjyuList.slice(0, 5).map((item: any) => ({
            id: String(item?.id || ''),
            headword: item?.headword?.display,
            jyutping: item?.phonetic?.jyutping,
            definition: item?.senses?.[0]?.definition
          })),
          metadata: { initiatedBy: 'manual_reference_search' }
        })
      }
    } catch (e) {
      duplicateCheckResult.value.set(entryId, { loading: false, entries: [], otherDialects: [] })
      duplicateCheckResult.value = new Map(duplicateCheckResult.value)

      jyutjyuRefResult.value.set(entryId, {
        loading: false,
        q,
        total: null,
        results: [],
        errorMessage: '查詢 Jyutjyu 時出現問題，請稍後再試。'
      })
      jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
    }
    referenceSearchLoading.value.set(entryId, false)
    referenceSearchLoading.value = new Map(referenceSearchLoading.value)
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

  function getReferenceSearchLoading(entryId: string): boolean {
    return referenceSearchLoading.value.get(entryId) || false
  }

  function getReferenceSearchQuery(entryId: string): string {
    return referenceSearchQuery.value.get(entryId) || ''
  }

  function setReferenceSearchQuery(entryId: string, q: string) {
    referenceSearchQuery.value.set(entryId, q)
    referenceSearchQuery.value = new Map(referenceSearchQuery.value)
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
      updateReferenceEvent(getInternalTemplateEventKey(getEntryIdString(targetEntry)), 'accepted', {
        entryId: getTrackingEntryId(targetEntry),
        clientEntryKey: getEntryIdString(targetEntry),
        acceptedContent: {
          sourceEntryId: sid,
          entryType: clonedEntryType,
          senses: clonedSenses,
          theme: clonedTheme,
          meta: clonedMeta,
          refs: clonedRefs,
          lexemeId: source.lexemeId
        },
        metadata: {
          sourceHeadword: source.headword?.display,
          sourceDialect: source.dialect?.name
        }
      })
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
      updateReferenceEvent(getJyutjyuEventKey(entryId, state?.q || ''), 'accepted', {
        entryId: getTrackingEntryId(targetEntry),
        clientEntryKey: entryId,
        acceptedContent: {
          sourceId: sid,
          senses: targetEntry.senses,
          jyutping: targetEntry.phonetic?.jyutping
        },
        metadata: {
          sourceHeadword: source?.headword?.display,
          query: state?.q || ''
        }
      })
    } catch (e) {
      console.error('Failed to apply Jyutjyu template', e)
    }
  }

  function dismissDuplicateCheck(entry: Entry) {
    const entryId = getEntryIdString(entry)
    updateReferenceEvent(getInternalTemplateEventKey(entryId), 'rejected', {
      entryId: getTrackingEntryId(entry),
      clientEntryKey: entryId
    })
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
    updateReferenceEvent(getJyutdictEventKey(entryId), 'accepted', {
      entryId: getTrackingEntryId(entry),
      clientEntryKey: entryId,
      field: 'phonetic.jyutping',
      acceptedContent: {
        pronunciation
      }
    })
    jyutdictHandled.value.add(entryId)
    jyutdictHandled.value = new Set(jyutdictHandled.value)
    jyutdictVisible.value.set(entryId, false)
  }

  function dismissJyutdict(entry: Entry) {
    const entryId = getEntryIdString(entry)
    updateReferenceEvent(getJyutdictEventKey(entryId), 'rejected', {
      entryId: getTrackingEntryId(entry),
      clientEntryKey: entryId,
      field: 'phonetic.jyutping'
    })
    jyutdictHandled.value.add(entryId)
    jyutdictHandled.value = new Set(jyutdictHandled.value)
    jyutdictVisible.value.set(entryId, false)
  }

  function dismissJyutjyuRef(entry: Entry) {
    const entryId = getEntryIdString(entry)
    const q = getJyutjyuQuery(entryId).trim()
    if (!entryId || !q) return
    const key = getJyutjyuHandledKey(entryId, q)
    updateReferenceEvent(getJyutjyuEventKey(entryId, q), 'rejected', {
      entryId: getTrackingEntryId(entry),
      clientEntryKey: entryId,
      metadata: { query: q }
    })
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
    referenceSearchLoading,
    referenceSearchQuery,
    getReferenceSearchLoading,
    getReferenceSearchQuery,
    setReferenceSearchQuery,
    runReferenceSearchForEntry,
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
