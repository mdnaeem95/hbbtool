import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { merchantRouter } from '../merchant'
import { db } from '@homejiak/database'
import type { AuthSession } from '@homejiak/auth'

// Mock dependencies
vi.mock('@homejiak/database', () => ({
  db: {
    merchant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    order: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
    review: {
      aggregate: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('../../../services/search', () => ({
  SearchService: {
    searchMerchants: vi.fn(),
    calculateDistance: vi.fn((lat1, lng1, lat2, lng2) => {
      // Simple distance calculation for testing
      return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)) * 111
    }),
  },
}))

// Import after mocking
import { SearchService } from '../../../services/search'

// Define Context type for testing
interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: any
  req: Request
  resHeaders: Headers
}

// Mock session for authenticated merchant
const mockMerchantSession: AuthSession = {
  user: {
    id: 'merchant-123',
    email: 'test@merchant.com',
    merchant: {
      id: 'merchant-123',
      email: 'test@merchant.com',
      businessName: 'Test Restaurant',
      phone: '91234567',
      status: 'ACTIVE',
    } as any,
  },
}

// Helper to create test context
const createTestContext = (session: AuthSession | null = mockMerchantSession): Context => {
  return {
    db,
    session,
    supabase: null,
    req: new Request('http://localhost:3000'),
    resHeaders: new Headers(),
  }
}

// Helper to create caller
const createCaller = (session: AuthSession | null = mockMerchantSession) => {
  const context = createTestContext(session)
  return merchantRouter.createCaller(context)
}

// Test data
const mockMerchant = {
  id: 'merchant-123',
  businessName: 'Test Restaurant',
  email: 'test@merchant.com',
  phone: '91234567',
  address: '123 Test Street',
  postalCode: '123456',
  status: 'ACTIVE',
  logoUrl: 'https://example.com/logo.png',
  description: 'Best food in town',
  operatingHours: {
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '23:00' },
    saturday: { open: '10:00', close: '23:00' },
    sunday: { closed: true },
  },
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFee: 5.00,
  minimumOrder: 20.00,
  deliveryRadius: 10,
  latitude: 1.3521,
  longitude: 103.8198,
  _count: {
    products: 15,
    orders: 150,
    reviews: 45,
  },
}

describe('Merchant Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock date to ensure consistent test results
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-08-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('should return merchant profile with counts', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(mockMerchant as any)

      const result = await caller.get()

      expect(result).toEqual(mockMerchant)
      expect(db.merchant.findUnique).toHaveBeenCalledWith({
        where: { id: 'merchant-123' },
        include: {
          _count: { select: { products: true, orders: true, reviews: true } },
        },
      })
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)

      await expect(caller.get()).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.get()).rejects.toThrow()
    })
  })

  describe('getDashboard', () => {
    it('should return dashboard data with stats and analytics', async () => {
      const caller = createCaller()

      // Mock all the database calls
      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        id: 'merchant-123',
        businessName: 'Test Restaurant',
        logoUrl: 'https://example.com/logo.png',
        email: 'test@merchant.com',
        phone: '91234567',
        status: 'ACTIVE',
      } as any)

      // Current month stats
      vi.mocked(db.order.groupBy).mockResolvedValueOnce([
        { status: 'PENDING', _count: { _all: 5 } },
        { status: 'CONFIRMED', _count: { _all: 10 } },
        { status: 'COMPLETED', _count: { _all: 25 } },
      ] as any)

      // Current month revenue
      vi.mocked(db.order.aggregate).mockResolvedValueOnce({
        _sum: { total: 2500.50 },
      } as any)

      // Current month customers
      vi.mocked(db.order.findMany).mockResolvedValueOnce([
        { customerId: 'cust-1' },
        { customerId: 'cust-2' },
        { customerId: 'cust-3' },
      ] as any)

      // Products sold
      vi.mocked(db.orderItem.aggregate).mockResolvedValueOnce({
        _sum: { quantity: 150 },
      } as any)

      // Previous month order count
      vi.mocked(db.order.count).mockResolvedValueOnce(30)

      // Previous month revenue
      vi.mocked(db.order.aggregate).mockResolvedValueOnce({
        _sum: { total: 2000.00 },
      } as any)

      // All-time completed orders
      vi.mocked(db.order.count).mockResolvedValueOnce(120)

      // All-time total orders
      vi.mocked(db.order.count).mockResolvedValueOnce(150)

      // Average preparation time
      vi.mocked(db.$queryRaw).mockResolvedValueOnce([
        { avg_prep_time: 25.5 },
      ])

      // Reviews data
      vi.mocked(db.review.aggregate).mockResolvedValueOnce({
        _avg: { rating: 4.5 },
        _count: { rating: 45 },
      } as any)

      // Active products count
      vi.mocked(db.product.count).mockResolvedValueOnce(15)

      // Recent orders
      vi.mocked(db.order.findMany).mockResolvedValueOnce([
        {
          id: 'order-1',
          orderNumber: 'ORD001',
          createdAt: new Date('2024-08-14'),
          status: 'COMPLETED',
          total: 45.50,
          customer: { name: 'John Doe', email: 'john@example.com' },
          items: [
            { productName: 'Burger', quantity: 2 },
            { productName: 'Fries', quantity: 1 },
          ],
        },
      ] as any)

      // Top products
      vi.mocked(db.orderItem.groupBy).mockResolvedValueOnce([
        {
          productId: 'prod-1',
          productName: 'Signature Burger',
          _sum: { quantity: 50, total: 750.00 },
        },
        {
          productId: 'prod-2',
          productName: 'Classic Pizza',
          _sum: { quantity: 30, total: 600.00 },
        },
      ] as any)

      const result = await caller.getDashboard()

      expect(result).toMatchObject({
        merchant: expect.objectContaining({
          businessName: 'Test Restaurant',
        }),
        stats: {
          totalOrders: 40,
          pendingOrders: 5,
          revenue: 2500.50,
          analytics: expect.objectContaining({
            revenue: {
              value: 2500.50,
              change: 25.025,
              trend: 'up',
            },
            orders: {
              value: 40,
              change: expect.any(Number),
              trend: 'up',
            },
            customers: {
              value: 3,
            },
            productsSold: {
              value: 150,
            },
            reviews: {
              value: 45,
            },
            completionRate: 80.0,
            avgPreparationTime: 26,
            avgRating: 4.5,
            activeProducts: 15,
          }),
        },
        recentOrders: expect.arrayContaining([
          expect.objectContaining({
            orderNumber: 'ORD001',
          }),
        ]),
        topProducts: expect.arrayContaining([
          expect.objectContaining({
            name: 'Signature Burger',
            quantitySold: 50,
            revenue: 750.00,
          }),
        ]),
      })
    })

    it('should handle zero values gracefully', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        id: 'merchant-123',
        businessName: 'New Restaurant',
      } as any)

      // Mock all calls with zero/null values
      vi.mocked(db.order.groupBy).mockResolvedValue([])
      vi.mocked(db.order.aggregate).mockResolvedValue({ _sum: { total: null } } as any)
      vi.mocked(db.order.findMany).mockResolvedValue([])
      vi.mocked(db.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: null } } as any)
      vi.mocked(db.order.count).mockResolvedValue(0)
      vi.mocked(db.$queryRaw).mockResolvedValue([{ avg_prep_time: null }])
      vi.mocked(db.review.aggregate).mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      } as any)
      vi.mocked(db.product.count).mockResolvedValue(0)
      vi.mocked(db.orderItem.groupBy).mockResolvedValue([])

      const result = await caller.getDashboard()

      expect(result.stats.analytics).toMatchObject({
        revenue: { value: 0 },
        orders: { value: 0 },
        customers: { value: 0 },
        productsSold: { value: 0 },
        completionRate: 0,
        avgPreparationTime: 0,
        avgRating: 0,
        activeProducts: 0,
      })
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)
      // Mock other calls to avoid undefined errors
      vi.mocked(db.order.groupBy).mockResolvedValue([])
      vi.mocked(db.order.aggregate).mockResolvedValue({ _sum: { total: 0 } } as any)
      vi.mocked(db.order.findMany).mockResolvedValue([])
      vi.mocked(db.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: 0 } } as any)
      vi.mocked(db.order.count).mockResolvedValue(0)
      vi.mocked(db.$queryRaw).mockResolvedValue([])
      vi.mocked(db.review.aggregate).mockResolvedValue({ _avg: { rating: 0 }, _count: { rating: 0 } } as any)
      vi.mocked(db.product.count).mockResolvedValue(0)
      vi.mocked(db.orderItem.groupBy).mockResolvedValue([])

      await expect(caller.getDashboard()).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found',
      })
    })
  })

  describe('update', () => {
    it('should update merchant profile', async () => {
      const caller = createCaller()

      const updateData = {
        businessName: 'Updated Restaurant',
        description: 'New description',
        phone: '98765432',
        deliverySettings: {
          deliveryEnabled: true,
          pickupEnabled: false,
          deliveryFee: 7.50,
          minimumOrder: 25.00,
          deliveryRadius: 15,
        },
      }

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null) // For slug uniqueness
      vi.mocked(db.merchant.update).mockResolvedValue({
        ...mockMerchant,
        ...updateData,
        slug: 'updated-restaurant',
      } as any)

      const result = await caller.update(updateData)

      expect(result).toMatchObject({
        businessName: 'Updated Restaurant',
        description: 'New description',
        phone: '98765432',
      })

      expect(db.merchant.update).toHaveBeenCalledWith({
        where: { id: 'merchant-123' },
        data: expect.objectContaining({
          businessName: 'Updated Restaurant',
          description: 'New description',
          phone: '98765432',
          deliveryEnabled: true,
          pickupEnabled: false,
          deliveryFee: 7.50,
          minimumOrder: 25.00,
          deliveryRadius: 15,
        }),
      })
    })

    it('should generate unique slug when updating business name', async () => {
      const caller = createCaller()

      // First call finds existing slug
      vi.mocked(db.merchant.findFirst)
        .mockResolvedValueOnce({ id: 'other-merchant' } as any)
        .mockResolvedValueOnce(null) // Second attempt succeeds

      vi.mocked(db.merchant.update).mockResolvedValue({
        ...mockMerchant,
        businessName: 'Popular Restaurant',
        slug: 'popular-restaurant-2',
      } as any)

      const result = await caller.update({
        businessName: 'Popular Restaurant',
      })

      expect(result.slug).toBe('popular-restaurant-2')
    })

    it('should update operating hours', async () => {
      const caller = createCaller()

      const operatingHours = {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '20:00' },
        thursday: { open: '08:00', close: '20:00' },
        friday: { open: '08:00', close: '21:00' },
        saturday: { open: '09:00', close: '21:00' },
        sunday: { open: '09:00', close: '21:00', closed: true },
      }

      vi.mocked(db.merchant.update).mockResolvedValue({
        ...mockMerchant,
        operatingHours,
      } as any)

      const result = await caller.update({ operatingHours })

      expect(result.operatingHours).toEqual(operatingHours)
    })

    it('should validate phone number format', async () => {
        const caller = createCaller()

        // Test invalid phone number (too short for Singapore)
        await expect(
        caller.update({ phone: '12345' })
        ).rejects.toThrow()

        // Mock the update response for valid phone number
        vi.mocked(db.merchant.update).mockResolvedValue({
        ...mockMerchant,
        phone: '91234567',
        } as any)

        // Test valid phone number (8-digit Singapore format)
        const result = await caller.update({ phone: '91234567' })
        
        expect(result).toBeDefined()
        expect(result.phone).toBe('91234567')
    })

    it('should validate postal code format', async () => {
        const caller = createCaller()

        // Test invalid postal code (5 digits - not Singapore format)
        await expect(
        caller.update({ postalCode: '12345' })
        ).rejects.toThrow()

        // Mock the update response for valid postal code
        vi.mocked(db.merchant.update).mockResolvedValue({
        ...mockMerchant,
        postalCode: '123456',
        } as any)

        // Test valid postal code (6-digit Singapore format)
        const result = await caller.update({ postalCode: '123456' })
        
        expect(result).toBeDefined()
        expect(result.postalCode).toBe('123456')
    })
  })

  describe('analytics', () => {
    it('should return analytics for specified period', async () => {
      const caller = createCaller()

      // Mock database responses
      vi.mocked(db.order.groupBy).mockResolvedValueOnce([
        { status: 'PENDING', _count: { _all: 5 } },
        { status: 'COMPLETED', _count: { _all: 20 } },
      ] as any)

      vi.mocked(db.order.aggregate).mockResolvedValueOnce({
        _sum: { total: 1500.00 },
      } as any)

      vi.mocked(db.orderItem.groupBy).mockResolvedValueOnce([
        { productId: 'prod-1', _sum: { quantity: 50 }, _count: { _all: 25 } },
        { productId: 'prod-2', _sum: { quantity: 30 }, _count: { _all: 15 } },
      ] as any)

      vi.mocked(db.order.groupBy).mockResolvedValueOnce([
        { customerId: 'cust-1', _count: { _all: 5 } },
        { customerId: 'cust-2', _count: { _all: 3 } },
      ] as any)

      const result = await caller.analytics({ period: 'month' })

      expect(result).toMatchObject({
        orders: {
          total: 25,
          byStatus: expect.arrayContaining([
            { status: 'PENDING', _count: { _all: 5 } },
            { status: 'COMPLETED', _count: { _all: 20 } },
          ]),
        },
        revenue: 1500.00,
        popularProducts: expect.arrayContaining([
          expect.objectContaining({ productId: 'prod-1' }),
        ]),
        uniqueCustomers: 2,
        period: 'month',
      })
    })

    it('should handle different time periods', async () => {
      const caller = createCaller()

      // Mock minimal responses
      vi.mocked(db.order.groupBy).mockResolvedValue([])
      vi.mocked(db.order.aggregate).mockResolvedValue({ _sum: { total: 0 } } as any)
      vi.mocked(db.orderItem.groupBy).mockResolvedValue([])

      const periods = ['today', 'week', 'month', 'year'] as const

      for (const period of periods) {
        await expect(
          caller.analytics({ period })
        ).resolves.toMatchObject({
          period,
          startDate: expect.any(Date),
        })
      }
    })
  })

  describe('searchNearby', () => {
    it('should search merchants with filters', async () => {
      const caller = createCaller(null) // Public procedure

      const mockSearchResults = [
        {
          id: 'merchant-1',
          businessName: 'Restaurant A',
          latitude: 1.3521,
          longitude: 103.8198,
          deliveryEnabled: true,
          pickupEnabled: true,
          operatingHours: {
            monday: { open: '09:00', close: '22:00' },
          },
          rating: 4.5,
          _count: { orders: 100 },
        },
        {
          id: 'merchant-2',
          businessName: 'Restaurant B',
          latitude: 1.3621,
          longitude: 103.8298,
          deliveryEnabled: true,
          pickupEnabled: false,
          operatingHours: {
            monday: { closed: true },
          },
          rating: 4.0,
          _count: { orders: 50 },
        },
      ]

      vi.mocked(SearchService.searchMerchants).mockResolvedValue(mockSearchResults as any)

      const result = await caller.searchNearby({
        query: 'restaurant',
        filters: {
          userLocation: { lat: 1.3521, lng: 103.8198 },
          radius: 5,
          deliveryOnly: true,
        },
      })

      expect(result.merchants).toHaveLength(2)
      expect(result.merchants[0]).toMatchObject({
        businessName: 'Restaurant A',
        isOpen: expect.any(Boolean),
        distance: expect.any(Number),
      })

      expect(SearchService.searchMerchants).toHaveBeenCalledWith({
        query: 'restaurant',
        latitude: 1.3521,
        longitude: 103.8198,
        radius: 5,
        deliveryEnabled: true,
        limit: 50,
      })
    })

    it('should filter by bounds', async () => {
      const caller = createCaller(null)

      const mockSearchResults = [
        {
          id: 'merchant-1',
          businessName: 'Inside Bounds',
          latitude: 1.35,
          longitude: 103.82,
          operatingHours: {},
        },
        {
          id: 'merchant-2',
          businessName: 'Outside Bounds',
          latitude: 1.40,
          longitude: 103.90,
          operatingHours: {},
        },
      ]

      vi.mocked(SearchService.searchMerchants).mockResolvedValue(mockSearchResults as any)

      const result = await caller.searchNearby({
        filters: {
          bounds: {
            north: 1.36,
            south: 1.34,
            east: 103.83,
            west: 103.81,
          },
        },
      })

      expect(result.merchants).toHaveLength(1)
      expect(result.merchants[0]?.businessName).toBe('Inside Bounds')
    })

    it('should filter by dietary options', async () => {
      const caller = createCaller(null)

      const mockSearchResults = [
        {
          id: 'merchant-1',
          businessName: 'Halal Restaurant',
          cuisineType: ['Halal', 'Asian'],
          operatingHours: {},
        },
        {
          id: 'merchant-2',
          businessName: 'Vegetarian Place',
          cuisineType: ['Vegetarian', 'Healthy'],
          operatingHours: {},
        },
      ]

      vi.mocked(SearchService.searchMerchants).mockResolvedValue(mockSearchResults as any)

      const result = await caller.searchNearby({
        filters: {
          dietaryOptions: ['VEGETARIAN'],
        },
      })

      expect(result.merchants).toHaveLength(1)
      expect(result.merchants[0]?.businessName).toBe('Vegetarian Place')
    })

    it('should sort by open status and distance', async () => {
      const caller = createCaller(null)

      // Mock date to Monday 10:00 AM
      vi.setSystemTime(new Date('2024-08-12T02:00:00Z')) // 10:00 AM SGT

      const mockSearchResults = [
        {
          id: 'merchant-1',
          businessName: 'Far but Open',
          latitude: 1.40,
          longitude: 103.85,
          operatingHours: {
            monday: { open: '09:00', close: '22:00' },
          },
        },
        {
          id: 'merchant-2',
          businessName: 'Near but Closed',
          latitude: 1.36,
          longitude: 103.82,
          operatingHours: {
            monday: { closed: true },
          },
        },
        {
          id: 'merchant-3',
          businessName: 'Near and Open',
          latitude: 1.35,
          longitude: 103.82,
          operatingHours: {
            monday: { open: '09:00', close: '22:00' },
          },
        },
      ]

      vi.mocked(SearchService.searchMerchants).mockResolvedValue(mockSearchResults as any)

      const result = await caller.searchNearby({
        filters: {
          userLocation: { lat: 1.35, lng: 103.82 },
        },
      })

      // Should be sorted: Open merchants first, then by distance
      expect(result.merchants[0]?.businessName).toBe('Near and Open')
      expect(result.merchants[1]?.businessName).toBe('Far but Open')
      expect(result.merchants[2]?.businessName).toBe('Near but Closed')
    })

    it('should handle empty search results', async () => {
      const caller = createCaller(null)

      vi.mocked(SearchService.searchMerchants).mockResolvedValue([])

      const result = await caller.searchNearby({
        query: 'nonexistent',
      })

      expect(result.merchants).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})