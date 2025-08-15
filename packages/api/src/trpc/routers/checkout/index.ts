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
  productId: z.string().cuid(),
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
      merchantId: z.string().uuid(),
      items: lineItemsZ.min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1) Validate merchant (only active, not deleted)
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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found or inactive' })
      }

      // 2) Validate products
      const productIds = input.items.map(i => i.productId)
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

      if (products.length !== input.items.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Some products are not available' })
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

      // 4) Enforce minimum order
      const minOrder = asNumber(merchant.minimumOrder ?? 0)
      if (minOrder > 0 && subtotal < minOrder) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum order amount is $${minOrder.toFixed(2)}`,
        })
      }

      // 5) Create a session (30 min)
      const sessionId = nanoid()
      const paymentReference = `KC${Date.now().toString(36).toUpperCase()}`

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
          deliveryEnabled: !!merchant.deliveryEnabled,
          pickupEnabled: !!merchant.pickupEnabled,
          deliveryFee: asNumber(merchant.deliveryFee ?? 0),
          minimumOrder: minOrder,
          operatingHours: merchant.operatingHours,
        },
        items: sessionItems,
        subtotal,
        paymentReference,
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }

      checkoutSessions.set(sessionId, session)

      return {
        sessionId,
        paymentReference,
        subtotal,
        deliveryFee: session.merchant.deliveryFee,
        minimumOrder: minOrder,
        merchant: {
          businessName: session.merchant.businessName,
          paynowNumber: session.merchant.paynowNumber,
          paynowQrCode: session.merchant.paynowQrCode,
        },
      }
    }),

  // Get session details
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = checkoutSessions.get(input.sessionId)

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or expired' })
      }
      if (new Date() > session.expiresAt) {
        checkoutSessions.delete(input.sessionId)
        session.status = 'expired'
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session has expired' })
      }

      return session
    }),

  // Calculate delivery fee (MVP: zone-based)
  calculateDeliveryFee: publicProcedure
    .input(z.object({
      merchantId: z.string().uuid(),
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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }

      // MVP: flat base fee + simple zone diff uplifts
      const baseFee = asNumber(merchant.deliveryFee ?? 5)
      const merchantZone = parseInt((merchant.postalCode ?? '').substring(0, 2) || '10', 10)
      const customerZone = parseInt(input.postalCode.substring(0, 2), 10)
      const zoneDifference = Math.abs(merchantZone - customerZone)

      let fee = baseFee
      let estimatedTime = 30 // minutes

      if (zoneDifference > 20) {
        fee = baseFee + 3; estimatedTime = 45
      } else if (zoneDifference > 10) {
        fee = baseFee + 2; estimatedTime = 40
      } else if (zoneDifference > 5) {
        fee = baseFee + 1; estimatedTime = 35
      }

      return {
        fee: money(fee),
        estimatedTime,
        distance: zoneDifference * 0.5, // very rough km estimate
      }
    }),

  // Complete checkout → create order
  complete: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      contactInfo: contactInfoZ,
      deliveryAddress: deliveryAddressZ.optional(),
      deliveryNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = checkoutSessions.get(input.sessionId)

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found or expired' })
      }
      if (new Date() > session.expiresAt) {
        checkoutSessions.delete(input.sessionId)
        session.status = 'expired'
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session has expired' })
      }
      if (session.status === 'completed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order already completed' })
      }

      // Determine delivery method and enforce merchant capability
      const deliveryMethod: DeliveryMethod = input.deliveryAddress
        ? DeliveryMethod.DELIVERY
        : DeliveryMethod.PICKUP

      // Re-check merchant flags to avoid stale session abuse
      const freshMerchant = await ctx.db.merchant.findUnique({
        where: { id: session.merchantId },
        select: { deliveryEnabled: true, pickupEnabled: true, deliveryFee: true },
      })
      if (!freshMerchant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Merchant not found' })
      }
      if (deliveryMethod === DeliveryMethod.DELIVERY && !freshMerchant.deliveryEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Delivery not available' })
      }
      if (deliveryMethod === DeliveryMethod.PICKUP && !freshMerchant.pickupEnabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pickup not available' })
      }

      // Optionally re-validate current product prices (in case they changed during session)
      const productIds = session.items.map(i => i.productId)
      const freshProducts = await ctx.db.product.findMany({
        where: { id: { in: productIds }, merchantId: session.merchantId, status: 'ACTIVE', deletedAt: null },
        select: { id: true, price: true, name: true },
      })
      const priceMap = new Map(freshProducts.map(p => [p.id, asNumber(p.price)]))
      const nameMap = new Map(freshProducts.map(p => [p.id, p.name]))

      let recalculatedSubtotal = 0
      for (const it of session.items) {
        const latestPrice = priceMap.get(it.productId)
        if (latestPrice == null) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A product became unavailable' })
        }
        // lock to *latest* price policy (or keep session price by switching latestPrice -> it.productPrice)
        it.productPrice = latestPrice
        it.productName = nameMap.get(it.productId) || it.productName
        it.total = money(latestPrice * it.quantity)
        recalculatedSubtotal += it.total
      }
      recalculatedSubtotal = money(recalculatedSubtotal)

      // Delivery fee
      let deliveryFee = 0
      if (deliveryMethod === DeliveryMethod.DELIVERY && input.deliveryAddress) {
        deliveryFee = asNumber(freshMerchant.deliveryFee ?? 5)
      }

      const subtotal = recalculatedSubtotal
      const discount = 0
      const tax = 0
      const total = money(subtotal + deliveryFee + tax - discount)

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

      // Create order + items (single transaction is safer)
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

      // TODO: Notification hooks (e.g., email, dashboard, push)
      // await NotificationService.notifyNewOrder(order)

      return { orderId: order.id, orderNumber: order.orderNumber }
    }),
})