import { TRPCError } from '@trpc/server'
import { middleware } from '../trpc/core';

interface RateLimitConfig {
  windowMs: number
  max: number
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export const rateLimit = (config: RateLimitConfig) => {
  return middleware(async ({ ctx, next, path }) => {
    const key = `${path}:${ctx.session?.user.id ?? ctx.ip ?? 'anon'}`
    const now = Date.now()
    
    const limit = rateLimitStore.get(key)
    
    if (!limit || limit.resetAt < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      })
    } else {
      limit.count++
      
      if (limit.count > config.max) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Try again in ${Math.ceil((limit.resetAt - now) / 1000)} seconds.`,
        })
      }
    }
    
    return next()
  })
}