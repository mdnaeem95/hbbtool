import { router } from './trpc'
import { authRouter } from './routers/auth'
import { merchantRouter } from './routers/merchant'
import { productRouter } from './routers/product'
import { orderRouter } from './routers/order'
import { publicRouter } from './routers/public'
import { checkoutRouter } from './routers/checkout'
import { paymentRouter } from './routers/payment'

export const appRouter = router({
  auth: authRouter,
  merchant: merchantRouter,
  product: productRouter,
  order: orderRouter,
  public: publicRouter,
  checkout: checkoutRouter,
  payment: paymentRouter
})

export type AppRouter = typeof appRouter

// Export utilities
export * from './types'