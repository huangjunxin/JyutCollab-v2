import type { FaanJyutLexemeDetail } from '~/types/faanjyut'

/**
 * 泛粵詞條詳情（FaanjyutV1Design §7、§12：GET /api/faanjyut/lexemes/:id）。
 * 響應信封 { success, data }；404 時 errorMessage 記錄「詞條不存在」。
 */
export function useFaanjyutLexemeDetail() {
  const data = ref<FaanJyutLexemeDetail | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  async function fetchLexeme(id: string): Promise<FaanJyutLexemeDetail | null> {
    loading.value = true
    errorMessage.value = null
    try {
      const response = await $fetch<{ success: boolean; data: FaanJyutLexemeDetail }>(
        `/api/faanjyut/lexemes/${encodeURIComponent(id)}`
      )
      data.value = response.data
      return response.data
    } catch (error: any) {
      data.value = null
      errorMessage.value = error?.data?.message || error?.message || '獲取詞條詳情失敗'
      return null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, errorMessage, fetchLexeme }
}
