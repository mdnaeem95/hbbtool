import { router } from './trpc'
import { authRouter } from './routers/auth'
import { merchantRouter } from './routers/merchant'
import { productRouter } from './routers/product'
import { orderRouter } from './routers/order'
import { publicRouter } from './routers/public'

export const appRouter = router({
  auth: authRouter,
  merchant: merchantRouter,
  product: productRouter,
  order: orderRouter,
  public: publicRouter,
})

export type AppRouter = typeof appRouter

// Export utilities
export { createContext } from './context'
export * from './types'