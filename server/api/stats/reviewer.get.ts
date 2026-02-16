/**
 * 返回審核相關統計：待審核總數、我已審核數量。
 * 僅審核員或管理員可調用，供左側欄「審核數據」使用。
 */
export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  const user = event.context.auth
  if (user.role !== 'reviewer' && user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: '無權訪問審核統計'
    })
  }

  const userId = user.id

  try {
    await connectDB()

    const [pending, reviewedByMe] = await Promise.all([
      Entry.countDocuments({ status: 'pending_review' }),
      Entry.countDocuments({ reviewedBy: userId })
    ])

    return { pending, reviewedByMe }
  } catch (error: any) {
    console.error('[Stats Reviewer API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取審核統計失敗'
    })
  }
})
