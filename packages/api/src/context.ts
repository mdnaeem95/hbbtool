import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { PrismaClient } from "@kitchencloud/database/client";
import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";

export interface Session {
  user: {
    id: string;
    email: string;
    role: "CUSTOMER" | "MERCHANT";
  };
}

// Reuse singletons in dev to avoid exhausting connections
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "minimal",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Prisma slow query logging
prisma.$use(async (params: any, next: any) => {
  const before = Date.now();
  try {
    const result = await next(params);
    const duration = Date.now() - before;
    if (duration > 1_000) {
      console.warn(`⚠️ Slow DB query: ${params.model}.${params.action} took ${duration}ms`);
      if (process.env.NODE_ENV === "development") {
        console.warn("Query args:", JSON.stringify(params.args, null, 2));
      }
    }
    return result;
  } catch (error) {
    console.error(`❌ DB query failed: ${params.model}.${params.action}`);
    throw error;
  }
});

export const redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/** Cache helpers (typed, JSON-free because Upstash serializes JSON) */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      return (await redis.get<T>(key)) ?? null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },
  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    try {
      await redis.set(key, value as any, { ex: ttlSeconds });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  },
  async del(key: string | string[]): Promise<void> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length) await redis.del(...keys);
    } catch (error) {
      console.error(`Cache delete error:`, error);
    }
  },
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys: string[] = [];
      let cursor = 0;
      do {
        const [nextCursor, batch] = (await redis.scan(cursor, { match: pattern, count: 100 })) as unknown as [
          number,
          string[],
        ];
        cursor = Number(nextCursor);
        keys.push(...batch);
      } while (cursor !== 0);

      if (keys.length) await redis.del(...keys);
    } catch (error) {
      console.error(`Cache pattern invalidation error:`, error);
    }
  },
};

/** Simple in-memory request metrics */
const requestMetrics = new Map<string, { count: number; totalTime: number }>();
export const metrics = {
  track(operation: string, durationMs: number) {
    const current = requestMetrics.get(operation) ?? { count: 0, totalTime: 0 };
    requestMetrics.set(operation, {
      count: current.count + 1,
      totalTime: current.totalTime + durationMs,
    });
  },
  getStats() {
    const stats: Record<string, { count: number; avgTime: number }> = {};
    for (const [op, data] of requestMetrics.entries()) {
      stats[op] = { count: data.count, avgTime: data.count ? data.totalTime / data.count : 0 };
    }
    return stats;
  },
  reset() {
    requestMetrics.clear();
  },
};

export const createInnerTRPCContext = (opts: {
  headers: Headers;
  session: Session | null;
  resHeaders?: Headers;
}) => {
  return {
    db: prisma,
    redis,
    cache,
    metrics,
    session: opts.session,
    headers: opts.headers,
    resHeaders: opts.resHeaders ?? new Headers(),
  };
};

async function getSessionFromHeaders(headers: Headers): Promise<Session | null> {
  try {
    const userId = headers.get("x-user-id");
    const userEmail = headers.get("x-user-email") ?? "";
    const userRole = headers.get("x-user-role") as Session["user"]["role"] | null;

    if (!userId || !userRole) return null;

    const cacheKey = `session:${userId}`;
    const cached = await cache.get<Session>(cacheKey);
    if (cached) return cached;

    const session: Session = { user: { id: userId, email: userEmail, role: userRole } };
    await cache.set(cacheKey, session, 300); // 5 minutes
    return session;
  } catch (error) {
    console.error("Error getting session from headers:", error);
    return null;
  }
}

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const { req, resHeaders } = opts;

  const requestId = randomUUID();
  const start = Date.now();
  const session = await getSessionFromHeaders(req.headers);

  // Basic tracing headers
  try {
    resHeaders.set("X-Request-Id", requestId);
    resHeaders.set("X-Request-Start", String(start));
  } catch {}

  // Debug logging in dev
  if (process.env.NODE_ENV === "development") {
    console.log(`📥 Request ${requestId}: ${req.method} ${req.url}`);
  }

  const ctx = createInnerTRPCContext({ headers: req.headers, resHeaders, session });
  return ctx;
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/** Transaction helper with timeout */
export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>,
  options?: { timeout?: number },
): Promise<T> {
  const timeout = options?.timeout ?? 10_000;

  return prisma.$transaction(
    async (tx: any) => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Transaction timeout after ${timeout}ms`)), timeout),
      );
      return (await Promise.race([fn(tx), timeoutPromise])) as T;
    },
    { maxWait: 2_000, timeout },
  );
}
