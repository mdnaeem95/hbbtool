import { z } from 'zod'
import { router, merchantProcedure, customerProcedure } from '../../trpc'
import { paginationSchema } from '../../utils/validation'
import { paginatedResponse } from '../../utils/pagination'
import { OrderStatus } from '@kitchencloud/database'
import { TRPCError } from '@trpc/server'

export const orderRouter = router({
  // List orders (merchant)
  list: merchantProcedure
    .input(paginationSchema.extend({
      status: z.nativeEnum(OrderStatus).optional(),
      search: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        merchantId: ctx.session?.user.id,
        ...(input.status && { status: input.status }),
        ...(input.search && {
          OR: [
            { orderNumber: { contains: input.search } },
            { customerName: { contains: input.search, mode: 'insensitive' } },
            { customerPhone: { contains: input.search } },
          ],
        }),
        ...(input.dateFrom && { createdAt: { gte: input.dateFrom } }),
        ...(input.dateTo && { createdAt: { lte: input.dateTo } }),
      }
      
      return paginatedResponse(
        ctx.db.order,
        where,
        { ...input, sortBy: input.sortBy || 'createdAt' },
        {
          customer: true,
          items: {
            include: { product: true },
          },
          payment: true,
        }
      )
    }),
    
  // Get order details
  get: merchantProcedure
    .input(z.object({
      id: z.string().cuid(),
    }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: {
          id: input.id,
          merchantId: ctx.session?.user.id,
        },
        include: {
          customer: true,
          deliveryAddress: true,
          items: {
            include: { product: true },
          },
          payment: true,
          events: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })
      
      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      return order
    }),
    
  // Update order status
  updateStatus: merchantProcedure
    .input(z.object({
      id: z.string().cuid(),
      status: z.nativeEnum(OrderStatus),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate status transition
      const currentOrder = await ctx.db.order.findFirst({
        where: {
          id: input.id,
          merchantId: ctx.session?.user.id,
        },
      })
      
      if (!currentOrder) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      // Update order
      const order = await ctx.db.order.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === 'CONFIRMED' && { confirmedAt: new Date() }),
          ...(input.status === 'PREPARING' && { preparedAt: new Date() }),
          ...(input.status === 'READY' && { readyAt: new Date() }),
          ...(input.status === 'DELIVERED' && { deliveredAt: new Date() }),
          ...(input.status === 'CANCELLED' && { cancelledAt: new Date() }),
          ...(input.status === 'COMPLETED' && { completedAt: new Date() }),
        },
      })
      
      // Create order event
      await ctx.db.orderEvent.create({
        data: {
          orderId: input.id,
          event: `STATUS_CHANGED_${currentOrder.status}_TO_${input.status}`,
          data: {
            from: currentOrder.status,
            to: input.status,
            notes: input.notes,
          },
        },
      })
      
      // TODO: Send notifications
      
      return order
    }),
    
  // Customer order history
  customerHistory: customerProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      return paginatedResponse(
        ctx.db.order,
        { customerId: ctx.session?.user.id },
        { ...input, sortBy: 'createdAt' },
        {
          merchant: true,
          items: {
            include: { product: true },
          },
        }
      )
    }),
})