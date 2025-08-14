import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { paginationSchema, phoneSchema } from '../../utils/validation'
import { paginatedResponse } from '../../utils/pagination'
import { DeliveryMethod } from '@kitchencloud/database'
import { nanoid } from 'nanoid'
import { TRPCError } from '@trpc/server'

export const publicRouter = router({
  // Get merchant storefront
  getMerchant: publicProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: {
          slug: input.slug,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          categories: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              products: true,
              reviews: true,
            },
          },
        },
      })
      
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      // Track analytics
      await ctx.db.analytics.create({
        data: {
          merchantId: merchant.id,
          event: 'storefront_view',
          properties: {
            referrer: ctx.header('referer')    ?? null,
            userAgent: ctx.header('user-agent') ?? null,
          },
        },
      })
      
      return merchant
    }),

  // get product
getProduct: publicProcedure
  .input(z.object({
    merchantSlug: z.string(),
    productId: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    // First get merchant
    const merchant = await ctx.db.merchant.findFirst({
      where: { 
        slug: input.merchantSlug,
        status: 'ACTIVE',
      },
      select: { id: true },
    })
    
    if (!merchant) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
    }
    
    // Get product
    const product = await ctx.db.product.findFirst({
      where: {
        id: input.productId,
        merchantId: merchant.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        category: true,
        ProductVariant: {
          orderBy: { isDefault: 'desc' },
        },
        _count: {
          select: {
            orderItems: true,
            reviews: true,
          },
        },
      },
    })
    
    if (!product) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })
    }
    
    // Track product view
    await ctx.db.analytics.create({
      data: {
        merchantId: merchant.id,
        event: 'product_view',
        properties: {
          productId: product.id,
          productName: product.name,
          price: product.price,
        },
      },
    })
    
    return product
  }),
    
  // Browse products
  listProducts: publicProcedure
    .input(z.object({
      merchantSlug: z.string(),
      categoryId: z.string().optional(),
      search: z.string().optional(),
      ...paginationSchema.shape,
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findFirst({
        where: { slug: input.merchantSlug },
        select: { id: true },
      })
      
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      const where = {
        merchantId: merchant.id,
        status: 'ACTIVE',
        deletedAt: null,
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ],
        }),
      }
      
      return paginatedResponse(
        ctx.db.product,
        where,
        input,
        {
          category: true,
          ProductVariant: true,
        }
      )
    }),
    
  // Create checkout session
  createCheckout: publicProcedure
    .input(z.object({
      merchantId: z.string().cuid(),
      items: z.array(z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
        variantId: z.string().optional(),
        notes: z.string().optional(),
      })),
      deliveryMethod: z.nativeEnum(DeliveryMethod),
      deliveryAddress: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        postalCode: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }).optional(),
      customer: z.object({
        name: z.string(),
        phone: phoneSchema,
        email: z.string().email().optional(),
      }),
      scheduledFor: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate merchant
      const merchant = await ctx.db.merchant.findFirst({
        where: {
          id: input.merchantId,
          status: 'ACTIVE',
        },
      })
      
      if (!merchant) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'Merchant not found or inactive' 
        })
      }
      
      // Validate products and calculate totals
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.items.map(i => i.productId) },
          merchantId: input.merchantId,
          status: 'ACTIVE',
        },
      })
      
      let subtotal = 0
      const orderItems = input.items.map(item => {
        const product = products.find(p => p.id === item.productId)
        if (!product) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Product ${item.productId} not found`,
          })
        }
        
        const itemTotal = product.price.toNumber() * item.quantity
        subtotal += itemTotal
        
        return {
          productId: item.productId,
          productName: product.name,
          productPrice: product.price,
          quantity: item.quantity,
          price: product.price,
          total: itemTotal,
          notes: item.notes,
        }
      })
      
      // Calculate delivery fee
      const deliveryFee = input.deliveryMethod === 'DELIVERY' 
        ? merchant.deliveryFee.toNumber() 
        : 0
        
      const total = subtotal + deliveryFee
      
      // Check minimum order
      if (total < merchant.minimumOrder.toNumber()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum order amount is $${merchant.minimumOrder}`,
        })
      }
      
      // Create checkout session
      const sessionId = nanoid(32)
      await ctx.db.checkoutSession.create({
        data: {
          sessionId,
          merchantId: input.merchantId,
          items: orderItems,
          deliveryMethod: input.deliveryMethod,
          deliveryAddress: input.deliveryAddress,
          contactInfo: input.customer,
          subtotal,
          deliveryFee,
          total,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
          createdAt: new Date(),
          updatedAt: new Date(),
          ipAddress: ctx.header('x-forwarded-for') ?? ctx.header('x-real-ip') ?? ctx.ip,
          userAgent: ctx.header('user-agent'),
        },
      })
      
      return {
        sessionId,
        total,
        paymentMethods: merchant.paymentMethods,
        paynowNumber: merchant.paynowNumber,
        paynowQrCode: merchant.paynowQrCode,
      }
    }),
    
  // Track order
  trackOrder: publicProcedure
    .input(z.object({
      orderNumber: z.string(),
      phone: phoneSchema,
    }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: {
          orderNumber: input.orderNumber,
          customerPhone: input.phone,
        },
        include: {
          merchant: {
            select: {
              businessName: true,
              phone: true,
            },
          },
          items: {
            include: { product: true },
          },
        },
      })
      
      if (!order) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'Order not found' 
        })
      }
      
      return order
    }),
})