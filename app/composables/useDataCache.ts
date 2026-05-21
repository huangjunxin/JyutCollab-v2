import type { AsyncData, AsyncDataOptions } from '#app'
import type { MaybeRefOrGetter } from 'vue'

export const CACHE_TTL = {
  stats: 5 * 60 * 1000,
  entries: 2 * 60 * 1000,
  review: 1 * 60 * 1000,
  histories: 2 * 60 * 1000,
  dialects: 30 * 60 * 1000
} as const

export function useCachedAsyncData<T>(
  key: MaybeRefOrGetter<string>,
  fetcher: () => Promise<T>,
  options: AsyncDataOptions<T> & { ttl?: number } = {}
): AsyncData<T | undefined, T> {
  const ttl = options.ttl ?? CACHE_TTL.stats
  const nuxtApp = useNuxtApp()
  const resolvedKey = computed(() => toValue(key))
  const tsKey = computed(() => `_ts_${resolvedKey.value}`)

  const result = useAsyncData<T>(resolvedKey, fetcher, {
    ...options,
    getCachedData: () => {
      const timestamp = nuxtApp.payload.data[tsKey.value] as number | undefined
      const cached = nuxtApp.payload.data[resolvedKey.value]

      if (cached !== undefined && timestamp && Date.now() - timestamp < ttl) {
        return cached as T
      }
      return undefined
    }
  })

  watch(result.data, (newData) => {
    if (newData !== undefined && result.status.value === 'success') {
      nuxtApp.payload.data[tsKey.value] = Date.now()
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
