import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc"
import { OrderStatus, DeliveryMethod, Prisma } from "@kitchencloud/database/client"

export const orderRouter = createTRPCRouter({
  // Create order (can be guest or authenticated)
  create: publicProcedure
    .input(
      z.object({
        merchantId: z.string(),
        customerId: z.string().optional(),
        deliveryMethod: z.nativeEnum(DeliveryMethod),
        deliveryAddressId: z.string().optional(),
        deliveryAddress: z
          .object({
            line1: z.string(),
            line2: z.string().optional(),
            postalCode: z.string(),
            instructions: z.string().optional(),
          })
          .optional(),
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().int().positive(),
            variant: z.any().optional(),
            notes: z.string().optional(),
          })
        ),
        scheduledFor: z.date().optional(),
        notes: z.string().optional(),
        customerInfo: z
          .object({
            name: z.string(),
            email: z.string().email(),
            phone: z.string(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate merchant
      const merchant = await ctx.db.merchant.findUnique({ where: { id: input.merchantId } })
      if (!merchant || merchant.status !== "ACTIVE") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Merchant not found or inactive" })
      }

      // Validate products and calculate totals
      const productIds = input.items.map((item) => item.productId)
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: productIds },
          merchantId: input.merchantId,
          status: "ACTIVE",
          deletedAt: null,
        },
      })
      if (products.length !== productIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Some products are unavailable" })
      }

      // Create product map for easy lookup
      const productMap = new Map(products.map((p) => [p.id, p]))

      // Calculate totals
      let subtotal = 0
      const orderItems = input.items.map((item) => {
        const product = productMap.get(item.productId)!
        const unit = product.price.toNumber();
        const itemTotal = unit * item.quantity

        subtotal += itemTotal

        return {
          productId: item.productId,
          productName: product.name,
          productPrice: new Prisma.Decimal(unit),
          quantity: item.quantity,
          price: new Prisma.Decimal(product.price),
          total: new Prisma.Decimal(itemTotal),
          variant: item.variant ?? null,
          notes: item.notes ?? null,
        }
      })

      // Calculate delivery fee (decimal in schema) => number for math
      const deliveryFee =
        input.deliveryMethod === DeliveryMethod.DELIVERY
          ? (merchant.deliveryFee ? merchant.deliveryFee.toNumber() : 0)
          : 0

      const total = subtotal + deliveryFee

      // Check minimum order (decimal in schema)
      if (merchant.minimumOrder && subtotal < merchant.minimumOrder.toNumber()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum order amount is $${merchant.minimumOrder}`,
        })
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`

      // Create order (wrap numeric fields back to decimal)
      const order = await ctx.db.order.create({
        data: {
          orderNumber,
          merchantId: input.merchantId,
          customerId: input.customerId,
          deliveryMethod: input.deliveryMethod,
          deliveryAddressId: input.deliveryAddressId,
          deliveryFee: new Prisma.Decimal(deliveryFee),
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          total: new Prisma.Decimal(total),
          scheduledFor: input.scheduledFor ?? null,
          notes: input.notes ?? null,
          customerName: input.customerInfo?.name ?? "Guest",
          customerEmail: input.customerInfo?.email ?? "",
          customerPhone: input.customerInfo?.phone || "",
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          merchant: true,
        },
      })

      // TODO: Send notifications

      return order
    }),

  // Get order by ID
  get: publicProcedure
    .input(
      z.object({
        id: z.string().optional(),
        orderNumber: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.id && !input.orderNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either id or orderNumber is required",
        })
      }

      const order = await ctx.db.order.findFirst({
        where: {
          ...(input.id && { id: input.id }),
          ...(input.orderNumber && { orderNumber: input.orderNumber }),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          merchant: true,
          customer: true,
          deliveryAddress: true,
        },
      })

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        })
      }

      // Check access (customer can only see their own orders)
      if (
        ctx.session?.user.role === "CUSTOMER" &&
        order.customerId !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view this order",
        })
      }

      return order
    }),

  // List orders (customer or merchant)
  list: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(OrderStatus).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, limit, cursor } = input
      const u = ctx.session.user

      // Build where clause based on user role
      let where: Prisma.OrderWhereInput= 
        u.role === "CUSTOMER"
            ? { customerId: u.id }
            : u.role === "MERCHANT"
            ? { merchantId: u.id }
            : (() => {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid role" })
            })()

      if (status) where.status = status

      const orders = await ctx.db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          items: true,
          merchant: true,
          customer: true,
        },
      })

      let nextCursor: string | undefined
      if (orders.length > limit) {
        const next = orders.pop()!
        nextCursor = next.id
      }

      return { items: orders, nextCursor }
    }),

  // Update order status (merchant only)
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(OrderStatus),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const u = ctx.session.user
      if (u.role !== "MERCHANT") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Merchant Only"})
      }

      // verify ownership + get current status & delivery Method
      const order = await ctx.db.order.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          merchantId: true,
          status: true,
          deliveryMethod: true,
          metadata: true,            
        }
      })

      if (!order || order.merchantId !== u.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found or you don't have permission" })
      }

      // Validate status transition
      const pickupTransitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
        READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED], // pickup terminal
        OUT_FOR_DELIVERY: [],          // not used for pickup flow
        DELIVERED: [],                 // not used for pickup flow
        COMPLETED: [],
        CANCELLED: [],
        REFUNDED: [],
      }

      const deliveryTransitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
        READY: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
        OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        DELIVERED: [OrderStatus.COMPLETED, OrderStatus.REFUNDED], // terminal then optional refund
        COMPLETED: [OrderStatus.REFUNDED], // allow refund after completion if you want; remove if not desired
        CANCELLED: [],
        REFUNDED: [],
      }

      const transitions = 
        order.deliveryMethod === DeliveryMethod.PICKUP
            ? pickupTransitions
            : deliveryTransitions

      if (!transitions[order.status].includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${order.status} to ${input.status}`,
        })
      }

      // build timestamp updates for certain statuses
      const now = new Date()
      const timestampData =
        input.status === OrderStatus.CONFIRMED
            ? { confirmedAt: now }
            : input.status === OrderStatus.PREPARING
            ? { preparedAt: now }
            : input.status === OrderStatus.READY
            ? { readyAt: now }
            : input.status === OrderStatus.OUT_FOR_DELIVERY
            ? {}
            : input.status === OrderStatus.DELIVERED
            ? { deliveredAt: now }
            : input.status === OrderStatus.CANCELLED
            ? { cancelledAt: now }
            : input.status === OrderStatus.COMPLETED
            ? { completedAt: now }
            : {}

        // optionally capture cancel reason in metadata
        const metaUpdate = 
            input.status === OrderStatus.CANCELLED && input.reason
                ? {
                    metadata: {
                        ...(order.metadata as any ?? {}),
                        cancelReason: input.reason,
                        cancelledAt: now.toISOString(),
                    },
                }
                : {}

        const updated = await ctx.db.order.update({
            where: { id: input.id },
            data: {
                status: input.status,
                ...timestampData,
                ...metaUpdate
            },
        })

        // TODO: Send status update notifications

        return updated
    }),
})