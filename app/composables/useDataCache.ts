import type { AsyncData, AsyncDataOptions } from '#app'

export const CACHE_TTL = {
  stats: 5 * 60 * 1000,
  entries: 2 * 60 * 1000,
  review: 1 * 60 * 1000,
  histories: 2 * 60 * 1000,
  dialects: 30 * 60 * 1000
} as const

export function useCachedAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: AsyncDataOptions<T> & { ttl?: number } = {}
): AsyncData<T | undefined, T> {
  const ttl = options.ttl ?? CACHE_TTL.stats
  const nuxtApp = useNuxtApp()
  const tsKey = `_ts_${key}`

  const result = useAsyncData<T>(key, fetcher, {
    ...options,
    getCachedData: () => {
      const timestamp = nuxtApp.payload.data[tsKey] as number | undefined
      const cached = nuxtApp.payload.data[key]

      if (cached !== undefined && timestamp && Date.now() - timestamp < ttl) {
        return cached as T
      }
      return undefined
    }
  })

  watch(result.data, (newData) => {
    if (newData !== undefined) {
      nuxtApp.payload.data[tsKey] = Date.now()
    }
  }, { immediate: true })

  return result
}

export function clearCacheByKey(keyPattern: string) {
  const nuxtApp = useNuxtApp()

  Object.keys(nuxtApp.payload.data).forEach(key => {
    if (key.includes(keyPattern) || key === `_ts_${keyPattern}`) {
      delete nuxtApp.payload.data[key]
    }
  })
}

export function clearAllCache() {
  const nuxtApp = useNuxtApp()

  Object.keys(nuxtApp.payload.data).forEach(key => {
    if (key.startsWith('_ts_')) {
      delete nuxtApp.payload.data[key]
    }
  })
}
