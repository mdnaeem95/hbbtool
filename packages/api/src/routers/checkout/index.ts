import { z } from 'zod'
import { router, publicProcedure } from '../../trpc'
import { TRPCError } from '@trpc/server'
import { phoneSchema, postalCodeSchema } from '../../utils/validation'
import { nanoid } from 'nanoid'
import { DeliveryMethod } from '@kitchencloud/database'

// Temporary in-memory session storage (replace with Redis in production)
const checkoutSessions = new Map<string, any>()

export const checkoutRouter = router({
  // Create checkout session
  createSession: publicProcedure
    .input(z.object({
      merchantId: z.string().cuid(),
      items: z.array(z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
        variant: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate merchant
      const merchant = await ctx.db.merchant.findFirst({
        where: {
          id: input.merchantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          businessName: true,
          email: true,
          phone: true,
          paynowNumber: true,
          paynowQrCode: true,
          deliveryEnabled: true,
          pickupEnabled: true,
          deliveryFee: true,
          minimumOrder: true,
          operatingHours: true,
        },
      })
      
      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found or inactive',
        })
      }
      
      // Validate products
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.items.map(i => i.productId) },
          merchantId: input.merchantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      })
      
      if (products.length !== input.items.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Some products are not available',
        })
      }
      
      // Calculate totals
      let subtotal = 0
      const sessionItems = input.items.map(item => {
        const product = products.find(p => p.id === item.productId)!
        const itemTotal = product.price.toNumber() * item.quantity
        subtotal += itemTotal
        
        return {
          ...item,
          productName: product.name,
          productPrice: product.price.toNumber(),
          total: itemTotal,
        }
      })
      
      // Check minimum order
      if (merchant.minimumOrder && subtotal < merchant.minimumOrder.toNumber()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum order amount is $${merchant.minimumOrder}`,
        })
      }
      
      // Create session
      const sessionId = nanoid()
      const paymentReference = `KC${Date.now().toString(36).toUpperCase()}`
      
      const session = {
        sessionId,
        merchantId: input.merchantId,
        merchant,
        items: sessionItems,
        subtotal,
        paymentReference,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      }
      
      checkoutSessions.set(sessionId, session)
      
      return {
        sessionId,
        paymentReference,
        subtotal,
        deliveryFee: merchant.deliveryFee?.toNumber() || 0,
        minimumOrder: merchant.minimumOrder?.toNumber() || 0,
        merchant: {
          businessName: merchant.businessName,
          paynowNumber: merchant.paynowNumber,
          paynowQrCode: merchant.paynowQrCode,
        },
      }
    }),
    
  // Get session details
  getSession: publicProcedure
    .input(z.object({
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      const session = checkoutSessions.get(input.sessionId)
      
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or expired',
        })
      }
      
      // Check if expired
      if (new Date() > session.expiresAt) {
        checkoutSessions.delete(input.sessionId)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session has expired',
        })
      }
      
      return session
    }),
    
  // Calculate delivery fee based on postal code
  calculateDeliveryFee: publicProcedure
    .input(z.object({
      merchantId: z.string().cuid(),
      postalCode: postalCodeSchema,
    }))
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
        select: {
          deliveryFee: true,
          deliveryRadius: true,
          postalCode: true,
          latitude: true,
          longitude: true,
        },
      })
      
      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found',
        })
      }
      
      // For MVP, use flat delivery fee
      // In production, calculate based on distance
      const baseFee = merchant.deliveryFee?.toNumber() || 5
      
      // Simple zone-based pricing
      const merchantZone = parseInt(merchant.postalCode?.substring(0, 2) || '10')
      const customerZone = parseInt(input.postalCode.substring(0, 2))
      const zoneDifference = Math.abs(merchantZone - customerZone)
      
      let fee = baseFee
      let estimatedTime = 30 // minutes
      
      if (zoneDifference > 20) {
        fee = baseFee + 3
        estimatedTime = 45
      } else if (zoneDifference > 10) {
        fee = baseFee + 2
        estimatedTime = 40
      } else if (zoneDifference > 5) {
        fee = baseFee + 1
        estimatedTime = 35
      }
      
      return {
        fee,
        estimatedTime,
        distance: zoneDifference * 0.5, // Rough estimate in km
      }
    }),
    
  // Complete checkout and create order
  complete: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      contactInfo: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: phoneSchema,
      }),
      deliveryAddress: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        postalCode: postalCodeSchema,
        notes: z.string().optional(),
      }).optional(),
      deliveryNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = checkoutSessions.get(input.sessionId)
      
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or expired',
        })
      }
      
      if (session.status === 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Order already completed',
        })
      }
      
      // Determine delivery method
      const deliveryMethod = input.deliveryAddress ? 'DELIVERY' : 'PICKUP'
      
      // Calculate delivery fee
      let deliveryFee = 0
      if (deliveryMethod === 'DELIVERY' && input.deliveryAddress) {
        const feeData = await ctx.db.merchant.findUnique({
          where: { id: session.merchantId },
          select: { deliveryFee: true },
        })
        deliveryFee = feeData?.deliveryFee?.toNumber() || 5
      }
      
      const total = session.subtotal + deliveryFee
      
      // Get or create customer
      let customer = await ctx.db.customer.findFirst({
        where: {
          OR: [
            { email: input.contactInfo.email },
            { phone: input.contactInfo.phone },
          ],
        },
      })
      
      if (!customer) {
        customer = await ctx.db.customer.create({
          data: {
            email: input.contactInfo.email,
            phone: input.contactInfo.phone,
            name: input.contactInfo.name,
          },
        })
      }

      // create delivery address if needed
      let deliveryAddressId: string | undefined
      if (input.deliveryAddress && deliveryMethod === 'DELIVERY') {
        const address = await ctx.db.address.create({
            data: {
                label: 'Delivery Address',
                line1: input.deliveryAddress.line1,
                line2: input.deliveryAddress.line2,
                postalCode: input.deliveryAddress.postalCode,
                customerId: customer.id,                
            },
        })
        deliveryAddressId = address.id
      }
      
      // Create order
      const orderNumber = `ORD${Date.now().toString(36).toUpperCase()}`
      
      const order = await ctx.db.order.create({
        data: {
          orderNumber,
          merchantId: session.merchantId,
          customerId: customer.id,
          status: 'PENDING',
          deliveryMethod: deliveryMethod as DeliveryMethod,
          deliveryAddressId,
          subtotal: session.subtotal,
          deliveryFee,
          discount: 0,
          tax: 0,
          total,
          paymentMethod: 'PAYNOW',
          paymentStatus: 'PENDING',
          customerName: input.contactInfo.name,
          customerEmail: input.contactInfo.email,
          customerPhone: input.contactInfo.phone,
          deliveryNotes: input.deliveryNotes,
          items: {
            create: session.items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productPrice: item.productPrice,
              quantity: item.quantity,
              price: item.productPrice,
              total: item.total,
              notes: item.notes,
            })),
          },
        },
      })
      
      // Mark session as completed
      session.status = 'completed'
      session.orderId = order.id
      
      // TODO: Send notifications
      // await NotificationService.notifyNewOrder(order)
      
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
      }
    }),
})