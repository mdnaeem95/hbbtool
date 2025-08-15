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

      // TODO: notify customer/merchant channels

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
})