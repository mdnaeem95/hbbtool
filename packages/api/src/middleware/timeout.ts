import { TRPCError } from '@trpc/server'
import { middleware } from '../trpc/core'

const DEFAULT_TIMEOUT_MS = 25_000 // Vercel hard limit ~30s

export const timeoutMiddleware = middleware(async ({ next, ctx }) => {
  // Allow a lower per-request cap via header, but never exceed DEFAULT_TIMEOUT_MS
  const hinted = Number(ctx.header?.('x-timeout-ms') ?? '')
  const timeoutMs =
    Number.isFinite(hinted) && hinted > 0
      ? Math.min(hinted, DEFAULT_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS

  const deadline = Date.now() + timeoutMs
  const nextCtx = { ...ctx, deadline } as typeof ctx & { deadline: number }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new TRPCError({
          code: 'TIMEOUT',
          message:
            'Request timed out. Try again with a smaller payload or split the work into multiple calls.',
        }),
      )
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([next({ ctx: nextCtx }), timeoutPromise])

    // Best-effort diagnostics for clients / proxies
    if (nextCtx.resHeaders) {
      nextCtx.resHeaders.set('x-timeout-ms', String(timeoutMs))
      nextCtx.resHeaders.set('x-deadline-at', new Date(deadline).toISOString())
    }

    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
})
