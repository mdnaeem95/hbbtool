import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context } from './context'
import { Merchant, MerchantStatus } from '@homejiak/types'

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
  // Select only the fields that match your central Merchant type
  const merchant = await ctx.db.merchant.findUnique({
    where: { id: ctx.session.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      businessName: true,
      slug: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      businessType: true,
      businessRegistrationNumber: true,
      cuisineType: true,
      halal: true,
      licenseNumber: true,
      licenseExpiryDate: true,  // Note: typo in your type (licesenseExpiry)
      insuranceExpiryDate: true,
      nric: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankName: true,
      gstRegistered: true,
      gstNumber: true,
      operatingHours: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFee: true,
      minimumOrder: true,
      deliveryRadius: true,
      preparationTime: true,
      averageRating: true,  // Map to 'rating' in your type
      totalReviews: true,   // Map to 'reviewCount' in your type
      status: true,
      verified: true,        // Map to 'isVerified' in your type
      address: true,
      postalCode: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      // Don't include sensitive fields like password, twoFactorSecret, etc.
    }
  })

  if (!merchant) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Merchant account not found',
    })
  }

  const simplifiedMerchant: Merchant = {
    id: merchant.id,
    email: merchant.email,
    phone: merchant.phone,
    businessName: merchant.businessName,
    slug: merchant.slug,
    description: merchant.description,
    logoUrl: merchant.logoUrl,
    bannerUrl: merchant.bannerUrl,
    cuisineType: merchant.cuisineType,
    operatingHours: merchant.operatingHours,
    deliveryEnabled: merchant.deliveryEnabled,
    pickupEnabled: merchant.pickupEnabled,

    // ✅ Decimal → number
    deliveryFee: merchant.deliveryFee.toNumber(),
    minimumOrder: merchant.minimumOrder.toNumber(),

    deliveryRadius: merchant.deliveryRadius,
    preparationTime: merchant.preparationTime,

    // ✅ map + defaults
    rating: merchant.averageRating?.toNumber() ?? 0,
    reviewCount: merchant.totalReviews,
    status: merchant.status as MerchantStatus,
    isVerified: merchant.verified,

    address: merchant.address,
    postalCode: merchant.postalCode,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    createdAt: merchant.createdAt,
    updatedAt: merchant.updatedAt,
    deletedAt: merchant.deletedAt,
  }

  return next({
    ctx: {
      ...ctx,
      merchant: simplifiedMerchant,
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
