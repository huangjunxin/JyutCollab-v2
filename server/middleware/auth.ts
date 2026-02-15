export default defineEventHandler(async (event) => {
  const path = event.path
  const method = event.method

  // Public routes - no auth needed
  if (!path.startsWith('/api/')) {
    return
  }

  // nuxt-auth-utils session endpoint - do not touch
  if (path.startsWith('/api/_auth/')) {
    return
  }

  // Our auth routes (login, register, logout) - handle inside handlers
  if (path.startsWith('/api/auth/')) {
    return
  }

  // GET /api/entries (list) - public
  if (path === '/api/entries' && method === 'GET') {
    return
  }

  // GET /api/entries/:id - public for viewing
  if (path.match(/^\/api\/entries\/[^/]+$/) && method === 'GET') {
    return
  }

  // GET /api/stats - public for sidebar counts
  if (path === '/api/stats' && method === 'GET') {
    return
  }

  // All other API routes need authentication (session from nuxt-auth-utils)
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  event.context.auth = session.user
})

// Extend event context types
declare module 'h3' {
  interface H3EventContext {
    auth?: {
      id: string
      email: string
      username: string
      displayName?: string
      role: 'contributor' | 'reviewer' | 'admin'
    }
  }
}
