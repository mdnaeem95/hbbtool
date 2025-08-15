import { middleware } from '../trpc/core'

export const performanceMiddleware = middleware(async ({ next, ctx, path }) => {
  const start = Date.now()
  
  const result = await next({ ctx })
  
  const duration = Date.now() - start
  
  // Log slow queries
  if (duration > 1000) {
    console.warn(`Slow query detected: ${path} took ${duration}ms`)
  }
  
  // Add timing header for client monitoring
  if (ctx.resHeaders) {
    ctx.resHeaders.set('X-Response-Time', `${duration}ms`)
  }
  
  return result
})