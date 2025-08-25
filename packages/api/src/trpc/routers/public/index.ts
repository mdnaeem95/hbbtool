import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../../core'
import { paginationSchema, phoneSchema } from '../../../utils/validation'
import { paginatedResponse } from '../../../utils/pagination'
import { DeliveryMethod } from '@kitchencloud/database'
import { nanoid } from 'nanoid'

/* ---------------- helpers ---------------- */
const asNumber = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'toNumber' in (v as any)) {
    try { return (v as any).toNumber() } catch {}
  }
  return Number(v ?? 0)
}

/* ---------------- router ---------------- */
export const publicRouter = router({
  // Get merchant storefront
  getMerchant: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.slug, status: 'ACTIVE', deletedAt: null },
        include: {
          categories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          _count: { select: { products: true, reviews: true } },
        },
      })

      if (!merchant) throw new TRPCError({ code: 'NOT_FOUND' })

      // Track analytics (best-effort)
      await ctx.db.analytics.create({
        data: {
          merchantId: merchant.id,
          event: 'storefront_view',
          properties: {
            referrer: ctx.req.headers.get('referer') ?? null,
            userAgent: ctx.req.headers.get('user-agent') ?? null,
          },
        },
      }).catch(() => {})

      return merchant
    }),

  // Get single product by merchant slug + product id
  getProduct: publicProcedure
    .input(z.object({
      merchantSlug: z.string(),
      productId: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.merchantSlug, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      })
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }

      const product = await ctx.db.product.findFirst({
        where: {
          id: input.productId,
          merchantId: merchant.id,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          category: true,
          variants: { orderBy: { isDefault: 'desc' } },
          _count: { select: { orderItems: true, reviews: true } },
        },
      })
      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })
      }

      // Track product view (best-effort)
      await ctx.db.analytics.create({
        data: {
          merchantId: merchant.id,
          event: 'product_view',
          properties: {
            productId: product.id,
            productName: product.name,
            price: asNumber(product.price),
          },
        },
      }).catch(() => {})

      return product
    }),

  // Browse products (public)
  listProducts: publicProcedure
    .input(z.object({
      merchantSlug: z.string(),
      categoryId: z.string().optional(),
      search: z.string().optional(),
      ...paginationSchema.shape,
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.merchantSlug, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      })
      if (!merchant) throw new TRPCError({ code: 'NOT_FOUND' })

      const where = {
        merchantId: merchant.id,
        status: 'ACTIVE' as const,
        deletedAt: null,
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { description: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      }

      return paginatedResponse(
        ctx.db.product,
        where,
        input,
        {
          category: true,
          variants: true,
        }
      )
    }),

  // Create checkout session (public)
  createCheckout: publicProcedure
    .input(z.object({
      merchantId: z.string().uuid(),
      items: z.array(z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
        variantId: z.string().optional(),
        notes: z.string().optional(),
      })).min(1),
      deliveryMethod: z.nativeEnum(DeliveryMethod),
      deliveryAddress: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        postalCode: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }).optional(),
      customer: z.object({
        name: z.string().min(1),
        phone: phoneSchema,
        email: z.string().email().optional(),
      }),
      scheduledFor: z.coerce.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate merchant + capabilities
      const merchant = await ctx.db.merchant.findFirst({
        where: { id: input.merchantId, status: 'ACTIVE', deletedAt: null },
        select: {
          id: true,
          deliveryEnabled: true,
          pickupEnabled: true,
          deliveryFee: true,
          minimumOrder: true,
          paynowNumber: true,
          paynowQrCode: true,
        },
      })
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found or inactive' })
      }
      if (input.deliveryMethod === 'DELIVERY' && !merchant.deliveryEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Delivery not available' })
      }
      if (input.deliveryMethod === 'PICKUP' && !merchant.pickupEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pickup not available' })
      }

      // Validate products & compute totals (lock current prices)
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.items.map(i => i.productId) },
          merchantId: input.merchantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true, name: true, price: true },
      })
      const byId = new Map(products.map(p => [p.id, p]))
      let subtotal = 0
      const orderItems = input.items.map(it => {
        const p = byId.get(it.productId)
        if (!p) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Product ${it.productId} not available` })
        }
        const unit = asNumber(p.price)
        const line = Math.round(unit * it.quantity * 100) / 100
        subtotal += line
        return {
          productId: it.productId,
          productName: p.name,
          productPrice: unit,
          quantity: it.quantity,
          price: unit,
          total: line,
          notes: it.notes,
          variantId: it.variantId,
        }
      })
      subtotal = Math.round(subtotal * 100) / 100

      const deliveryFee = input.deliveryMethod === 'DELIVERY' ? asNumber(merchant.deliveryFee ?? 0) : 0
      const total = Math.round((subtotal + deliveryFee) * 100) / 100

      // Minimum order check (compare against subtotal or total; here we use total)
      const minOrder = asNumber(merchant.minimumOrder ?? 0)
      if (total < minOrder) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum order amount is $${minOrder.toFixed(2)}`,
        })
      }

      // Persist checkout session (30 mins)
      const sessionId = nanoid(32)
      await ctx.db.checkoutSession.create({
        data: {
          sessionId,
          merchantId: input.merchantId,
          items: orderItems as unknown as any,          // JSON column
          deliveryAddress: input.deliveryAddress as unknown as any, // JSON column
          // Persist public-only bits here (schema has no dedicated fields)
          contactInfo: {
            ...input.customer,
            deliveryMethod: input.deliveryMethod,       // ← stored inside JSON
            scheduledFor: input.scheduledFor ?? null,   // ← stored inside JSON
          } as unknown as any,
          subtotal,
          deliveryFee,
          total,
          promotionCodes: [],                            // ← required array field
          ipAddress: ctx.req.headers.get('x-forwarded-for') ?? ctx.req.headers.get('x-real-ip') ?? ctx.ip,
          userAgent: ctx.req.headers.get('user-agent'),
          // expiresAt has no default; createdAt has a default; updatedAt is @updatedAt
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      })

      // Normalize payment methods (derive from merchant PayNow fields)
      const paymentMethods = merchant.paynowNumber
        ? [{
            method: 'PAYNOW' as const,
            enabled: true,
            details: { number: merchant.paynowNumber, qrCode: merchant.paynowQrCode },
          }]
        : []

      return {
        sessionId,
        total,
        paymentMethods,
        paynowNumber: merchant.paynowNumber,
        paynowQrCode: merchant.paynowQrCode,
      }
    }),

  // Public order tracker
  trackOrder: publicProcedure
    .input(z.object({
      orderNumber: z.string().min(3),
      phone: phoneSchema,
    }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: { orderNumber: input.orderNumber, customerPhone: input.phone },
        include: {
          merchant: { select: { businessName: true, phone: true } },
          items: { include: { product: true } },
          deliveryAddress: true,
          events: { orderBy: { createdAt: 'desc' } },
        },
      })

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' })
      }

      return order
    }),
})