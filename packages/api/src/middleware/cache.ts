import { Redis } from '@upstash/redis'
import { middleware } from '../trpc'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const cacheMiddleware = middleware(async ({ next, ctx, path, type, rawInput }) => {
  // Only cache queries, not mutations
  if (type !== 'query') {
    return next({ ctx })
  }
  
  // Generate cache key
  const cacheKey = `trpc:${path}:${JSON.stringify(rawInput)}`
  
  // Try to get from cache
  const cached = await redis.get(cacheKey)
  if (cached) {
    return { ok: true, data: cached }
  }
  
  // Execute query
  const result = await next({ ctx })
  
  // Cache successful results
  if (result.ok) {
    await redis.setex(cacheKey, 60, result.data) // Cache for 1 minute
  }
  
  return result
})