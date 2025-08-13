import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { Context } from './types'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    }
  },
})

// Base middleware for logging
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start
  console.log(`[${type}] ${path} - ${duration}ms`)
  return result
})

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

// Merchant-only middleware
const isMerchant = isAuthed.unstable_pipe(({ ctx, next }) => {
  if (ctx.session.user.userType !== 'merchant') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Merchant access required' 
    })
  }
  return next({ ctx })
})

// Customer-only middleware
const isCustomer = isAuthed.unstable_pipe(({ ctx, next }) => {
  if (ctx.session.user.userType !== 'customer') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Customer access required' 
    })
  }
  return next({ ctx })
})

export const middleware: typeof t.middleware = t.middleware
export const router: typeof t.router = t.router
export const publicProcedure: typeof t.procedure = t.procedure.use(loggerMiddleware)
export const protectedProcedure: typeof t.procedure = t.procedure.use(loggerMiddleware).use(isAuthed)
export const merchantProcedure: typeof t.procedure = t.procedure.use(loggerMiddleware).use(isMerchant)
export const customerProcedure: typeof t.procedure = t.procedure.use(loggerMiddleware).use(isCustomer)