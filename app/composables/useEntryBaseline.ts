import type { Ref } from 'vue'
import type { Entry } from '~/types'

/** 深拷貝（避開 Vue reactive Proxy，structuredClone 會報 DataCloneError） */
export function deepCopy<T>(x: T): T {
  return JSON.parse(JSON.stringify(x))
}

export type EntryBaselineSnapshot = {
  headword?: any
  text?: any
  dialect?: any
  phonetic?: any
  phoneticNotation?: any
  entryType?: any
  senses?: any
  refs?: any
  theme?: any
  meta?: any
  status?: any
  reviewNotes?: any
  lexemeId?: string
  morphemeRefs?: any[]
}

/** 僅用於已保存詞條的 baseline key（不含 _tempId） */
export function getEntryIdKey(entry: Entry): string {
  return String((entry as any)?.id ?? '')
}

export function makeBaselineSnapshot(entry: Entry): EntryBaselineSnapshot {
  return deepCopy({
    headword: (entry as any).headword,
    text: (entry as any).text,
    dialect: (entry as any).dialect,
    phonetic: (entry as any).phonetic,
    phoneticNotation: (entry as any).phoneticNotation,
    entryType: (entry as any).entryType,
    senses: (entry as any).senses,
    refs: (entry as any).refs,
    theme: (entry as any).theme,
    meta: (entry as any).meta,
    status: (entry as any).status,
    reviewNotes: (entry as any).reviewNotes,
    lexemeId: (entry as any).lexemeId,
    morphemeRefs: (entry as any).morphemeRefs
  })
}

export function useEntryBaseline(entryBaselineById: Ref<Map<string, any>>) {
  function setBaselineForEntry(entry: Entry) {
    const id = getEntryIdKey(entry)
    if (!id) return
    entryBaselineById.value.set(id, makeBaselineSnapshot(entry))
    entryBaselineById.value = new Map(entryBaselineById.value)
  }

  function restoreEntryFromBaseline(entry: Entry): boolean {
    const id = getEntryIdKey(entry)
    if (!id) return false
    const snap = entryBaselineById.value.get(id) as EntryBaselineSnapshot | undefined
    if (!snap) return false

    ;(entry as any).headword = snap.headword ? deepCopy(snap.headword) : undefined
    ;(entry as any).text = snap.text
    ;(entry as any).dialect = snap.dialect ? deepCopy(snap.dialect) : undefined
    ;(entry as any).phonetic = snap.phonetic ? deepCopy(snap.phonetic) : undefined
    ;(entry as any).phoneticNotation = snap.phoneticNotation
    ;(entry as any).entryType = snap.entryType
    ;(entry as any).senses = snap.senses ? deepCopy(snap.senses) : undefined
    ;(entry as any).refs = snap.refs ? deepCopy(snap.refs) : undefined
    ;(entry as any).theme = snap.theme ? deepCopy(snap.theme) : undefined
    ;(entry as any).meta = snap.meta ? deepCopy(snap.meta) : undefined
    ;(entry as any).status = snap.status
    ;(entry as any).reviewNotes = snap.reviewNotes
    ;(entry as any).lexemeId = snap.lexemeId
    ;(entry as any).morphemeRefs = snap.morphemeRefs ? deepCopy(snap.morphemeRefs) : undefined
    entry._isDirty = false
    return true
  }

  function applyDraftOntoEntry(target: Entry, draft: Entry) {
    ;(target as any).headword = (draft as any).headword ? deepCopy((draft as any).headword) : undefined
    ;(target as any).text = (draft as any).text
    ;(target as any).dialect = (draft as any).dialect ? deepCopy((draft as any).dialect) : undefined
    ;(target as any).phonetic = (draft as any).phonetic ? deepCopy((draft as any).phonetic) : undefined
    ;(target as any).phoneticNotation = (draft as any).phoneticNotation
    ;(target as any).entryType = (draft as any).entryType
    ;(target as any).senses = (draft as any).senses ? deepCopy((draft as any).senses) : undefined
    ;(target as any).refs = (draft as any).refs ? deepCopy((draft as any).refs) : undefined
    ;(target as any).theme = (draft as any).theme ? deepCopy((draft as any).theme) : undefined
    ;(target as any).meta = (draft as any).meta ? deepCopy((draft as any).meta) : undefined
    ;(target as any).status = (draft as any).status
    ;(target as any).reviewNotes = (draft as any).reviewNotes
    if ((draft as any).lexemeId !== undefined) (target as any).lexemeId = (draft as any).lexemeId
    if ((draft as any).morphemeRefs !== undefined) (target as any).morphemeRefs = (draft as any).morphemeRefs ? deepCopy((draft as any).morphemeRefs) : undefined
    ;(target as any)._isNew = (draft as any)._isNew ?? false
    ;(target as any)._isDirty = (draft as any)._isDirty ?? false
    if ((draft as any)._tempId) (target as any)._tempId = (draft as any)._tempId
  }

  return {
    setBaselineForEntry,
    restoreEntryFromBaseline,
    applyDraftOntoEntry
  }
}
