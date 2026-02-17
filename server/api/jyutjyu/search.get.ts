/**
 * Jyutjyu 搜尋 API 代理
 * 代理 https://www.jyutjyu.com/api/search?q=...
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string) || ''

  if (!q?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Query parameter q is required'
    })
  }

  try {
    const url = `https://www.jyutjyu.com/api/search?q=${encodeURIComponent(q)}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JyutCollab/2.0'
      }
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: `Jyutjyu API responded with status: ${response.status}`
      })
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch from Jyutjyu API:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch data from Jyutjyu'
    })
  }
})

