/**
 * 泛粵典查詢和發音提取邏輯
 * 用於粵拼建議功能
 */
import type {
  JyutdictGeneralCharacter,
  JyutdictSheetEntry,
  JyutdictColumn,
  JyutdictHeaderResponse,
  CharPronunciationData,
  ExtractedPronunciation
} from '~/types/jyutdict'

// 方言名稱到泛粵典城市名的映射
const DIALECT_TO_CITY_MAP: Record<string, string[]> = {
  '香港': ['香港'],
  '廣州': ['廣州', '穗'],
  '台山': ['台山', '台'],
  '澳門': ['澳門', '澳'],
  '順德': ['順德', '順'],
  '東莞': ['東莞', '莞'],
  '中山': ['中山', '香'],
  '新會': ['新會', '岡'],
  '江門': ['江門', '蓬'],
  '開平': ['開平', '開'],
  '恩平': ['恩平'],
  '鶴山': ['鶴山']
}

// 全局緩存列定義
let cachedColumns: JyutdictColumn[] | null = null

/**
 * 獲取泛粵字表的列定義
 */
async function fetchColumns(): Promise<JyutdictColumn[]> {
  if (cachedColumns) {
    return cachedColumns
  }

  try {
    const response = await fetch('/api/jyutdict/sheet?header')
    if (!response.ok) {
      throw new Error('Failed to fetch columns')
    }
    const data: JyutdictHeaderResponse = await response.json()
    cachedColumns = data.__valid_options || []
    return cachedColumns
  } catch (error) {
    console.error('Failed to fetch jyutdict columns:', error)
    return []
  }
}

/**
 * 從通用字表數據中提取發音
 */
function extractFromGeneralData(
  charData: JyutdictGeneralCharacter,
  targetCities: string[]
): ExtractedPronunciation[] {
  const results: ExtractedPronunciation[] = []

  if (!charData.各地 || !Array.isArray(charData.各地)) {
    return results
  }

  for (const regionGroup of charData.各地) {
    if (!Array.isArray(regionGroup)) continue

    for (const region of regionGroup) {
      if (!region || typeof region !== 'object') continue

      const locationName = region.管區
        ? `${region.市}(${region.管區})`
        : region.市 || ''

      // 構建粵拼（優先使用粵拼字段，否則拼接聲母韻核韻尾聲調）
      let jyutping = region.粵拼 || ''
      if (!jyutping) {
        jyutping = [
          region.聲母 || '',
          region.韻核 || '',
          region.韻尾 || '',
          region.聲調 || ''
        ].join('').trim()
      }

      if (!jyutping && region.IPA) {
        jyutping = region.IPA
      }

      if (jyutping) {
        results.push({
          char: charData.字,
          location: locationName,
          jyutping,
          color: region.色,
          note: region.註,
          source: 'general'
        })
      }
    }
  }

  return results
}

/**
 * 從泛粵字表數據中提取發音
 */
function extractFromSheetData(
  entries: JyutdictSheetEntry[],
  columns: JyutdictColumn[],
  char: string
): CharPronunciationData['sheetEntries'] {
  if (!entries || entries.length === 0) {
    return []
  }

  // 跳過第一行（表頭映射）
  const dataEntries = entries.slice(1).filter(
    (entry) => entry && typeof entry === 'object' && entry.id
  )

  // 構建列映射
  const columnMap = new Map<string, JyutdictColumn>()
  for (const col of columns) {
    columnMap.set(col.col, col)
  }

  return dataEntries.map((entry) => {
    const pronunciations: ExtractedPronunciation[] = []

    // 遍歷所有方言點列
    for (const [key, value] of Object.entries(entry)) {
      const column = columnMap.get(key)
      if (!column || column.is_city !== 1) continue

      const val = value as string
      if (!val || val === '' || val === '_') continue

      const locationName = column.sub
        ? `${column.city}(${column.sub})`
        : column.city || key

      pronunciations.push({
        char: entry.繁 || char,
        location: locationName,
        jyutping: val,
        color: column.color,
        source: 'sheet'
      })
    }

    return {
      summary: entry.綜 as string | undefined,
      definition: entry.釋 as string | undefined,
      pronunciations
    }
  })
}

/**
 * 根據目標城市過濾發音
 */
function filterByDialect(
  pronunciations: ExtractedPronunciation[],
  targetCities: string[]
): ExtractedPronunciation[] {
  if (targetCities.length === 0) {
    return pronunciations
  }

  return pronunciations.filter((p) =>
    targetCities.some(
      (city) =>
        p.location.includes(city) ||
        city.includes(p.location.split('(')[0] || '')
    )
  )
}

/**
 * 查詢泛粵典並返回發音建議數據
 */
export async function queryJyutdict(
  headword: string,
  dialectName: string
): Promise<CharPronunciationData[]> {
  if (!headword || !dialectName) {
    return []
  }

  const targetCities = DIALECT_TO_CITY_MAP[dialectName] || [dialectName]
  const results: CharPronunciationData[] = []

  // 獲取列定義
  const columns = await fetchColumns()

  // 逐字查詢
  for (const char of headword) {
    const charData: CharPronunciationData = {
      char,
      generalPronunciations: [],
      sheetEntries: []
    }

    try {
      // 查詢通用字表
      const generalResponse = await fetch(
        `/api/jyutdict/general?query=${encodeURIComponent(char)}`
      )
      if (generalResponse.ok) {
        const generalData: JyutdictGeneralCharacter[] = await generalResponse.json()
        if (generalData && generalData.length > 0) {
          const allPronunciations = extractFromGeneralData(
            generalData[0],
            targetCities
          )
          charData.generalPronunciations = allPronunciations
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch general data for character: ${char}`, error)
    }

    try {
      // 查詢泛粵字表
      const sheetResponse = await fetch(
        `/api/jyutdict/sheet?query=${encodeURIComponent(char)}`
      )
      if (sheetResponse.ok) {
        const sheetData: JyutdictSheetEntry[] = await sheetResponse.json()
        if (sheetData && sheetData.length > 1) {
          charData.sheetEntries = extractFromSheetData(sheetData, columns, char)
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch sheet data for character: ${char}`, error)
    }

    results.push(charData)
  }

  return results
}

/**
 * 從字符數據中提取建議發音（根據方言）
 */
export function getSuggestedPronunciation(
  charData: CharPronunciationData[],
  dialectName: string
): string {
  const targetCities = DIALECT_TO_CITY_MAP[dialectName] || [dialectName]
  const pronunciations: string[] = []

  for (const data of charData) {
    let found = false

    // 優先從通用字表找匹配方言的發音
    for (const p of data.generalPronunciations) {
      const matches = targetCities.some(
        (city) =>
          p.location.includes(city) ||
          city.includes(p.location.split('(')[0] || '')
      )
      if (matches && p.jyutping) {
        pronunciations.push(p.jyutping)
        found = true
        break
      }
    }

    // 如果通用字表沒找到，嘗試泛粵字表
    if (!found && data.sheetEntries.length > 0) {
      // 優先使用綜合音
      if (data.sheetEntries[0].summary) {
        pronunciations.push(data.sheetEntries[0].summary)
        found = true
      } else {
        // 否則找匹配方言的發音
        for (const entry of data.sheetEntries) {
          for (const p of entry.pronunciations) {
            const matches = targetCities.some(
              (city) =>
                p.location.includes(city) ||
                city.includes(p.location.split('(')[0] || '')
            )
            if (matches && p.jyutping) {
              pronunciations.push(p.jyutping)
              found = true
              break
            }
          }
          if (found) break
        }
      }
    }

    // 如果都沒找到，嘗試取第一個可用的發音
    if (!found) {
      if (data.generalPronunciations.length > 0) {
        pronunciations.push(data.generalPronunciations[0].jyutping)
      } else if (data.sheetEntries.length > 0 && data.sheetEntries[0].summary) {
        pronunciations.push(data.sheetEntries[0].summary)
      } else if (
        data.sheetEntries.length > 0 &&
        data.sheetEntries[0].pronunciations.length > 0
      ) {
        pronunciations.push(data.sheetEntries[0].pronunciations[0].jyutping)
      }
    }
  }

  return pronunciations.join(' ')
}

/**
 * Composable: 使用泛粵典功能
 */
export function useJyutdict() {
  const charData = ref<CharPronunciationData[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 查詢發音數據
   */
  async function query(headword: string, dialectName: string) {
    if (!headword || !dialectName) {
      charData.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      charData.value = await queryJyutdict(headword, dialectName)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '查詢泛粵典失敗'
      charData.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 獲取建議發音
   */
  function getSuggestion(dialectName: string): string {
    return getSuggestedPronunciation(charData.value, dialectName)
  }

  /**
   * 清空數據
   */
  function clear() {
    charData.value = []
    error.value = null
  }

  return {
    charData: readonly(charData),
    isLoading: readonly(isLoading),
    error: readonly(error),
    query,
    getSuggestion,
    clear
  }
}
