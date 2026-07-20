import { getRequestIP } from 'h3'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
  concurrent?: boolean
}

interface RateEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateEntry>()

function isAllowed(key: string, config: RateLimitConfig): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return true
  }

  if (entry.count >= config.maxRequests) {
    return false
  }

  entry.count++
  return true
}

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key)
  }
}

setInterval(cleanup, 60_000).unref()

const CONFIGS: Array<{
  path: string
  config: RateLimitConfig
  keyFn: (event: any) => string
}> = [
  {
    path: '/api/agent/chat.stream',
    config: { windowMs: 60_000, maxRequests: 10, keyPrefix: 'agent:stream' },
    keyFn: (event) => `${getRequestIP(event)}:${event.context?.auth?.id ?? 'anon'}`,
  },
  {
    path: '/api/agent/chat',
    config: { windowMs: 60_000, maxRequests: 10, keyPrefix: 'agent:chat' },
    keyFn: (event) => `${getRequestIP(event)}:${event.context?.auth?.id ?? 'anon'}`,
  },
  {
    path: '/api/auth/login',
    config: { windowMs: 15 * 60_000, maxRequests: 5, keyPrefix: 'auth:login' },
    keyFn: (event) => getRequestIP(event),
  },
  {
    path: '/api/auth/register',
    config: { windowMs: 60 * 60_000, maxRequests: 3, keyPrefix: 'auth:register' },
    keyFn: (event) => getRequestIP(event),
  },
]

export default defineEventHandler((event) => {
  const path = event.path
  const match = CONFIGS.find(c => path.startsWith(c.path))
  if (!match) return

  const key = `${match.config.keyPrefix}:${match.keyFn(event)}`

  if (!isAllowed(key, match.config)) {
    throw createError({
      statusCode: 429,
      message: '請求過於頻繁，請稍後再試',
    })
  }
})
