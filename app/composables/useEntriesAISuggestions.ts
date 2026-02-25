import type { Ref } from 'vue'
import { ref } from 'vue'
import { getThemeById } from '~/composables/useThemeData'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import type { Entry, Register } from '~/types'

export interface ThemeAISuggestion {
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
  definition: string
  usageNotes?: string
  formalityLevel?: string
}

export interface UseEntriesAISuggestionsOptions {
  editingCell: Ref<{ entryId: string; field: string } | null>
  editValue: Ref<any>
  currentPageEntries: Ref<Entry[]>
}

export function useEntriesAISuggestions(options: UseEntriesAISuggestionsOptions) {
  const { editingCell, editValue, currentPageEntries } = options

  const aiSuggestion = ref<string | null>(null)
  const aiSuggestionForField = ref<string | null>(null)
  const pendingAISuggestions = ref<Map<string, { entryId: string; field: string; text: string }>>(new Map())
  const aiDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const themeAISuggestions = ref<Map<string, ThemeAISuggestion>>(new Map())
  const definitionAISuggestions = ref<Map<string, DefinitionAISuggestion>>(new Map())
  const aiLoadingFor = ref<{ entryKey: string | number; action: 'definition' | 'theme' | 'examples' } | null>(null)
  const aiLoading = ref(false)
  const aiSuggestAbortController = ref<AbortController | null>(null)
  const aiLoadingInlineFor = ref<{ entryId: string; field: string } | null>(null)
  const aiInlineError = ref<{ entryId: string; field: string; message: string } | null>(null)

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
          const categorizeBody: any = { expression: headword }
          if (firstDefinition) {
            categorizeBody.context = firstDefinition
          }

          const [definitionResponse, categorizeResponse] = await Promise.all([
            $fetch<{ success: boolean; data?: { definition?: string } }>('/api/ai/definitions', {
              method: 'POST',
              body: { expression: headword, region: 'hongkong' },
              signal
            }),
            $fetch<{ success: boolean; data?: { themeId?: number; confidence?: number; explanation?: string } }>('/api/ai/categorize', {
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
            aiSuggestionForField.value = targetField
            const stillEditingThisCell = editingCell.value && String(editingCell.value.entryId) === entryId && editingCell.value.field === targetField
            if (!stillEditingThisCell) {
              const key = `${entryId}-${targetField}`
              pendingAISuggestions.value.set(key, { entryId, field: targetField, text: suggestionText })
              pendingAISuggestions.value = new Map(pendingAISuggestions.value)
              aiSuggestion.value = null
              aiSuggestionForField.value = null
            }
          }

          if (categorizeResponse?.success && categorizeResponse.data?.themeId) {
            const themeId = categorizeResponse.data.themeId
            const theme = getThemeById(themeId)
            if (theme) {
              themeAISuggestions.value.set(entryId, {
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
      const response = await $fetch<{ success: boolean; data?: Array<{ sentence?: string; text?: string; explanation?: string; translation?: string; scenario?: string }> }>('/api/ai/examples', {
        method: 'POST',
        body: {
          expression: entry.headword!.display,
          definition: entry.senses[0].definition,
          region: 'hongkong'
        }
      })
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        if (!entry.senses?.length) entry.senses = [{ definition: '', examples: [] }]
        const firstSense = entry.senses[0]
        if (firstSense) {
          if (!firstSense.examples) firstSense.examples = []
          const examples = firstSense.examples
          response.data.forEach((ex: any) => {
            examples.push({
              text: ex.sentence || ex.text,
              translation: ex.explanation || ex.translation,
              scenario: ex.scenario,
              source: 'ai_generated'
            })
          })
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
      const response: any = await $fetch('/api/ai/definitions', {
        method: 'POST',
        body: { expression: entry.headword.display, region: 'hongkong' }
      })
      const data = response?.data
      if (response?.success === true && data && typeof data.definition === 'string') {
        const entryKey = String(getEntryKey(entry))
        definitionAISuggestions.value.set(entryKey, {
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
      const firstDefinition = entry.senses?.[0]?.definition?.trim()
      const body: any = { expression: entry.headword.display }
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
          const entryKey = String(getEntryKey(entry))
          themeAISuggestions.value.set(entryKey, {
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
    let defText = aiSuggestion.value
    const defMatch = aiSuggestion.value.match(/^建議釋義: (.+)$/s)
    if (defMatch) defText = defMatch[1]?.trim() ?? aiSuggestion.value

    if (isDefinition && editingCell.value?.entryId !== undefined) {
      const entry = currentPageEntries.value.find(e => getEntryIdString(e) === String(editingCell.value!.entryId))
      if (entry) {
        if (!entry.senses || entry.senses.length === 0) {
          entry.senses = [{ definition: defText, examples: [] }]
        } else {
          const first = entry.senses[0]
          if (first) first.definition = defText
        }
        ;(entry as any)._isDirty = true
      }
      editValue.value = defText
    } else {
      editValue.value = aiSuggestion.value
    }
    clearPendingSuggestionForCurrentCell()
    aiSuggestion.value = null
    aiSuggestionForField.value = null
  }

  function dismissAISuggestion() {
    clearPendingSuggestionForCurrentCell()
    aiSuggestion.value = null
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
      if (editingCell.value && String(editingCell.value.entryId) === keyStr && editingCell.value.field === 'theme') {
        editValue.value = suggestion.level3Id as any
      }
      themeAISuggestions.value.delete(keyStr)
      themeAISuggestions.value = new Map(themeAISuggestions.value)
    }
  }

  function dismissThemeAI(entry: Entry) {
    themeAISuggestions.value.delete(String(getEntryKey(entry)))
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
    definitionAISuggestions.value.delete(key)
    definitionAISuggestions.value = new Map(definitionAISuggestions.value)
  }

  function dismissDefinitionAI(entry: Entry) {
    definitionAISuggestions.value.delete(String(getEntryKey(entry)))
    definitionAISuggestions.value = new Map(definitionAISuggestions.value)
  }

  return {
    aiSuggestion,
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
    dismissDefinitionAI
  }
}
