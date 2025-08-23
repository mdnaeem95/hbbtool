import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, merchantProcedure, customerProcedure } from '../../core'
import { paginationSchema } from '../../../utils/validation'
import { paginatedResponse } from '../../../utils/pagination'
import {
  OrderStatus,
  orderIncludes,
  Prisma,
} from '@kitchencloud/database'
import { Parser } from 'json2csv'
import { canUpdateOrderStatus } from '../../../lib/helpers/order'
import { NotificationService } from '../../../services/notification'
import { NotificationPriority } from '@kitchencloud/database'

/* =========================
   Zod
   ========================= */
const listInputZ = paginationSchema.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().trim().min(1).optional(),
  // Accept ISO strings or Date objects
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

const getInputZ = z.object({ id: z.string().cuid() })

const updateStatusZ = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
})

/* =========================
   Helpers
   ========================= */
const SAFE_SORT_FIELDS = new Set<keyof Prisma.OrderOrderByWithRelationInput>([
  'createdAt',
  'updatedAt',
  'status',
  'total',
  'orderNumber',
])

function buildCreatedAtRange(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined
  const range: Prisma.DateTimeFilter = {}
  if (dateFrom) range.gte = dateFrom
  if (dateTo) range.lte = dateTo
  return range
}

// Allowed transitions (tweak to your ops flow)
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING:           ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:         ['PREPARING', 'READY', 'CANCELLED'],
  PREPARING:         ['READY', 'CANCELLED'],
  READY:             ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY:  ['DELIVERED', 'CANCELLED'],
  DELIVERED:         ['COMPLETED', 'REFUNDED'],
  CANCELLED:         ['REFUNDED'],      // allow refund after a charged cancellation
  REFUNDED:          [],                // terminal
  COMPLETED:         ['REFUNDED'],      // optionally allow post-completion refunds
} as const

function assertTransition(from: OrderStatus, to: OrderStatus) {
  const allowed = ALLOWED_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid status transition: ${from} → ${to}`,
    })
  }
}

function statusTimestamps(status: OrderStatus) {
  const now = new Date()
  // Only set the timestamp that matches the new status
  switch (status) {
    case 'CONFIRMED':  return { confirmedAt: now }
    case 'PREPARING':  return { preparedAt: now }
    case 'READY':      return { readyAt: now }
    case 'DELIVERED':  return { deliveredAt: now }
    case 'CANCELLED':  return { cancelledAt: now }
    case 'COMPLETED':  return { completedAt: now }
    default:           return {}
  }
}

async function triggerOrderNotification(
  orderId: string,
  oldStatus: OrderStatus,
  newStatus: OrderStatus,
  db: any
) {
  try {
    // Get order details
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: {
          select: { 
            id: true, 
            businessName: true,
            emailNotifications: true,
            whatsappNotifications: true 
          }
        },
        customer: {
          select: { 
            id: true, 
            name: true, 
            email: true,
            emailNotifications: true,
            whatsappNotifications: true 
          }
        }
      }
    })

    if (!order) return

    const channels: ('in_app' | 'email' | 'whatsapp')[] = ['in_app']
    
    // Determine notification channels based on user preferences
    if (order.customer?.emailNotifications || order.merchant.emailNotifications) {
      channels.push('email')
    }
    if (order.customer?.whatsappNotifications || order.merchant.whatsappNotifications) {
      channels.push('whatsapp')
    }

    // Trigger notifications based on status change
    switch (newStatus) {
      case 'CONFIRMED':
        // Notify customer that order is confirmed
        if (order.customerId) {
          await NotificationService.orderConfirmed({
            customerId: order.customerId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            estimatedTime: order.estimatedDeliveryTime,
            channels,
            priority: NotificationPriority.NORMAL,
          })
        }
        break

      case 'READY':
        // Notify customer that order is ready
        if (order.customerId) {
          await NotificationService.orderReady({
            customerId: order.customerId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            channels,
            priority: NotificationPriority.HIGH,
          })
        }
        break

      case 'DELIVERED':
      case 'COMPLETED':
        // Notify customer of delivery/completion
        if (order.customerId) {
          await NotificationService.createNotification({
            customerId: order.customerId,
            orderId: order.id,
            type: 'ORDER_DELIVERED',
            channels,
            priority: NotificationPriority.NORMAL,
            data: {
              orderNumber: order.orderNumber,
              deliveryMethod: order.deliveryMethod,
            }
          })
        }
        break

      case 'CANCELLED':
        // Notify customer of cancellation
        if (order.customerId) {
          await NotificationService.createNotification({
            customerId: order.customerId,
            orderId: order.id,
            type: 'ORDER_CANCELLED',
            channels,
            priority: NotificationPriority.HIGH,
            data: {
              orderNumber: order.orderNumber,
              reason: order.cancellationReason || 'Order cancelled',
            }
          })
        }
        break
    }

    // For new orders, notify merchant
    if (newStatus === 'PENDING' && oldStatus !== 'PENDING') {
      await NotificationService.orderPlaced({
        merchantId: order.merchantId,
        orderId: order.id,
        customerName: order.customer?.name || order.customerName,
        orderNumber: order.orderNumber,
        amount: parseFloat(order.total.toString()),
        channels,
        priority: NotificationPriority.HIGH,
      })
    }

  } catch (error) {
    console.error('Failed to trigger order notification:', error)
    // Don't throw - notifications are non-critical
  }
}

/* =========================
   Router
   ========================= */
export const orderRouter = router({

  /** -------- List orders (merchant) -------- */
  list: merchantProcedure
    .input(listInputZ)
    .query(async ({ ctx, input }) => {
      const createdAt = buildCreatedAtRange(input.dateFrom, input.dateTo)

      const where: Prisma.OrderWhereInput = {
        merchantId: ctx.session!.user.id,
        ...(input.status ? { status: input.status } : {}),
        ...(input.search
          ? {
              OR: [
                { orderNumber:   { contains: input.search, mode: 'insensitive' } },
                { customerName:  { contains: input.search, mode: 'insensitive' } },
                { customerPhone: { contains: input.search } }, // phone: keep as exact string search
              ],
            }
          : {}),
        ...(createdAt ? { createdAt } : {}),
      }

      // Whitelist sortBy to avoid runtime Prisma errors
      const sortBy = SAFE_SORT_FIELDS.has((input.sortBy as any) ?? 'createdAt')
        ? (input.sortBy as keyof Prisma.OrderOrderByWithRelationInput)
        : 'createdAt'

      return paginatedResponse(
        ctx.db.order,
        where,
        { ...input, sortBy },
        // Include items + payment using shared helper
        orderIncludes.withPayment
      )
    }),

  /** -------- Get order details (merchant) -------- */
  get: merchantProcedure
    .input(getInputZ)
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: { id: input.id, merchantId: ctx.session!.user.id },
        // Full fat include: merchant, customer, address, items+product, payment, events
        include: {
          merchant: true,
          customer: true,
          deliveryAddress: true,
          items: { include: { product: true } },
          payment: true,
          events: { orderBy: { createdAt: 'desc'} },
        }
      })

      if (!order) throw new TRPCError({ code: 'NOT_FOUND' })
      return order
    }),

  /** -------- Update order status (merchant) -------- */
  updateStatus: merchantProcedure
    .input(updateStatusZ)
    .mutation(async ({ ctx, input }) => {
      // Load current order to validate transition
      const current = await ctx.db.order.findFirst({
        where: { id: input.id, merchantId: ctx.session!.user.id },
        select: { id: true, status: true },
      })
      if (!current) throw new TRPCError({ code: 'NOT_FOUND' })

      const from = current.status as OrderStatus
      const to = input.status
      if (from === to) {
        // no-op (but still record event if you prefer)
        return ctx.db.order.findUnique({ where: { id: input.id } })
      }
      assertTransition(from, to)

      // Update + event in a transaction
      const result = await ctx.db.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: input.id },
          data: {
            status: to,
            ...statusTimestamps(to),
          },
        })

        await tx.orderEvent.create({
          data: {
            orderId: input.id,
            event: `STATUS_CHANGED_FROM_${from}_TO_${to}`,
            data: { from, to, notes: input.notes ?? null },
          },
        })

        return order
      })

      // add notification here
      await triggerOrderNotification(input.id, from, to, ctx.db)

      return result
    }),

  /** -------- Customer order history -------- */
  customerHistory: customerProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      const where: Prisma.OrderWhereInput = { customerId: ctx.session!.user.id }

      return paginatedResponse(
        ctx.db.order,
        where,
        { ...input, sortBy: 'createdAt' },
        {
          merchant: true,
          items: { include: { product: true } },
        }
      )
    }),

  /** -------- Bulk update status (merchant) -------- */
  bulkUpdateStatus: merchantProcedure
    .input(z.object({
      orderIds: z.array(z.string().cuid()).min(1).max(100),
      status: z.nativeEnum(OrderStatus),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      // Fetch all orders to validate ownership and transitions
      const orders = await ctx.db.order.findMany({
        where: {
          id: { in: input.orderIds },
          merchantId,
        },
        select: {
          id: true,
          status: true,
          deliveryMethod: true,
        },
      })
      
      if (orders.length === 0) {
        throw new TRPCError({ 
          code: 'NOT_FOUND',
          message: 'No valid orders found',
        })
      }
      
      // Filter orders that can be transitioned
      const validOrders = orders.filter(order => {
        const isPickup = order.deliveryMethod === 'PICKUP'
        return canUpdateOrderStatus(
          order.status as OrderStatus,
          input.status,
          isPickup
        )
      })
      
      if (validOrders.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No orders can be transitioned to the selected status',
        })
      }
      
      // Update in transaction with events
      const results = await ctx.db.$transaction(async (tx) => {
        const updatePromises = validOrders.map(order => 
          tx.order.update({
            where: { id: order.id },
            data: {
              status: input.status,
              ...statusTimestamps(input.status),
            },
          })
        )
        
        const eventPromises = validOrders.map(order =>
          tx.orderEvent.create({
            data: {
              orderId: order.id,
              event: `STATUS_CHANGED_FROM_${order.status}_TO_${input.status}`,
              data: {
                from: order.status,
                to: input.status,
                notes: input.notes || 'Bulk update',
                bulk: true,
              },
            },
          })
        )
        
        await Promise.all([...updatePromises, ...eventPromises])
        
        return {
          successCount: validOrders.length,
          totalCount: orders.length,
          failedCount: orders.length - validOrders.length,
        }
      })
      
      return results
    }),

  /** -------- Export orders to CSV (merchant) -------- */
  export: merchantProcedure
    .input(z.object({
      orderIds: z.array(z.string().cuid()).optional(),
      filters: z.object({
        status: z.array(z.nativeEnum(OrderStatus)).optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      
      // Build where clause
      const where: any = { merchantId }
      
      if (input.orderIds && input.orderIds.length > 0) {
        where.id = { in: input.orderIds }
      } else if (input.filters) {
        if (input.filters.status?.length) {
          where.status = { in: input.filters.status }
        }
        
        if (input.filters.search) {
          where.OR = [
            { orderNumber: { contains: input.filters.search, mode: 'insensitive' } },
            { customerName: { contains: input.filters.search, mode: 'insensitive' } },
          ]
        }
        
        if (input.filters.dateFrom || input.filters.dateTo) {
          where.createdAt = {}
          if (input.filters.dateFrom) {
            where.createdAt.gte = new Date(input.filters.dateFrom)
          }
          if (input.filters.dateTo) {
            where.createdAt.lte = new Date(input.filters.dateTo)
          }
        }
      }
      
      // Fetch orders with items
      const orders = await ctx.db.order.findMany({
        where,
        include: {
          items: true,
          customer: true,
          deliveryAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Limit to prevent memory issues
      })
      
      if (orders.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No orders found to export',
        })
      }
      
      // Transform data for CSV
      const csvData = orders.map(order => ({
        'Order Number': order.orderNumber,
        'Date': new Date(order.createdAt).toLocaleDateString('en-SG'),
        'Time': new Date(order.createdAt).toLocaleTimeString('en-SG'),
        'Status': order.status,
        'Customer Name': order.customerName,
        'Customer Phone': order.customerPhone,
        'Customer Email': order.customerEmail || '',
        'Delivery Method': order.deliveryMethod,
        'Delivery Address': order.deliveryAddress 
          ? `${order.deliveryAddress.line1} ${order.deliveryAddress.line2 || ''} ${order.deliveryAddress.postalCode}`.trim()
          : '',
        'Items': order.items.map(item => 
          `${item.productName} x${item.quantity}${item.specialRequest ? ` (${item.specialRequest})` : ''}`
        ).join('; '),
        'Subtotal': `$${order.subtotal.toFixed(2)}`,
        'Delivery Fee': `$${order.deliveryFee.toFixed(2)}`,
        'Total': `$${order.total.toFixed(2)}`,
        'Payment Method': order.paymentMethod,
        'Payment Status': order.paymentStatus,
        'Notes': order.deliveryNotes || '',
      }))
      
      // Generate CSV
      const parser = new Parser({
        fields: [
          'Order Number',
          'Date',
          'Time',
          'Status',
          'Customer Name',
          'Customer Phone',
          'Customer Email',
          'Delivery Method',
          'Delivery Address',
          'Items',
          'Subtotal',
          'Delivery Fee',
          'Total',
          'Payment Method',
          'Payment Status',
          'Notes',
        ],
      })
      
      const csv = parser.parse(csvData)
      
      return {
        csv,
        count: orders.length,
      }
    }),

  /** -------- Get orders for printing (merchant) -------- */
  getPrintData: merchantProcedure
    .input(z.object({
      orderIds: z.array(z.string().cuid()).min(1).max(50),
    }))
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: {
          id: { in: input.orderIds },
          merchantId: ctx.session!.user.id,
        },
        include: {
          merchant: true,
          customer: true,
          deliveryAddress: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      
      if (orders.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No orders found',
        })
      }
      
      return orders
    }),  
})