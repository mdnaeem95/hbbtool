// middleware/batching.ts
import { middleware } from '../trpc/core'

export const batching = middleware(async ({ next, ctx, input }) => {
  const DEFAULT_LIMIT = 20
  const MAX_LIMIT = 100
  const MIN_LIMIT = 1

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
