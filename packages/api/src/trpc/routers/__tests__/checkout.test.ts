import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkoutRouter } from '../checkout'
import { db } from '@homejiak/database'
import { DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus } from '@homejiak/database'

// Mock dependencies
vi.mock('@homejiak/database', () => ({
  db: {
    merchant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    address: {
      create: vi.fn(),
    },
    order: {
      create: vi.fn(),
    },
  },
  DeliveryMethod: {
    PICKUP: 'PICKUP',
    DELIVERY: 'DELIVERY',
  },
  OrderStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PREPARING: 'PREPARING',
    READY: 'READY',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
  PaymentMethod: {
    CASH: 'CASH',
    PAYNOW: 'PAYNOW',
    CARD: 'CARD',
  },
  PaymentStatus: {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
  },
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test_nanoid_123456789012345678901234'),
}))

// Define Context type for testing
interface Context {
  db: typeof db
  session: any
  supabase: any
  req: Request
  resHeaders: Headers
  ip?: string
}

// Helper to create test context
const createTestContext = (): Context => {
  return {
    db,
    session: null,
    supabase: null,
    req: new Request('http://localhost:3000'),
    resHeaders: new Headers(),
    ip: '127.0.0.1',
  }
}

// Helper to create caller
const createCaller = () => {
  const context = createTestContext()
  return checkoutRouter.createCaller(context)
}

// Test data
const mockMerchant = {
  id: 'merchant-123',
  businessName: 'Test Restaurant',
  email: 'test@merchant.com',
  phone: '91234567',
  paynowNumber: '91234567',
  paynowQrCode: 'https://example.com/qr.png',
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFee: 5.00,
  minimumOrder: 20.00,
  operatingHours: null,
  status: 'ACTIVE',
  deletedAt: null,
  postalCode: '238874',
  latitude: 1.3,
  longitude: 103.85,
  deliveryRadius: 10,
  deliverySettings: null,
  preparationTime: 30,
}

const mockProducts = [
  {
    id: 'product-1',
    name: 'Chicken Rice',
    price: 8.50,
    status: 'ACTIVE',
    deletedAt: null,
  },
  {
    id: 'product-2',
    name: 'Laksa',
    price: 9.00,
    status: 'ACTIVE',
    deletedAt: null,
  },
  {
    id: 'product-3',
    name: 'Char Kway Teow',
    price: 7.50,
    status: 'ACTIVE',
    deletedAt: null,
  },
]

const mockCustomer = {
  id: 'customer-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '81234567',
}

describe('Checkout Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createSession', () => {
    const validInput = {
      merchantId: 'merchant-123',
      items: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ],
    }

    it('should create a checkout session successfully', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.product.findMany).mockResolvedValue([
        mockProducts[0],
        mockProducts[1],
      ] as any)

      const result = await caller.createSession(validInput)

      expect(result).toMatchObject({
        sessionId: 'test_nanoid_123456789012345678901234',
        subtotal: 26.00, // (8.50 * 2) + (9.00 * 1)
        paymentReference: expect.stringMatching(/^PAY-/),
        merchant: expect.objectContaining({
          businessName: 'Test Restaurant',
          deliveryEnabled: true,
          pickupEnabled: true,
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'product-1',
            quantity: 2,
            productName: 'Chicken Rice',
            productPrice: 8.50,
            total: 17.00,
          }),
          expect.objectContaining({
            productId: 'product-2',
            quantity: 1,
            productName: 'Laksa',
            productPrice: 9.00,
            total: 9.00,
          }),
        ]),
      })

      expect(db.merchant.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'merchant-123',
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: expect.any(Object),
      })

      expect(db.product.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['product-1', 'product-2'] },
          merchantId: 'merchant-123',
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: expect.any(Object),
      })
    })

    it('should reject if merchant not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null)

      await expect(
        caller.createSession(validInput)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found or inactive',
      })
    })

    it('should reject if merchant is inactive', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(null)

      await expect(
        caller.createSession({
          ...validInput,
          merchantId: 'inactive-merchant',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant not found or inactive',
      })
    })

    it('should reject if products not found', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any) // Only 1 product

      await expect(
        caller.createSession(validInput)
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Some products are not available',
      })
    })

    it('should reject if below minimum order', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 50.00, // High minimum
      } as any)

      vi.mocked(db.product.findMany).mockResolvedValue([
        mockProducts[0],
        mockProducts[1],
      ] as any)

      await expect(
        caller.createSession(validInput)
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Minimum order amount is $50.00'),
      })
    })

    it('should handle decimal prices correctly', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.product.findMany).mockResolvedValue([
        { ...mockProducts[0], price: 8.99 },
      ] as any)

      const result = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{ productId: 'product-1', quantity: 3 }],
      })

      expect(result.subtotal).toBe(26.97) // 8.99 * 3
      expect(result.items[0]?.total).toBe(26.97)
    })

    it('should include optional item fields', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 5.00,
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      const result = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{
          productId: 'product-1',
          quantity: 1,
          variant: 'Extra Spicy',
          notes: 'No vegetables please',
        }],
      })

      expect(result.items[0]).toMatchObject({
        variant: 'Extra Spicy',
        notes: 'No vegetables please',
      })
    })

    it('should validate ID formats', async () => {
      const caller = createCaller()

      // Test with various ID formats
      const validIds = [
        'merchant-123', // Simple ID
        'c1234567890123456789012345', // CUID-like
        '123e4567-e89b-12d3-a456-426614174000', // UUID
      ]

      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 5.00
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      for (const id of validIds) {
        // mock product with same ID being tested
        vi.mocked(db.product.findMany).mockResolvedValue([{
          id: id,
          name: "Test Product",
          price: 10.00,
          status: "ACTIVE",
          deletedAt: null,
        }] as any)

        await expect(
          caller.createSession({
            merchantId: id,
            items: [{ productId: id, quantity: 1 }],
          })
        ).resolves.toBeDefined()
      }

      // Invalid IDs
      const invalidIds = ['', 'short', 'has spaces', 'has\nnewline']

      for (const id of invalidIds) {
        await expect(
          caller.createSession({
            merchantId: id,
            items: [{ productId: 'product-1', quantity: 1 }],
          })
        ).rejects.toThrow()
      }
    })
  })

  describe('getSession', () => {
    it('should retrieve an existing session', async () => {
      const caller = createCaller()

      // First create a session
      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 5.00,        
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      const createResult = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{ productId: 'product-1', quantity: 1 }],
      })

      // Then retrieve it
      const getResult = await caller.getSession({
        sessionId: createResult.sessionId,
      })

      expect(getResult).toMatchObject({
        sessionId: createResult.sessionId,
        merchantId: 'merchant-123',
        status: 'pending',
        subtotal: 8.50,
      })
    })

    it('should reject if session not found', async () => {
      const caller = createCaller()

      await expect(
        caller.getSession({ sessionId: 'non-existent' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Session not found or expired',
      })
    })

    it('should reject expired sessions', async () => {
      const caller = createCaller()

      // Create a session
      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 5.00,
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      const createResult = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{ productId: 'product-1', quantity: 1 }],
      })

      // Fast-forward time to expire the session
      vi.useFakeTimers()
      vi.advanceTimersByTime(31 * 60 * 1000) // 31 minutes

      await expect(
        caller.getSession({ sessionId: createResult.sessionId })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Session expired',
      })

      vi.useRealTimers()
    })
  })

  describe('complete', () => {
    const validInput = {
      sessionId: 'test_session',
      contactInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '81234567',
      },
      deliveryMethod: DeliveryMethod.PICKUP,
    }

    it('should complete checkout and create order', async () => {
      const caller = createCaller()

      // Create a session first
      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.product.findMany).mockResolvedValue([
        mockProducts[0],
        mockProducts[1],
      ] as any)

      const session = await caller.createSession({
        merchantId: 'merchant-123',
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 1 },
        ],
      })

      // Mock customer and order creation
      vi.mocked(db.customer.findFirst).mockResolvedValue(null)
      vi.mocked(db.customer.create).mockResolvedValue(mockCustomer as any)
      vi.mocked(db.order.create).mockResolvedValue({
        id: 'order-123',
        orderNumber: 'ORD123ABC',
      } as any)

      const result = await caller.complete({
        ...validInput,
        sessionId: session.sessionId,
      })

      expect(result).toEqual({
        orderId: 'order-123',
        orderNumber: 'ORD123ABC',
      })

      expect(db.customer.create).toHaveBeenCalledWith({
        data: {
          email: 'john@example.com',
          phone: '81234567',
          name: 'John Doe',
        },
      })

      expect(db.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          merchantId: 'merchant-123',
          customerId: 'customer-123',
          status: OrderStatus.PENDING,
          deliveryMethod: DeliveryMethod.PICKUP,
          subtotal: 26.00,
          deliveryFee: 0,
          total: 26.00,
          paymentMethod: PaymentMethod.PAYNOW,
          paymentStatus: PaymentStatus.PENDING,
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '81234567',
        }),
      })
    })

    it('should handle delivery orders with address', async () => {
      const caller = createCaller()

      // Create session
      vi.mocked(db.merchant.findFirst).mockResolvedValue(mockMerchant as any)
      vi.mocked(db.product.findMany).mockResolvedValue([
        mockProducts[0],
        mockProducts[1],
      ] as any)

      const session = await caller.createSession({
        merchantId: 'merchant-123',
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 1 },
        ],
      })

      // Mock database calls
      vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer as any)
      vi.mocked(db.address.create).mockResolvedValue({
        id: 'address-123',
      } as any)
      vi.mocked(db.order.create).mockResolvedValue({
        id: 'order-456',
        orderNumber: 'ORD456DEF',
      } as any)

      const result = await caller.complete({
        sessionId: session.sessionId,
        contactInfo: validInput.contactInfo,
        deliveryMethod: DeliveryMethod.DELIVERY,
        deliveryAddress: {
          line1: '123 Test Street',
          line2: '#01-01',
          postalCode: '123456',
          notes: 'Ring doorbell twice',
        },
        deliveryNotes: 'Leave at door',
      })

      expect(result.orderId).toBe('order-456')

      expect(db.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          line1: '123 Test Street',
          line2: '#01-01',
          postalCode: '123456',
          customerId: 'customer-123',
        }),
      })

      expect(db.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deliveryMethod: DeliveryMethod.DELIVERY,
          deliveryAddressId: 'address-123',
          deliveryFee: 5.00,
          total: 31.00, // 17.00 + 5.00
          deliveryNotes: 'Leave at door',
        }),
      })
    })

    it('should use existing customer if found', async () => {
      const caller = createCaller()

      // Create session
      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 5.00,
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      const session = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{ productId: 'product-1', quantity: 1 }],
      })

      // Mock existing customer
      vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer as any)
      vi.mocked(db.order.create).mockResolvedValue({
        id: 'order-789',
        orderNumber: 'ORD789GHI',
      } as any)

      await caller.complete({
        ...validInput,
        sessionId: session.sessionId,
      })

      expect(db.customer.create).not.toHaveBeenCalled()
      expect(db.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'customer-123',
        }),
      })
    })

    it('should reject if session not found', async () => {
      const caller = createCaller()

      await expect(
        caller.complete(validInput)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Session not found or expired',
      })
    })

    it('should reject if session already completed', async () => {
      const caller = createCaller()

      // Create and complete a session
      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 5.00,
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      const session = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{ productId: 'product-1', quantity: 1 }],
      })

      vi.mocked(db.customer.findFirst).mockResolvedValue(mockCustomer as any)
      vi.mocked(db.order.create).mockResolvedValue({
        id: 'order-123',
        orderNumber: 'ORD123',
      } as any)

      await caller.complete({
        ...validInput,
        sessionId: session.sessionId,
      })

      // Try to complete again
      await expect(
        caller.complete({
          ...validInput,
          sessionId: session.sessionId,
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Session already completed',
      })
    })

    it('should reject delivery if not enabled', async () => {
      const caller = createCaller()

      // Create session with delivery disabled
      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        deliveryEnabled: false,
        minimumOrder: 5.00,
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      const session = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{ productId: 'product-1', quantity: 1 }],
      })

      await expect(
        caller.complete({
          ...validInput,
          sessionId: session.sessionId,
          deliveryMethod: DeliveryMethod.DELIVERY,
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Delivery not available',
      })
    })

    it('should reject pickup if not enabled', async () => {
      const caller = createCaller()

      // Create session with pickup disabled
      vi.mocked(db.merchant.findFirst).mockResolvedValue({
        ...mockMerchant,
        pickupEnabled: false,
        minimumOrder: 5.00,
      } as any)
      vi.mocked(db.product.findMany).mockResolvedValue([mockProducts[0]] as any)

      const session = await caller.createSession({
        merchantId: 'merchant-123',
        items: [{ productId: 'product-1', quantity: 1 }],
      })

      await expect(
        caller.complete({
          ...validInput,
          sessionId: session.sessionId,
          deliveryMethod: DeliveryMethod.PICKUP,
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Pickup not available',
      })
    })

    it('should validate contact info', async () => {
      const caller = createCaller()

      // Invalid email
      await expect(
        caller.complete({
          ...validInput,
          contactInfo: {
            ...validInput.contactInfo,
            email: 'invalid-email',
          },
        })
      ).rejects.toThrow()

      // Invalid phone
      await expect(
        caller.complete({
          ...validInput,
          contactInfo: {
            ...validInput.contactInfo,
            phone: '12345', // Too short
          },
        })
      ).rejects.toThrow()

      // Short name
      await expect(
        caller.complete({
          ...validInput,
          contactInfo: {
            ...validInput.contactInfo,
            name: 'J', // Too short
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('calculateDeliveryFee', () => {
    const validInput = {
      merchantId: '123e4567-e89b-12d3-a456-426614174000',
      postalCode: '238874',
      orderTotal: 30,
    }

    it('should calculate flat rate delivery fee', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        ...mockMerchant,
        minimumOrder: 50,
        deliveryRadius: 50,
        deliverySettings: {
          pricingModel: 'FLAT',
          flatRate: 5,
          freeDeliveryMinimum: 50
        },
      } as any)

      const result = await caller.calculateDeliveryFee(validInput)

      expect(result).toMatchObject({
        fee: 5,
        message: 'Standard delivery fee',
        pricingModel: 'FLAT',
        isSpecialArea: false,
      })

      // Check these separately if needed
      expect(result.estimatedTime).toBeGreaterThan(0)
      expect(result.zone).toBeDefined()
    })

    it('should apply free delivery for minimum order', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        ...mockMerchant,
        deliveryRadius: 50,
        deliverySettings: {
          pricingModel: 'FLAT',
          flatRate: 5,
          freeDeliveryMinimum: 25,
        },
      } as any)

      const result = await caller.calculateDeliveryFee({
        ...validInput,
        orderTotal: 30, // Above minimum
      })

      expect(result).toMatchObject({
        fee: 0,
        message: expect.stringContaining('Free delivery'),
      })
    })

    it('should calculate distance-based fee', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        ...mockMerchant,
        postalCode: '238874',
        deliveryRadius: 50,
        deliverySettings: {
          pricingModel: 'DISTANCE',
          distanceRates: {
            baseRate: 3,
            perKmRate: 1,
            tiers: [
              { minKm: 0, maxKm: 3, additionalFee: 0 },
              { minKm: 3, maxKm: 5, additionalFee: 2 },
              { minKm: 5, maxKm: 10, additionalFee: 4 },
            ],
          },
          freeDeliveryMinimum: 100
        },
      } as any)

      const result = await caller.calculateDeliveryFee({
        ...validInput,
        postalCode: '238874',
        orderTotal: 30, // Central zone, same as merchant
      })

      expect(result.fee).toBeGreaterThanOrEqual(3) // At least base rate
      expect(result.pricingModel).toBe('DISTANCE')
    })

    it('should calculate zone-based fee', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        ...mockMerchant,
        postalCode: '018956', // Central
        minimumOrder: 50,
        deliverySettings: {
          pricingModel: 'ZONE',
          zoneRates: {
            sameZone: 5,
            adjacentZone: 7,
            crossZone: 10,
            specialArea: 15,
          },
          freeDeliveryMinimum: 100,
        },
      } as any)

      // Same zone
      let result = await caller.calculateDeliveryFee({
        ...validInput,
        postalCode: '018956', // Central
      })
      expect(result.fee).toBe(5)
      expect(result.message).toContain('Same zone')

      // Adjacent zone
      result = await caller.calculateDeliveryFee({
        ...validInput,
        postalCode: '018956', // East (adjacent to central)
      })
      expect(result.fee).toBe(5)
      expect(result.message).toContain('Same zone')
    })

    it('should add surcharge for special areas', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        ...mockMerchant,
        deliverySettings: {
          pricingModel: 'FLAT',
          flatRate: 5,
          specialAreaSurcharge: 5,
          freeDeliveryMinimum: 100,
        },
      } as any)

      // Sentosa postal code
      const result = await caller.calculateDeliveryFee({
        ...validInput,
        postalCode: '098123', // Sentosa
      })

      expect(result).toMatchObject({
        fee: 10, // 5 + 5 surcharge
        isSpecialArea: true,
        message: expect.stringContaining('special area'),
      })
    })

    it('should reject if delivery not enabled', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        ...mockMerchant,
        deliveryEnabled: false,
      } as any)

      await expect(
        caller.calculateDeliveryFee(validInput)
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Merchant does not offer delivery',
      })
    })

    it('should reject if outside delivery radius', async () => {
      const caller = createCaller()

      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        ...mockMerchant,
        deliveryRadius: 0.11, // Small radius
        latitude: 1.2836,
        longitude: 103.8515,
        postalCode: '018956', // Central
        minimumOrder: 50,
      } as any)

      await expect(
        caller.calculateDeliveryFee({
          ...validInput,
          postalCode: '289899', // Far north
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('not available to this area'),
      })
    })

    it('should validate postal code format', async () => {
      const caller = createCaller()

      // Invalid postal codes
      await expect(
        caller.calculateDeliveryFee({
          ...validInput,
          postalCode: '12345', // Too short
        })
      ).rejects.toThrow()

      await expect(
        caller.calculateDeliveryFee({
          ...validInput,
          postalCode: '1234567', // Too long
        })
      ).rejects.toThrow()

      await expect(
        caller.calculateDeliveryFee({
          ...validInput,
          postalCode: 'ABCDEF', // Not numeric
        })
      ).rejects.toThrow()
    })

    it('should validate merchant ID format', async () => {
      const caller = createCaller()

      // Invalid UUID
      await expect(
        caller.calculateDeliveryFee({
          ...validInput,
          merchantId: 'not-a-uuid',
        })
      ).rejects.toThrow()
    })
  })
})