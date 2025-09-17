import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { productRouter } from '../product'
import { db } from '@kitchencloud/database'
import { ProductStatus } from '@kitchencloud/database'
import type { AuthSession } from '@kitchencloud/auth'

// Mock dependencies
vi.mock('@kitchencloud/database', () => ({
  db: {
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((cb) => {
      if (Array.isArray(cb)) {
        return Promise.all(cb)
      }
      return cb(db)
    }),
  },
  ProductStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DISCONTINUED: 'DISCONTINUED',
  },
  Prisma: {},
}))

vi.mock('../../../utils/pagination', () => ({
  paginatedResponse: vi.fn(async (model, where, options, include) => {
    const skip = ((options.page || 1) - 1) * options.limit
    const items = await model.findMany({
      where,
      include,
      skip,
      take: options.limit,
      orderBy: { [options.sortBy]: options.sortOrder },
    })
    const total = await model.count({ where })
    return {
      items,
      total,
      hasMore: skip + options.limit < total,
    }
  }),
}))

vi.mock('../../../utils/errors', () => ({
  handleDatabaseError: vi.fn((error) => {
    throw error
  }),
}))

// Import after mocking
import { paginatedResponse } from '../../../utils/pagination'

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
}

// Mock session
const mockMerchantSession: AuthSession = {
  user: {
    id: 'clh3sa9g10001qzrm5h4n8xo2',
    email: 'merchant@test.com',
    userType: 'merchant',
    merchant: {
      id: 'clh3sa9g10001qzrm5h4n8xo2',
      email: 'merchant@test.com',
      businessName: 'Test Restaurant',
      phone: '91234567',
      status: 'ACTIVE',
    } as any,
  },
}

// Helper functions
const createTestContext = (session: AuthSession | null = mockMerchantSession): Context => {
  return {
    db,
    session,
    supabase: null,
    req: new Request('http://localhost:3000'),
    resHeaders: new Headers(),
  }
}

const createCaller = (session: AuthSession | null = mockMerchantSession) => {
  const context = createTestContext(session)
  return productRouter.createCaller(context)
}

// Test data
const mockProducts = [
  {
    id: 'clh3sa9g10000qzrm5h4n8xo1',
    merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
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
    createdAt: new Date('2024-08-15T10:00:00Z'),
    updatedAt: new Date('2024-08-15T10:00:00Z'),
    category: {
      id: 'clh3sa9g10020qzrm5h4n8x20',
      name: 'Burgers',
    },
    _count: {
      orderItems: 150,
      reviews: 45,
    },
  },
  {
    id: 'clh3sa9g10002qzrm5h4n8xo3',
    merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
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
    createdAt: new Date('2024-08-14T10:00:00Z'),
    updatedAt: new Date('2024-08-14T10:00:00Z'),
    category: {
      id: 'clh3sa9g10021qzrm5h4n8x21',
      name: 'Sides',
    },
    _count: {
      orderItems: 200,
      reviews: 30,
    },
  },
]

describe('Product Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('list', () => {
    it('should list merchant products', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findMany).mockResolvedValue(mockProducts as any)
      vi.mocked(db.product.count).mockResolvedValue(2)

      const result = await caller.list({
        limit: 10,
        page: 1,
      })

      expect(result).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            name: 'Signature Burger',
            slug: 'signature-burger',
          }),
        ]),
        total: 2,
      })

      expect(paginatedResponse).toHaveBeenCalledWith(
        db.product,
        { merchantId: 'clh3sa9g10001qzrm5h4n8xo2' },
        expect.any(Object),
        {
          category: true,
          _count: { select: { orderItems: true } },
        }
      )
    })

    it('should filter by status', async () => {
      const caller = createCaller()

      const activeProducts = mockProducts.filter(p => p.status === 'ACTIVE')
      vi.mocked(db.product.findMany).mockResolvedValue(activeProducts as any)
      vi.mocked(db.product.count).mockResolvedValue(2)

      const result = await caller.list({
        status: ProductStatus.ACTIVE,
        limit: 10,
        page: 1,
      })

      expect(result.items).toHaveLength(2)
      expect(paginatedResponse).toHaveBeenCalledWith(
        db.product,
        expect.objectContaining({
          status: 'ACTIVE',
        }),
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should filter by category', async () => {
      const caller = createCaller()

      const categoryProducts = [mockProducts[0]]
      vi.mocked(db.product.findMany).mockResolvedValue(categoryProducts as any)
      vi.mocked(db.product.count).mockResolvedValue(1)

      const result = await caller.list({
        categoryId: 'clh3sa9g10020qzrm5h4n8x20',
        limit: 10,
        page: 1,
      })

      expect(result.items).toHaveLength(1)
      expect(paginatedResponse).toHaveBeenCalledWith(
        db.product,
        expect.objectContaining({
          categoryId: 'clh3sa9g10020qzrm5h4n8x20',
        }),
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should search products', async () => {
      const caller = createCaller()

      const searchResults = [mockProducts[0]]
      vi.mocked(db.product.findMany).mockResolvedValue(searchResults as any)
      vi.mocked(db.product.count).mockResolvedValue(1)

      const result = await caller.list({
        search: 'burger',
        limit: 10,
        page: 1,
      })

      expect(result.items).toHaveLength(1)
      expect(paginatedResponse).toHaveBeenCalledWith(
        db.product,
        expect.objectContaining({
          OR: [
            { name: { contains: 'burger', mode: 'insensitive' } },
            { description: { contains: 'burger', mode: 'insensitive' } },
          ],
        }),
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should require merchant authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.list({})).rejects.toThrow()
    })
  })

  describe('get', () => {
    it('should return product details', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue({
        ...mockProducts[0],
        variants: [],
      } as any)

      const result = await caller.get({ id: 'clh3sa9g10000qzrm5h4n8xo1' })

      expect(result).toMatchObject({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        name: 'Signature Burger',
        category: expect.objectContaining({
          name: 'Burgers',
        }),
        _count: {
          orderItems: 150,
          reviews: 45,
        },
      })

      expect(db.product.findFirst).toHaveBeenCalledWith({
        where: { 
          id: 'clh3sa9g10000qzrm5h4n8xo1', 
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2' 
        },
        include: {
          category: true,
          variants: true,
          _count: { select: { orderItems: true, reviews: true } },
        },
      })
    })

    it('should throw if product not found', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue(null)

      await expect(
        caller.get({ id: 'clh3sa9g19999qzrm5h4n8x99' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should validate CUID format', async () => {
      const caller = createCaller()

      await expect(
        caller.get({ id: 'invalid-id' })
      ).rejects.toThrow()
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.get({ id: 'clh3sa9g10000qzrm5h4n8xo1' })
      ).rejects.toThrow()
    })
  })

  describe('create', () => {
    it('should create a product', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue(null) // For slug uniqueness check

      vi.mocked(db.product.create).mockResolvedValue({
        ...mockProducts[0],
        id: 'clh3sa9g10003qzrm5h4n8xo4',
        name: 'New Product',
        slug: 'new-product',
      } as any)

      const result = await caller.create({
        name: 'New Product',
        description: 'A brand new product',
        categoryId: 'clh3sa9g10020qzrm5h4n8x20',
        price: 20.00,
        compareAtPrice: 25.00,
        sku: 'NEW001',
        trackInventory: true,
        inventory: 100,
        images: ['https://example.com/new.jpg'],
        status: ProductStatus.ACTIVE,
        featured: true,
      })

      expect(result).toMatchObject({
        name: 'New Product',
        slug: 'new-product',
      })

      expect(db.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Product',
          price: 20.00,
          compareAtPrice: 25.00,
          trackInventory: true,
          inventory: 100,
          status: 'ACTIVE',
          featured: true,
          merchant: { connect: { id: 'clh3sa9g10001qzrm5h4n8xo2' } },
          category: { connect: { id: 'clh3sa9g10020qzrm5h4n8x20' } },
        }),
      })
    })

    it('should handle legacy field names', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue(null)
      vi.mocked(db.product.create).mockResolvedValue(mockProducts[0] as any)

      await caller.create({
        name: 'Legacy Product',
        price: 15.00,
        comparePrice: 20.00,  // Legacy field
        trackQuantity: true,   // Legacy field
        quantity: 50,          // Legacy field
      })

      expect(db.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          compareAtPrice: 20.00, // Mapped from comparePrice
          trackInventory: true,   // Mapped from trackQuantity
          inventory: 50,          // Mapped from quantity
        }),
      })
    })

    it('should generate unique slug', async () => {
      const caller = createCaller()

      // First call finds existing slug
      vi.mocked(db.product.findFirst)
        .mockResolvedValueOnce({ id: 'existing' } as any) // slug exists
        .mockResolvedValueOnce(null) // slug-2 is available

      vi.mocked(db.product.create).mockResolvedValue({
        ...mockProducts[0],
        slug: 'new-product-2',
      } as any)

      const result = await caller.create({
        name: 'New Product',
        price: 10.00,
      })

      expect(result.slug).toBe('new-product-2')
    })

    it('should handle special characters in slug', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue(null)
      vi.mocked(db.product.create).mockResolvedValue({
        ...mockProducts[0],
        name: 'Café Latte & Croissant',
        slug: 'cafe-latte-croissant',
      } as any)

      const result = await caller.create({
        name: 'Café Latte & Croissant',
        price: 12.00,
      })

      expect(result.slug).toBe('cafe-latte-croissant')
    })

    it('should use default values', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue(null)
      vi.mocked(db.product.create).mockResolvedValue(mockProducts[0] as any)

      await caller.create({
        name: 'Basic Product',
        price: 10.00,
      })

      expect(db.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
          compareAtPrice: null,
          sku: null,
          trackInventory: false,
          inventory: 0,
          images: [],
          status: 'DRAFT',
          featured: false,
        }),
      })
    })

    it('should validate required fields', async () => {
      const caller = createCaller()

      await expect(
        caller.create({
          name: '', // Empty name
          price: 10.00,
        })
      ).rejects.toThrow()

      await expect(
        caller.create({
          name: 'Product',
          price: -10.00, // Negative price
        })
      ).rejects.toThrow()
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.create({
          name: 'Product',
          price: 10.00,
        })
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should update a product', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        name: 'Old Name',
        slug: 'old-name',
      } as any)

      vi.mocked(db.product.update).mockResolvedValue({
        ...mockProducts[0],
        name: 'Updated Burger',
        price: mockDecimal(18.00),
      } as any)

      const result = await caller.update({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        data: {
          name: 'Updated Burger',
          price: 18.00,
          featured: false,
        },
      })

      expect(result).toMatchObject({
        name: 'Updated Burger',
      })

      expect(db.product.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10000qzrm5h4n8xo1' },
        data: expect.objectContaining({
          name: 'Updated Burger',
          price: 18.00,
          featured: false,
        }),
      })
    })

    it('should regenerate slug when name changes', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst)
        .mockResolvedValueOnce({ // Existing product
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          name: 'Old Name',
          slug: 'old-name',
        } as any)
        .mockResolvedValueOnce(null) // New slug is available

      vi.mocked(db.product.update).mockResolvedValue({
        ...mockProducts[0],
        name: 'New Name',
        slug: 'new-name',
      } as any)

      const result = await caller.update({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        data: {
          name: 'New Name',
        },
      })

      expect(result.slug).toBe('new-name')
    })

    it('should handle category disconnect', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
      } as any)

      vi.mocked(db.product.update).mockResolvedValue({
        ...mockProducts[0],
        categoryId: null,
        category: null,
      } as any)

      await caller.update({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        data: {
          categoryId: null, // Disconnect category
        },
      })

      expect(db.product.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10000qzrm5h4n8xo1' },
        data: expect.objectContaining({
          category: { disconnect: true },
        }),
      })
    })

    it('should handle category connect', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
      } as any)

      vi.mocked(db.product.update).mockResolvedValue(mockProducts[0] as any)

      await caller.update({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        data: {
          categoryId: 'clh3sa9g10021qzrm5h4n8x21',
        },
      })

      expect(db.product.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10000qzrm5h4n8xo1' },
        data: expect.objectContaining({
          category: { connect: { id: 'clh3sa9g10021qzrm5h4n8x21' } },
        }),
      })
    })

    it('should handle legacy field names', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
      } as any)

      vi.mocked(db.product.update).mockResolvedValue(mockProducts[0] as any)

      await caller.update({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        data: {
          comparePrice: 22.00,  // Legacy field
          trackQuantity: true,  // Legacy field
          quantity: 75,         // Legacy field
        },
      })

      expect(db.product.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10000qzrm5h4n8xo1' },
        data: expect.objectContaining({
          compareAtPrice: 22.00, // Mapped from comparePrice
          trackInventory: true,  // Mapped from trackQuantity
          inventory: 75,         // Mapped from quantity
        }),
      })
    })

    it('should throw if product not found', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue(null)

      await expect(
        caller.update({
          id: 'clh3sa9g19999qzrm5h4n8x99',
          data: { name: 'Updated' },
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should validate CUID format', async () => {
      const caller = createCaller()

      await expect(
        caller.update({
          id: 'invalid-id',
          data: { name: 'Updated' },
        })
      ).rejects.toThrow()
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.update({
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          data: { name: 'Updated' },
        })
      ).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('should soft delete a product', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
      } as any)

      vi.mocked(db.product.update).mockResolvedValue({
        ...mockProducts[0],
        status: 'DISCONTINUED',
      } as any)

      const mockSoftDelete = vi.fn().mockResolvedValue({})
      vi.mocked(db as any).Product = { softDelete: mockSoftDelete }

      const result = await caller.delete({ id: 'clh3sa9g10000qzrm5h4n8xo1' })

      expect(result).toEqual({ success: true })

      expect(db.product.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10000qzrm5h4n8xo1' },
        data: { status: 'DISCONTINUED' },
      })

      expect(mockSoftDelete).toHaveBeenCalledWith({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
      })
    })

    it('should throw if product not found', async () => {
      const caller = createCaller()

      vi.mocked(db.product.findFirst).mockResolvedValue(null)

      await expect(
        caller.delete({ id: 'clh3sa9g19999qzrm5h4n8x99' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should validate CUID format', async () => {
      const caller = createCaller()

      await expect(
        caller.delete({ id: 'invalid-id' })
      ).rejects.toThrow()
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.delete({ id: 'clh3sa9g10000qzrm5h4n8xo1' })
      ).rejects.toThrow()
    })
  })

  describe('bulkUpdate', () => {
    it('should bulk activate products', async () => {
      const caller = createCaller()

      vi.mocked(db.product.updateMany).mockResolvedValue({ count: 2 } as any)

      const result = await caller.bulkUpdate({
        ids: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10002qzrm5h4n8xo3'],
        action: 'activate',
      })

      expect(result).toEqual({ success: true, count: 2 })

      expect(db.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10002qzrm5h4n8xo3'] },
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
        },
        data: { status: 'ACTIVE' },
      })
    })

    it('should bulk deactivate products', async () => {
      const caller = createCaller()

      vi.mocked(db.product.updateMany).mockResolvedValue({ count: 2 } as any)

      const result = await caller.bulkUpdate({
        ids: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10002qzrm5h4n8xo3'],
        action: 'deactivate',
      })

      expect(result).toEqual({ success: true, count: 2 })

      expect(db.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10002qzrm5h4n8xo3'] },
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
        },
        data: { status: 'DRAFT' },
      })
    })

    it('should bulk delete products', async () => {
      const caller = createCaller()

      vi.mocked(db.product.update).mockResolvedValue({} as any)
      
      const mockSoftDelete = vi.fn().mockResolvedValue({})
      vi.mocked(db as any).Product = { softDelete: mockSoftDelete }

      const result = await caller.bulkUpdate({
        ids: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10002qzrm5h4n8xo3'],
        action: 'delete',
      })

      expect(result).toEqual({ success: true, count: 2 })

      // Should update status to DISCONTINUED for each product
      expect(db.product.update).toHaveBeenCalledTimes(2)
      
      // Should soft delete each product
      expect(mockSoftDelete).toHaveBeenCalledTimes(2)
    })

    it('should validate at least one ID', async () => {
      const caller = createCaller()

      await expect(
        caller.bulkUpdate({
          ids: [],
          action: 'activate',
        })
      ).rejects.toThrow()
    })

    it('should validate action type', async () => {
      const caller = createCaller()

      await expect(
        caller.bulkUpdate({
          ids: ['clh3sa9g10000qzrm5h4n8xo1'],
          action: 'invalid' as any,
        })
      ).rejects.toThrow()
    })

    it('should validate CUID format for all IDs', async () => {
      const caller = createCaller()

      await expect(
        caller.bulkUpdate({
          ids: ['clh3sa9g10000qzrm5h4n8xo1', 'invalid-id'],
          action: 'activate',
        })
      ).rejects.toThrow()
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.bulkUpdate({
          ids: ['clh3sa9g10000qzrm5h4n8xo1'],
          action: 'activate',
        })
      ).rejects.toThrow()
    })

    it('should only update products owned by merchant', async () => {
      const caller = createCaller()

      vi.mocked(db.product.updateMany).mockResolvedValue({ count: 1 } as any)

      const result = await caller.bulkUpdate({
        ids: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10999qzrm5h4n8x99'],
        action: 'activate',
      })

      // Even if 2 IDs provided, only 1 was updated (owned by merchant)
      expect(result.count).toBe(2)

      expect(db.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: expect.any(Array) },
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2', // Ensures ownership
        },
        data: expect.any(Object),
      })
    })
  })
})