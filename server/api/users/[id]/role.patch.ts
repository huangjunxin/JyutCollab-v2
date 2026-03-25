import { z } from 'zod'
import { User } from '../../../utils/User'
import { connectDB } from '../../../utils/db'

const BodySchema = z.object({
  role: z.enum(['contributor', 'reviewer', 'admin'])
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
        message: '無權修改用戶角色'
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
        message: '角色值無效'
      })
    }

    const { role: newRole } = validated.data

    // 查找目標用戶
    const targetUser = await User.findById(userId)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: '用戶不存在'
      })
    }

    // 不能修改自己的角色
    if (targetUser._id.toString() === currentUser.id) {
      throw createError({
        statusCode: 400,
        message: '不能修改自己的角色'
      })
    }

    // 如果要降級管理員，檢查是否為最後一位管理員
    if (targetUser.role === 'admin' && newRole !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true })
      if (adminCount <= 1) {
        throw createError({
          statusCode: 400,
          message: '不能降級最後一位管理員'
        })
      }
    }

    // 更新角色
    targetUser.role = newRole
    await targetUser.save()

    return {
      success: true,
      message: '角色更新成功',
      user: {
        id: targetUser._id.toString(),
        username: targetUser.username,
        role: targetUser.role
      }
    }
  } catch (error: any) {
    console.error('Update user role error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '更新用戶角色失敗'
    })
  }
})
