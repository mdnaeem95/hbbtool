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
import { settingsRouter } from './trpc/routers/settings'
import { notificationRouter } from './trpc/routers/notification'
import { adminRouter } from './trpc/routers/admin'
import { storageRouter } from './trpc/routers/storage'
import { productModifiersRouter } from './trpc/routers/productModifiers'
import { onboardingRouter } from './trpc/routers/onboarding'
import { productVariantsRouter } from './trpc/routers/productVariants'
import { ingredientRouter } from './trpc/routers/ingredient'
import { recipeRouter } from './trpc/routers/recipe'
import { deliveryRouter } from './trpc/routers/delivery'
import { categoryRouter } from './trpc/routers/category'

export { createTRPCContext } from './trpc/context'
export type { TRPCContext } from './trpc/context'

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
  analytics: analyticsRouter,
  settings: settingsRouter,
  notification: notificationRouter,
  admin: adminRouter,
  storage: storageRouter,
  productModifiers: productModifiersRouter,
  productVariants: productVariantsRouter,
  onboarding: onboardingRouter,
  ingredients: ingredientRouter, 
  recipe: recipeRouter,
  delivery: deliveryRouter,
  category: categoryRouter
})

export * from "./services/search/index"

export type AppRouter = typeof appRouter
export * from "./types"
export { default as transformer } from 'superjson'