import { z } from 'zod'
import { User } from '../../../utils/User'
import { connectDB } from '../../../utils/db'

const BodySchema = z.object({
  isActive: z.boolean()
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

    const currentUser = event.context.auth
    if (currentUser.role !== 'admin') {
      throw createError({
        statusCode: 403,
        message: '無權修改用戶狀態'
      })
    }

    await connectDB()

    // 獲取用戶 ID
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: '用戶 ID 無效'
      })
    }

    // 解析請求體
    const body = await readBody(event)
    const validated = BodySchema.safeParse(body)

    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: '狀態值無效'
      })
    }

    const { isActive: newIsActive } = validated.data

    // 查找目標用戶
    const targetUser = await User.findById(userId)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: '用戶不存在'
      })
    }

    // 不能停用自己
    if (targetUser._id.toString() === currentUser.id && !newIsActive) {
      throw createError({
        statusCode: 400,
        message: '不能停用自己的賬戶'
      })
    }

    // 如果要停用管理員，檢查是否為最後一位活躍管理員
    if (targetUser.role === 'admin' && !newIsActive && targetUser.isActive) {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true })
      if (activeAdminCount <= 1) {
        throw createError({
          statusCode: 400,
          message: '不能停用最後一位活躍管理員'
        })
      }
    }

    // 更新狀態
    targetUser.isActive = newIsActive
    await targetUser.save()

    return {
      success: true,
      message: newIsActive ? '用戶已啟用' : '用戶已停用',
      user: {
        id: targetUser._id.toString(),
        username: targetUser.username,
        isActive: targetUser.isActive
      }
    }
  } catch (error: any) {
    console.error('Toggle user active error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '更新用戶狀態失敗'
    })
  }
})
