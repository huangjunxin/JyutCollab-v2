
export default defineEventHandler(async (event) => {
  try {
    // Check auth
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    await connectDB()

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: '缺少詞條ID'
      })
    }

    // Get existing entry - 先用自定義 id 查找
    let existingEntry = await Entry.findOne({ id })
    if (!existingEntry && /^[a-f\d]{24}$/i.test(id)) {
      existingEntry = await Entry.findById(id)
    }
    if (!existingEntry) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    const userId = event.context.auth.id
    const userRole = event.context.auth.role

    // Check permission - only owner or admin can delete
    const isOwner = existingEntry.createdBy === userId
    const canDelete = isOwner || userRole === 'admin'

    if (!canDelete) {
      throw createError({
        statusCode: 403,
        message: '無權刪除此詞條'
      })
    }

    // Create edit history before deletion
    await EditHistory.create({
      entryId: existingEntry._id.toString(),
      userId,
      beforeSnapshot: existingEntry.toObject(),
      afterSnapshot: {},
      changedFields: [],
      action: 'delete'
    })

    // Delete entry
    await existingEntry.deleteOne()

    return {
      success: true,
      message: '詞條已刪除'
    }
  } catch (error: any) {
    console.error('Delete entry error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '刪除詞條失敗'
    })
  }
})
