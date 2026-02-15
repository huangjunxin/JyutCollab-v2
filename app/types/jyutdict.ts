/**
 * 泛粵典 API 類型定義
 * 用於查詢粵拼發音建議
 */

// 通用字表 - 各地發音數據
export interface JyutdictRegionData {
  片區?: string
  市?: string
  管區?: string
  色?: string
  聲母?: string
  韻核?: string
  韻尾?: string
  聲調?: string
  IPA?: string
  粵拼?: string
  註?: string
}

// 通用字表 - 單字數據
export interface JyutdictGeneralCharacter {
  字: string
  韻書?: unknown[][]
  各地: JyutdictRegionData[][]
}

// 泛粵字表 - 條目數據
export interface JyutdictSheetEntry {
  id?: string
  綜?: string // 綜合音
  釋?: string // 簡釋
  繁?: string // 繁體字
  [key: string]: unknown // 動態的方言點列
}

// 泛粵字表 - 列定義
export interface JyutdictColumn {
  id: number
  col: string // 列名，如 "港"、"穗"
  is_city: number // 1 表示是方言點列
  city?: string // 城市名，如 "香港"、"廣州"
  sub?: string // 子區，如 "斗山墟"
  fullname?: string // 完整名稱
  color?: string // 顯示顏色
}

// 泛粵字表 - Header 響應
export interface JyutdictHeaderResponse {
  __valid_options: JyutdictColumn[]
}

// 提取後的發音數據（用於 UI 展示）
export interface ExtractedPronunciation {
  char: string // 字符
  location: string // 地點名稱（市或 市(管區)）
  jyutping: string // 粵拼
  color?: string // 顏色
  note?: string // 註釋
  source: 'general' | 'sheet' // 來源
}

// 單字的所有發音
export interface CharPronunciationData {
  char: string
  generalPronunciations: ExtractedPronunciation[] // 通用字表發音
  sheetEntries: {
    summary?: string // 綜合音
    definition?: string // 釋義
    pronunciations: ExtractedPronunciation[] // 各地方音
  }[]
}

// 整個詞條的發音建議數據
export interface JyutdictSuggestionData {
  headword: string
  dialectName: string
  charData: CharPronunciationData[] // 每個字的數據
  suggestedPronunciation: string // 根據方言推薦的發音
  isLoading: boolean
  error?: string
}
