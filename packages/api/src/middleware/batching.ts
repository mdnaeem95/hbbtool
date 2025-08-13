export const batchingMiddleware = middleware(async ({ next, ctx, rawInput }) => {
  // Check if this is a list query with potential for large results
  const input = rawInput as any
  
  if (input?.pagination && !input.pagination.limit) {
    // Enforce a default limit
    input.pagination.limit = 20
  }
  
  if (input?.pagination?.limit > 100) {
    // Cap maximum limit
    input.pagination.limit = 100
  }
  
  return next({ ctx })
})