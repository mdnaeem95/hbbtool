import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context, Session, SupabaseLike } from './types'

// 👇 Provide concrete generics so ctx.session / ctx.supabase are strongly typed
const t = initTRPC.context<Context<Session, SupabaseLike>>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// Logging middleware (unchanged)
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start
  console.log(`[${type}] ${path} - ${duration}ms`)
  return result
})

// When this passes, we *narrow* session to non-null for downstream
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' })
  // Narrow the type for subsequent handlers:
  return next({
    ctx: { ...ctx, session: ctx.session as Session },
  })
})

const isMerchant = isAuthed.unstable_pipe(({ ctx, next }) => {
  if (ctx.session.user.userType !== 'merchant') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Merchant access required' })
  }
  return next({ ctx })
})

const isCustomer = isAuthed.unstable_pipe(({ ctx, next }) => {
  if (ctx.session.user.userType !== 'customer') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Customer access required' })
  }
  return next({ ctx })
})

export const middleware = t.middleware
export const router = t.router
export const publicProcedure = t.procedure.use(loggerMiddleware)
export const protectedProcedure = t.procedure.use(loggerMiddleware).use(isAuthed)
export const merchantProcedure = t.procedure.use(loggerMiddleware).use(isMerchant)
export const customerProcedure = t.procedure.use(loggerMiddleware).use(isCustomer)
