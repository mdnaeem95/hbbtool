import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import superjson from "./superjson";
import { ZodError } from "zod";
import { performance } from "node:perf_hooks"; // Why: Node typing for `performance`

// Constants
const REQUEST_TIMEOUT_MS = 25_000; // Why: Keep under Vercel 30s hard limit
const SLOW_QUERY_THRESHOLD_MS = 1_000;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/** Utility: stable stringify for dedupe keys */
function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, val) => {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        return Object.keys(val)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            (acc as any)[k] = (val as any)[k];
            return acc;
          }, {});
      }
      return val;
    });
  } catch {
    return typeof value === "string" ? value : "<non-serializable>";
  }
}

/** Timeout middleware */
const timeoutMiddleware = t.middleware(async ({ next, path }) => {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new TRPCError({
          code: "TIMEOUT",
          message: `Request timeout after ${REQUEST_TIMEOUT_MS}ms. Query: ${path}`,
        }),
      );
    }, REQUEST_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([next(), timeoutPromise]);
    return result as Awaited<ReturnType<typeof next>>;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
});

/** Performance middleware */
const performanceMiddleware = t.middleware(async ({ next, path, type, ctx }) => {
  const start = performance.now();

  try {
    const result = await next();
    const duration = performance.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`⚠️ Slow ${type}: ${path} took ${duration.toFixed(2)}ms`);
    }

    // Add timing headers (best-effort)
    try {
      ctx.resHeaders?.set("X-Response-Time", `${duration.toFixed(2)}ms`);
      if (path) ctx.resHeaders?.set("X-Query-Path", path);
    } catch {}

    return result;
  } catch (err) {
    const duration = performance.now() - start;
    console.error(`❌ Failed ${type}: ${path} after ${duration.toFixed(2)}ms`);
    throw err;
  }
});

/** Pagination enforcement middleware */
const paginationMiddleware = t.middleware(async ({ next, rawInput }) => {
  const input: any = rawInput ?? {};

  if (input?.pagination) {
    if (!input.pagination.limit) input.pagination.limit = 20;
    if (input.pagination.limit > 100) input.pagination.limit = 100;
  }

  if (input?.limit !== undefined) {
    input.limit = Math.min(input.limit || 20, 100);
  }

  return next({ rawInput: input }); // Why: propagate potential input changes
});

/** Error recovery middleware */
const errorRecoveryMiddleware = t.middleware(async ({ next, path }) => {
  try {
    return await next();
  } catch (error: unknown) {
    console.error(`Error in ${path}:`, error);

    if (error instanceof TRPCError) {
      if (error.code === "TIMEOUT") {
        throw new TRPCError({
          code: error.code,
          message:
            "The request took too long to complete. Try a smaller page size or narrower filters.",
          cause: error.cause,
        });
      }

      // Prisma connectivity signals (heuristic)
      const msg = error.message || "";
      if (msg.includes("P2024") || msg.toLowerCase().includes("connection")) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection issue. Please try again shortly.",
          cause: error.cause,
        });
      }
    }

    throw error;
  }
});

/** Request deduplication (queries only) */
const inFlightRequests = new Map<string, Promise<unknown>>();
const deduplicationMiddleware = t.middleware(async ({ next, path, type, rawInput }) => {
  if (type !== "query") return next();

  const requestKey = `${path}:${stableStringify(rawInput)}`;
  const existing = inFlightRequests.get(requestKey);
  if (existing) {
    console.log(`Deduplicating request: ${path}`);
    return existing as any;
  }

  const p = next().finally(() => inFlightRequests.delete(requestKey));
  inFlightRequests.set(requestKey, p);
  return p as any;
});

/** Auth gate */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } },
  });
});

/** Streaming helper */
export const streaming = t.middleware(({ ctx, next }) => {
  try {
    ctx.resHeaders?.set("Content-Type", "application/x-ndjson");
    ctx.resHeaders?.set("Transfer-Encoding", "chunked");
  } catch {}
  return next();
});

/** Complexity scoring */
export function calculateQueryComplexity(input: any): number {
  let complexity = 1;

  if (input?.include) {
    const includeKeys = Object.keys(input.include);
    complexity += includeKeys.length * 2;
    for (const key of includeKeys) {
      const val: any = (input.include as any)[key];
      if (val && typeof val === "object" && val.include) {
        complexity += Object.keys(val.include).length;
      }
    }
  }

  const limit = input?.pagination?.limit ?? input?.limit;
  if (typeof limit === "number") complexity += Math.floor(limit / 20);

  if (input?.filters?.dateFrom && input?.filters?.dateTo) {
    const diffDays = Math.abs(
      new Date(input.filters.dateTo).getTime() - new Date(input.filters.dateFrom).getTime(),
    ) / (1000 * 60 * 60 * 24);
    complexity += Math.floor(diffDays / 30);
  }

  if (input?.search || input?.filters?.search) complexity += 2;
  return complexity;
}

export const withComplexityCheck = (maxComplexity = 10) =>
  t.middleware(({ next, rawInput, path }) => {
    const complexity = calculateQueryComplexity(rawInput);
    if (complexity > maxComplexity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Query too complex (complexity: ${complexity}, max: ${maxComplexity}). Narrow your criteria.`,
      });
    }
    console.log(`Query complexity for ${path}: ${complexity}`);
    return next();
  });

/** Router and procedures */
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure
  .use(deduplicationMiddleware)
  .use(errorRecoveryMiddleware)
  .use(paginationMiddleware)
  .use(timeoutMiddleware)
  .use(performanceMiddleware);

export const protectedProcedure = publicProcedure.use(enforceUserIsAuthed);