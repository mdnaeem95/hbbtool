import { createTRPCRouter } from "./trpc"
import { productRouter } from "./routers/product"
import { merchantRouter } from "./routers/merchant"
import { categoryRouter } from "./routers/category"
import { orderRouter } from "./routers/order"
import { customerRouter } from "./routers/customer"
import { checkoutRouter } from "./routers/checkout"
import { paymentRouter } from "./routers/payment"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  product: productRouter,
  merchant: merchantRouter,
  category: categoryRouter,
  order: orderRouter,
  customer: customerRouter,
  checkout: checkoutRouter,
  payment: paymentRouter
})

// export type definition of API
export type AppRouter = typeof appRouter