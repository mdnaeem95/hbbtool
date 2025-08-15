import { middleware } from "../trpc/core"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const MIN_LIMIT = 1

export const batchingMiddleware = middleware(async ({ next, ctx, input }) => {
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

  // surface the effective limit for observability
  if (resolvedLimit !== undefined) {
    ctx.resHeaders?.set('x-result-limit', String(resolvedLimit))
  }

  return next({ ctx, input: nextInput })
})