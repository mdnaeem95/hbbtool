import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../../core'
import { phoneSchema, postalCodeSchema } from '../../../utils/validation'
import { nanoid } from 'nanoid'
import {
  DeliveryMethod,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
} from '@kitchencloud/database'

// ---------- helpers ----------
const asNumber = (v: unknown): number => {
  // Prisma.Decimal or number or string
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'toNumber' in (v as any)) {
    try { return (v as any).toNumber() } catch {}
  }
  return Number(v)
}

const money = (n: number) => Math.round(n * 100) / 100

// Flexible ID validation - accepts UUID, CUID, or reasonable ID strings
const flexibleIdSchema = z.string().min(1).refine((id) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const isCuid = /^[cC][^\s-]{8,}$/.test(id)
  const isReasonableId = id.length >= 8 && id.length <= 50 && !/\s/.test(id)
  
  return isUuid || isCuid || isReasonableId
}, {
  message: "Invalid ID format"
})

// Temporary in-memory session storage (replace with Redis in production)
const checkoutSessions = new Map<
  string,
  {
    sessionId: string
    merchantId: string
    merchant: {
      id: string
      businessName: string
      email: string | null
      phone: string | null
      paynowNumber: string | null
      paynowQrCode: string | null
      deliveryEnabled: boolean
      pickupEnabled: boolean
      deliveryFee: number
      minimumOrder: number
      operatingHours: unknown
    }
    items: Array<{
      productId: string
      quantity: number
      variant?: string
      notes?: string
      productName: string
      productPrice: number
      total: number
    }>
    subtotal: number
    paymentReference: string
    status: 'pending' | 'completed' | 'expired'
    createdAt: Date
    expiresAt: Date
    orderId?: string
  }
>()

// ---------- zod shapes ----------
const lineItemsZ = z.array(z.object({
  productId: flexibleIdSchema,
  quantity: z.number().int().positive(),
  variant: z.string().optional(),
  notes: z.string().optional(),
}))

const contactInfoZ = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: phoneSchema,
})

const deliveryAddressZ = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  postalCode: postalCodeSchema,
  notes: z.string().optional(),
})

// ---------- router ----------
export const checkoutRouter = router({

  // Create checkout session
  createSession: publicProcedure
    .input(z.object({
      merchantId: flexibleIdSchema,
      items: lineItemsZ.min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('🛒 [Checkout] Creating session for merchant:', input.merchantId)
      console.log('🛒 [Checkout] Items:', input.items.length)

      // Debug ID formats
      console.log('🔍 [Checkout] ID Analysis:', {
        merchantId: {
          value: input.merchantId,
          length: input.merchantId.length,
          isUuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.merchantId),
          isCuid: /^[cC][^\s-]{8,}$/.test(input.merchantId),
        },
        productIds: input.items.map(item => ({
          value: item.productId,
          length: item.productId.length,
          isUuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.productId),
          isCuid: /^[cC][^\s-]{8,}$/.test(item.productId),
        }))
      })

      try {
        // 1) Validate merchant (only active, not deleted)
        console.log('🔍 [Checkout] Looking for merchant...')
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
          console.error('❌ [Checkout] Merchant not found:', input.merchantId)
          
          // Debug: Check what merchants exist
          const allMerchants = await ctx.db.merchant.findMany({
            select: { id: true, businessName: true, status: true, deletedAt: true },
            take: 5
          })
          console.log('🔍 [Checkout] Available merchants:', allMerchants)
          
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Merchant not found or inactive',
            cause: `Merchant ID: ${input.merchantId}`
          })
        }

        console.log('✅ [Checkout] Merchant found:', merchant.businessName)

        // 2) Validate products
        const productIds = input.items.map(i => i.productId)
        console.log('🔍 [Checkout] Looking for products:', productIds)
        
        const products = await ctx.db.product.findMany({
          where: {
            id: { in: productIds },
            merchantId: input.merchantId,
            status: 'ACTIVE',
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            price: true,
          },
        })

        console.log('✅ [Checkout] Products found:', products.length, 'expected:', input.items.length)

        if (products.length !== input.items.length) {
          console.error('❌ [Checkout] Product mismatch.')
          console.error('❌ [Checkout] Found products:', products.map(p => ({ id: p.id, name: p.name })))
          console.error('❌ [Checkout] Expected product IDs:', productIds)
          
          // Debug: Check what products exist for this merchant
          const allProducts = await ctx.db.product.findMany({
            where: { merchantId: input.merchantId },
            select: { id: true, name: true, status: true, deletedAt: true },
            take: 5
          })
          console.log('🔍 [Checkout] All merchant products:', allProducts)
          
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Some products are not available'
          })
        }

        // 3) Calculate totals + lock line pricing
        let subtotal = 0
        const sessionItems = input.items.map(item => {
          const product = products.find(p => p.id === item.productId)!
          const unit = asNumber(product.price)
          const line = money(unit * item.quantity)
          subtotal += line
          return {
            ...item,
            productName: product.name,
            productPrice: unit,
            total: line,
          }
        })
        subtotal = money(subtotal)

        console.log('💰 [Checkout] Subtotal calculated:', subtotal)

        // 4) Enforce minimum order
        const minOrder = asNumber(merchant.minimumOrder ?? 0)
        if (subtotal < minOrder) {
          console.error('❌ [Checkout] Minimum order not met:', subtotal, 'required:', minOrder)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Minimum order amount is $${minOrder.toFixed(2)}. Current total: $${subtotal.toFixed(2)}`,
          })
        }

        // 5) Create session
        const sessionId = nanoid(32)
        const paymentReference = `PAY-${sessionId.slice(0, 8).toUpperCase()}`
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

        const session = {
          sessionId,
          merchantId: input.merchantId,
          merchant: {
            id: merchant.id,
            businessName: merchant.businessName,
            email: merchant.email,
            phone: merchant.phone,
            paynowNumber: merchant.paynowNumber,
            paynowQrCode: merchant.paynowQrCode,
            deliveryEnabled: merchant.deliveryEnabled,
            pickupEnabled: merchant.pickupEnabled,
            deliveryFee: asNumber(merchant.deliveryFee ?? 0),
            minimumOrder: asNumber(merchant.minimumOrder ?? 0),
            operatingHours: merchant.operatingHours,
          },
          items: sessionItems,
          subtotal,
          paymentReference,
          status: 'pending' as const,
          createdAt: new Date(),
          expiresAt,
        }

        // Store in memory (replace with Redis/DB in production)
        checkoutSessions.set(sessionId, session)

        console.log('✅ [Checkout] Session created:', sessionId)

        return {
          sessionId,
          subtotal,
          paymentReference,
          merchant: session.merchant,
          items: sessionItems,
          expiresAt,
        }

      } catch (error) {
        console.error('❌ [Checkout] Session creation failed:', error)
        throw error
      }
    }),

  // Get checkout session
  getSession: publicProcedure
    .input(z.object({
      sessionId: z.string().min(1),
    }))
    .query(async ({ input }) => {
      console.log('🔍 [Checkout] Getting session:', input.sessionId)
      
      const session = checkoutSessions.get(input.sessionId)
      
      if (!session) {
        console.error('❌ [Checkout] Session not found:', input.sessionId)
        console.log('🔍 [Checkout] Available sessions:', Array.from(checkoutSessions.keys()).slice(0, 5))
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or expired' })
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        console.error('❌ [Checkout] Session expired:', input.sessionId)
        checkoutSessions.delete(input.sessionId)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session expired' })
      }

      console.log('✅ [Checkout] Session found:', session.merchant.businessName)
      return session
    }),

  // Complete checkout and create order
  complete: publicProcedure
    .input(z.object({
      sessionId: z.string().min(1),
      contactInfo: contactInfoZ,
      deliveryAddress: deliveryAddressZ.optional(),
      deliveryMethod: z.nativeEnum(DeliveryMethod).default(DeliveryMethod.PICKUP),
      deliveryNotes: z.string().optional(),
      paymentProof: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('🎯 [Checkout] Completing checkout for session:', input.sessionId)

      try {
        // 1) Get session
        const session = checkoutSessions.get(input.sessionId)
        if (!session || session.expiresAt < new Date()) {
          checkoutSessions.delete(input.sessionId)
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or expired' })
        }

        if (session.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session already completed' })
        }

        // 2) Validate delivery method
        const deliveryMethod = input.deliveryMethod
        if (deliveryMethod === DeliveryMethod.DELIVERY && !session.merchant.deliveryEnabled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Delivery not available' })
        }
        if (deliveryMethod === DeliveryMethod.PICKUP && !session.merchant.pickupEnabled) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pickup not available' })
        }

        // 3) Calculate final totals
        const deliveryFee = deliveryMethod === DeliveryMethod.DELIVERY 
          ? session.merchant.deliveryFee 
          : 0

        const subtotal = session.subtotal
        const discount = 0
        const tax = 0
        const total = money(subtotal + deliveryFee + tax - discount)

        console.log('💰 [Checkout] Final totals:', { subtotal, deliveryFee, total })

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

        console.log('👤 [Checkout] Customer:', customer.name)

        // Optional: create delivery address
        let deliveryAddressId: string | undefined
        if (deliveryMethod === DeliveryMethod.DELIVERY && input.deliveryAddress) {
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

        // Create order + items
        const orderNumber = `ORD${Date.now().toString(36).toUpperCase()}`
        const order = await ctx.db.order.create({
          data: {
            orderNumber,
            merchantId: session.merchantId,
            customerId: customer.id,
            status: OrderStatus.PENDING,
            deliveryMethod,
            deliveryAddressId,
            subtotal,
            deliveryFee,
            discount,
            tax,
            total,
            paymentMethod: PaymentMethod.PAYNOW,
            paymentStatus: PaymentStatus.PENDING,
            customerName: input.contactInfo.name,
            customerEmail: input.contactInfo.email,
            customerPhone: input.contactInfo.phone,
            deliveryNotes: input.deliveryNotes,
            paymentReference: session.paymentReference,
            paymentProof: input.paymentProof,
            items: {
              create: session.items.map((it) => ({
                productId: it.productId,
                productName: it.productName,
                productPrice: it.productPrice,
                quantity: it.quantity,
                price: it.productPrice,
                total: it.total,
                notes: it.notes,
              })),
            },
          },
        })

        // Mark session as completed
        session.status = 'completed'
        session.orderId = order.id

        console.log('✅ [Checkout] Order created:', order.orderNumber)
        
        return { orderId: order.id, orderNumber: order.orderNumber }

      } catch (error) {
        console.error('❌ [Checkout] Completion failed:', error)
        throw error
      }
    }),
})