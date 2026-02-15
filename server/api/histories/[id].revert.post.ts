export default defineEventHandler(async (event) => {
  try {
    // 檢查認證
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    const user = event.context.auth
    const historyId = getRouterParam(event, 'id')

    if (!historyId) {
      throw createError({
        statusCode: 400,
        message: '缺少歷史記錄ID'
      })
    }

    await connectDB()

    // 查找歷史記錄
    const history = await EditHistory.findById(historyId)
    if (!history) {
      throw createError({
        statusCode: 404,
        message: '歷史記錄不存在'
      })
    }

    if (history.isReverted) {
      throw createError({
        statusCode: 400,
        message: '該歷史記錄已被撤銷'
      })
    }

    // 查找詞條
    const entry = await Entry.findById(history.entryId)
    if (!entry) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    // 檢查權限
    const isOwner = entry.createdBy === user.id
    const canRevert = isOwner || user.role === 'admin' || user.role === 'reviewer'

    if (!canRevert) {
      throw createError({
        statusCode: 403,
        message: '無權撤銷此編輯'
      })
    }

    // 保存當前快照
    const currentSnapshot = entry.toObject()

    // 檢查是否有快照可以恢復
    if (!history.snapshot && !history.beforeSnapshot) {
      throw createError({
        statusCode: 400,
        message: '無可恢復的快照數據'
      })
    }

    // 使用 beforeSnapshot 恢復數據
    const restoreData = history.snapshot || history.beforeSnapshot

    // 恢復字段
    if (restoreData) {
      // 只恢復可恢復的字段
      const fieldsToRestore = [
        'headword', 'dialect', 'phonetic', 'entryType',
        'senses', 'refs', 'theme', 'meta', 'status'
      ]

      for (const field of fieldsToRestore) {
        if (restoreData[field] !== undefined) {
          (entry as any)[field] = restoreData[field]
        }
      }
    }

    entry.updatedBy = user.id
    await entry.save()

    // 標記歷史記錄為已撤銷
    history.isReverted = true
    history.revertedAt = new Date()
    history.revertedBy = user.id
    await history.save()

    // 創建撤銷歷史記錄
    await EditHistory.create({
      entryId: entry._id.toString(),
      userId: user.id,
      beforeSnapshot: currentSnapshot,
      afterSnapshot: entry.toObject(),
      changedFields: ['_reverted'],
      action: 'update',
      comment: `撤銷歷史記錄 ${historyId}`
    })

    return {
      success: true,
      message: '已撤銷到歷史版本',
      data: {
        id: entry.id,
        status: entry.status
      }
    }
  } catch (error: any) {
    console.error('Revert history error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '撤銷操作失敗'
    })
  }
})
