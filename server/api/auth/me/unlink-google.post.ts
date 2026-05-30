import { getActiveAuthUserById, unlinkGoogleFromUser } from '../../../utils/auth'

/** 解除 Google 帳號連結（需有密碼才能解除，否則用戶將無法登錄） */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  const activeUser = await getActiveAuthUserById(session.user.id)
  if (!activeUser) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, message: '帳戶已停用或不存在，請重新登錄' })
  }

  const result = await unlinkGoogleFromUser(session.user.id)
  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true }
})
