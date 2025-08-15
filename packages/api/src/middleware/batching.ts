// packages/api/src/middleware/batching.ts
/**
 * Factory to build a batching/pagination guard without importing from core.ts.
 * Pass in `t.middleware` from core.
 */
export const buildBatchingMiddleware = (mw: any, opts?: {
  defaultLimit?: number
  maxLimit?: number
  minLimit?: number
}) =>
  mw(async ({ next, ctx, input }: { next: any, ctx: any, input: any }) => {
    const DEFAULT_LIMIT = opts?.defaultLimit ?? 20
    const MAX_LIMIT = opts?.maxLimit ?? 100
    const MIN_LIMIT = opts?.minLimit ?? 1

    const isObj = (v: unknown): v is Record<string, any> =>
      typeof v === 'object' && v !== null

    let resolvedLimit: number | undefined
    let nextInput = input

    if (isObj(input)) {
      const clone = { ...input }
      const hasNested = isObj(clone.pagination)
      const target = hasNested ? { ...clone.pagination } : clone

      // page
      const rawPage = Number(target.page)
      target.page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1

      // limit
      const rawLimit = Number(target.limit)
      let limit =
        Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : DEFAULT_LIMIT
      limit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, limit))
      target.limit = limit
      resolvedLimit = limit

      // sortOrder (optional)
      if (typeof target.sortOrder === 'string') {
        const s = target.sortOrder.toLowerCase()
        if (s === 'asc' || s === 'desc') target.sortOrder = s
        else delete target.sortOrder
      }

      // reattach nested pagination if present
      if (hasNested) {
        clone.pagination = target
      }

      nextInput = clone
    }

    if (resolvedLimit !== undefined) {
      ctx.resHeaders?.set('x-result-limit', String(resolvedLimit))
    }

    return next({ ctx, input: nextInput })
  })
