export const useAuth = () => {
  const { user, loggedIn, fetch: fetchSession, clear: clearSession } = useUserSession()
  const router = useRouter()
  const getRoute = () => useRoute()

  /** 拉取當前 session（nuxt-auth-utils 管理，SSR 時會帶請求 cookie） */
  const initAuth = async () => {
    await fetchSession()
  }

  const login = async (email: string, password: string) => {
    try {
      const res = await $fetch<{ success: boolean; data?: { user: any }; error?: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      if (res.success) {
        await fetchSession()
        const route = getRoute()
        await router.push((route.query.redirect as string) || '/entries')
        return { success: true }
      }
      return { success: false, error: res.error }
    } catch (e: any) {
      return { success: false, error: e.data?.error || '登錄失敗' }
    }
  }

  const register = async (data: {
    email: string
    username: string
    password: string
    displayName?: string
    location?: string
    nativeDialect?: string
    dialect?: string
  }) => {
    try {
      const res = await $fetch<{ success: boolean; data?: { user: any }; error?: string }>('/api/auth/register', {
        method: 'POST',
        body: data
      })
      if (res.success) {
        await fetchSession()
        await router.push('/entries')
        return { success: true }
      }
      return { success: false, error: res.error || '註冊失敗' }
    } catch (e: any) {
      const msg = e.data?.error ?? e.message ?? '註冊失敗'
      if (process.dev) console.warn('[註冊] 請求異常:', e.data ?? e.message)
      return { success: false, error: msg }
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (_) {
      // 確保即使接口報錯也繼續清空本地並跳轉
    }
    await clearSession()
    await router.push('/login')
  }

  const requireAuth = async () => {
    await fetchSession()
    if (!loggedIn.value) {
      const route = getRoute()
      await router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
      return false
    }
    return true
  }

  const requireRole = async (role: 'reviewer' | 'admin') => {
    const ok = await requireAuth()
    if (!ok) return false
    const u = user.value
    if (role === 'admin' && u?.role !== 'admin') {
      await router.push('/entries')
      return false
    }
    if (role === 'reviewer' && u?.role !== 'reviewer' && u?.role !== 'admin') {
      await router.push('/entries')
      return false
    }
    return true
  }

  const canReview = computed(() => {
    const r = user.value?.role
    return r === 'reviewer' || r === 'admin'
  })

  return {
    user,
    isAuthenticated: loggedIn,
    isAdmin: computed(() => user.value?.role === 'admin'),
    isReviewer: computed(() => user.value?.role === 'reviewer' || user.value?.role === 'admin'),
    canReview,
    loading: computed(() => false),
    initialized: computed(() => true),
    initAuth,
    login,
    register,
    logout,
    requireAuth,
    requireRole
  }
}
