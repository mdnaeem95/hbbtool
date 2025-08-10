import { createTRPCRouter } from "./trpc"
import { productRouter } from "./routers/product"
import { merchantRouter } from "./routers/merchant"
import { categoryRouter } from "./routers/category"
import { orderRouter } from "./routers/order"
import { customerRouter } from "./routers/customer"
import { authRouter } from "./routers/auth"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  product: productRouter,
  merchant: merchantRouter,
  category: categoryRouter,
  order: orderRouter,
  customer: customerRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter