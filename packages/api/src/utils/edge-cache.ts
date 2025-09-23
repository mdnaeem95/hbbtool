import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import superjson from 'superjson'

// Initialize Upstash Redis client (edge-compatible)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiter for API endpoints
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: '@homejiak/ratelimit',
})

// Cache key helpers
export const cacheKeys = {
  merchant: (slug: string) => `merchant:${slug}`,
  products: (merchantId: string, page?: number) => `products:${merchantId}:${page || 1}`,
  product: (id: string) => `product:${id}`,
  categories: () => 'categories:all',
  merchantDashboard: (merchantId: string) => `dashboard:${merchantId}`,
  orderStatus: (orderId: string) => `order:${orderId}:status`,
  customerOrders: (customerId: string) => `customer:${customerId}:orders`,
  analytics: (merchantId: string, period: string) => `analytics:${merchantId}:${period}`,
} as const

// Cache TTL configurations (in seconds)
export const cacheTTL = {
  merchant: 300, // 5 minutes
  products: 60, // 1 minute
  product: 300, // 5 minutes
  categories: 3600, // 1 hour
  dashboard: 30, // 30 seconds
  orderStatus: 10, // 10 seconds
  customerOrders: 60, // 1 minute
  analytics: 300, // 5 minutes
} as const

// Type-safe cache wrapper
export class EdgeCache {
  private redis: Redis

  constructor() {
    this.redis = redis
  }

  /**
   * Get cached value with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key)
      if (!cached) return null
      
      // Handle both string and object responses
      if (typeof cached === 'string') {
        try {
          // Try to parse with superjson for complex types
          return superjson.parse(cached) as T
        } catch {
          // Fallback to regular JSON
          return JSON.parse(cached) as T
        }
      }
      
      return cached as T
    } catch (error) {
      console.error('[EdgeCache] Get error:', error)
      return null
    }
  }

  /**
   * Set cached value with automatic serialization and TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = superjson.stringify(value)
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
    } catch (error) {
      console.error('[EdgeCache] Set error:', error)
      // Don't throw - caching should not break the app
    }
  }

  /**
   * Delete cached value(s)
   */
  async delete(keys: string | string[]): Promise<void> {
    try {
      if (Array.isArray(keys)) {
        await this.redis.del(...keys)
      } else {
        await this.redis.del(keys)
      }
    } catch (error) {
      console.error('[EdgeCache] Delete error:', error)
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Note: SCAN is not available in Upstash free tier
      // For production, upgrade to paid tier or implement a key registry
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('[EdgeCache] Pattern invalidation error:', error)
    }
  }

  /**
   * Cache-aside pattern helper
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const fresh = await fetcher()
    
    // Cache for future requests
    await this.set(key, fresh, ttlSeconds)
    
    return fresh
  }

  /**
   * Stale-while-revalidate pattern
   */
  async getSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
    staleSeconds: number
  ): Promise<T> {
    const staleKey = `${key}:stale`
    
    // Try to get fresh data
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Try to get stale data
    const stale = await this.get<T>(staleKey)
    
    // Return stale data while revalidating in background
    if (stale !== null) {
      // Revalidate in background (fire and forget)
      fetcher()
        .then(fresh => {
          this.set(key, fresh, ttlSeconds)
          this.set(staleKey, fresh, ttlSeconds + staleSeconds)
        })
        .catch(console.error)
      
      return stale
    }

    // No cache available, fetch fresh
    const fresh = await fetcher()
    
    // Cache both fresh and stale versions
    await Promise.all([
      this.set(key, fresh, ttlSeconds),
      this.set(staleKey, fresh, ttlSeconds + staleSeconds),
    ])
    
    return fresh
  }

  /**
   * Increment counter (useful for view counts, etc.)
   */
  async increment(key: string, amount = 1): Promise<number> {
    return await this.redis.incrby(key, amount)
  }

  /**
   * Check rate limit for a given identifier
   */
  async checkRateLimit(identifier: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const result = await ratelimit.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  }
}

// Export singleton instance
export const edgeCache = new EdgeCache()

// Middleware helper for tRPC
export function withCache<T>(
  keyFn: (input: any) => string,
  ttlSeconds: number
) {
  return async (opts: { input: any; ctx: any; next: () => Promise<T> }) => {
    const key = keyFn(opts.input)
    
    // Try cache first
    const cached = await edgeCache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute procedure
    const result = await opts.next()
    
    // Cache result
    await edgeCache.set(key, result, ttlSeconds)
    
    return result
  }
}