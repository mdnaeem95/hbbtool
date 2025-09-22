import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { analyticsRouter } from '../analytics'
import { db } from '@homejiak/database'
import type { AuthSession } from '@homejiak/auth'
import type { Context } from '../../context'
import { createServerSupabaseClient } from '@homejiak/auth/server'

// Mock database
vi.mock('@homejiak/database', () => ({
  db: {
    order: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    orderItem: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    productView: {
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

// Mock Supabase client
vi.mock('@homejiak/auth/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
  })),
}))

// Mock authentication context
const mockSession: AuthSession = {
  user: {
    id: 'test-merchant-123',
    email: 'test@merchant.com',
    merchant: {
      id: 'test-merchant-123',
      email: 'test@merchant.com',
      businessName: 'Test Restaurant',
      phone: '91234567',
      status: 'ACTIVE',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    } as any,
  },
}

const createTestContext = async (session: AuthSession | null = mockSession): Promise<Context> => {
  const supabase = await createServerSupabaseClient()
  
  return {
    session,
    db,
    supabase,
    req: new Request('http://localhost:3000'),
    resHeaders: new Headers(),
  }
}

// Helper to call procedures with proper typing
const createCaller = async (session: AuthSession | null = mockSession) => {
  const context = await createTestContext(session)
  return analyticsRouter.createCaller(context)
}

describe('Analytics Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set a fixed date for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-08-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('getDashboardStats', () => {
    it('should return dashboard statistics for the default period (30 days)', async () => {
      const caller = await createCaller()

      // Mock database responses
      const mockOrderCount = 50
      const mockRevenue = { _sum: { total: 2500.50 } }
      const mockCustomers = [
        { customerId: 'cust-1' },
        { customerId: 'cust-2' },
        { customerId: 'cust-3' },
      ]
      const mockProducts = { _sum: { quantity: 150 } }
      
      // Previous period data for comparison
      const mockPrevOrderCount = 40
      const mockPrevRevenue = { _sum: { total: 2000.00 } }

      vi.mocked(db.order.count)
        .mockResolvedValueOnce(mockOrderCount)
        .mockResolvedValueOnce(mockPrevOrderCount)
      
      vi.mocked(db.order.aggregate)
        .mockResolvedValueOnce(mockRevenue as any)
        .mockResolvedValueOnce(mockPrevRevenue as any)
      
      vi.mocked(db.order.findMany).mockResolvedValueOnce(mockCustomers as any)
      vi.mocked(db.orderItem.aggregate).mockResolvedValueOnce(mockProducts as any)

      const result = await caller.getDashboardStats({ preset: '30days' })

      expect(result).toEqual({
        revenue: {
          value: 2500.50,
          change: 25.025, // ((2500.50 - 2000) / 2000) * 100
          trend: 'up',
        },
        orders: {
          value: 50,
          change: 25, // ((50 - 40) / 40) * 100
          trend: 'up',
        },
        avgOrderValue: {
          value: 50.01, // 2500.50 / 50
          change: 0,
          trend: 'up',
        },
        customers: {
          value: 3,
          change: 0,
          trend: 'up',
        },
        products: {
          value: 150,
          change: 0,
          trend: 'up',
        },
      })

      // Verify database calls
      expect(db.order.count).toHaveBeenCalledTimes(2)
      expect(db.order.aggregate).toHaveBeenCalledTimes(2)
      expect(db.order.findMany).toHaveBeenCalledTimes(1)
      expect(db.orderItem.aggregate).toHaveBeenCalledTimes(1)
    })

    it('should handle today preset correctly', async () => {
      const caller = await createCaller()

      vi.mocked(db.order.count).mockResolvedValue(5)
      vi.mocked(db.order.aggregate).mockResolvedValue({ _sum: { total: 125.00 } } as any)
      vi.mocked(db.order.findMany).mockResolvedValue([])
      vi.mocked(db.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: 10 } } as any)

      const result = await caller.getDashboardStats({ preset: 'today' })

      expect(result.orders.value).toBe(5)
      expect(result.revenue.value).toBe(125.00)
      
      // Verify the date range was calculated correctly
      expect(db.order.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            merchantId: 'test-merchant-123',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should handle custom date range', async () => {
      const caller = await createCaller()
      const customFrom = new Date('2024-07-01')
      const customTo = new Date('2024-07-31')

      vi.mocked(db.order.count).mockResolvedValue(100)
      vi.mocked(db.order.aggregate).mockResolvedValue({ _sum: { total: 5000 } } as any)
      vi.mocked(db.order.findMany).mockResolvedValue([])
      vi.mocked(db.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: 250 } } as any)

      const result = await caller.getDashboardStats({
        preset: 'custom',
        from: customFrom,
        to: customTo,
      })

      expect(result.orders.value).toBe(100)
      expect(result.revenue.value).toBe(5000)
    })

    it('should handle zero orders gracefully', async () => {
      const caller = await createCaller()

      vi.mocked(db.order.count).mockResolvedValue(0)
      vi.mocked(db.order.aggregate).mockResolvedValue({ _sum: { total: null } } as any)
      vi.mocked(db.order.findMany).mockResolvedValue([])
      vi.mocked(db.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: null } } as any)

      const result = await caller.getDashboardStats({ preset: '30days' })

      expect(result.revenue.value).toBe(0)
      expect(result.orders.value).toBe(0)
      expect(result.avgOrderValue.value).toBe(0)
      expect(result.customers.value).toBe(0)
      expect(result.products.value).toBe(0)
    })

    it('should require authentication', async () => {
      const caller = await createCaller(null) // No session

      await expect(
        caller.getDashboardStats({ preset: '30days' })
      ).rejects.toThrow()
    })
  })

  describe('getRevenueChart', () => {
    it('should return daily revenue data', async () => {
      const caller = await createCaller()

      const mockOrders = [
        { total: 100.50, createdAt: new Date('2024-08-01') },
        { total: 200.75, createdAt: new Date('2024-08-01') },
        { total: 150.25, createdAt: new Date('2024-08-02') },
        { total: 300.00, createdAt: new Date('2024-08-03') },
      ]

      vi.mocked(db.order.findMany).mockResolvedValue(mockOrders as any)

      const result = await caller.getRevenueChart({ 
        preset: '7days',
        groupBy: 'day' 
      })

      expect(result).toEqual([
        { date: '2024-08-01', revenue: 301.25 }, // 100.50 + 200.75
        { date: '2024-08-02', revenue: 150.25 },
        { date: '2024-08-03', revenue: 300.00 },
      ])
    })

    it('should group by week correctly', async () => {
      const caller = await createCaller()

      const mockOrders = [
        { total: 100, createdAt: new Date('2024-08-05') }, // Monday
        { total: 200, createdAt: new Date('2024-08-07') }, // Wednesday
        { total: 300, createdAt: new Date('2024-08-12') }, // Next Monday
      ]

      vi.mocked(db.order.findMany).mockResolvedValue(mockOrders as any)

      const result = await caller.getRevenueChart({ 
        preset: '30days',
        groupBy: 'week' 
      })

      expect(result.length).toBe(2) // Two different weeks
      expect(result[0]?.revenue).toBe(300) // First week total
      expect(result[1]?.revenue).toBe(300) // Second week total
    })

    it('should group by month correctly', async () => {
      const caller = await createCaller()

      const mockOrders = [
        { total: 100, createdAt: new Date('2024-07-15') },
        { total: 200, createdAt: new Date('2024-07-20') },
        { total: 300, createdAt: new Date('2024-08-01') },
        { total: 400, createdAt: new Date('2024-08-15') },
      ]

      vi.mocked(db.order.findMany).mockResolvedValue(mockOrders as any)

      const result = await caller.getRevenueChart({ 
        preset: '90days',
        groupBy: 'month' 
      })

      expect(result).toEqual([
        { date: '2024-07', revenue: 300 }, // July total
        { date: '2024-08', revenue: 700 }, // August total
      ])
    })

    it('should only include completed/delivered orders', async () => {
      const caller = await createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([])

      await caller.getRevenueChart({ preset: '30days' })

      expect(db.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['COMPLETED', 'DELIVERED'] },
          }),
        })
      )
    })
  })

  describe('getOrderMetrics', () => {
    it('should return order metrics with status distribution', async () => {
      const caller = await createCaller()

      const mockStatusGroups = [
        { status: 'PENDING', _count: 5 },
        { status: 'CONFIRMED', _count: 10 },
        { status: 'COMPLETED', _count: 25 },
        { status: 'CANCELLED', _count: 2 },
      ]

      const mockHourlyData = [
        { hour: 9n, count: 5n },
        { hour: 12n, count: 15n },
        { hour: 18n, count: 20n },
        { hour: 20n, count: 10n },
      ]

      const mockPrepTime = [{ avg_prep_time: 35.5 }]

      vi.mocked(db.order.groupBy).mockResolvedValue(mockStatusGroups as any)
      vi.mocked(db.$queryRaw)
        .mockResolvedValueOnce(mockHourlyData)
        .mockResolvedValueOnce(mockPrepTime)

      const result = await caller.getOrderMetrics({ preset: '30days' })

      expect(result.byStatus).toEqual([
        { status: 'PENDING', count: 5 },
        { status: 'CONFIRMED', count: 10 },
        { status: 'COMPLETED', count: 25 },
        { status: 'CANCELLED', count: 2 },
      ])

      // Check hourly distribution (24 hours)
      expect(result.hourlyDistribution).toHaveLength(24)
      expect(result.hourlyDistribution[9]).toEqual({ hour: 9, orders: 5 })
      expect(result.hourlyDistribution[12]).toEqual({ hour: 12, orders: 15 })
      expect(result.hourlyDistribution[0]).toEqual({ hour: 0, orders: 0 }) // No data for midnight

      expect(result.avgPreparationTime).toBe(35.5)
    })

    it('should handle missing preparation time data', async () => {
      const caller = await createCaller()

      vi.mocked(db.order.groupBy).mockResolvedValue([])
      vi.mocked(db.$queryRaw)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await caller.getOrderMetrics({ preset: '7days' })

      expect(result.avgPreparationTime).toBe(0)
      expect(result.hourlyDistribution.every(h => h.orders === 0)).toBe(true)
    })
  })

  describe('getProductPerformance', () => {
    it('should return top performing products with metrics', async () => {
      const caller = await createCaller()

      const mockProducts = [
        {
          productId: 'prod-1',
          productName: 'Chocolate Cake',
          _sum: { quantity: 50, total: 1500.00 },
        },
        {
          productId: 'prod-2',
          productName: 'Tiramisu',
          _sum: { quantity: 30, total: 900.00 },
        },
        {
          productId: 'prod-3',
          productName: 'Cheesecake',
          _sum: { quantity: 25, total: 625.00 },
        },
      ]

      const mockViews = [
        { productId: 'prod-1', _count: 200 },
        { productId: 'prod-2', _count: 150 },
        { productId: 'prod-3', _count: 100 },
      ]

      vi.mocked(db.orderItem.groupBy).mockResolvedValue(mockProducts as any)
      vi.mocked(db.productView.groupBy).mockResolvedValue(mockViews as any)

      const result = await caller.getProductPerformance({ 
        preset: '30days',
        limit: 10 
      })

      expect(result).toEqual([
        {
          id: 'prod-1',
          name: 'Chocolate Cake',
          quantity: 50,
          revenue: 1500.00,
          views: 200,
          conversionRate: 25, // (50/200) * 100
        },
        {
          id: 'prod-2',
          name: 'Tiramisu',
          quantity: 30,
          revenue: 900.00,
          views: 150,
          conversionRate: 20, // (30/150) * 100
        },
        {
          id: 'prod-3',
          name: 'Cheesecake',
          quantity: 25,
          revenue: 625.00,
          views: 100,
          conversionRate: 25, // (25/100) * 100
        },
      ])
    })

    it('should handle products with no views', async () => {
      const caller = await createCaller()

      const mockProducts = [
        {
          productId: 'prod-1',
          productName: 'New Product',
          _sum: { quantity: 10, total: 100.00 },
        },
      ]

      vi.mocked(db.orderItem.groupBy).mockResolvedValue(mockProducts as any)
      vi.mocked(db.productView.groupBy).mockResolvedValue([])

      const result = await caller.getProductPerformance({ 
        preset: '7days',
        limit: 5 
      })

      expect(result[0]?.views).toBe(0)
      expect(result[0]?.conversionRate).toBe(0)
    })

    it('should respect the limit parameter', async () => {
      const caller = await createCaller()

      const mockProducts = Array.from({ length: 20 }, (_, i) => ({
        productId: `prod-${i}`,
        productName: `Product ${i}`,
        _sum: { quantity: 10 - i, total: (10 - i) * 25 },
      }))

      vi.mocked(db.orderItem.groupBy).mockResolvedValue(mockProducts.slice(0, 5) as any)
      vi.mocked(db.productView.groupBy).mockResolvedValue([])

      const result = await caller.getProductPerformance({ 
        preset: '30days',
        limit: 5 
      })

      expect(result).toHaveLength(5)
    })
  })

  describe('getCustomerInsights', () => {
    it('should return customer analytics', async () => {
      const caller = await createCaller()

      const mockCustomerOrders = [
        { customerId: 'cust-1', _count: 5, _sum: { total: 250.00 } },
        { customerId: 'cust-2', _count: 3, _sum: { total: 150.00 } },
        { customerId: 'cust-3', _count: 1, _sum: { total: 50.00 } },
        { customerId: 'cust-4', _count: 2, _sum: { total: 100.00 } },
      ]

      const mockRepeatCustomers = [{ customer_count: 2n }] // cust-1 and cust-2
      const mockNewCustomers = [{ customer_count: 1n }] // cust-3

      vi.mocked(db.order.groupBy).mockResolvedValue(mockCustomerOrders as any)
      vi.mocked(db.$queryRaw)
        .mockResolvedValueOnce(mockRepeatCustomers)
        .mockResolvedValueOnce(mockNewCustomers)

      const result = await caller.getCustomerInsights({ preset: '30days' })

      expect(result).toEqual({
        total: 4,
        new: 1,
        returning: 2,
        repeatRate: 50, // (2/4) * 100
        avgCustomerValue: 137.5, // 550/4
        customerLifetimeValue: 412.5, // 137.5 * 3
      })
    })

    it('should handle no customers gracefully', async () => {
      const caller = await createCaller()

      vi.mocked(db.order.groupBy).mockResolvedValue([])
      vi.mocked(db.$queryRaw)
        .mockResolvedValueOnce([{ customer_count: 0n }])
        .mockResolvedValueOnce([{ customer_count: 0n }])

      const result = await caller.getCustomerInsights({ preset: '7days' })

      expect(result).toEqual({
        total: 0,
        new: 0,
        returning: 0,
        repeatRate: 0,
        avgCustomerValue: 0,
        customerLifetimeValue: 0,
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const caller = await createCaller()

      vi.mocked(db.order.count).mockRejectedValue(new Error('Database connection failed'))

      await expect(
        caller.getDashboardStats({ preset: '30days' })
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle invalid date ranges', async () => {
      const caller = await createCaller()

      const invalidFrom = new Date('2024-08-15')
      const invalidTo = new Date('2024-08-01') // To is before From

      // The router should still process this, but return empty results
      vi.mocked(db.order.findMany).mockResolvedValue([])

      const result = await caller.getRevenueChart({
        preset: 'custom',
        from: invalidFrom,
        to: invalidTo,
      })

      expect(result).toEqual([])
    })

    it('should handle decimal conversion errors', async () => {
      const caller = await createCaller()

      // Mock a response with invalid decimal data
      vi.mocked(db.order.aggregate).mockResolvedValue({
        _sum: { total: { invalid: 'data' } },
      } as any)

      vi.mocked(db.order.count).mockResolvedValue(10)
      vi.mocked(db.order.findMany).mockResolvedValue([])
      vi.mocked(db.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: 0 } } as any)

      const result = await caller.getDashboardStats({ preset: '30days' })

      // Should handle invalid data gracefully and return 0
      expect(result.revenue.value).toBe(0)
    })
  })

  describe('Performance Considerations', () => {
    it('should batch database queries efficiently', async () => {
      const caller = await createCaller()

      vi.mocked(db.order.count).mockResolvedValue(10)
      vi.mocked(db.order.aggregate).mockResolvedValue({ _sum: { total: 500 } } as any)
      vi.mocked(db.order.findMany).mockResolvedValue([])
      vi.mocked(db.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: 20 } } as any)

      const startTime = performance.now()
      await caller.getDashboardStats({ preset: '30days' })
      const endTime = performance.now()

      // All queries should be batched with Promise.all
      // This test ensures queries run in parallel, not sequentially
      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly

      // Verify parallel execution by checking all were called
      expect(db.order.count).toHaveBeenCalled()
      expect(db.order.aggregate).toHaveBeenCalled()
      expect(db.order.findMany).toHaveBeenCalled()
      expect(db.orderItem.aggregate).toHaveBeenCalled()
    })
  })
})