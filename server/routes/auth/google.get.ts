/**
 * Google OAuth 路由 — 同時處理「登錄」與「連結帳號」兩種場景：
 *
 * - 無 session → 登錄流程（googleLoginUser: 3-way match）
 * - 有 session → 連結流程（linkGoogleToUser: 綁定到當前用戶）
 *
 * Google Cloud Console 需設定 redirect URI 為：<site-url>/auth/google
 */

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    const googleUser = {
      sub: user.sub,
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      picture: user.picture,
      locale: user.locale
    }

    // 連結流程：用戶已登入，將 Google 綁定到現有帳號
    const session = await getUserSession(event)
    if (session?.user?.id) {
      const result = await linkGoogleToUser(session.user.id, googleUser)
      if (!result.success) {
        return sendRedirect(event, `/profile?google_link_error=${encodeURIComponent(result.error!)}`)
      }
      return sendRedirect(event, '/profile?google_linked=1')
    }

    // 登錄流程：無 session，走正常的 3-way match
    const result = await googleLoginUser(googleUser)

    if (result.error || !result.user) {
      console.error('[Google OAuth] 登錄失敗:', result.error)
      return sendRedirect(event, '/login?error=google_auth_failed')
    }

    await setUserSession(event, {
      user: result.user,
      loggedInAt: Date.now()
    })

    // 新用戶 → 引導設定方言點；合併 → toast 提示；其他 → 直接進入
    if (result.isNew) {
      return sendRedirect(event, '/setup')
    }
    const redirectPath = result.merged ? '/entries?google_merged=1' : '/entries'
    return sendRedirect(event, redirectPath)
  },

  onError(event, error) {
    console.error('[Google OAuth] 錯誤:', error)
    return sendRedirect(event, '/login?error=google_auth_failed')
  }
})
