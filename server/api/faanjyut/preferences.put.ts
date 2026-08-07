/**
 * PUT /api/faanjyut/preferences（審計 M52，2026-08-07）
 * 保存泛粵矩陣頁列選擇偏好（§6.2）：body { matrixColumns: string[]（逐項校驗非空）}。
 * 普通 user preference，非 SavedView 命名空間；越界/超長 400。
 */
import { z } from 'zod'
import { User } from '../../utils/User'
import { connectDB } from '../../utils/db'

const BodySchema = z.object({
  matrixColumns: z.array(z.string().trim().min(1))
})

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  const body = await readBody(event)
  const validated = BodySchema.safeParse(body ?? {})
  if (!validated.success) {
    throw createError({ statusCode: 400, message: validated.error.issues[0]?.message ?? '參數不合法' })
  }

  await connectDB()
  await User.updateOne(
    { _id: user.id },
    { $set: { faanjyutMatrixColumns: [...new Set(validated.data.matrixColumns)] } }
  )
  return { success: true, data: { matrixColumns: [...new Set(validated.data.matrixColumns)] } }
})
