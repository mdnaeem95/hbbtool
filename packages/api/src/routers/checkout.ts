import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"
import { DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@kitchencloud/database/client"

// helper for Decimal | number -> number
const toNum = (v: unknown): number =>
    typeof v === "number" ? v : v && typeof (v as any).toNumber === "function" ? (v as any).toNumber() : Number(v ?? 0)

// Validation schemas
const addressSchema = z.object({
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  postalCode: z.string().regex(/^\d{6}$/, "Invalid Singapore postal code"),
  city: z.string().default("Singapore"),
  state: z.string().default("Singapore"),
  country: z.string().default("Singapore"),
})

const contactInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[689]\d{7}$/, "Invalid Singapore phone number"),
})

const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  variant: z.any().optional(),
  notes: z.string().optional(),
})

export const checkoutRouter = createTRPCRouter({
  // Create checkout session
  createSession: publicProcedure
    .input(
      z.object({
        merchantId: z.string(),
        items: z.array(cartItemSchema).min(1, "Cart cannot be empty"),
        deliveryMethod: z.nativeEnum(DeliveryMethod).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify merchant exists and is active
      const merchant = await ctx.db.merchant.findFirst({
        where: { id: input.merchantId, status: "ACTIVE" },
        select: {
          id: true,
          businessName: true,
          minimumOrder: true,
          deliveryFee: true,
          paynowNumber: true,
          paynowQrCode: true,
        }
      })
      if (!merchant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found or inactive" })
      }
      
      // Validate products and calculate subtotal
      let subtotal = 0
      const validatedItems = await Promise.all(
        input.items.map(async (item) => {
          const product = await ctx.db.product.findFirst({
            where: { 
              id: item.productId,
              merchantId: input.merchantId,
              status: "ACTIVE",
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
              price: true,
              quantity: true,
              trackQuantity: true,
            }
          })
          
          if (!product) {
            throw new TRPCError({ code: "NOT_FOUND", message: `Product not found or unavailable` })
          }
          
          // Stock check if tracking
          if (product.trackQuantity && product.quantity < item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Only ${product.quantity} units of ${product.name} available`,
            })
          }
          
          const unit = toNum(product.price)
          const itemTotal = unit * item.quantity
          subtotal += itemTotal
          
          return {
            productId: product.id,
            productName: product.name,
            price: new Prisma.Decimal(unit),
            quantity: item.quantity,
            variant: item.variant ?? null,
            notes: item.notes ?? null,
            total: new Prisma.Decimal(itemTotal),
          }
        })
      )
      
      // Check minimum order
      const minOrder = toNum(merchant.minimumOrder)
      if (minOrder > 0 && subtotal < minOrder) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum order amount is $${minOrder.toFixed(2)}`,
        })
      }

      // Delivery fee (only for DELIVERY)
      const deliveryFeeNum = 
        input.deliveryMethod === DeliveryMethod.DELIVERY ? toNum(merchant.deliveryFee ?? 0) : 0
    
      const totalNum = subtotal + deliveryFeeNum
      
      // Generate unique session ID and payment reference
      const sessionId = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string
      const paymentReference = `PAY-${Date.now().toString().slice(-7)}`
      const now = new Date()

      // Headers
      const xfwd = ctx.headers?.get("x-forwarded-for") || undefined
      const ipAddress = xfwd ? xfwd.split(",")[0]?.trim() : undefined
      const userAgent = ctx.headers?.get("user-agent") || undefined
           
      // persist session
      await ctx.db.checkoutSession.create({
        data: {
          sessionId,
          merchantId: input.merchantId,
          items: validatedItems as any,
          deliveryMethod: input.deliveryMethod ?? null,
          subtotal: new Prisma.Decimal(subtotal),
          deliveryFee: new Prisma.Decimal(deliveryFeeNum),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(totalNum),
          paymentReference,
          customerId: ctx.session?.user?.id ?? null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
          createdAt: now,
          updatedAt: now
        },
      })
      
      return {
        sessionId,
        paymentReference,
        subtotal,
        deliveryFee: deliveryFeeNum,
        total: totalNum,
        merchant: {
          businessName: merchant.businessName,
          paynowNumber: merchant.paynowNumber,
          paynowQrCode: merchant.paynowQrCode,
        }
      }
    }),

  // Get session details
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.checkoutSession.findUnique({
        where: { sessionId: input.sessionId },
        include: { 
          merchant: {
            select: {
              id: true,
              businessName: true,
              paynowNumber: true,
              paynowQrCode: true,
              deliveryFee: true,
              minimumOrder: true,
              address: true,
              phone: true,
              deliveryEnabled: true,
              pickupEnabled: true
            }
          } 
        },
      })
      
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" })
      }
      if (session.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session expired. Please start checkout again.",
        })
      }
      
      return session
    }),

  // Update session delivery details
  updateDelivery: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        deliveryMethod: z.nativeEnum(DeliveryMethod),
        deliveryAddress: addressSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.checkoutSession.findUnique({
        where: { sessionId: input.sessionId },
        include: { merchant: {
            select: {
                id: true,
                deliveryEnabled: true,
                pickupEnabled: true,
                deliveryFee: true
            }
        } },
      })
      
      if (!session || session.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or expired",
        })
      }

      // validate merchant capabilities
      if (input.deliveryMethod === DeliveryMethod.DELIVERY && !session.merchant.deliveryEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Merchant does not offer delivery" })
      }
      if (input.deliveryMethod === DeliveryMethod.PICKUP && !session.merchant.pickupEnabled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Merchant does not offer pickup" })
      }
      
      // require address for delivery
      if (input.deliveryMethod === DeliveryMethod.DELIVERY && !input.deliveryAddress) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery address is required" })
      }
      
      // Recalculate delivery fee
      const deliveryFee = input.deliveryMethod === DeliveryMethod.DELIVERY
        ? toNum(session.merchant.deliveryFee)
        : 0
      
      const subtotal = toNum(session.subtotal)
      const total = subtotal + deliveryFee
      
      // Update session
      await ctx.db.checkoutSession.update({
        where: { id: session.id },
        data: {
          deliveryMethod: input.deliveryMethod,
          deliveryAddress: input.deliveryAddress
            ? (input.deliveryAddress as Prisma.InputJsonValue)
            : Prisma.DbNull,
          deliveryFee: new Prisma.Decimal(deliveryFee),
          total: new Prisma.Decimal(total),
          updatedAt: new Date(),
        },
      })
      
      return {
        deliveryFee,
        total,
      }
    }),

  // Calculate delivery fee based on postal code
  calculateDeliveryFee: publicProcedure
    .input(
      z.object({
        merchantId: z.string(),
        postalCode: z.string().regex(/^\d{6}$/, "Invalid postal code"),
      })
    )
    .query(async ({ ctx, input }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
        select: {
          deliveryFee: true,
          deliveryRadius: true,
          postalCode: true,
          deliveryEnabled: true,
        },
      })
      
      if (!merchant || !merchant.deliveryEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Delivery not available for this merchant",
        })
      }
      
      // Simple zone-based calculation
      // In production, use actual distance calculation with Google Maps API
      const merchantZone = merchant.postalCode?.substring(0, 2) || "00"
      const customerZone = input.postalCode.substring(0, 2)
      
      let fee = merchant.deliveryFee?.toNumber() || 0
      
      // Add surcharge for different zones
      const zoneDiff = Math.abs(parseInt(merchantZone) - parseInt(customerZone))
      if (zoneDiff > 10) {
        fee += 3 // $3 surcharge for far zones
      } else if (zoneDiff > 5) {
        fee += 2 // $2 surcharge for medium distance
      }
      
      return { 
        fee,
        estimatedTime: 30 + (zoneDiff * 2), // Base 30 min + 2 min per zone difference
      }
    }),

  // Complete checkout and create order
  complete: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        contactInfo: contactInfoSchema,
        deliveryAddress: addressSchema.optional(),
        deliveryNotes: z.string().optional(),
        notes: z.string().optional(),
        scheduledFor: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get and validate session
      const session = await ctx.db.checkoutSession.findUnique({
        where: { sessionId: input.sessionId },
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
              minimumOrder: true,
              preparationTime: true,
              deliveryEnabled: true,
              pickupEnabled: true
            }
          },
        },
      })
      
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" })
      }
      
      if (session.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session expired. Please start checkout again.",
        })
      }
      
      // Validate delivery requirements
      const method = session.deliveryMethod ?? DeliveryMethod.PICKUP
      if (method === DeliveryMethod.DELIVERY && !input.deliveryAddress) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Delivery address is required" })
      }
      
      // Calculate final pricing
      const subtotal = toNum(session.subtotal)
      const deliveryFee = toNum(session.deliveryFee)
      const total = subtotal + deliveryFee
      
      // Generate order number and Estimate ready time
      const orderNumber = `ORD-${Date.now()}`
      const estimatedReady = new Date(
        Date.now() + (session.merchant.preparationTime ?? 30) * 60 * 1000
      )
      const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null
      
      // persists in a transaction
      const order = await ctx.db.$transaction(async (tx) => {
        // Create delivery address if needed
        let deliveryAddressId: string | null = null
        if (method === DeliveryMethod.DELIVERY && input.deliveryAddress && session.customerId) {
            // pick only model fields
            const { line1, line2, postalCode, latitude, longitude } = input.deliveryAddress as any
            const addr = await tx.address.create({
                data: {
                    customerId: session.customerId,
                    label: "Delivery Address",
                    line1,
                    line2: line2 ?? null,
                    postalCode,
                    latitude: typeof latitude === "number" ? latitude : null,
                    longitude: typeof longitude === "number" ? longitude : null,
                }
            })
            deliveryAddressId = addr.id
        }
        
        // Create order
        const created = await tx.order.create({
          data: {
            orderNumber,
            merchantId: session.merchantId,
            customerId: session.customerId,
            deliveryMethod: method,
            deliveryAddressId,
            deliveryFee: new Prisma.Decimal(deliveryFee),
            deliveryNotes: input.deliveryNotes ?? null,
            subtotal: new Prisma.Decimal(subtotal),
            discount: new Prisma.Decimal(0),
            tax: new Prisma.Decimal(0),
            total: new Prisma.Decimal(total),
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            paymentMethod: PaymentMethod.PAYNOW,
            customerName: input.contactInfo.name,
            customerPhone: input.contactInfo.phone,
            customerEmail: input.contactInfo.email,
            notes: input.notes ?? null,
            scheduledFor,
            estimatedReady,
            items: {
              create: (session.items as any[]).map((item) => ({
                productId: item.productId,
                productName: item.productName,
                productPrice: new Prisma.Decimal(toNum(item.price)),
                quantity: item.quantity,
                price: new Prisma.Decimal(toNum(item.price)),
                total: new Prisma.Decimal(toNum(item.total)),
                variant: item.variant ?? null,
                notes: item.notes ?? null,
              })),
            },
          },
          include: {
            merchant: { select: { businessName: true, phone: true, address: true } },
            items: {
              include: {
                product: { select: { name: true, images: true } },
              },
            },
          },
        })
        
        // Create payment record
        await tx.payment.create({
          data: {
            orderId: created.id,
            amount: new Prisma.Decimal(total),
            currency: "SGD",
            method: PaymentMethod.PAYNOW,
            status: PaymentStatus.PENDING,
            paymentReference: session.paymentReference ?? null,
          },
        })
        
        // Create order event
        await tx.orderEvent.create({
          data: {
            orderId: created.id,
            event: "order_created",
            data: {
              source: "checkout",
              sessionId: session.sessionId,
              customerInfo: input.contactInfo
            } as any,
          },
        })
        
        // Update product inventory if tracking is enabled
        for (const item of session.items as any[]) {
          await tx.product.updateMany({
            where: {
              id: item.productId,
              trackQuantity: true,
              quantity: { gte: item.quantity }
            },
            data: {
              quantity: { decrement: item.quantity }
            }
          })
        }
        
        // Delete session
        await tx.checkoutSession.delete({ where: { id: session.id } })
        
        return created
      })
      
      // TODO: Send notifications (email, SMS, WhatsApp)
      // - Order confirmation to customer
      // - New order notification to merchant
      
      // return response
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentReference: session.paymentReference ?? "",
        total,
        merchant: order.merchant,
        estimatedReady,
      }
    }),
})