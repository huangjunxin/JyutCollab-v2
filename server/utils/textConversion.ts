import * as OpenCC from 'opencc-js'

// 創建轉換器實例
const simplifiedToHongKong = OpenCC.Converter({ from: 'cn', to: 'hk' })
const traditionalToHongKong = OpenCC.Converter({ from: 't', to: 'hk' })

/**
 * 將任何中文文本轉換為香港繁體
 * 策略：總是嘗試簡體到香港繁體的轉換，然後再嘗試繁體標準化
 * @param text 輸入文本
 * @returns 轉換後的香港繁體文本
 */
export function convertToHongKongTraditional(text: string): string {
  if (!text || text.trim() === '') {
    return text
  }

  try {
    // 首先嚐試簡體到香港繁體的轉換
    const fromSimplified = simplifiedToHongKong(text)

    // 然後對結果進行繁體標準化（處理台灣繁體等變體）
    const fromTraditional = traditionalToHongKong(fromSimplified)

    return fromTraditional
  } catch (error) {
    console.error('Text conversion error:', error)
    // 如果轉換失敗，返回原文本
    return text
  }
}

/**
 * 檢查文本是否需要轉換（即轉換前後是否有差異）
 * @param original 原始文本
 * @param converted 轉換後文本
 * @returns 是否需要轉換
 */
export function needsConversion(original: string, converted: string): boolean {
  return original !== converted && original.trim() !== '' && converted.trim() !== ''
}

/**
 * 檢測文本主要包含的字符類型
 * @param original 原始文本
 * @param converted 轉換後文本
 * @returns 文本類型説明
 */
function detectTextType(original: string, converted: string): 'simplified' | 'traditional' | 'hongkong' {
  // 如果轉換後沒有變化，説明已經是香港繁體
  if (original === converted) {
    return 'hongkong'
  }

  // 如果有變化，測試是否包含簡體字
  const onlySimplifiedConversion = simplifiedToHongKong(original)
  if (onlySimplifiedConversion !== original) {
    return 'simplified'
  } else {
    return 'traditional'
  }
}

/**
 * 獲取轉換説明文本
 * @param original 原始文本
 * @param converted 轉換後文本
 * @returns 説明文本
 */
export function getConversionExplanation(original: string, converted: string): string {
  if (!needsConversion(original, converted)) {
    return '文本已為香港繁體，無需轉換'
  }

  const textType = detectTextType(original, converted)

  switch (textType) {
    case 'simplified':
      return '檢測到簡體字，已轉換為香港繁體'
    case 'traditional':
      return '檢測到其他繁體變體，已標準化為香港繁體'
    default:
      return '已轉換為香港繁體'
  }
}

/**
 * 批量轉換文本數組
 * @param texts 文本數組
 * @returns 轉換後的文本數組
 */
export function batchConvertToHongKongTraditional(texts: string[]): string[] {
  return texts.map(text => convertToHongKongTraditional(text))
}
