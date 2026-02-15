
export default defineEventHandler(async (event) => {
  try {
    // 檢查認證
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    await connectDB()

    const id = getRouterParam(event, 'id')
    const userId = event.context.auth.id
    const userRole = event.context.auth.role

    if (!id) {
      throw createError({
        statusCode: 400,
        message: '缺少詞條ID'
      })
    }

    // 先用自定義 id 查找，如果失敗且 id 格式像 ObjectId 再嘗試 _id
    let entry = await Entry.findOne({ id })

    // 如果沒找到，且 id 看起來像 MongoDB ObjectId，再嘗試用 _id 查找
    if (!entry && /^[a-f\d]{24}$/i.test(id)) {
      entry = await Entry.findById(id)
    }

    if (!entry) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    // 檢查權限 - 只有創建者可以提交
    const isOwner = entry.createdBy === userId
    const canSubmit = isOwner || userRole === 'admin' || userRole === 'reviewer'

    if (!canSubmit) {
      throw createError({
        statusCode: 403,
        message: '無權提交此詞條'
      })
    }

    // 檢查狀態
    if (entry.status !== 'draft' && entry.status !== 'rejected') {
      throw createError({
        statusCode: 400,
        message: '只有草稿或被拒絕的詞條可以提交審核'
      })
    }

    // 驗證必填字段
    if (!entry.headword?.display) {
      throw createError({
        statusCode: 400,
        message: '詞條文本不能為空'
      })
    }

    if (!entry.senses || entry.senses.length === 0 || !entry.senses[0]?.definition) {
      throw createError({
        statusCode: 400,
        message: '釋義不能為空'
      })
    }

    // 保存快照
    const beforeSnapshot = entry.toObject()

    // 更新狀態
    entry.status = 'pending_review'
    await entry.save()

    // 創建編輯歷史
    await EditHistory.create({
      entryId: entry._id.toString(),
      userId,
      beforeSnapshot,
      afterSnapshot: entry.toObject(),
      changedFields: ['status'],
      action: 'status_change',
      comment: '提交審核'
    })

    return {
      success: true,
      message: '詞條已提交審核',
      data: {
        id: entry.id,
        status: entry.status
      }
    }
  } catch (error: any) {
    console.error('Submit entry error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '提交審核失敗'
    })
  }
})
