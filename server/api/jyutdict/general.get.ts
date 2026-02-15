/**
 * 泛粵典通用字表 API 代理
 * 代理 https://jyutdict.org/api/v0.9/detail
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const chars = query.query as string

  if (!chars) {
    throw createError({
      statusCode: 400,
      message: 'Query parameter is required'
    })
  }

  try {
    const jyutdictUrl = `https://jyutdict.org/api/v0.9/detail?chara=${encodeURIComponent(chars)}`

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
    console.error('Failed to fetch from Jyutdict general API:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch data from Jyutdict'
    })
  }
})
