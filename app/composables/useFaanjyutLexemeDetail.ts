import type { FaanJyutLexemeDetail } from '~/types/faanjyut'

/**
 * 泛粵詞條詳情（FaanjyutV1Design §7、§12：GET /api/faanjyut/lexemes/:id）。
 * 響應信封 { success, data, writeEnabled, canEditComposite }；404 時 errorMessage 記錄「詞條不存在」。
 */
export function useFaanjyutLexemeDetail() {
  const data = ref<FaanJyutLexemeDetail | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  /** 全局寫入旗標（false = 全頁唯讀，含綜合音編輯） */
  const writeEnabled = ref(false)
  /** 本詞條綜合音可編輯（admin && writeEnabled，服務端判定） */
  const canEditComposite = ref(false)

  async function fetchLexeme(id: string): Promise<FaanJyutLexemeDetail | null> {
    loading.value = true
    errorMessage.value = null
    try {
      const response = await $fetch<{
        success: boolean
        data: FaanJyutLexemeDetail
        writeEnabled: boolean
        canEditComposite: boolean
      }>(
        `/api/faanjyut/lexemes/${encodeURIComponent(id)}`
      )
      data.value = response.data
      writeEnabled.value = response.writeEnabled === true
      canEditComposite.value = response.canEditComposite === true
      return response.data
    } catch (error: any) {
      data.value = null
      writeEnabled.value = false
      canEditComposite.value = false
      errorMessage.value = error?.data?.message || error?.message || '獲取詞條詳情失敗'
      return null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, errorMessage, writeEnabled, canEditComposite, fetchLexeme }
}
