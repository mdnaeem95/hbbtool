import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context } from './context'

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

// --- Middlewares ---

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = performance.now()
  const result = await next()
  const ms = (performance.now() - start).toFixed(1)

  if (process.env.NODE_ENV !== 'test') {
    console.log(`[tRPC] ${path} (${type}) - ${ms}ms`)
  }

  return result
})

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' })
  }

  // Lookup merchant only once
  const merchant = await ctx.db.merchant.findUnique({
    where: { id: ctx.session.user.id },
  })

  if (!merchant) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Merchant account not found',
    })
  }

  return next({
    ctx: {
      ...ctx,
      merchant,
    },
  })
})

const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' })
  }

  const userEmail = ctx.session.user.email?.toLowerCase()
  const adminEmails = [
    'muhdnaeem95@gmail.com',
    ...(process.env.ADMIN_EMAILS?.split(',') ?? []),
  ].map((e) => e.trim().toLowerCase())

  if (!userEmail || !adminEmails.includes(userEmail)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }

  return next({ ctx: { ...ctx, isAdmin: true } })
})

// --- Exports ---
export const router = t.router
export const middleware = t.middleware

export const publicProcedure = t.procedure.use(loggerMiddleware)
export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isAuthed)
export const adminProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isAdmin)

export const merchantProcedure = protectedProcedure
