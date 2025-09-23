import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../../core'
import { phoneSchema, postalCodeSchema } from '../../../utils/validation'
import { nanoid } from 'nanoid'
import { DeliveryMethod, PaymentMethod, OrderStatus, PaymentStatus } from '@homejiak/database'
import { orderSMSTemplates } from '../../../services/notification/templates/order-sms'
import { smsProvider } from '../../../services/notification/provider/sms'

// ---------- types ----------
export enum DeliveryPricingModel {
  FLAT = 'FLAT',
  DISTANCE = 'DISTANCE',
  ZONE = 'ZONE',
  FREE = 'FREE'
}

interface DeliverySettings {
  pricingModel: DeliveryPricingModel
  flatRate?: number
  zoneRates?: {
    sameZone: number
    adjacentZone: number
    crossZone: number
    specialArea: number
  }
  distanceRates?: {
    baseRate: number
    perKmRate: number
    tiers: Array<{
      minKm: number
      maxKm: number
      additionalFee: number
    }>
  }
  freeDeliveryMinimum?: number
  specialAreaSurcharge?: number
}

// Singapore zone mapping
const SINGAPORE_ZONES: Record<string, string> = {
  // Central
  '01': 'central', '02': 'central', '03': 'central', '04': 'central',
  '05': 'central', '06': 'central', '07': 'central', '08': 'central',
  '09': 'central', '10': 'central', '11': 'central', '12': 'central',
  '13': 'central', '14': 'central', '15': 'central', '16': 'central',
  '17': 'central', '18': 'central', '19': 'central', '20': 'central',
  '58': 'central', '59': 'central',
  
  // West
  '21': 'west', '22': 'west', '23': 'west', '24': 'west',
  '60': 'west', '61': 'west', '62': 'west', '63': 'west',
  '64': 'west', '65': 'west', '66': 'west', '67': 'west',
  '68': 'west', '69': 'west',
  
  // North
  '25': 'north', '26': 'north', '27': 'north', '28': 'north',
  '70': 'north', '71': 'north', '72': 'north', '73': 'north',
  '75': 'north', '76': 'north', '77': 'north', '78': 'north',
  
  // Northeast
  '29': 'northeast', '30': 'northeast', '31': 'northeast',
  '53': 'northeast', '54': 'northeast', '55': 'northeast',
  '56': 'northeast', '57': 'northeast', '79': 'northeast',
  '80': 'northeast', '81': 'northeast', '82': 'northeast',
  
  // East
  '34': 'east', '35': 'east', '36': 'east', '37': 'east',
  '38': 'east', '39': 'east', '40': 'east', '41': 'east',
  '42': 'east', '43': 'east', '44': 'east', '45': 'east',
  '46': 'east', '47': 'east', '48': 'east', '49': 'east',
  '50': 'east', '51': 'east', '52': 'east',
}

const ADJACENT_ZONES: Record<string, string[]> = {
  'central': ['east', 'west', 'north', 'northeast'],
  'east': ['central', 'northeast'],
  'west': ['central', 'north'],
  'north': ['central', 'west', 'northeast'],
  'northeast': ['central', 'north', 'east'],
}

// District coordinates for distance calculation
const DISTRICT_COORDINATES: Record<string, { lat: number; lon: number }> = {
  '01': { lat: 1.2836, lon: 103.8515 }, // Raffles Place
  '02': { lat: 1.2836, lon: 103.8515 }, // Raffles Place  
  '03': { lat: 1.2931, lon: 103.8520 }, // Queenstown
  '04': { lat: 1.2897, lon: 103.8422 }, // Telok Blangkar
  '05': { lat: 1.2719, lon: 103.8078 }, // Pasir Panjang
  '06': { lat: 1.2931, lon: 103.8520 }, // City Hall
  '07': { lat: 1.3054, lon: 103.8547 }, // Beach Road
  '08': { lat: 1.3088, lon: 103.8622 }, // Little India
  '09': { lat: 1.2494, lon: 103.8303 }, // Sentosa/Orchard
  '10': { lat: 1.3032, lon: 103.8307 }, // Tanglin
  '11': { lat: 1.3146, lon: 103.8154 }, // Newton
  '12': { lat: 1.3271, lon: 103.8527 }, // Toa Payoh
  '13': { lat: 1.3404, lon: 103.8759 }, // Macpherson
  '14': { lat: 1.3317, lon: 103.8890 }, // Geylang
  '15': { lat: 1.3088, lon: 103.9054 }, // Katong
  '16': { lat: 1.3345, lon: 103.9034 }, // Bedok
  '17': { lat: 1.3179, lon: 103.9423 }, // Changi
  '18': { lat: 1.3534, lon: 103.9448 }, // Pasir Ris
  '19': { lat: 1.3711, lon: 103.8863 }, // Hougang
  '20': { lat: 1.3766, lon: 103.8485 }, // Bishan
  '21': { lat: 1.3516, lon: 103.8083 }, // Upper Bukit Timah
  '22': { lat: 1.3403, lon: 103.6935 }, // Jurong
  '23': { lat: 1.3526, lon: 103.7543 }, // Hillview
  '24': { lat: 1.3420, lon: 103.7321 }, // Jurong East/West
  '25': { lat: 1.4419, lon: 103.7768 }, // Woodlands
  '26': { lat: 1.3932, lon: 103.8483 }, // Upper Thomson
  '27': { lat: 1.4382, lon: 103.8002 }, // Sembawang
  '28': { lat: 1.3807, lon: 103.8759 }, // Sengkang
  '29': { lat: 1.4058, lon: 103.9032 }, // Seletar
  '30': { lat: 1.3639, lon: 103.8095 }, // Mandai
  // Add more as needed
}

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
      address?: {
        line1: string
        line2?: string
        postalCode?: string
        buildingName?: string
      }
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

function getZoneFromPostalCode(postalCode: string): string {
  const district = postalCode.substring(0, 2)
  
  // Special check for Sentosa
  if (postalCode.startsWith('098') || postalCode.startsWith('099')) {
    return 'sentosa'
  }
  
  return SINGAPORE_ZONES[district] || 'central'
}

function getCoordinatesFromPostalCode(postalCode: string): { lat: number; lon: number } | null {
  const district = postalCode.substring(0, 2)
  return DISTRICT_COORDINATES[district] || null
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function isSpecialArea(postalCode: string): boolean {
  // Sentosa
  if (postalCode.startsWith('098') || postalCode.startsWith('099')) {
    return true
  }
  // Jurong Island
  if (postalCode.startsWith('627') || postalCode.startsWith('628') || postalCode.startsWith('629')) {
    return true
  }
  // Tuas
  if (postalCode.startsWith('636') || postalCode.startsWith('637') || postalCode.startsWith('638')) {
    return true
  }
  return false
}

// ---------- zod shapes ----------
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
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

// ---------- router ----------
export const checkoutRouter = router({

  // Create checkout session
  createSession: publicProcedure
    .input(z.object({
      merchantId: z.string().uuid(),
      items: z.array(z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().positive(),
        variant: z.string().optional(), // JSON string of variant
        notes: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('🛒 [Checkout] Creating session for merchant:', input.merchantId)
      
      // 1) Validate merchant
      const merchant = await ctx.db.merchant.findFirst({
        where: { 
          id: input.merchantId, 
          status: 'ACTIVE', 
          deletedAt: null 
        },
        select: {
          id: true,
          businessName: true,
          deliveryEnabled: true,
          pickupEnabled: true,
          deliveryFee: true,
          minimumOrder: true,
          paynowNumber: true,
          paynowQrCode: true,
        },
      })
      
      if (!merchant) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Merchant not found or inactive' 
        })
      }

      // 2) Validate products & calculate totals
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.items.map(i => i.productId) },
          merchantId: input.merchantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { 
          id: true, 
          name: true, 
          price: true,
          inventory: true,
          trackInventory: true,
        },
      })
      
      const productMap = new Map(products.map(p => [p.id, p]))
      
      // Helper to convert Decimal to number
      const asNumber = (decimal: any): number => {
        if (typeof decimal === 'number') return decimal
        if (decimal && typeof decimal === 'object' && 'toNumber' in decimal) {
          return decimal.toNumber()
        }
        return Number(decimal ?? 0)
      }
      
      // 3) Build order items with current prices
      let subtotal = 0
      const orderItems = []
      
      for (const item of input.items) {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Product ${item.productId} not available` 
          })
        }
        
        // Check stock if tracking inventory
        if (product.trackInventory && product.inventory < item.quantity) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `${product.name} only has ${product.inventory} units in stock` 
          })
        }
        
        const unitPrice = asNumber(product.price)
        const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100
        subtotal += lineTotal
        
        orderItems.push({
          productId: item.productId,
          productName: product.name,
          productPrice: unitPrice,
          quantity: item.quantity,
          price: unitPrice,
          total: lineTotal,
          notes: item.notes || null,
          variant: item.variant ? JSON.parse(item.variant) : null,
        })
      }
      
      subtotal = Math.round(subtotal * 100) / 100
      
      // 4) Check minimum order
      const minOrder = asNumber(merchant.minimumOrder ?? 0)
      if (minOrder > 0 && subtotal < minOrder) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Minimum order amount is $${minOrder.toFixed(2)}. Current total: $${subtotal.toFixed(2)}`,
        })
      }
      
      // 5) Generate unique IDs
      const sessionId = nanoid(32)
      const paymentReference = `PAY${Date.now().toString(36).toUpperCase()}`
      
      // 6) Create session in DATABASE
      const session = await ctx.db.checkoutSession.create({
        data: {
          sessionId,
          merchantId: input.merchantId,
          items: orderItems as any, // JSON field
          subtotal,
          deliveryFee: merchant.deliveryFee || 0,
          discount: 0,
          total: subtotal, // Will be recalculated on complete with delivery fee
          paymentReference,
          promotionCodes: [],
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
          ipAddress: ctx.req?.headers.get('x-forwarded-for') || 
                    ctx.req?.headers.get('x-real-ip') || 
                    'unknown',
          userAgent: ctx.req?.headers.get('user-agent') || null,
        },
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
              paynowNumber: true,
              paynowQrCode: true,
              deliveryEnabled: true,
              pickupEnabled: true,
              deliveryFee: true,
            }
          }
        }
      })
      
      console.log('✅ [Checkout] Session created:', sessionId)
      console.log('💳 [Checkout] Payment reference:', paymentReference)
      
      return {
        sessionId,
        paymentReference,
        subtotal,
        deliveryFee: asNumber(merchant.deliveryFee ?? 0),
        total: subtotal, // Without delivery fee for now
        merchant: {
          id: merchant.id,
          businessName: merchant.businessName,
          paynowNumber: merchant.paynowNumber || null,
          paynowQrCode: merchant.paynowQrCode || null,
          deliveryEnabled: merchant.deliveryEnabled,
          pickupEnabled: merchant.pickupEnabled,
        },
        expiresAt: session.expiresAt.toISOString(),
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
        // 1) Get session from DATABASE (not memory!)
        const session = await ctx.db.checkoutSession.findFirst({
          where: {
            sessionId: input.sessionId,
            expiresAt: { gt: new Date() }, // Not expired
          },
          include: {
            merchant: true, // Include merchant for delivery validation
          }
        })

        if (!session) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Session not found or expired' 
          })
        }

        // 2) Check if already completed (idempotency)
        const existingOrder = await ctx.db.order.findFirst({
          where: { paymentReference: session.paymentReference }
        })

        if (existingOrder) {
          console.log('♻️ [Checkout] Returning existing order:', existingOrder.orderNumber)
          return { 
            orderId: existingOrder.id, 
            orderNumber: existingOrder.orderNumber 
          }
        }

        // 3) Validate delivery method
        const deliveryMethod = input.deliveryMethod
        if (deliveryMethod === DeliveryMethod.DELIVERY && !session.merchant.deliveryEnabled) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Delivery not available for this merchant' 
          })
        }
        if (deliveryMethod === DeliveryMethod.PICKUP && !session.merchant.pickupEnabled) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Pickup not available for this merchant' 
          })
        }

        // 4) Parse items from JSON
        const items = session.items as any[] // Type assertion for JSON field
        if (!items || items.length === 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Session has no items' 
          })
        }

        // 5) Calculate final totals with proper Decimal handling
        const asNumber = (decimal: any): number => {
          if (typeof decimal === 'number') return decimal
          if (decimal && typeof decimal === 'object' && 'toNumber' in decimal) {
            return decimal.toNumber()
          }
          return Number(decimal ?? 0)
        }

        const deliveryFee = deliveryMethod === DeliveryMethod.DELIVERY 
          ? asNumber(session.merchant.deliveryFee ?? 0)
          : 0

        const subtotal = asNumber(session.subtotal ?? 0)
        const discount = asNumber(session.discount ?? 0)
        const tax = 0 // Or calculate if needed
        const total = subtotal + deliveryFee + tax - discount

        console.log('💰 [Checkout] Final totals:', { subtotal, deliveryFee, total })

        // 6) Get or create customer
        let customer = await ctx.db.customer.findFirst({
          where: {
            OR: [
              ...(input.contactInfo.email ? [{ email: input.contactInfo.email }] : []),
              { phone: input.contactInfo.phone },
            ],
          },
        })
        
        if (!customer) {
          customer = await ctx.db.customer.create({
            data: {
              email: input.contactInfo.email || null,
              phone: input.contactInfo.phone,
              name: input.contactInfo.name,
            },
          })
          console.log('👤 [Checkout] Created new customer:', customer.name)
        } else {
          console.log('👤 [Checkout] Found existing customer:', customer.name)
        }

        // 7) Create delivery address if needed
        let deliveryAddressId: string | undefined
        if (deliveryMethod === DeliveryMethod.DELIVERY && input.deliveryAddress) {
          const address = await ctx.db.address.create({
            data: {
              label: 'Delivery Address',
              line1: input.deliveryAddress.line1,
              line2: input.deliveryAddress.line2 || null,
              postalCode: input.deliveryAddress.postalCode,
              latitude: input.deliveryAddress.latitude || null,
              longitude: input.deliveryAddress.longitude || null,
              customerId: customer.id,
            },
          })
          deliveryAddressId = address.id
          console.log('📍 [Checkout] Created delivery address')
        }

        // 8) Generate unique order number
        const orderNumber = `ORD${Date.now().toString(36).toUpperCase()}`

        // 9) Create order with items in a transaction
        const order = await ctx.db.$transaction(async (tx) => {
          const newOrder = await tx.order.create({
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
              customerEmail: input.contactInfo.email || null,
              customerPhone: input.contactInfo.phone,
              deliveryNotes: input.deliveryNotes || null,
              paymentReference: session.paymentReference || null,
              paymentProof: input.paymentProof || null,
              items: {
                create: items.map((it) => ({
                  productId: it.productId,
                  productName: it.productName || 'Product',
                  productPrice: asNumber(it.productPrice ?? it.price ?? 0),
                  quantity: it.quantity ?? 1,
                  price: asNumber(it.productPrice ?? it.price ?? 0),
                  total: asNumber(it.total ?? 0),
                  notes: it.notes || null,
                })),
              },
            },
            include: {
              items: true,
            }
          })

          // 10) Update session to link it to the order (optional but helpful)
          await tx.checkoutSession.update({
            where: { id: session.id },
            data: { 
              customerId: customer.id,
              // Optionally extend expiry to allow payment proof upload
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            }
          })

          return newOrder
        })

        console.log('✅ [Checkout] Order created successfully:', order.orderNumber)
        console.log('📦 [Checkout] Order contains', order.items.length, 'items')
        
        // 11) Send notifications (best effort, don't fail the order)
        try {
          // Generate tracking URL
            const trackingUrl = `${process.env.APP_URL || 'https://homejiak.sg'}/order/${order.orderNumber}/track`

            // send SMS to customer if phone provided
            if (input.contactInfo.phone) {
              const smsMessage = orderSMSTemplates.orderPlaced({
                orderNumber: order.orderNumber,
                merchantName: session.merchant.businessName,
                trackingUrl
              })

            // since we're using guest checkout - send SMS directly using phone
            await smsProvider.sendDirect({
              phone: input.contactInfo.phone,
              message: smsMessage
            })

            console.log('📱 [Checkout] SMS sent to customer:', input.contactInfo.phone)
            }

            // Also notify merchant
            await smsProvider.send({
              userId: session.merchantId,
              message: `📱 New order #${order.orderNumber} from ${customer.name} - $${order.total}. Check your dashboard!`,
              data: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerName: customer.name,
                amount: Number(order.total)
              }
            })
        } catch (notifError) {
          console.error('⚠️ [Checkout] Notification failed:', notifError)
          // Don't throw - order was created successfully
        }

        return { 
          orderId: order.id, 
          orderNumber: order.orderNumber,
          paymentReference: session.paymentReference || undefined,
        }

      } catch (error) {
        console.error('❌ [Checkout] Completion failed:', error)
        
        // Provide more specific error messages
        if (error instanceof TRPCError) {
          throw error
        }
        
        // Database errors
        if (error instanceof Error) {
          if (error.message.includes('Unique constraint')) {
            throw new TRPCError({ 
              code: 'CONFLICT', 
              message: 'Order already exists for this session' 
            })
          }
        }
        
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to complete order. Please try again.' 
        })
      }
    }),

  // Calculate delivery fee endpoint
  calculateDeliveryFee: publicProcedure
    .input(z.object({
      merchantId: z.string().uuid(),
      postalCode: z.string().regex(/^\d{6}$/, 'Invalid Singapore postal code'),
      orderTotal: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get merchant with all delivery-related fields
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
        select: {
          id: true,
          businessName: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          deliveryEnabled: true,
          deliveryFee: true,
          deliveryRadius: true,
          minimumOrder: true,
          deliverySettings: true,
          preparationTime: true,
        }
      })

      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found'
        })
      }

      if (!merchant.deliveryEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Merchant does not offer delivery'
        })
      }

      // Parse delivery settings or use defaults
      const settings: DeliverySettings = (merchant.deliverySettings as any) || {
        pricingModel: DeliveryPricingModel.FLAT,
        flatRate: Number(merchant.deliveryFee || 5),
        specialAreaSurcharge: 5
      }

      // Get merchant postal code and coordinates
      const merchantPostalCode = merchant.postalCode || '238874'
      const specialArea = isSpecialArea(input.postalCode)
      
      // Get zones
      const customerZone = getZoneFromPostalCode(input.postalCode)
      const merchantZone = getZoneFromPostalCode(merchantPostalCode)
      
      // Calculate distance if coordinates available
      let distance = 0
      if (merchant.latitude && merchant.longitude) {
        // Use actual merchant coordinates if available
        const customerCoords = getCoordinatesFromPostalCode(input.postalCode)
        if (customerCoords) {
          distance = calculateDistance(
            merchant.latitude,
            merchant.longitude,
            customerCoords.lat,
            customerCoords.lon
          )
        }
      } else {
        // Fallback to postal code coordinates
        const merchantCoords = getCoordinatesFromPostalCode(merchantPostalCode)
        const customerCoords = getCoordinatesFromPostalCode(input.postalCode)
        if (merchantCoords && customerCoords) {
          distance = calculateDistance(
            merchantCoords.lat,
            merchantCoords.lon,
            customerCoords.lat,
            customerCoords.lon
          )
        }
      }

      // Check delivery radius
      const maxRadius = merchant.deliveryRadius || 10
      if (distance > 0 && distance > maxRadius) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Delivery not available to this area. We only deliver within ${maxRadius}km.`
        })
      }

      // Check if eligible for free delivery
      const orderTotal = input.orderTotal || 0
      const freeDeliveryThreshold = settings.freeDeliveryMinimum || Number(merchant.minimumOrder || 0)
      if (freeDeliveryThreshold > 0 && orderTotal >= freeDeliveryThreshold) {
        return {
          fee: 0,
          estimatedTime: 30,
          distance,
          zone: customerZone,
          message: `Free delivery (minimum order $${freeDeliveryThreshold} met)`,
          pricingModel: settings.pricingModel,
          isSpecialArea: specialArea
        }
      }

      let fee = 0
      let message = ''

      // Calculate fee based on pricing model
      switch (settings.pricingModel) {
        case DeliveryPricingModel.FREE:
          fee = 0
          message = 'Free delivery'
          break

        case DeliveryPricingModel.FLAT:
          fee = settings.flatRate || Number(merchant.deliveryFee || 5)
          if (specialArea) {
            fee += settings.specialAreaSurcharge || 5
            message = 'Standard delivery fee + special area surcharge'
          } else {
            message = 'Standard delivery fee'
          }
          break

        case DeliveryPricingModel.DISTANCE:
          if (!distance) {
            fee = Number(merchant.deliveryFee || 5)
            message = 'Standard delivery fee'
          } else {
            const rates = settings.distanceRates || {
              baseRate: 5,
              perKmRate: 0,
              tiers: [
                { minKm: 0, maxKm: 3, additionalFee: 0 },
                { minKm: 3, maxKm: 5, additionalFee: 2 },
                { minKm: 5, maxKm: 10, additionalFee: 4 },
                { minKm: 10, maxKm: 15, additionalFee: 6 }
              ]
            }
            
            fee = rates.baseRate
            const tier = rates.tiers.find(t => distance >= t.minKm && distance <= t.maxKm)
            if (tier) {
              fee += tier.additionalFee
            }
            
            if (specialArea) {
              fee += settings.specialAreaSurcharge || 5
            }
            
            message = `Distance-based pricing (${distance}km)`
            if (specialArea) {
              message += ' + special area surcharge'
            }
          }
          break

        case DeliveryPricingModel.ZONE:
          const rates = settings.zoneRates || {
            sameZone: 5,
            adjacentZone: 7,
            crossZone: 10,
            specialArea: 15
          }
          
          if (specialArea) {
            fee = rates.specialArea
            message = 'Special area delivery'
          } else if (customerZone === merchantZone) {
            fee = rates.sameZone
            message = `Same zone delivery (${customerZone})`
          } else {
            const adjacentZones = ADJACENT_ZONES[merchantZone] || []
            if (adjacentZones.includes(customerZone)) {
              fee = rates.adjacentZone
              message = `Adjacent zone delivery (${merchantZone} to ${customerZone})`
            } else {
              fee = rates.crossZone
              message = `Cross-zone delivery (${merchantZone} to ${customerZone})`
            }
          }
          break

        default:
          fee = Number(merchant.deliveryFee || 5)
          message = 'Standard delivery fee'
      }

      // Calculate estimated time
      let estimatedTime = merchant.preparationTime || 30
      if (distance > 0) {
        // Add travel time based on distance (assuming 30km/h average speed)
        estimatedTime += Math.round((distance / 30) * 60)
      } else if (customerZone !== merchantZone) {
        // Zone-based estimate
        estimatedTime += 20
      }

      return {
        fee: Math.round(fee * 100) / 100,
        estimatedTime,
        distance,
        zone: customerZone,
        message,
        pricingModel: settings.pricingModel,
        isSpecialArea: specialArea
      }
    }),
})