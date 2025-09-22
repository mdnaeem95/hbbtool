import { Redis } from "@upstash/redis"
import superjson from "superjson"

/** ---------- Redis client ---------- */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/** ---------- Namespacing / keys ---------- */
const PREFIX = process.env.REDIS_PREFIX ?? "kc" // e.g. "homejiak"
const k = (...parts: string[]) => [PREFIX, ...parts].join(":")
const tagKey = (tag: string) => k("tag", tag)

/** ---------- Superjson helpers (safer for Date/Decimal/etc.) ---------- */
async function sget<T>(key: string): Promise<T | null> {
  const raw = await redis.get<unknown>(key)
  if (raw == null) return null

  // If Upstash returned the serialized object, deserialize it
  if (typeof raw === "object" && raw !== null && "json" in (raw as any)) {
    return superjson.deserialize(raw as any) as T
  }

  // Legacy/string fallback: try superjson.parse, then JSON.parse, else return as-is
  if (typeof raw === "string") {
    try {
      return superjson.parse<T>(raw)
    } catch {
      try {
        return JSON.parse(raw) as T
      } catch {
        return raw as unknown as T
      }
    }
  }

  // Already a plain object/primitive
  return raw as T
}

async function sset<T>(key: string, value: T, ttl?: number) {
  const payload = superjson.serialize(value) // <-- object { json, meta }
  if (ttl != null && ttl > 0) return redis.set(key, payload, { ex: ttl })
  return redis.set(key, payload)
}

/** ---------- Public cache API ---------- */
export const cache = {
  /** JSON-safe get/set using superjson */
  async get<T>(key: string) {
    return sget<T>(key)
  },
  async set<T>(key: string, value: T, ttl?: number) {
    return sset<T>(key, value, ttl)
  },
  async del(...keys: string[]) {
    if (!keys.length) return 0
    return redis.del(...keys)
  },

  /** Tagging: store a key and register it under a tag */
  async setWithTag<T>(key: string, tag: string, value: T, ttl?: number) {
    await sset<T>(key, value, ttl)
    await redis.sadd(tagKey(tag), key)
  },

  /** Invalidate all keys for a tag (no KEYS scan) */
  async invalidateTag(tag: string) {
    const tKey = tagKey(tag)
    const keys = await redis.smembers(tKey) as string[]
    if (keys.length) await redis.del(...keys)
    await redis.del(tKey)
  },

  /** (Optional) Invalidate pattern (uses KEYS) — avoid for large datasets */
  async invalidatePattern(pattern: string) {
    const keys = await redis.keys(pattern)
    if (keys.length) await redis.del(...keys)
  },
}

/** ---------- Common key builders ---------- */
export const cacheKeys = {
  merchant: (id: string) => k("merchant", id),
  merchantProducts: (id: string) => k("merchant", id, "products"),
  product: (id: string) => k("product", id),
  customerCart: (id: string) => k("customer", id, "cart"),
  orderAnalytics: (merchantId: string, date: string) => k("analytics", merchantId, date),
}

/** ---------- Simple stampede protection for hot misses ---------- */
async function acquireLock(lockKey: string, ttlMs = 2000) {
  // NX + PX ensures lock only if absent, with auto-expiry
  const ok = await redis.set(lockKey, "1", { nx: true, px: ttlMs })
  return ok === "OK"
}
async function releaseLock(lockKey: string) {
  // Best-effort unlock (acceptable for coarse protection)
  await redis.del(lockKey)
}

/**
 * Cached compute with basic dogpile protection.
 * - Returns cached value if present (including falsy values like 0/false/"").
 * - On miss, first caller acquires a short lock, computes and sets; others briefly poll.
 */
export async function cachedCompute<T>(
  key: string,
  finder: () => Promise<T>,
  opts: { ttl?: number; tag?: string; lockMs?: number; pollMs?: number; maxPolls?: number } = {}
): Promise<T> {
  const ttl = opts.ttl ?? 300
  const lockMs = opts.lockMs ?? 2000
  const pollMs = opts.pollMs ?? 80
  const maxPolls = opts.maxPolls ?? 20
  const lockKey = `${key}:lock`

  const cached = await cache.get<T>(key)
  if (cached !== null && cached !== undefined) return cached

  if (await acquireLock(lockKey, lockMs)) {
    try {
      const data = await finder()
      if (data !== undefined) {
        if (opts.tag) {
          await cache.setWithTag(key, opts.tag, data, ttl)
        } else {
          await cache.set(key, data, ttl)
        }
      }
      return data
    } finally {
      await releaseLock(lockKey)
    }
  }

  // Another worker is computing. Poll a few times for the fresh value.
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, pollMs))
    const val = await cache.get<T>(key)
    if (val !== null && val !== undefined) return val
  }

  // Fallback: compute ourselves (rare)
  const data = await finder()
  if (data !== undefined) {
    if (opts.tag) {
      await cache.setWithTag(key, opts.tag, data, ttl)
    } else {
      await cache.set(key, data, ttl)
    }
  }
  return data
}
