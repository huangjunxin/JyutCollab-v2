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

    const entry = await Entry.findById(history.entryId)
    const snapshotForPermission = history.beforeSnapshot || history.afterSnapshot
    const ownerId = entry?.createdBy || (snapshotForPermission as any)?.createdBy
    const canRevert = ownerId === user.id || user.role === 'admin' || user.role === 'reviewer'

    if (!canRevert) {
      throw createError({
        statusCode: 403,
        message: '無權撤銷此編輯'
      })
    }

    let beforeSnapshot: Record<string, unknown>
    let afterSnapshot: Record<string, unknown>
    let revertedEntry: any = entry
    let revertAction: 'create' | 'update' | 'delete' = 'update'

    if (history.action === 'create') {
      if (!entry) {
        throw createError({
          statusCode: 404,
          message: '詞條已不存在'
        })
      }

      beforeSnapshot = entry.toObject()
      await entry.deleteOne()
      afterSnapshot = {}
      revertedEntry = null
      revertAction = 'delete'
    } else if (history.action === 'delete') {
      if (entry) {
        throw createError({
          statusCode: 409,
          message: '詞條已存在，無法還原刪除記錄'
        })
      }
      if (!history.beforeSnapshot || Object.keys(history.beforeSnapshot).length === 0) {
        throw createError({
          statusCode: 400,
          message: '無可恢復的快照數據'
        })
      }

      beforeSnapshot = {}
      revertedEntry = await Entry.create(history.beforeSnapshot)
      afterSnapshot = revertedEntry.toObject()
      revertAction = 'create'
    } else {
      if (!entry) {
        throw createError({
          statusCode: 404,
          message: '詞條不存在'
        })
      }
      if (!history.beforeSnapshot || Object.keys(history.beforeSnapshot).length === 0) {
        throw createError({
          statusCode: 400,
          message: '無可恢復的快照數據'
        })
      }

      beforeSnapshot = entry.toObject()
      const restoreData = history.beforeSnapshot
      const fieldsToRestore = [
        'lexemeId', 'morphemeRefs', 'sourceBook',
        'headword', 'dialect', 'phonetic', 'entryType',
        'senses', 'refs', 'theme', 'meta', 'status',
        'createdBy', 'updatedBy', 'reviewedBy', 'reviewedAt', 'reviewNotes',
        'viewCount', 'likeCount', 'createdAt', 'updatedAt'
      ]
      const optionalFields = new Set([
        'lexemeId', 'morphemeRefs', 'sourceBook', 'refs',
        'updatedBy', 'reviewedBy', 'reviewedAt', 'reviewNotes'
      ])

      for (const field of fieldsToRestore) {
        if (restoreData[field] !== undefined) {
          entry.set(field, restoreData[field])
        } else if (optionalFields.has(field)) {
          entry.set(field, undefined)
        }
      }

      await entry.save({ timestamps: false })
      afterSnapshot = entry.toObject()
    }

    // 標記歷史記錄為已撤銷
    history.isReverted = true
    history.revertedAt = new Date()
    history.revertedBy = user.id
    await history.save()

    // 創建撤銷歷史記錄
    await EditHistory.create({
      entryId: (revertedEntry?._id || history.entryId).toString(),
      userId: user.id,
      beforeSnapshot,
      afterSnapshot,
      changedFields: ['_reverted'],
      action: revertAction,
      comment: `撤銷歷史記錄 ${historyId}`
    })

    return {
      success: true,
      message: '已撤銷到歷史版本',
      data: revertedEntry ? {
        id: revertedEntry.id,
        status: revertedEntry.status
      } : null
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
