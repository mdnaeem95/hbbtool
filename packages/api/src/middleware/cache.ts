import { middleware } from '../trpc/core'

interface CacheConfig {
  ttl: number // seconds
  key?: (input: unknown) => string
}

const cacheStore = new Map<string, { data: any; expiresAt: number }>()

export const cache = (config: CacheConfig) => {
  return middleware(async ({ next, path, input }) => {
    const cacheKey = config.key 
      ? `${path}:${config.key(input)}`
      : `${path}:${JSON.stringify(input)}`
    
    const now = Date.now()
    const cached = cacheStore.get(cacheKey)
    
    if (cached && cached.expiresAt > now) {
      return cached.data
    }
    
    const result = await next()
    
    cacheStore.set(cacheKey, {
      data: result,
      expiresAt: now + (config.ttl * 1000),
    })
    
    return result
  })
}