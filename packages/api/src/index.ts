// sub-routers
import { publicProcedure, router } from './trpc/core'
import { authRouter } from './trpc/routers/auth'
import { checkoutRouter } from './trpc/routers/checkout'
import { merchantRouter } from './trpc/routers/merchant'
import { orderRouter } from './trpc/routers/order'
import { paymentRouter } from './trpc/routers/payment'
import { productRouter } from './trpc/routers/product'
import { publicRouter } from './trpc/routers/public'
import { analyticsRouter } from './trpc/routers/analytics'

export { createTRPCContext } from './trpc/context'
export type { TRPCContext } from './trpc/context'

// (optional) tiny health route for smoke tests
export const appRouter = router({
  health: publicProcedure.query(({ ctx }) => ({
    ok: true,
    time: new Date().toISOString(),
    ip: ctx.ip ?? null,
  })),
  auth: authRouter,
  merchant: merchantRouter,
  product: productRouter,
  checkout: checkoutRouter,
  order: orderRouter,
  payment: paymentRouter,
  public: publicRouter,
  analytics: analyticsRouter
})

export type AppRouter = typeof appRouter
export { default as transformer } from 'superjson'