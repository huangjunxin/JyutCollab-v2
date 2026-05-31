/**
 * Verify a Cloudflare Turnstile token.
 *
 * Call this in login/register endpoints before processing the request.
 * Returns false when the secret key is not configured (dev mode bypass).
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const config = useRuntimeConfig()
  const secretKey = config.turnstileSecretKey

  // 未設定 secret key 時跳過驗證
  if (!secretKey) {
    const msg = '[Turnstile] NUXT_TURNSTILE_SECRET_KEY 未設定，跳過驗證'
    if (process.dev) {
      console.warn(msg)
    } else {
      console.error(msg)
    }
    return !!process.dev
  }

  if (!token) {
    return false
  }

  try {
    const result = await $fetch<{ success: boolean; 'error-codes'?: string[] }>(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: new URLSearchParams({
          secret: secretKey,
          response: token
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    if (!result.success) {
      console.warn('[Turnstile] 驗證失敗:', result['error-codes'])
    }

    return result.success === true
  } catch (err) {
    console.error('[Turnstile] siteverify 請求失敗:', err)
    // 網路錯誤時放行，避免擋住真實用戶
    return !!process.dev
  }
}
