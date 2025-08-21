import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context } from './context'
import type { AuthSession } from '@kitchencloud/auth'

export const t = initTRPC.context<Context>().create({
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

// ---------- Middlewares ----------

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const ms = Date.now() - start
  
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[tRPC] [${type}] ${path} - ${ms}ms`)
  }
  
  return result
})

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  return next({
    ctx: {
      ...ctx,
      session: ctx.session as AuthSession,
    },
  })
})

const isMerchant = isAuthed.unstable_pipe(({ ctx, next }) => {
  if (ctx.session.user.userType !== 'merchant') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Merchant access required' 
    })
  }
  
  return next({ ctx })
})

const isCustomer = isAuthed.unstable_pipe(({ ctx, next }) => {
  if (ctx.session.user.userType !== 'customer') {
    throw new TRPCError({ 
      code: 'FORBIDDEN', 
      message: 'Customer access required' 
    })
  }
  
  return next({ ctx })
})

// ---------- Export procedures ----------

export const router = t.router
export const middleware = t.middleware

export const publicProcedure = t.procedure
  .use(loggerMiddleware)

export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isAuthed)

export const merchantProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isMerchant)

export const customerProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isCustomer)