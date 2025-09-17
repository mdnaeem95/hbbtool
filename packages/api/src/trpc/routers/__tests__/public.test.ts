import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { publicRouter } from '../public'
import { db } from '@kitchencloud/database'
import { DeliveryMethod } from '@kitchencloud/database'
import type { AuthSession } from '@kitchencloud/auth'

// Mock dependencies
vi.mock('@kitchencloud/database', () => ({
  db: {
    merchant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
    analytics: {
      create: vi.fn(),
    },
    checkoutSession: {
      create: vi.fn(),
    },
  },
  DeliveryMethod: {
    DELIVERY: 'DELIVERY',
    PICKUP: 'PICKUP',
  },
  Prisma: {},
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-session-id-1234567890123456'),
}))

// Helper to create mock Decimal objects
const mockDecimal = (value: number) => ({
  toNumber: () => value,
  toString: () => value.toString(),
  toFixed: (digits?: number) => value.toFixed(digits),
  valueOf: () => value,
})

// Define Context type
interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: any
  req: Request
  resHeaders: Headers
  ip?: string
}

// Helper functions
const createTestContext = (session: AuthSession | null = null): Context => {
  return {
    db,
    session,
    supabase: null,
    req: new Request('http://localhost:3000', {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'referer': 'https://google.com',
        'x-forwarded-for': '192.168.1.1',
      },
    }),
    resHeaders: new Headers(),
    ip: '127.0.0.1',
  }
}

const createCaller = (session: AuthSession | null = null) => {
  const context = createTestContext(session)
  return publicRouter.createCaller(context)
}

// Test data
const mockMerchant = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  slug: 'test-restaurant',
  businessName: 'Test Restaurant',
  status: 'ACTIVE',
  deletedAt: null,
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFee: mockDecimal(5.00),
  minimumOrder: mockDecimal(20.00),
  paynowNumber: '91234567',
  paynowQrCode: 'data:image/png;base64,mockqrcode',
  categories: [
    { id: 'clh3sa9g10020qzrm5h4n8x20', name: 'Burgers', slug: 'burgers', isActive: true, sortOrder: 1 },
    { id: 'clh3sa9g10021qzrm5h4n8x21', name: 'Sides', slug: 'sides', isActive: true, sortOrder: 2 },
  ],
  _count: {
    products: 25,
    reviews: 100,
  },
}

const mockProducts = [
  {
    id: 'clh3sa9g10000qzrm5h4n8xo1',
    merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Signature Burger',
    slug: 'signature-burger',
    description: 'Our famous homemade burger',
    categoryId: 'clh3sa9g10020qzrm5h4n8x20',
    price: mockDecimal(15.00),
    compareAtPrice: mockDecimal(18.00),
    sku: 'BRG001',
    trackInventory: true,
    inventory: 50,
    images: ['https://example.com/burger.jpg'],
    status: 'ACTIVE',
    featured: true,
    tags: ['bestseller', 'spicy'],
    viewCount: 150,
    deletedAt: null,
    createdAt: new Date('2024-08-15T10:00:00Z'),
    category: { id: 'clh3sa9g10020qzrm5h4n8x20', name: 'Burgers', slug: 'burgers' },
    variants: [],
    orderItems: [],
    reviews: [],
    _count: { orderItems: 150, reviews: 45 },
  },
  {
    id: 'clh3sa9g10002qzrm5h4n8xo3',
    merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'French Fries',
    slug: 'french-fries',
    description: 'Crispy golden fries',
    categoryId: 'clh3sa9g10021qzrm5h4n8x21',
    price: mockDecimal(5.00),
    compareAtPrice: null,
    sku: 'FRY001',
    trackInventory: false,
    inventory: 0,
    images: ['https://example.com/fries.jpg'],
    status: 'ACTIVE',
    featured: false,
    tags: ['vegetarian'],
    viewCount: 100,
    deletedAt: null,
    createdAt: new Date('2024-08-14T10:00:00Z'),
    category: { id: 'clh3sa9g10021qzrm5h4n8x21', name: 'Sides', slug: 'sides' },
    variants: [],
    orderItems: [],
    reviews: [],
    _count: { orderItems: 200, reviews: 30 },
  },
]

const mockOrder = {
  id: 'clh3sa9g10000qzrm5h4n8xo1',
  orderNumber: 'ORD001',
  customerPhone: '98765432',
  status: 'CONFIRMED',
  merchant: {
    businessName: 'Test Restaurant',
    phone: '91234567',
  },
  items: [
    {
      productName: 'Burger',
      quantity: 2,
      product: { name: 'Burger', price: mockDecimal(15.00) },
    },
  ],
  deliveryAddress: {
    line1: '123 Test Street',
    postalCode: '123456',
  },
  events: [
    { event: 'ORDER_CREATED', createdAt: new Date() },
  ],
}

describe('Public Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMerchant', () => {
    it('should return merchant storefront data', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.analytics.create).mockResolvedValue({} as any)

      const result = await caller.getMerchant({ slug: 'test-restaurant' })

      expect(result).toMatchObject({
        slug: 'test-restaurant',
        businessName: 'Test Restaurant',
        categories: expect.arrayContaining([
          expect.objectContaining({ name: 'Burgers' }),
        ]),
        _count: {
          products: 25,
          reviews: 100,
        },
      })

      expect(db.merchant.findFirst).toHaveBeenCalledWith({
        where: { slug: 'test-restaurant', status: 'ACTIVE', deletedAt: null },
        include: {
          categories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          _count: { select: { products: true, reviews: true } },
        },
      })
    })

    it('should track analytics', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.analytics.create).mockResolvedValue({} as any)

      await caller.getMerchant({ slug: 'test-restaurant' })

      expect(db.analytics.create).toHaveBeenCalledWith({
        data: {
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          event: 'storefront_view',
          properties: {
            referrer: 'https://google.com',
            userAgent: 'Mozilla/5.0',
          },
        },
      })
    })

    it('should handle analytics failure gracefully', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.analytics.create).mockRejectedValue(new Error('Analytics failed'))

      // Should not throw even if analytics fails
      await expect(
        caller.getMerchant({ slug: 'test-restaurant' })
      ).resolves.toBeDefined()
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null)

      await expect(
        caller.getMerchant({ slug: 'nonexistent' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should filter inactive merchants', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null)

      await expect(
        caller.getMerchant({ slug: 'inactive-merchant' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })

      expect(db.merchant.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'ACTIVE',
          deletedAt: null,
        }),
        include: expect.any(Object),
      })
    })
  })

  describe('getProduct', () => {
    it('should return product details', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.findFirst).mockResolvedValue(mockProducts[0] as any)
      vi.mocked(db.analytics.create).mockResolvedValue({} as any)

      const result = await caller.getProduct({
        merchantSlug: 'test-restaurant',
        productId: 'clh3sa9g10000qzrm5h4n8xo1',
      })

      expect(result).toMatchObject({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        name: 'Signature Burger',
        category: expect.objectContaining({ name: 'Burgers' }),
        _count: {
          orderItems: 150,
          reviews: 45,
        },
      })
    })

    it('should track product view analytics', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.findFirst).mockResolvedValue(mockProducts[0] as any)
      vi.mocked(db.analytics.create).mockResolvedValue({} as any)

      await caller.getProduct({
        merchantSlug: 'test-restaurant',
        productId: 'clh3sa9g10000qzrm5h4n8xo1',
      })

      expect(db.analytics.create).toHaveBeenCalledWith({
        data: {
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          event: 'product_view',
          properties: {
            productId: 'clh3sa9g10000qzrm5h4n8xo1',
            productName: 'Signature Burger',
            price: 15.00,
          },
        },
      })
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null)

      await expect(
        caller.getProduct({
          merchantSlug: 'nonexistent',
          productId: 'clh3sa9g10000qzrm5h4n8xo1',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found',
      })
    })

    it('should throw if product not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.findFirst).mockResolvedValue(null)

      await expect(
        caller.getProduct({
          merchantSlug: 'test-restaurant',
          productId: 'clh3sa9g19999qzrm5h4n8x99',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Product not found',
      })
    })

    it('should validate CUID format', async () => {
      const caller = createCaller()

      await expect(
        caller.getProduct({
          merchantSlug: 'test-restaurant',
          productId: 'invalid-id',
        })
      ).rejects.toThrow()
    })
  })

  describe('listProducts', () => {
    it('should list products with pagination', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(2)
      vi.mocked(db.product.findMany).mockResolvedValue(mockProducts as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(5.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(10.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([
        { categoryId: 'clh3sa9g10020qzrm5h4n8x20', _count: 1 },
        { categoryId: 'clh3sa9g10021qzrm5h4n8x21', _count: 1 },
      ] as any)

      const result = await caller.listProducts({
        merchantSlug: 'test-restaurant',
        limit: 20,
        page: 1,
      })

      expect(result).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            name: 'Signature Burger',
            price: 15.00,
            effectivePrice: 15.00,
            isOnSale: true,
            discountPercentage: 17,
            inStock: true,
          }),
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasMore: false,
        },
        aggregations: {
          priceRange: {
            min: 5.00,
            max: 15.00,
            avg: 10.00,
          },
          categoryCount: {
            'clh3sa9g10020qzrm5h4n8x20': 1,
            'clh3sa9g10021qzrm5h4n8x21': 1,
          },
        },
      })
    })

    it('should filter by category', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(1)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(15.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(15.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        categoryId: 'clh3sa9g10020qzrm5h4n8x20',
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'clh3sa9g10020qzrm5h4n8x20',
          }),
        })
      )
    })

    it('should filter by multiple categories', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(2)
      vi.mocked(db.product.findMany).mockResolvedValue(mockProducts as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(5.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(10.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        categoryIds: ['clh3sa9g10020qzrm5h4n8x20', 'clh3sa9g10021qzrm5h4n8x21'],
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: { in: ['clh3sa9g10020qzrm5h4n8x20', 'clh3sa9g10021qzrm5h4n8x21'] },
          }),
        })
      )
    })

    it('should search products', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(1)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(15.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(15.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        search: 'burger',
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'burger', mode: 'insensitive' } },
              { description: { contains: 'burger', mode: 'insensitive' } },
              { tags: { hasSome: ['burger'] } },
              { sku: { contains: 'burger', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should filter by price range', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(1)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[1]] as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(5.00) },
        _max: { price: mockDecimal(5.00) },
        _avg: { price: mockDecimal(5.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        minPrice: 3.00,
        maxPrice: 10.00,
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: {
              gte: 3.00,
              lte: 10.00,
            },
          }),
        })
      )
    })

    it('should filter by tags', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(1)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(15.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(15.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        tags: ['bestseller', 'spicy'],
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['bestseller', 'spicy'] },
          }),
        })
      )
    })

    it('should filter by featured', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(1)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(15.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(15.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        featured: true,
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            featured: true,
          }),
        })
      )
    })

    it('should filter by in stock', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(2)
      vi.mocked(db.product.findMany).mockResolvedValue(mockProducts as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(5.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(10.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        inStock: true,
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { trackInventory: false },
              {
                AND: [
                  { trackInventory: true },
                  { inventory: { gt: 0 } },
                ],
              },
            ],
          }),
        })
      )
    })

    it('should sort by price ascending', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(2)
      vi.mocked(db.product.findMany).mockResolvedValue(mockProducts as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(5.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(10.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
        sort: 'price-asc',
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        })
      )
    })

    it('should sort by featured and popularity by default', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({ id: mockMerchant.id } as any)
      vi.mocked(db.product.count).mockResolvedValue(2)
      vi.mocked(db.product.findMany).mockResolvedValue(mockProducts as any)
      vi.mocked(db.product.aggregate).mockResolvedValue({
        _min: { price: mockDecimal(5.00) },
        _max: { price: mockDecimal(15.00) },
        _avg: { price: mockDecimal(10.00) },
      } as any)
      vi.mocked(db.product.groupBy).mockResolvedValue([])

      await caller.listProducts({
        merchantSlug: 'test-restaurant',
      })

      expect(db.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { featured: 'desc' },
            { orderItems: { _count: 'desc' } },
            { createdAt: 'desc' },
          ],
        })
      )
    })

    it('should throw if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null)

      await expect(
        caller.listProducts({
          merchantSlug: 'nonexistent',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found',
      })
    })
  })

  describe('createCheckout', () => {
    it('should create checkout session', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        deliveryEnabled: true,
        pickupEnabled: true,
      } as any)

      vi.mocked(db.product.findMany).mockResolvedValue([
        {
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          name: 'Burger',
          price: mockDecimal(15.00),
        },
      ] as any)

      vi.mocked(db.checkoutSession.create).mockResolvedValue({} as any)

      const result = await caller.createCheckout({
        merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        items: [
          {
            productId: 'clh3sa9g10000qzrm5h4n8xo1',
            quantity: 2,
            notes: 'No onions',
          },
        ],
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryAddress: {
          line1: '123 Test Street',
          line2: '#10-01',
          postalCode: '123456',
          latitude: 1.3521,
          longitude: 103.8198,
        },
        customer: {
          name: 'John Doe',
          phone: '98765432',
          email: 'john@example.com',
        },
        scheduledFor: new Date('2024-08-15T14:00:00Z'),
      })

      expect(result).toMatchObject({
        sessionId: 'test-session-id-1234567890123456',
        total: 35.00, // 2 * 15 + 5 delivery fee
        paymentMethods: [
          {
            method: 'PAYNOW',
            enabled: true,
            details: {
              number: '91234567',
              qrCode: 'data:image/png;base64,mockqrcode',
            },
          },
        ],
        paynowNumber: '91234567',
        paynowQrCode: 'data:image/png;base64,mockqrcode',
      })

      expect(db.checkoutSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: 'test-session-id-1234567890123456',
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          subtotal: 30.00,
          deliveryFee: 5.00,
          total: 35.00,
          expiresAt: expect.any(Date),
        }),
      })
    })

    it('should validate merchant status', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null)

      await expect(
        caller.createCheckout({
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          items: [{ productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 1 }],
          deliveryMethod: DeliveryMethod.DELIVERY,
          customer: { name: 'John', phone: '98765432' },
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found or inactive',
      })
    })

    it('should validate delivery method availability', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        deliveryEnabled: false,
      } as any)

      await expect(
        caller.createCheckout({
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          items: [{ productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 1 }],
          deliveryMethod: DeliveryMethod.DELIVERY,
          customer: { name: 'John', phone: '98765432' },
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Delivery not available',
      })
    })

    it('should validate pickup availability', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        pickupEnabled: false,
      } as any)

      await expect(
        caller.createCheckout({
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          items: [{ productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 1 }],
          deliveryMethod: DeliveryMethod.PICKUP,
          customer: { name: 'John', phone: '98765432' },
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Pickup not available',
      })
    })

    it('should validate minimum order amount', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: mockDecimal(50.00),
      } as any)

      vi.mocked(db.product.findMany).mockResolvedValue([
        {
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          name: 'Burger',
          price: mockDecimal(15.00),
        },
      ] as any)

      await expect(
        caller.createCheckout({
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          items: [
            { productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 1 }, // 15 + 5 = 20, less than 50
          ],
          deliveryMethod: DeliveryMethod.DELIVERY,
          customer: { name: 'John', phone: '98765432' },
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Minimum order amount is $50.00',
      })
    })

    it('should validate product availability', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.product.findMany).mockResolvedValue([]) // No products found

      await expect(
        caller.createCheckout({
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          items: [
            { productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 1 },
          ],
          deliveryMethod: DeliveryMethod.DELIVERY,
          customer: { name: 'John', phone: '98765432' },
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Product clh3sa9g10000qzrm5h4n8xo1 not available',
      })
    })

    it('should not charge delivery fee for pickup', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)

      vi.mocked(db.product.findMany).mockResolvedValue([
        {
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          name: 'Burger',
          price: mockDecimal(15.00),
        },
      ] as any)

      vi.mocked(db.checkoutSession.create).mockResolvedValue({} as any)

      const result = await caller.createCheckout({
        merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        items: [
          { productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 2 },
        ],
        deliveryMethod: DeliveryMethod.PICKUP,
        customer: { name: 'John', phone: '98765432' },
      })

      expect(result.total).toBe(30.00) // No delivery fee

      expect(db.checkoutSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subtotal: 30.00,
          deliveryFee: 0,
          total: 30.00,
        }),
      })
    })

    it('should handle UUID validation for merchantId', async () => {
      const caller = createCaller()

      await expect(
        caller.createCheckout({
          merchantId: 'invalid-uuid',
          items: [{ productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 1 }],
          deliveryMethod: DeliveryMethod.DELIVERY,
          customer: { name: 'John', phone: '98765432' },
        })
      ).rejects.toThrow()
    })

    it('should validate phone format', async () => {
      const caller = createCaller()

      await expect(
        caller.createCheckout({
          merchantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          items: [{ productId: 'clh3sa9g10000qzrm5h4n8xo1', quantity: 1 }],
          deliveryMethod: DeliveryMethod.DELIVERY,
          customer: { name: 'John', phone: '123' }, // Invalid phone
        })
      ).rejects.toThrow()
    })
  })

  describe('trackOrder', () => {
    it('should track order by number and phone', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any)

      const result = await caller.trackOrder({
        orderNumber: 'ORD001',
        phone: '98765432',
      })

      expect(result).toMatchObject({
        orderNumber: 'ORD001',
        status: 'CONFIRMED',
        merchant: expect.objectContaining({
          businessName: 'Test Restaurant',
        }),
        items: expect.arrayContaining([]),
      })

      expect(db.order.findFirst).toHaveBeenCalledWith({
        where: {
          orderNumber: 'ORD001',
          customerPhone: '98765432',
        },
        include: {
          merchant: { select: { businessName: true, phone: true } },
          items: { include: { product: true } },
          deliveryAddress: true,
          events: { orderBy: { createdAt: 'desc' } },
        },
      })
    })

    it('should throw if order not found', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue(null)

      await expect(
        caller.trackOrder({
          orderNumber: 'INVALID',
          phone: '98765432',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Order not found',
      })
    })

    it('should validate phone format', async () => {
      const caller = createCaller()

      await expect(
        caller.trackOrder({
          orderNumber: 'ORD001',
          phone: '123', // Invalid
        })
      ).rejects.toThrow()
    })

    it('should validate order number length', async () => {
      const caller = createCaller()

      await expect(
        caller.trackOrder({
          orderNumber: 'OR', // Too short (min 3)
          phone: '98765432',
        })
      ).rejects.toThrow()
    })

    it('should require matching phone for security', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue(null)

      await caller.trackOrder({
        orderNumber: 'ORD001',
        phone: '91234567', // Different phone
      }).catch(() => {})

      expect(db.order.findFirst).toHaveBeenCalledWith({
        where: {
          orderNumber: 'ORD001',
          customerPhone: '91234567', // Must match exactly
        },
        include: expect.any(Object),
      })
    })
  })
})