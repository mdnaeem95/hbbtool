import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    return redis.get(key)
  },
  
  async set(key: string, value: any, ttl?: number) {
    // Only pass ex option if ttl is provided and valid
    if (ttl && ttl > 0) {
      return redis.set(key, value, { ex: ttl })
    }
    return redis.set(key, value)
  },
  
  async del(key: string) {
    return redis.del(key)
  },
  
  async invalidate(pattern: string) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}

// Cache helpers
export const cacheKeys = {
  merchant: (id: string) => `merchant:${id}`,
  merchantProducts: (id: string) => `merchant:${id}:products`,
  product: (id: string) => `product:${id}`,
  customerCart: (id: string) => `customer:${id}:cart`,
  orderAnalytics: (merchantId: string, date: string) => 
    `analytics:${merchantId}:${date}`,
}

// Cached query helper
export const cachedFindUnique = async <T>(
  key: string,
  finder: () => Promise<T>,
  ttl = 300
): Promise<T> => {
  const cached = await cache.get<T>(key)
  if (cached) return cached
  
  const data = await finder()
  if (data) {
    await cache.set(key, data, ttl)
  }
  return data
}