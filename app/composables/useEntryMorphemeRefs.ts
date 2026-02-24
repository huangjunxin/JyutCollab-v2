import { ref } from 'vue'
import type { Entry } from '~/types'

export type MorphemeSearchResult = {
  id: string
  headword: string
  jyutping: string
  definition: string
  dialect: string
  entryType: string
}

export type UnlinkedMorphemeCandidate = {
  position: number
  char: string
  jyutping: string
  note: string
}

export function useEntryMorphemeRefs(getEntryIdString: (entry: Entry) => string) {
  const morphemeSearchModalOpen = ref(false)
  const morphemeSearchTargetEntry = ref<Entry | null>(null)
  const morphemeSearchResults = ref<MorphemeSearchResult[]>([])
  const morphemeSearchLoading = ref(false)
  const unlinkedMorphemeEntryId = ref<string | null>(null)
  const unlinkedMorphemeCandidates = ref<UnlinkedMorphemeCandidate[]>([])

  function openUnlinkedMorphemeForm(entry: Entry) {
    unlinkedMorphemeEntryId.value = getEntryIdString(entry)
    const headword = entry.headword?.display || entry.text || ''
    const rawJyutping = entry.phonetic?.jyutping
    let syllables: string[] = []
    if (Array.isArray(rawJyutping)) {
      syllables = rawJyutping.join(' ').split(/\s+/).filter(Boolean)
    } else if (typeof rawJyutping === 'string') {
      syllables = (rawJyutping as string).split(/\s+/).filter(Boolean)
    }
    const existingPositions = new Set((entry.morphemeRefs || []).map((r: any) => r.position))
    const candidates: UnlinkedMorphemeCandidate[] = []
    for (let i = 0; i < headword.length; i++) {
      if (existingPositions.has(i)) continue
      const char = headword[i]
      if (!char || char === '□') continue
      candidates.push({ position: i, char, jyutping: syllables[i] ?? '', note: '' })
    }
    unlinkedMorphemeCandidates.value = candidates
  }

  function confirmUnlinkedMorphemeRefs(entry: Entry) {
    const list = entry.morphemeRefs ? [...entry.morphemeRefs] : []
    for (const cand of unlinkedMorphemeCandidates.value) {
      list.push({
        position: cand.position,
        char: cand.char,
        jyutping: (cand.jyutping || '').trim() || undefined,
        note: (cand.note || '').trim() || undefined
      })
    }
    ;(entry as any).morphemeRefs = list
    entry._isDirty = true
    closeUnlinkedMorphemeForm()
  }

  function closeUnlinkedMorphemeForm() {
    unlinkedMorphemeEntryId.value = null
    unlinkedMorphemeCandidates.value = []
  }

  function openMorphemeSearch(entry: Entry) {
    morphemeSearchTargetEntry.value = entry
    morphemeSearchModalOpen.value = true
    searchMorphemes(entry)
  }

  async function searchMorphemes(entry: Entry) {
    morphemeSearchLoading.value = true
    morphemeSearchResults.value = []
    try {
      const query: Record<string, string> = {}
      if (entry.headword?.display) query.headword = entry.headword.display
      if (entry.dialect?.name) query.dialect = entry.dialect.name
      if (entry.phonetic?.jyutping?.length) query.jyutping = entry.phonetic.jyutping.join(' ')
      if (entry.senses?.[0]?.definition) query.definition = entry.senses[0].definition
      const response = await $fetch<{ success: boolean; data: Array<any> }>('/api/entries/search-morphemes', { query })
      if (response.success && Array.isArray(response.data)) {
        morphemeSearchResults.value = response.data
      }
    } catch (e: any) {
      console.error('Failed to search morphemes:', e)
      alert(e?.data?.message || e?.message || '搜索失敗')
    } finally {
      morphemeSearchLoading.value = false
    }
  }

  function addMorphemeRef(targetEntryId: string, morphemeEntry: { headword: string; jyutping: string }) {
    const entry = morphemeSearchTargetEntry.value
    if (!entry) return
    if (!entry.morphemeRefs) (entry as any).morphemeRefs = []
    if (entry.morphemeRefs.some((r: any) => r.targetEntryId === targetEntryId)) {
      alert('該詞素已引用')
      return
    }
    const headword = entry.headword?.display || ''
    const char = morphemeEntry.headword
    let position: number | undefined = headword && char && headword.includes(char) ? headword.indexOf(char) : undefined
    entry.morphemeRefs.push({
      targetEntryId,
      position,
      char: morphemeEntry.headword,
      jyutping: morphemeEntry.jyutping || undefined
    })
    entry._isDirty = true
    morphemeSearchModalOpen.value = false
  }

  function removeMorphemeRef(entry: Entry, refIdx: number) {
    if (!entry.morphemeRefs || refIdx < 0 || refIdx >= entry.morphemeRefs.length) return
    entry.morphemeRefs.splice(refIdx, 1)
    entry._isDirty = true
  }

  return {
    morphemeSearchModalOpen,
    morphemeSearchTargetEntry,
    morphemeSearchResults,
    morphemeSearchLoading,
    unlinkedMorphemeEntryId,
    unlinkedMorphemeCandidates,
    openUnlinkedMorphemeForm,
    confirmUnlinkedMorphemeRefs,
    closeUnlinkedMorphemeForm,
    openMorphemeSearch,
    searchMorphemes,
    addMorphemeRef,
    removeMorphemeRef
  }
}
