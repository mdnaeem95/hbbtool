import { z } from 'zod'
import { router, merchantProcedure } from '../../trpc'
import { postalCodeSchema, phoneSchema } from '../../utils/validation'
import { handleDatabaseError } from '../../utils/errors'
import { TRPCError } from '@trpc/server'

export const merchantRouter = router({
  // Get merchant profile
  get: merchantProcedure
    .query(async ({ ctx }) => {
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: ctx.session?.user.id },
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
              reviews: true,
            },
          },
        },
      })
      
      if (!merchant) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      return merchant
    }),
    
  // Update merchant profile
  update: merchantProcedure
    .input(z.object({
      businessName: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
      phone: phoneSchema.optional(),
      address: z.string().optional(),
      postalCode: postalCodeSchema.optional(),
      operatingHours: z.record(
        z.string(),
        z.object({
          open: z.string(),
          close: z.string(),
          closed: z.boolean().optional(),
        })).optional(),
      deliverySettings: z.object({
        deliveryEnabled: z.boolean(),
        pickupEnabled: z.boolean(),
        deliveryFee: z.number().min(0),
        minimumOrder: z.number().min(0),
        deliveryRadius: z.number().min(1).max(20),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const merchant = await ctx.db.merchant.update({
          where: { id: ctx.session?.user.id },
          data: input,
        })
        
        return merchant
      } catch (error) {
        handleDatabaseError(error)
      }
    }),
    
  // Get dashboard analytics
  analytics: merchantProcedure
    .input(z.object({
      period: z.enum(['today', 'week', 'month', 'year']).default('month'),
    }))
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session?.user.id
      const now = new Date()
      let startDate: Date
      
      switch (input.period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1))
          break
      }
      
      const [orders, revenue, products, customers] = await Promise.all([
        // Order stats
        ctx.db.order.groupBy({
          by: ['status'],
          where: {
            merchantId,
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
        
        // Revenue
        ctx.db.order.aggregate({
          where: {
            merchantId,
            status: 'COMPLETED',
            createdAt: { gte: startDate },
          },
          _sum: { total: true },
        }),
        
        // Popular products
        ctx.db.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: {
              merchantId,
              createdAt: { gte: startDate },
            },
          },
          _sum: { quantity: true },
          _count: true,
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        
        // Customer stats
        ctx.db.order.groupBy({
          by: ['customerId'],
          where: {
            merchantId,
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
      ])
      
      return {
        orders: {
          total: orders.reduce((sum, o) => sum + o._count, 0),
          byStatus: orders,
        },
        revenue: revenue._sum.total || 0,
        popularProducts: products,
        uniqueCustomers: customers.length,
        period: input.period,
      }
    }),
})
