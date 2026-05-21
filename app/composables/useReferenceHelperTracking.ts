export type ReferenceHelperType =
  | 'jyutdict_pronunciation'
  | 'jyutjyu_template'
  | 'internal_dialect_template'
  | 'manual_reference_search'
  | 'morpheme_search'
  | 'morpheme_linked'
  | 'morpheme_unlinked'
  | 'external_etymon'

export type ReferenceHelperAction = 'accepted' | 'rejected' | 'modified' | 'pending'

export interface ReferenceHelperEventPayload {
  entryId?: string
  clientEntryKey?: string
  lexemeId?: string
  helperType: ReferenceHelperType
  sourceProvider?: 'jyutdict' | 'jyutjyu' | 'internal' | 'manual' | 'morpheme' | 'external_etymon'
  field?: string
  sourceEntryId?: string
  sourceLexemeId?: string
  query?: string
  resultCount?: number
  originalContent?: unknown
  suggestedContent?: unknown
  acceptedContent?: unknown
  finalContent?: unknown
  userAction?: ReferenceHelperAction
  metadata?: Record<string, unknown>
}

export interface ReferenceHelperActionPayload {
  entryId?: string
  clientEntryKey?: string
  lexemeId?: string
  field?: string
  acceptedContent?: unknown
  finalContent?: unknown
  metadata?: Record<string, unknown>
}

export function useReferenceHelperTracking() {
  async function logReferenceHelperEvent(payload: ReferenceHelperEventPayload): Promise<string | null> {
    try {
      const response = await $fetch<{ success: boolean; data?: { id: string } }>('/api/reference-helpers/events', {
        method: 'POST',
        body: payload
      })
      return response.data?.id || null
    } catch (error) {
      console.warn('Failed to log reference helper event:', error)
      return null
    }
  }

  function logReferenceHelperAction(
    id: string | null | undefined,
    action: Exclude<ReferenceHelperAction, 'pending'>,
    payload: ReferenceHelperActionPayload = {}
  ) {
    if (!id) return

    void $fetch(`/api/reference-helpers/events/${id}/action`, {
      method: 'POST',
      body: {
        action,
        ...payload
      }
    }).catch((error) => {
      console.warn('Failed to log reference helper action:', error)
    })
  }

  return {
    logReferenceHelperEvent,
    logReferenceHelperAction
  }
}
