import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../../core'
import { phoneSchema, postalCodeSchema } from '../../../utils/validation'
import { nanoid } from 'nanoid'
import { DeliveryMethod, PaymentMethod, OrderStatus, PaymentStatus } from '@kitchencloud/database'

// ---------- types ----------
enum DeliveryPricingModel {
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