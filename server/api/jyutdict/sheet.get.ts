/**
 * 泛粵典字表 API 代理
 * 代理 https://jyutdict.org/api/v0.9/sheet
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const char = query.query as string
  const isHeaderRequest = 'header' in query

  try {
    let jyutdictUrl: string

    if (isHeaderRequest) {
      // Header 請求 - 獲取列定義
      jyutdictUrl = `https://jyutdict.org/api/v0.9/sheet?query=${encodeURIComponent(char || '')}&header`
    } else {
      if (!char) {
        throw createError({
          statusCode: 400,
          message: 'Query parameter is required'
        })
      }
      jyutdictUrl = `https://jyutdict.org/api/v0.9/sheet?query=${encodeURIComponent(char)}&fuzzy`
    }

    const response = await fetch(jyutdictUrl, {
      headers: {
        'User-Agent': 'JyutCollab/2.0'
      }
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: `Jyutdict API responded with status: ${response.status}`
      })
    }

    const data = await response.json()

    return data
  } catch (error) {
    console.error('Failed to fetch from Jyutdict sheet API:', error)
    if ((error as any).statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch data from Jyutdict'
    })
  }
})
