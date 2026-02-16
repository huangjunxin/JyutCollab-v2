/**
 * 返回當前用戶的詞條統計：總數、待審核、已發佈、已拒絕。
 * 供左側欄「我的詞條」使用，需登入。（草稿不落庫，不統計）
 */
export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  const userId = event.context.auth.id

  try {
    await connectDB()

    const baseFilter = { createdBy: userId }

    const [total, pending, approved, rejected] = await Promise.all([
      Entry.countDocuments(baseFilter),
      Entry.countDocuments({ ...baseFilter, status: 'pending_review' }),
      Entry.countDocuments({ ...baseFilter, status: 'approved' }),
      Entry.countDocuments({ ...baseFilter, status: 'rejected' })
    ])

    return { total, pending, approved, rejected }
  } catch (error: any) {
    console.error('[Stats Mine API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取我的統計失敗'
    })
  }
})
