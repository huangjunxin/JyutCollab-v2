import { z } from 'zod'
import { User } from '../../../utils/User'
import { connectDB } from '../../../utils/db'
import { DIALECT_IDS } from '../../../../shared/dialects'

const DialectPermissionSchema = z.object({
  dialectName: z.string(),
  role: z.enum(['contributor', 'reviewer']).optional()
})

const BodySchema = z.object({
  dialectPermissions: z.array(DialectPermissionSchema)
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
        message: '無權修改用戶方言權限'
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
        message: '方言權限格式無效'
      })
    }

    const { dialectPermissions } = validated.data

    // 驗證方言名稱
    const validDialectNames = new Set(DIALECT_IDS)
    for (const perm of dialectPermissions) {
      if (!validDialectNames.has(perm.dialectName as any)) {
        throw createError({
          statusCode: 400,
          message: `無效的方言: ${perm.dialectName}`
        })
      }
    }

    // 查找目標用戶
    const targetUser = await User.findById(userId)
    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: '用戶不存在'
      })
    }

    // 更新方言權限
    targetUser.dialectPermissions = dialectPermissions
    await targetUser.save()

    return {
      success: true,
      message: '方言權限更新成功',
      user: {
        id: targetUser._id.toString(),
        username: targetUser.username,
        dialectPermissions: targetUser.dialectPermissions
      }
    }
  } catch (error: any) {
    console.error('Update user dialect permissions error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '更新方言權限失敗'
    })
  }
})
