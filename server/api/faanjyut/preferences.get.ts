/**
 * GET /api/faanjyut/preferences（審計 M52，2026-08-07）
 * 泛粵矩陣頁列選擇偏好（§6.2「服務端記住該用戶上次列選擇」）：
 * 返回 { matrixColumns: string[] }；用戶無偏好時為空數組（前端回退 localStorage/默認列集）。
 * 要求登錄（全局 auth middleware 已強制）。
 */
import { User } from '../../utils/User'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  await connectDB()
  const doc = await User.findById(user.id).select('faanjyutMatrixColumns').lean()
  const matrixColumns = doc?.faanjyutMatrixColumns ?? []
  return {
    success: true,
    data: { matrixColumns: Array.isArray(matrixColumns) ? matrixColumns : [] }
  }
})
