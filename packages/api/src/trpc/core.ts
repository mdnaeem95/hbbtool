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

// ---------- Export procedures ----------

export const router = t.router
export const middleware = t.middleware

export const publicProcedure = t.procedure
  .use(loggerMiddleware)

export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isAuthed)

// In packages/api/src/trpc/core.ts

// Add this after your existing publicProcedure and protectedProcedure

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Check if user is authenticated
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    })
  }

  // Check if user is an admin
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim())
  
  if (!ADMIN_EMAILS.includes(ctx.session.user.email)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return next({
    ctx: {
      ...ctx,
      isAdmin: true,
    },
  })
})

// merchantProcedure is the same as protectedProcedure now
export const merchantProcedure = protectedProcedure