import { db } from '@kitchencloud/database'
import { Prisma } from '@kitchencloud/database'

export class AnalyticsService {
  static async trackEvent(params: {
    merchantId?: string
    customerId?: string
    event: string
    properties?: Record<string, any>
    sessionId?: string
    ipAddress?: string
    userAgent?: string
  }) {
    const { merchantId, event, properties = {}, ...metadata } = params
    
    if (merchantId) {
      await db.analytics.create({
        data: {
          merchantId,
          event,
          properties,
          ...metadata,
        },
      })
    }
  }
  
  static async trackProductView(
    productId: string,
    customerId?: string,
    sessionId?: string
  ) {
    await db.productView.create({
      data: {
        productId,
        customerId,
        sessionId,
      },
    })
  }
  
  static async getDashboardStats(
    merchantId: string,
    dateRange: { from: Date; to: Date }
  ) {
    const { from, to } = dateRange
    
    // Get order stats
    const orderStats = await db.order.groupBy({
      by: ['status'],
      where: {
        merchantId,
        createdAt: { gte: from, lte: to },
      },
      _count: true,
      _sum: { total: true },
    })
    
    // Get product performance
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
      orderBy: {
        _sum: { total: 'desc' },
      },
      take: 10,
    })
    
    // Get customer insights
    const customerStats = await db.order.groupBy({
      by: ['customerId'],
      where: {
        merchantId,
        createdAt: { gte: from, lte: to },
        customerId: { not: null },
      },
      _count: true,
      _sum: { total: true },
    })
    
    const repeatCustomers = customerStats.filter(c => c._count > 1).length
    const totalCustomers = customerStats.length
    
    // Get hourly distribution
    const hourlyOrders = await db.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
      FROM "Order"
      WHERE "merchantId" = ${merchantId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY hour
      ORDER BY hour
    `
    
    return {
      orders: {
        total: orderStats.reduce((sum, s) => sum + s._count, 0),
        byStatus: orderStats,
        revenue: orderStats
          .filter(s => s.status === 'COMPLETED')
          .reduce((sum, s) => sum + (s._sum.total?.toNumber() || 0), 0),
      },
      products: {
        top: topProducts,
        totalSold: topProducts.reduce((sum, p) => sum + (p._sum.quantity || 0), 0),
      },
      customers: {
        total: totalCustomers,
        repeat: repeatCustomers,
        repeatRate: totalCustomers > 0 ? repeatCustomers / totalCustomers : 0,
        averageOrderValue: customerStats.length > 0
          ? customerStats.reduce((sum, c) => sum + (c._sum.total?.toNumber() || 0), 0) / customerStats.length
          : 0,
      },
      insights: {
        peakHours: hourlyOrders.map(h => ({
          hour: Number(h.hour),
          orders: Number(h.count),
        })),
      },
    }
  }
  
  static async getRevenueChart(
    merchantId: string,
    period: 'day' | 'week' | 'month',
    dateRange: { from: Date; to: Date }
  ) {
    const { from, to } = dateRange
    
    let groupBy: string
    switch (period) {
      case 'day':
        groupBy = 'DATE("createdAt")'
        break
      case 'week':
        groupBy = `DATE_TRUNC('week', "createdAt")`
        break
      case 'month':
        groupBy = `DATE_TRUNC('month', "createdAt")`
        break
    }
    
    const revenue = await db.$queryRaw<Array<{ date: Date; revenue: number }>>`
      SELECT ${Prisma.sql([groupBy])} as date, 
             SUM("total") as revenue
      FROM "Order"
      WHERE "merchantId" = ${merchantId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
        AND "status" IN ('COMPLETED', 'DELIVERED')
      GROUP BY date
      ORDER BY date
    `
    
    return revenue
  }
}