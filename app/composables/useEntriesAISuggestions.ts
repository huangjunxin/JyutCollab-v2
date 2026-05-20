import type { Ref } from 'vue'
import { ref } from 'vue'
import { getThemeById } from '~/composables/useThemeData'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import type { Entry, Register } from '~/types'

export interface ThemeAISuggestion {
  suggestionId?: string
  level1Name: string
  level2Name: string
  level3Name: string
  level1Id: number
  level2Id: number
  level3Id: number
  confidence?: number
  explanation?: string
}

export interface DefinitionAISuggestion {
  suggestionId?: string
  definition: string
  usageNotes?: string
  formalityLevel?: string
}

interface PendingAISuggestion {
  entryId: string
  field: string
  text: string
  suggestionId?: string
}

type AISuggestionAction = 'accepted' | 'rejected' | 'modified'
type AcceptedAIField = 'definition' | 'theme' | 'examples'

interface AcceptedAITracker {
  suggestionId: string
  entryKey: string
  entryId?: string
  field: AcceptedAIField
  acceptedContent: unknown
}

export interface UseEntriesAISuggestionsOptions {
  editingCell: Ref<{ entryId: string; field: string } | null>
  editValue: Ref<any>
  currentPageEntries: Ref<Entry[]>
}

export function useEntriesAISuggestions(options: UseEntriesAISuggestionsOptions) {
  const { editingCell, editValue, currentPageEntries } = options

  const aiSuggestion = ref<string | null>(null)
  const aiSuggestionId = ref<string | null>(null)
  const aiSuggestionForField = ref<string | null>(null)
  const pendingAISuggestions = ref<Map<string, PendingAISuggestion>>(new Map())
  const aiDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const themeAISuggestions = ref<Map<string, ThemeAISuggestion>>(new Map())
  const definitionAISuggestions = ref<Map<string, DefinitionAISuggestion>>(new Map())
  const acceptedAITrackers = ref<Map<string, AcceptedAITracker>>(new Map())
  const aiLoadingFor = ref<{ entryKey: string | number; action: 'definition' | 'theme' | 'examples' } | null>(null)
  const aiLoading = ref(false)
  const aiSuggestAbortController = ref<AbortController | null>(null)
  const aiLoadingInlineFor = ref<{ entryId: string; field: string } | null>(null)
  const aiInlineError = ref<{ entryId: string; field: string; message: string } | null>(null)

  function getRealEntryId(entry: Entry): string | undefined {
    return (entry as any)._isNew ? undefined : entry.id
  }

  function normalizeAICompareValue(value: unknown) {
    return String(value ?? '').trim()
  }

  function getThemeActionContent(entry: Entry) {
    return {
      level1: entry.theme?.level1,
      level2: entry.theme?.level2,
      level3: entry.theme?.level3,
      level1Id: entry.theme?.level1Id,
      level2Id: entry.theme?.level2Id,
      level3Id: entry.theme?.level3Id
    }
  }

  function logAISuggestionAction(
    suggestionId: string | undefined | null,
    action: AISuggestionAction,
    payload: {
      entryId?: string
      clientEntryKey?: string
      field?: string
      acceptedContent?: unknown
      finalContent?: unknown
      metadata?: Record<string, unknown>
    } = {}
  ) {
    if (!suggestionId) return
    void $fetch(`/api/ai/suggestions/${suggestionId}/action`, {
      method: 'POST',
      body: {
        action,
        ...payload
      }
    }).catch((error) => {
      console.warn('Failed to log AI suggestion action:', error)
    })
  }

  function trackAcceptedAISuggestion(tracker: AcceptedAITracker) {
    const key = `${tracker.entryKey}:${tracker.field}`
    acceptedAITrackers.value.set(key, tracker)
    acceptedAITrackers.value = new Map(acceptedAITrackers.value)
  }

  function markModifiedAISuggestionsForEntry(entry: Entry) {
    const entryKey = getEntryIdString(entry)
    const realEntryId = getRealEntryId(entry) || entry.id
    const definitionTracker = acceptedAITrackers.value.get(`${entryKey}:definition`)
    if (definitionTracker) {
      const currentDefinition = entry.senses?.[0]?.definition
      if (normalizeAICompareValue(currentDefinition) !== normalizeAICompareValue(definitionTracker.acceptedContent)) {
        logAISuggestionAction(definitionTracker.suggestionId, 'modified', {
          entryId: realEntryId,
          clientEntryKey: entryKey,
          field: 'senses.0.definition',
          finalContent: currentDefinition,
          metadata: { previousAction: 'accepted' }
        })
      }
    }

    const themeTracker = acceptedAITrackers.value.get(`${entryKey}:theme`)
    if (themeTracker) {
      const acceptedTheme = themeTracker.acceptedContent as Partial<{ level1Id: number; level2Id: number; level3Id: number }>
      const currentTheme = getThemeActionContent(entry)
      const changed = acceptedTheme.level1Id !== currentTheme.level1Id || acceptedTheme.level2Id !== currentTheme.level2Id || acceptedTheme.level3Id !== currentTheme.level3Id
      if (changed) {
        logAISuggestionAction(themeTracker.suggestionId, 'modified', {
          entryId: realEntryId,
          clientEntryKey: entryKey,
          field: 'theme',
          finalContent: currentTheme,
          metadata: { previousAction: 'accepted' }
        })
      }
    }

    const examplesTracker = acceptedAITrackers.value.get(`${entryKey}:examples`)
    if (examplesTracker) {
      const currentExamples = entry.senses?.[0]?.examples ?? []
      if (JSON.stringify(currentExamples) !== JSON.stringify(examplesTracker.acceptedContent)) {
        logAISuggestionAction(examplesTracker.suggestionId, 'modified', {
          entryId: realEntryId,
          clientEntryKey: entryKey,
          field: 'senses.0.examples',
          finalContent: currentExamples,
          metadata: { previousAction: 'accepted' }
        })
      }
    }
  }

  function clearAcceptedAITrackersForEntry(entry: Entry) {
    const entryKey = getEntryIdString(entry)
    acceptedAITrackers.value.delete(`${entryKey}:definition`)
    acceptedAITrackers.value.delete(`${entryKey}:theme`)
    acceptedAITrackers.value.delete(`${entryKey}:examples`)
    acceptedAITrackers.value = new Map(acceptedAITrackers.value)
  }

  function migrateAcceptedAITrackersEntryId(prevId: string, nextId: string) {
    const nextTrackers = new Map<string, AcceptedAITracker>()
    acceptedAITrackers.value.forEach((tracker, key) => {
      if (key.startsWith(`${prevId}:`)) {
        const field = key.slice(prevId.length + 1) as AcceptedAIField
        nextTrackers.set(`${nextId}:${field}`, { ...tracker, entryKey: nextId, entryId: nextId })
      } else {
        nextTrackers.set(key, tracker)
      }
    })
    acceptedAITrackers.value = nextTrackers
  }

  function clearPendingSuggestionForCurrentCell() {
    if (editingCell.value && aiSuggestionForField.value) {
      const key = `${String(editingCell.value.entryId)}-${aiSuggestionForField.value}`
      pendingAISuggestions.value.delete(key)
      pendingAISuggestions.value = new Map(pendingAISuggestions.value)
    }
  }

  function formatThemeSuggestion(s: { level1Name: string; level2Name: string; level3Name: string } | undefined): string {
    if (!s) return ''
    return `${s.level3Name} (${s.level1Name} > ${s.level2Name})`
  }

  async function triggerAISuggestion(entry: Entry, field: string, value: string) {
    if (!(entry as any)._isNew) return

    if (aiDebounceTimer.value) {
      clearTimeout(aiDebounceTimer.value)
      aiDebounceTimer.value = null
    }
    if (aiSuggestAbortController.value) {
      aiSuggestAbortController.value.abort()
      aiSuggestAbortController.value = null
    }

    const headword = entry.headword?.display?.trim() || ''
    if (field === 'phonetic' && headword.length >= 1) {
      const entryId = getEntryIdString(entry)
      aiDebounceTimer.value = setTimeout(async () => {
        aiSuggestAbortController.value = new AbortController()
        const signal = aiSuggestAbortController.value.signal
        aiLoadingInlineFor.value = { entryId, field: 'definition' }
        aiInlineError.value = null
        aiLoading.value = true
        try {
          const firstDefinition = entry.senses?.[0]?.definition?.trim()
          const categorizeBody: any = {
            expression: headword,
            clientEntryKey: entryId,
            entryId: getRealEntryId(entry),
            field: 'theme',
            originalContent: entry.theme ?? {}
          }
          if (firstDefinition) {
            categorizeBody.context = firstDefinition
          }

          const [definitionResponse, categorizeResponse] = await Promise.all([
            $fetch<{ success: boolean; data?: { definition?: string; suggestionId?: string } }>('/api/ai/definitions', {
              method: 'POST',
              body: {
                expression: headword,
                region: 'hongkong',
                clientEntryKey: entryId,
                entryId: getRealEntryId(entry),
                field: 'senses.0.definition',
                originalContent: entry.senses?.[0]?.definition ?? ''
              },
              signal
            }),
            $fetch<{ success: boolean; data?: { themeId?: number; confidence?: number; explanation?: string; suggestionId?: string } }>('/api/ai/categorize', {
              method: 'POST',
              body: categorizeBody,
              signal
            }).catch(e => {
              if (e?.name === 'AbortError') throw e
              console.error('AI categorization error:', e)
              return null
            })
          ])

          const currentEntry = currentPageEntries.value.find(e => getEntryIdString(e) === entryId)
          const currentHeadword = currentEntry?.headword?.display?.trim() || ''
          if (currentHeadword !== headword) return

          if (definitionResponse?.success && definitionResponse.data?.definition) {
            const suggestionText = `建議釋義: ${definitionResponse.data.definition}`
            const targetField = 'definition'
            aiSuggestion.value = suggestionText
            aiSuggestionId.value = definitionResponse.data.suggestionId || null
            aiSuggestionForField.value = targetField
            const stillEditingThisCell = editingCell.value && String(editingCell.value.entryId) === entryId && editingCell.value.field === targetField
            if (!stillEditingThisCell) {
              const key = `${entryId}-${targetField}`
              pendingAISuggestions.value.set(key, { entryId, field: targetField, text: suggestionText, suggestionId: definitionResponse.data.suggestionId })
              pendingAISuggestions.value = new Map(pendingAISuggestions.value)
              aiSuggestion.value = null
              aiSuggestionId.value = null
              aiSuggestionForField.value = null
            }
          }

          if (categorizeResponse?.success && categorizeResponse.data?.themeId) {
            const themeId = categorizeResponse.data.themeId
            const theme = getThemeById(themeId)
            if (theme) {
              themeAISuggestions.value.set(entryId, {
                suggestionId: categorizeResponse.data.suggestionId,
                level1Name: theme.level1Name,
                level2Name: theme.level2Name,
                level3Name: theme.level3Name,
                level1Id: theme.level1Id,
                level2Id: theme.level2Id,
                level3Id: theme.level3Id,
                confidence: categorizeResponse.data.confidence,
                explanation: categorizeResponse.data.explanation
              })
              themeAISuggestions.value = new Map(themeAISuggestions.value)
            }
          }
        } catch (error: any) {
          const isAborted =
            error?.name === 'AbortError' ||
            error?.cause?.name === 'AbortError' ||
            (typeof error?.message === 'string' && error.message.toLowerCase().includes('abort'))
          if (isAborted) return
          console.error('AI suggestion error:', error)
          const message = error?.data?.message || error?.message || '釋義建議暫時無法生成'
          aiInlineError.value = { entryId, field: 'definition', message }
        } finally {
          if (aiLoadingInlineFor.value?.entryId === entryId) {
            aiLoadingInlineFor.value = null
          }
          aiLoading.value = false
          aiSuggestAbortController.value = null
        }
      }, 800)
    }
  }

  async function generateAIExamples(entry: Entry) {
    if (!entry.headword?.display || !entry.senses?.[0]?.definition) {
      alert('請先填寫詞條文本和釋義')
      return
    }
    aiLoadingFor.value = { entryKey: getEntryKey(entry), action: 'examples' }
    try {
      const entryKey = getEntryIdString(entry)
      const response = await $fetch<{ success: boolean; data?: { examples?: Array<{ sentence?: string; text?: string; explanation?: string; translation?: string; scenario?: string }>; suggestionId?: string } }>('/api/ai/examples', {
        method: 'POST',
        body: {
          expression: entry.headword!.display,
          definition: entry.senses[0].definition,
          region: 'hongkong',
          clientEntryKey: entryKey,
          entryId: getRealEntryId(entry),
          field: 'senses.0.examples',
          originalContent: entry.senses?.[0]?.examples ?? []
        }
      })
      const examplesData = response.data?.examples
      if (response.success && Array.isArray(examplesData) && examplesData.length > 0) {
        if (!entry.senses?.length) entry.senses = [{ definition: '', examples: [] }]
        const firstSense = entry.senses[0]
        if (firstSense) {
          if (!firstSense.examples) firstSense.examples = []
          const examples = firstSense.examples
          const acceptedExamples = examplesData.map((ex: any) => ({
            text: ex.sentence || ex.text,
            translation: ex.explanation || ex.translation,
            scenario: ex.scenario,
            source: 'ai_generated'
          }))
          examples.push(...acceptedExamples)
          logAISuggestionAction(response.data?.suggestionId, 'accepted', {
            entryId: getRealEntryId(entry),
            clientEntryKey: entryKey,
            field: 'senses.0.examples',
            acceptedContent: acceptedExamples,
            metadata: { source: 'entries_table' }
          })
          if (response.data?.suggestionId) {
            trackAcceptedAISuggestion({
              suggestionId: response.data.suggestionId,
              entryKey,
              entryId: getRealEntryId(entry),
              field: 'examples',
              acceptedContent: acceptedExamples
            })
          }
        }
        ;(entry as any)._isDirty = true
      }
    } catch (error) {
      console.error('AI examples generation error:', error)
      alert('生成例句失敗')
    } finally {
      aiLoadingFor.value = null
    }
  }

  async function generateAIDefinition(entry: Entry) {
    if (!entry.headword?.display) {
      alert('請先填寫詞條文本')
      return
    }
    const key = getEntryKey(entry)
    aiLoadingFor.value = { entryKey: key, action: 'definition' }
    try {
      const entryKey = getEntryIdString(entry)
      const response: any = await $fetch('/api/ai/definitions', {
        method: 'POST',
        body: {
          expression: entry.headword.display,
          region: 'hongkong',
          clientEntryKey: entryKey,
          entryId: getRealEntryId(entry),
          field: 'senses.0.definition',
          originalContent: entry.senses?.[0]?.definition ?? ''
        }
      })
      const data = response?.data
      if (response?.success === true && data && typeof data.definition === 'string') {
        definitionAISuggestions.value.set(entryKey, {
          suggestionId: data.suggestionId,
          definition: data.definition,
          usageNotes: data.usageNotes,
          formalityLevel: data.formalityLevel
        })
        definitionAISuggestions.value = new Map(definitionAISuggestions.value)
      } else {
        alert('AI 未能生成釋義，請檢查服務端日誌')
      }
    } catch (error: any) {
      console.error('[Frontend] AI definition generation error:', error)
      const errMsg = error?.data?.message || error?.message || JSON.stringify(error)
      alert(`生成釋義失敗: ${errMsg}`)
    } finally {
      aiLoadingFor.value = null
    }
  }

  async function generateAICategorization(entry: Entry) {
    if (!entry.headword?.display) {
      alert('請先填寫詞條文本')
      return
    }
    aiLoadingFor.value = { entryKey: getEntryKey(entry), action: 'theme' }
    try {
      const entryKey = getEntryIdString(entry)
      const firstDefinition = entry.senses?.[0]?.definition?.trim()
      const body: any = {
        expression: entry.headword.display,
        clientEntryKey: entryKey,
        entryId: getRealEntryId(entry),
        field: 'theme',
        originalContent: entry.theme ?? {}
      }
      if (firstDefinition) {
        body.context = firstDefinition
      }

      const response: any = await $fetch('/api/ai/categorize', {
        method: 'POST',
        body
      })
      if (response.success && response.data?.themeId) {
        const themeId = response.data.themeId
        const theme = getThemeById(themeId)
        if (theme) {
          themeAISuggestions.value.set(entryKey, {
            suggestionId: response.data.suggestionId,
            level1Name: theme.level1Name,
            level2Name: theme.level2Name,
            level3Name: theme.level3Name,
            level1Id: theme.level1Id,
            level2Id: theme.level2Id,
            level3Id: theme.level3Id,
            confidence: response.data.confidence,
            explanation: response.data.explanation
          })
          themeAISuggestions.value = new Map(themeAISuggestions.value)
        }
      } else {
        alert('AI 未能生成分類，請重試或手動選擇')
      }
    } catch (error: any) {
      console.error('AI categorization error:', error)
      alert(`AI分類失敗: ${error?.data?.message || error?.message || '未知錯誤'}`)
    } finally {
      aiLoadingFor.value = null
    }
  }

  function retryInlineAISuggestion(entry: Entry) {
    const entryId = getEntryIdString(entry)
    if (aiInlineError.value?.entryId === entryId) {
      aiInlineError.value = null
    }
    const phoneticValue = entry.phonetic?.jyutping?.join(' ') ?? (entry as any).phoneticNotation ?? ''
    triggerAISuggestion(entry, 'phonetic', phoneticValue)
  }

  function acceptAISuggestion() {
    if (!aiSuggestion.value) return
    const isDefinition = aiSuggestionForField.value === 'definition'
    const suggestionId = aiSuggestionId.value
    let defText = aiSuggestion.value
    const defMatch = aiSuggestion.value.match(/^建議釋義: (.+)$/s)
    if (defMatch) defText = defMatch[1]?.trim() ?? aiSuggestion.value

    if (isDefinition && editingCell.value?.entryId !== undefined) {
      const entry = currentPageEntries.value.find(e => getEntryIdString(e) === String(editingCell.value!.entryId))
      if (entry) {
        const entryKey = getEntryIdString(entry)
        if (!entry.senses || entry.senses.length === 0) {
          entry.senses = [{ definition: defText, examples: [] }]
        } else {
          const first = entry.senses[0]
          if (first) first.definition = defText
        }
        ;(entry as any)._isDirty = true
        logAISuggestionAction(suggestionId, 'accepted', {
          entryId: getRealEntryId(entry),
          clientEntryKey: entryKey,
          field: 'senses.0.definition',
          acceptedContent: defText
        })
        if (suggestionId) {
          trackAcceptedAISuggestion({
            suggestionId,
            entryKey,
            entryId: getRealEntryId(entry),
            field: 'definition',
            acceptedContent: defText
          })
        }
      }
      editValue.value = defText
    } else {
      editValue.value = aiSuggestion.value
    }
    clearPendingSuggestionForCurrentCell()
    aiSuggestion.value = null
    aiSuggestionId.value = null
    aiSuggestionForField.value = null
  }

  function dismissAISuggestion() {
    const entryId = editingCell.value?.entryId ? String(editingCell.value.entryId) : undefined
    const field = aiSuggestionForField.value
    logAISuggestionAction(aiSuggestionId.value, 'rejected', {
      clientEntryKey: entryId,
      field: field === 'definition' ? 'senses.0.definition' : field || undefined
    })
    clearPendingSuggestionForCurrentCell()
    aiSuggestion.value = null
    aiSuggestionId.value = null
    aiSuggestionForField.value = null
  }

  function acceptThemeAI(entry: Entry) {
    const keyStr = String(getEntryKey(entry))
    const suggestion = themeAISuggestions.value.get(keyStr)
    if (suggestion) {
      if (!entry.theme) entry.theme = {}
      entry.theme.level1 = suggestion.level1Name
      entry.theme.level2 = suggestion.level2Name
      entry.theme.level3 = suggestion.level3Name
      entry.theme.level1Id = suggestion.level1Id
      entry.theme.level2Id = suggestion.level2Id
      entry.theme.level3Id = suggestion.level3Id
      ;(entry as any)._isDirty = true
      const acceptedContent = getThemeActionContent(entry)
      logAISuggestionAction(suggestion.suggestionId, 'accepted', {
        entryId: getRealEntryId(entry),
        clientEntryKey: keyStr,
        field: 'theme',
        acceptedContent
      })
      if (suggestion.suggestionId) {
        trackAcceptedAISuggestion({
          suggestionId: suggestion.suggestionId,
          entryKey: keyStr,
          entryId: getRealEntryId(entry),
          field: 'theme',
          acceptedContent
        })
      }
      if (editingCell.value && String(editingCell.value.entryId) === keyStr && editingCell.value.field === 'theme') {
        editValue.value = suggestion.level3Id as any
      }
      themeAISuggestions.value.delete(keyStr)
      themeAISuggestions.value = new Map(themeAISuggestions.value)
    }
  }

  function dismissThemeAI(entry: Entry) {
    const key = String(getEntryKey(entry))
    const suggestion = themeAISuggestions.value.get(key)
    logAISuggestionAction(suggestion?.suggestionId, 'rejected', {
      entryId: getRealEntryId(entry),
      clientEntryKey: key,
      field: 'theme'
    })
    themeAISuggestions.value.delete(key)
    themeAISuggestions.value = new Map(themeAISuggestions.value)
  }

  function clearThemeSuggestionForEntry(entry: Entry) {
    themeAISuggestions.value.delete(String(getEntryKey(entry)))
    themeAISuggestions.value = new Map(themeAISuggestions.value)
  }

  function acceptDefinitionAI(entry: Entry) {
    const key = String(getEntryKey(entry))
    const suggestion = definitionAISuggestions.value.get(key)
    if (!suggestion) return
    if (!entry.senses || entry.senses.length === 0) {
      entry.senses = [{ definition: suggestion.definition, examples: [] }]
    } else {
      const first = entry.senses[0]
      if (first) {
        entry.senses[0] = { ...first, definition: suggestion.definition }
      }
      entry.senses = [...entry.senses]
    }
    if (suggestion.usageNotes) {
      if (!entry.meta) entry.meta = {}
      entry.meta.usage = suggestion.usageNotes
    }
    if (suggestion.formalityLevel) {
      const formalityMap: Record<string, string> = {
        formal: '文雅',
        neutral: '中性',
        informal: '口語',
        slang: '口語',
        vulgar: '粗俗'
      }
      if (!entry.meta) entry.meta = {}
      entry.meta.register = (formalityMap[suggestion.formalityLevel] || '中性') as Register
    }
    ;(entry as any)._isDirty = true
    logAISuggestionAction(suggestion.suggestionId, 'accepted', {
      entryId: getRealEntryId(entry),
      clientEntryKey: key,
      field: 'senses.0.definition',
      acceptedContent: {
        definition: suggestion.definition,
        usageNotes: suggestion.usageNotes,
        formalityLevel: suggestion.formalityLevel
      }
    })
    if (suggestion.suggestionId) {
      trackAcceptedAISuggestion({
        suggestionId: suggestion.suggestionId,
        entryKey: key,
        entryId: getRealEntryId(entry),
        field: 'definition',
        acceptedContent: suggestion.definition
      })
    }
    definitionAISuggestions.value.delete(key)
    definitionAISuggestions.value = new Map(definitionAISuggestions.value)
  }

  function dismissDefinitionAI(entry: Entry) {
    const key = String(getEntryKey(entry))
    const suggestion = definitionAISuggestions.value.get(key)
    logAISuggestionAction(suggestion?.suggestionId, 'rejected', {
      entryId: getRealEntryId(entry),
      clientEntryKey: key,
      field: 'senses.0.definition'
    })
    definitionAISuggestions.value.delete(key)
    definitionAISuggestions.value = new Map(definitionAISuggestions.value)
  }

  return {
    aiSuggestion,
    aiSuggestionId,
    aiSuggestionForField,
    pendingAISuggestions,
    themeAISuggestions,
    definitionAISuggestions,
    aiLoadingFor,
    aiLoading,
    aiLoadingInlineFor,
    aiInlineError,
    formatThemeSuggestion,
    triggerAISuggestion,
    generateAIExamples,
    generateAIDefinition,
    generateAICategorization,
    clearPendingSuggestionForCurrentCell,
    retryInlineAISuggestion,
    acceptAISuggestion,
    dismissAISuggestion,
    acceptThemeAI,
    dismissThemeAI,
    clearThemeSuggestionForEntry,
    acceptDefinitionAI,
    dismissDefinitionAI,
    markModifiedAISuggestionsForEntry,
    clearAcceptedAITrackersForEntry,
    migrateAcceptedAITrackersEntryId
  }
}
