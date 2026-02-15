import { z } from 'zod'

const ApproveSchema = z.object({
  notes: z.string().optional()
})

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
    if (user.role !== 'reviewer' && user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        message: '無權執行審核操作'
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

    const body = await readBody(event)
    const validated = ApproveSchema.safeParse(body || {})

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

    // 檢查是否已被其他審核員審核（並發保護）
    if (entry.status !== 'pending_review') {
      throw createError({
        statusCode: 400,
        message: '該詞條已被審核或狀態已變更'
      })
    }

    // 保存審核前快照
    const beforeSnapshot = entry.toObject()

    // 使用 findOneAndUpdate 進行原子操作，確保並發安全
    const updatedEntry = await Entry.findOneAndUpdate(
      {
        _id: entry._id,
        status: 'pending_review'
      },
      {
        $set: {
          status: 'approved',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          ...(validated.data?.notes ? { reviewNotes: validated.data.notes } : {})
        }
      },
      { returnDocument: 'after' }
    )

    // 如果更新失敗，說明狀態已被其他請求修改
    if (!updatedEntry) {
      throw createError({
        statusCode: 409,
        message: '該詞條已被其他審核員處理'
      })
    }

    // 創建編輯歷史
    await EditHistory.create({
      entryId: updatedEntry._id.toString(),
      userId: user.id,
      beforeSnapshot,
      afterSnapshot: updatedEntry.toObject(),
      changedFields: ['status', 'reviewedBy', 'reviewedAt'],
      action: 'status_change',
      comment: '審核通過'
    })

    return {
      success: true,
      message: '詞條已通過審核',
      data: {
        id: updatedEntry.id,
        status: updatedEntry.status
      }
    }
  } catch (error: any) {
    console.error('Approve entry error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '審核操作失敗'
    })
  }
})
