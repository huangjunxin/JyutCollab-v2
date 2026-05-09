import type { EntriesSharedViewState } from '~/utils/entriesSharedView'

export type SavedViewVisibility = 'public' | 'private'

export interface SavedViewRecord {
  id: string
  name: string
  creatorId: string
  creatorName?: string
  visibility: SavedViewVisibility
  state: EntriesSharedViewState
  createdAt: string
  updatedAt: string
}

export interface SaveViewInput {
  name: string
  visibility: SavedViewVisibility
  state: EntriesSharedViewState
}

export interface UpdateViewInput {
  id: string
  name?: string
  visibility?: SavedViewVisibility
  state?: EntriesSharedViewState
}

interface SavedViewsApiResponse<T> {
  success?: boolean
  data?: T
}

const SAVE_VIEW_ERROR = '儲存視圖失敗，請稍後再試'
const UPDATE_VIEW_ERROR = '更新視圖失敗，請稍後再試'
const DELETE_VIEW_ERROR = '刪除視圖失敗，請稍後再試'
const VIEW_NOT_FOUND_ERROR = '視圖不存在或已被刪除'

function extractErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { data?: { message?: string; statusMessage?: string; error?: string }; message?: string }
  return candidate?.data?.message || candidate?.data?.statusMessage || candidate?.data?.error || candidate?.message || fallback
}

export function useEntriesSavedViews() {
  const { user } = useAuth()
  const views = ref<SavedViewRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const currentUserId = computed(() => user.value?.id ?? '')
  const myViews = computed(() => views.value.filter(view => view.creatorId === currentUserId.value))
  const publicViews = computed(() => views.value.filter(view => view.visibility === 'public' && view.creatorId !== currentUserId.value))

  async function fetchViews(): Promise<SavedViewRecord[]> {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/views') as SavedViewsApiResponse<SavedViewRecord[]> | SavedViewRecord[]
      const nextViews = Array.isArray(response) ? response : response.data ?? []
      views.value = nextViews
      return nextViews
    } catch (err) {
      const message = extractErrorMessage(err, VIEW_NOT_FOUND_ERROR)
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createView(input: SaveViewInput): Promise<SavedViewRecord> {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch('/api/views', {
        method: 'POST',
        body: input
      }) as SavedViewsApiResponse<SavedViewRecord>
      const view = response.data ?? (response as SavedViewRecord)
      if (!view?.id) throw new Error(SAVE_VIEW_ERROR)
      views.value = [view, ...views.value.filter(existing => existing.id !== view.id)]
      return view
    } catch (err) {
      const message = extractErrorMessage(err, SAVE_VIEW_ERROR)
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  async function updateView(input: UpdateViewInput): Promise<SavedViewRecord> {
    isLoading.value = true
    error.value = null
    const { id, ...body } = input
    try {
      const response = await $fetch<SavedViewsApiResponse<SavedViewRecord>>(`/api/views/${id}`, {
        method: 'PUT',
        body
      })
      const view = response.data ?? (response as SavedViewRecord)
      if (!view?.id) throw new Error(UPDATE_VIEW_ERROR)
      views.value = views.value.map(existing => existing.id === view.id ? view : existing)
      return view
    } catch (err) {
      const message = extractErrorMessage(err, UPDATE_VIEW_ERROR)
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  async function deleteView(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      await $fetch(`/api/views/${id}`, { method: 'DELETE' })
      views.value = views.value.filter(view => view.id !== id)
    } catch (err) {
      const message = extractErrorMessage(err, DELETE_VIEW_ERROR)
      error.value = message
      throw new Error(message)
    } finally {
      isLoading.value = false
    }
  }

  async function getViewById(id: string): Promise<SavedViewRecord> {
    error.value = null
    try {
      const response = await $fetch<SavedViewsApiResponse<SavedViewRecord>>(`/api/views/${id}`)
      const view = response.data ?? (response as SavedViewRecord)
      if (!view?.id) throw new Error(VIEW_NOT_FOUND_ERROR)
      return view
    } catch (err) {
      const message = extractErrorMessage(err, VIEW_NOT_FOUND_ERROR)
      error.value = message
      throw new Error(message)
    }
  }

  return {
    views,
    myViews,
    publicViews,
    isLoading,
    error,
    fetchViews,
    createView,
    updateView,
    deleteView,
    getViewById
  }
}
