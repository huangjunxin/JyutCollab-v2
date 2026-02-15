/**
 * 返回詞條統計：總數、已發佈、待審核、已拒絕。
 * 供左側欄統計數據使用，無需登入。
 */
export default defineEventHandler(async () => {
  try {
    await connectDB()

    const [total, approved, pending, rejected] = await Promise.all([
      Entry.countDocuments({}),
      Entry.countDocuments({ status: 'approved' }),
      Entry.countDocuments({ status: 'pending_review' }),
      Entry.countDocuments({ status: 'rejected' })
    ])

    return { total, approved, pending, rejected }
  } catch (error: any) {
    console.error('[Stats API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取統計失敗'
    })
  }
})
