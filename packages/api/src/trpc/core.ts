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

const isAuthed = t.middleware(async ({ ctx, next }) => {
  // Get session from Supabase
  const { data: { session } } = await ctx.supabase.auth.getSession()
  
  if (!session?.user) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in' 
    })
  }
  
  // Get merchant data
  const merchant = await ctx.db.merchant.findFirst({
    where: { 
      email: {
        equals: session.user.email!,
        mode: 'insensitive'
      }
    }
  })

  if (!merchant) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'Merchant account not found' 
    })
  }
  
  return next({
    ctx: {
      ...ctx,
      session: {
        user: {
          id: merchant.id,
          email: merchant.email,
          userType: 'merchant' as const,
        }
      },
      merchant,
    },
  })
})

const isAdmin = t.middleware(async ({ ctx, next }) => {
  // Get session from Supabase
  const { data: { session } } = await ctx.supabase.auth.getSession()
  
  if (!session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    })
  }

  // Check if user is an admin
  const ADMIN_EMAILS: string[] = process.env.ADMIN_EMAILS 
    ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
    : ['muhdnaeem95@gmail.com']
  
  const userEmail = session.user.email?.toLowerCase()
  
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  // Get merchant data for context
  const merchant = await ctx.db.merchant.findFirst({
    where: { 
      email: {
        equals: session.user.email!,
        mode: 'insensitive'
      }
    }
  })

  if (!merchant) {
    throw new TRPCError({ 
      code: 'NOT_FOUND',
      message: 'Merchant account not found' 
    })
  }

  // Check merchant status
  if (merchant.status !== 'ACTIVE' || !merchant.verified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Account is not active',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        user: {
          id: merchant.id,
          email: merchant.email,
          userType: 'merchant' as const,
        }
      },
      merchant,
      isAdmin: true,
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

export const adminProcedure = t.procedure
  .use(loggerMiddleware)
  .use(isAdmin)

// merchantProcedure is the same as protectedProcedure
export const merchantProcedure = protectedProcedure