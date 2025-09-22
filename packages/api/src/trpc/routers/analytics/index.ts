import { z } from 'zod'
import { router, merchantProcedure } from '../../core'
import { db } from '@homejiak/database'
import { subDays, startOfDay, endOfDay, startOfWeek } from 'date-fns'

// Helper to convert Prisma Decimal to number
const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as any).toNumber()
  }
  return 0
}

// Date range schema
const dateRangeSchema = z.object({
  preset: z.enum(['today', '7days', '30days', '90days', 'custom']).optional(),
  from: z.date().optional(),
  to: z.date().optional(),
})

// Helper to get date range
const getDateRange = (input: z.infer<typeof dateRangeSchema>) => {
  const now = new Date()
  
  if (input.preset) {
    switch (input.preset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) }
      case '7days':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) }
      case '30days':
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) }
      case '90days':
        return { from: startOfDay(subDays(now, 90)), to: endOfDay(now) }
    }
  }
  
  return {
    from: input.from || startOfDay(subDays(now, 30)),
    to: input.to || endOfDay(now),
  }
}

export const analyticsRouter = router({
  // Get dashboard overview stats
  getDashboardStats: merchantProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      const { from, to } = getDateRange(input)
      
      // Get previous period for comparison
      const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
      const prevFrom = subDays(from, periodDays)
      const prevTo = subDays(to, periodDays)
      
      // Current period stats
      const [currentOrders, currentRevenue, currentCustomers, currentProducts] = await Promise.all([
        // Total orders
        db.order.count({
          where: {
            merchantId,
            createdAt: { gte: from, lte: to },
          },
        }),
        // Revenue (completed orders only)
        db.order.aggregate({
          where: {
            merchantId,
            status: { in: ['COMPLETED', 'DELIVERED'] },
            createdAt: { gte: from, lte: to },
          },
          _sum: { total: true },
        }),
        // Unique customers
        db.order.findMany({
          where: {
            merchantId,
            createdAt: { gte: from, lte: to },
            customerId: { not: null },
          },
          select: { customerId: true },
          distinct: ['customerId'],
        }),
        // Products sold
        db.orderItem.aggregate({
          where: {
            order: {
              merchantId,
              createdAt: { gte: from, lte: to },
              status: { in: ['COMPLETED', 'DELIVERED'] },
            },
          },
          _sum: { quantity: true },
        }),
      ])
      
      // Previous period stats
      const [prevOrders, prevRevenue] = await Promise.all([
        db.order.count({
          where: {
            merchantId,
            createdAt: { gte: prevFrom, lte: prevTo },
          },
        }),
        db.order.aggregate({
          where: {
            merchantId,
            status: { in: ['COMPLETED', 'DELIVERED'] },
            createdAt: { gte: prevFrom, lte: prevTo },
          },
          _sum: { total: true },
        }),
      ])
      
      const revenue = toNumber(currentRevenue._sum.total)
      const prevRevenueValue = toNumber(prevRevenue._sum.total)
      const avgOrderValue = currentOrders > 0 ? revenue / currentOrders : 0
      
      // Calculate percentage changes
      const orderChange = prevOrders > 0 
        ? ((currentOrders - prevOrders) / prevOrders) * 100 
        : currentOrders > 0 ? 100 : 0
      
      const revenueChange = prevRevenueValue > 0
        ? ((revenue - prevRevenueValue) / prevRevenueValue) * 100
        : revenue > 0 ? 100 : 0
      
      return {
        revenue: {
          value: revenue,
          change: revenueChange,
          trend: revenueChange >= 0 ? 'up' : 'down' as 'up' | 'down',
        },
        orders: {
          value: currentOrders,
          change: orderChange,
          trend: orderChange >= 0 ? 'up' : 'down' as 'up' | 'down',
        },
        avgOrderValue: {
          value: avgOrderValue,
          change: 0, // TODO: Calculate this
          trend: 'up' as 'up' | 'down',
        },
        customers: {
          value: currentCustomers.length,
          change: 0, // TODO: Calculate this
          trend: 'up' as 'up' | 'down',
        },
        products: {
          value: currentProducts._sum.quantity || 0,
          change: 0, // TODO: Calculate this
          trend: 'up' as 'up' | 'down',
        },
      }
    }),

  // Get revenue chart data
  getRevenueChart: merchantProcedure
    .input(
      dateRangeSchema.extend({
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
      })
    )
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      const { from, to } = getDateRange(input)
      
      const orders = await db.order.findMany({
        where: {
          merchantId,
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: { gte: from, lte: to },
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      
      // Group by day/week/month
      const revenueData = new Map<string, number>()
      
      orders.forEach(order => {
        const date = order.createdAt
        let key: string

        if (input.groupBy === 'day') {
          key = date.toISOString().substring(0, 10)
        } else if (input.groupBy === 'week') {
          key = startOfWeek(date).toISOString().substring(0, 10)
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        }
                
        const current = revenueData.get(key) || 0
        revenueData.set(key, current + toNumber(order.total))
      })
      
      return Array.from(revenueData.entries()).map(([date, revenue]) => ({
        date,
        revenue,
      }))
    }),

  // Get order metrics
  getOrderMetrics: merchantProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      const { from, to } = getDateRange(input)
      
      const [ordersByStatus, hourlyDistribution, avgPreparationTime] = await Promise.all([
        // Orders by status
        db.order.groupBy({
          by: ['status'],
          where: {
            merchantId,
            createdAt: { gte: from, lte: to },
          },
          _count: true,
        }),
        
        // Hourly distribution
        db.$queryRaw<Array<{ hour: number; count: bigint }>>`
          SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*)::bigint as count
          FROM "Order"
          WHERE "merchantId" = ${merchantId}
            AND "createdAt" >= ${from}
            AND "createdAt" <= ${to}
          GROUP BY hour
          ORDER BY hour
        `,
        
        // Average preparation time (completed orders)
        db.$queryRaw<Array<{ avg_prep_time: number }>>`
          SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "confirmedAt")) / 60)::float as avg_prep_time
          FROM "Order"
          WHERE "merchantId" = ${merchantId}
            AND "createdAt" >= ${from}
            AND "createdAt" <= ${to}
            AND "status" = 'COMPLETED'
            AND "confirmedAt" IS NOT NULL
            AND "completedAt" IS NOT NULL
        `,
      ])
      
      // Format data
      const statusData = ordersByStatus.map((item: any) => ({
        status: item.status,
        count: item._count,
      }))
      
      const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const found = hourlyDistribution.find((h: any) => Number(h.hour) === hour)
        return {
          hour,
          orders: found ? Number(found.count) : 0,
        }
      })
      
      return {
        byStatus: statusData,
        hourlyDistribution: hourlyData,
        avgPreparationTime: avgPreparationTime[0]?.avg_prep_time || 0,
        fulfillmentRate: 0, // TODO: Calculate fulfillment rate
      }
    }),

  // Get product performance
  getProductPerformance: merchantProcedure
    .input(
      dateRangeSchema.extend({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      const { from, to } = getDateRange(input)
      
      const topProducts = await db.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: {
            merchantId,
            createdAt: { gte: from, lte: to },
            status: { in: ['COMPLETED', 'DELIVERED'] },
          },
        },
        _sum: {
          quantity: true,
          total: true,
        },
        orderBy: [
          { _sum: { total: 'desc' } },
        ],
        take: input.limit,
      })
      
      // Get product views for conversion rate
      const productIds = topProducts.map(p => p.productId)
      const productViews = await db.productView.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          viewedAt: { gte: from, lte: to },
        },
        _count: true,
      })
      
      const viewsMap = new Map(productViews.map(v => [v.productId, v._count]))
      
      return topProducts.map(product => ({
        id: product.productId,
        name: product.productName,
        quantity: product._sum.quantity || 0,
        revenue: toNumber(product._sum.total),
        views: viewsMap.get(product.productId) || 0,
        conversionRate: viewsMap.get(product.productId) 
          ? ((product._sum.quantity || 0) / viewsMap.get(product.productId)!) * 100
          : 0,
      }))
    }),

  // Get customer insights
  getCustomerInsights: merchantProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      const merchantId = ctx.session!.user.id
      const { from, to } = getDateRange(input)
      
      const [customerOrders, repeatCustomers, newCustomers] = await Promise.all([
        // Customer order counts
        db.order.groupBy({
          by: ['customerId'],
          where: {
            merchantId,
            createdAt: { gte: from, lte: to },
            customerId: { not: null },
          },
          _count: true,
          _sum: { total: true },
        }),
        
        // Repeat customers (2+ orders)
        db.$queryRaw<Array<{ customer_count: bigint }>>`
          SELECT COUNT(DISTINCT "customerId")::bigint as customer_count
          FROM (
            SELECT "customerId", COUNT(*) as order_count
            FROM "Order"
            WHERE "merchantId" = ${merchantId}
              AND "createdAt" >= ${from}
              AND "createdAt" <= ${to}
              AND "customerId" IS NOT NULL
            GROUP BY "customerId"
            HAVING COUNT(*) > 1
          ) as repeat_customers
        `,
        
        // New customers (first order in period)
        db.$queryRaw<Array<{ customer_count: bigint }>>`
          SELECT COUNT(*)::bigint as customer_count
          FROM (
            SELECT "customerId", MIN("createdAt") as first_order
            FROM "Order"
            WHERE "merchantId" = ${merchantId}
              AND "customerId" IS NOT NULL
            GROUP BY "customerId"
            HAVING MIN("createdAt") >= ${from} AND MIN("createdAt") <= ${to}
          ) as new_customers
        `,
      ])
      
      const totalCustomers = customerOrders.length
      const totalRevenue = customerOrders.reduce((sum, c) => sum + toNumber(c._sum.total), 0)
      const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0
      const repeatCount = Number(repeatCustomers[0]?.customer_count || 0)
      const newCount = Number(newCustomers[0]?.customer_count || 0)
      
      return {
        total: totalCustomers,
        new: newCount,
        returning: repeatCount,
        repeatRate: totalCustomers > 0 ? (repeatCount / totalCustomers) * 100 : 0,
        avgCustomerValue,
        customerLifetimeValue: avgCustomerValue * 3, // Simple CLV calculation
      }
    }),

  // Export analytics data
//   exportData: merchantProcedure
//     .input(
//       z.object({
//         type: z.enum(['orders', 'products', 'customers', 'revenue']),
//         format: z.enum(['csv']).default('csv'),
//         dateRange: dateRangeSchema,
//       })
//     )
//     .mutation(async ({ ctx, input }) => {
//     //   const merchantId = ctx.session!.user.id
//     //   const { from, to } = getDateRange(input.dateRange)
      
//       // TODO: Implement export logic
//       // This would generate CSV data based on the type requested
      
//       throw new TRPCError({
//         code: 'UNIMPLEMENTED',
//         message: 'Export functionality coming soon',
//       })
//     }),
})