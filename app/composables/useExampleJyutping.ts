/**
 * 例句粵拼自動生成
 *
 * 與詞頭粵拼生成共用 queryJyutdict + getSuggestedPronunciation，
 * 但在逐字之間加入延遲，避免長例句發出過多請求壓垮泛粵典服務器。
 * 結果直接返回——不顯示來源、不彈出建議行。
 */
import { queryJyutdict, getSuggestedPronunciation } from './useJyutdict'

const CN_PUNCTUATION_TO_EN: Record<string, string> = {
  '，': ',',
  '。': '.',
  '！': '!',
  '？': '?',
  '；': ';',
  '：': ':',
  '、': ',',
  '（': '(',
  '）': ')',
  '【': '[',
  '】': ']',
  '「': '"',
  '」': '"',
  '『': '"',
  '』': '"',
  '…': '...',
  '—': '—',
  '～': '~',
}

const NO_SPACE_BEFORE = /^[,.!?;:)\]」』】》>%]$/

function joinJyutpingTokens(tokens: string[]): string {
  let out = ''
  for (const token of tokens) {
    if (!token) continue
    if (NO_SPACE_BEFORE.test(token)) {
      out = out.trimEnd() + token + ' '
    } else if (/^[(\[「『【《<]$/.test(token)) {
      out += token
    } else {
      out += token + ' '
    }
  }
  return out.trim()
}

export function useExampleJyutping() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  let abortController: AbortController | null = null

  /**
   * 為例句文本生成粵拼字符串
   *
   * @param text         例句文本
   * @param dialectName  方言名稱（如「香港」「廣州」）
   * @param onProgress   進度回調——每查到一個字的粵拼即調用，傳入當前累積的完整粵拼字符串
   * @param delayMs      逐字之間的延遲（毫秒），預設 400ms
   * @returns            空格分隔的粵拼字符串；若中止則返回空串
   */
  async function generate(
    text: string,
    dialectName: string,
    onProgress?: (partial: string) => void,
    delayMs: number = 400
  ): Promise<string> {
    if (!text || !dialectName) return ''

    // 取消正在進行的生成
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    isLoading.value = true
    error.value = null

    try {
      const chars = [...text] // Unicode 安全拆分
      const results: string[] = []

      for (let i = 0; i < chars.length; i++) {
        if (signal.aborted) break

        const char = chars[i]!
        if (!char) continue

        // 只對漢字（Han script）查詢
        if (/\p{Script=Han}/u.test(char)) {
          try {
            const charData = await queryJyutdict(char, dialectName)
            const pronunciation = getSuggestedPronunciation(charData, dialectName)
            results.push(pronunciation || `[${char}]`)
          } catch (e: any) {
            // 若是中止信號則向上拋出，否則保留原字標記
            if (e?.name === 'AbortError') throw e
            results.push(`[${char}]`)
          }

          // 每查到一個字就通知調用方（實現逐字上屏）
          if (onProgress) {
            onProgress(joinJyutpingTokens(results))
          }

          // 逐字延遲（僅在查詢後，且後續還有漢字時），避免對泛粵典服務器造成瞬間大量請求
          const hasRemainingHan = chars.slice(i + 1).some(c => /\p{Script=Han}/u.test(c))
          if (delayMs > 0 && hasRemainingHan) {
            await new Promise((resolve) => setTimeout(resolve, delayMs))
            if (signal.aborted) break
          }
        } else if (CN_PUNCTUATION_TO_EN[char] !== undefined) {
          // 中文標點轉英文標點，令粵拼與文字一一對應
          results.push(CN_PUNCTUATION_TO_EN[char])
          if (onProgress) {
            onProgress(joinJyutpingTokens(results))
          }
        }
        // 其他字符（空格、數字、英文標點等）跳過
      }

      // 被中止則返回空串，避免寫入不完整的結果
      if (signal.aborted) return ''

      return joinJyutpingTokens(results)
    } catch (e: any) {
      if (e?.name === 'AbortError') return ''
      error.value = e instanceof Error ? e.message : '生成粵拼失敗'
      return ''
    } finally {
      isLoading.value = false
      abortController = null
    }
  }

  /**
   * 取消當前生成
   */
  function cancel() {
    abortController?.abort()
    abortController = null
    isLoading.value = false
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    generate,
    cancel
  }
}
