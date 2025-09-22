import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { orderRouter } from '../order'
import { db } from '@homejiak/database'
import { OrderStatus, NotificationPriority } from '@homejiak/database'
import type { AuthSession } from '@homejiak/auth'

// Mock dependencies
vi.mock('@homejiak/database', () => ({
  db: {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    orderEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(db)),
    $queryRaw: vi.fn(),
  },
  OrderStatus: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PREPARING: 'PREPARING',
    READY: 'READY',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
  },
  NotificationPriority: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
  orderIncludes: {
    withPayment: {
      items: true,
      payment: true,
    },
  },
  Prisma: {},
}))

vi.mock('../../../services/notification', () => ({
  NotificationService: {
    createNotification: vi.fn(),
  },
}))

vi.mock('../../../utils/pagination', () => ({
  paginatedResponse: vi.fn(async (model, where, options, include) => {
    const items = await model.findMany({
      where,
      include,
      skip: options.offset,
      take: options.limit,
      orderBy: { [options.sortBy]: options.sortOrder },
    })
    const total = await model.count({ where })
    return {
      items,
      total,
      hasMore: options.offset + options.limit < total,
    }
  }),
}))

vi.mock('../../../lib/helpers/order', () => ({
  canUpdateOrderStatus: vi.fn((from, to) => {
    // Simple validation for testing
    const transitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PREPARING', 'READY', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['COMPLETED', 'REFUNDED'],
      CANCELLED: ['REFUNDED'],
      REFUNDED: [],
      COMPLETED: ['REFUNDED'],
    }
    const allowed = transitions[from] || []
    return allowed.includes(to)
  }),
}))

vi.mock('json2csv', () => {
  class MockParser {
    fields: string[]
    
    constructor(options: { fields?: string[] }) {
      this.fields = options.fields || []
    }
    
    parse(data: any[]): string {
      const fields = this.fields.length > 0 ? this.fields : Object.keys(data[0] || {})
      const header = fields.join(',')
      const rows = data.map((row: any) => 
        fields.map((field: string) => row[field] || '').join(',')
      )
      return [header, ...rows].join('\n')
    }
  }
  
  return {
    Parser: MockParser,
  }
})

// Import after mocking
import { NotificationService } from '../../../services/notification'
import { canUpdateOrderStatus } from '../../../lib/helpers/order'
import { paginatedResponse } from '../../../utils/pagination'

// Define Context type
interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: any
  req: Request
  resHeaders: Headers
}

// Mock session - Only merchant session needed now
const mockMerchantSession: AuthSession = {
  user: {
    id: 'clh3sa9g10001qzrm5h4n8xo2',
    email: 'merchant@test.com',
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
  return orderRouter.createCaller(context)
}

// Test data
const mockOrders = [
  {
    id: 'clh3sa9g10000qzrm5h4n8xo1',
    orderNumber: 'ORD001',
    merchantId: 'clh3sa9g10001qzrm5h4n8xo2',  // Match merchant session
    customerId: 'clh3sa9g10002qzrm5h4n8xo3', 
    status: 'PENDING',
    customerName: 'John Doe',
    customerPhone: '98765432',
    customerEmail: 'john@example.com',
    deliveryMethod: 'DELIVERY',
    deliveryNotes: 'Ring the doorbell',
    subtotal: 45.00,
    deliveryFee: 5.00,
    total: 50.00,
    paymentMethod: 'CARD',
    paymentStatus: 'PAID',
    estimatedDeliveryTime: new Date('2024-08-15T14:00:00Z'),
    createdAt: new Date('2024-08-15T10:00:00Z'),
    updatedAt: new Date('2024-08-15T10:00:00Z'),
    merchant: {
      id: 'clh3sa9g10001qzrm5h4n8xo2',
      businessName: 'Test Restaurant',
      emailNotifications: true,
      whatsappNotifications: false,
    },
    customer: {
      id: 'clh3sa9g10002qzrm5h4n8xo3',
      name: 'John Doe',
      email: 'john@example.com',
      emailNotifications: true,
      whatsappNotifications: true,
    },
    items: [
      {
        id: 'clh3sa9g10005qzrm5h4n8xo6',
        orderId: 'clh3sa9g10000qzrm5h4n8xo1',
        productId: 'clh3sa9g10007qzrm5h4n8xo8',
        productName: 'Burger',
        price: 15.00,
        quantity: 2,
        subtotal: 30.00,
        specialRequest: 'No onions',
        product: { id: 'product-1', name: 'Burger' },
      },
      {
        id: 'clh3sa9g10006qzrm5h4n8xo7',
        orderId: 'clh3sa9g10000qzrm5h4n8xo1',
        productId: 'clh3sa9g10008qzrm5h4n8xo9',
        productName: 'Fries',
        price: 5.00,
        quantity: 3,
        subtotal: 15.00,
        product: { id: 'product-2', name: 'Fries' },
      },
    ],
    deliveryAddress: {
      id: 'clh3sa9g10009qzrm5h4n8x10',
      line1: '123 Test Street',
      line2: '#10-01',
      postalCode: '123456',
      city: 'Singapore',
      country: 'Singapore',
    },
    payment: {
      id: 'clh3sa9g10010qzrm5h4n8x11',
      amount: 50.00,
      status: 'SUCCESS',
      method: 'CARD',
    },
    events: [
      {
        id: 'clh3sa9g10011qzrm5h4n8x12',
        orderId: 'clh3sa9g10000qzrm5h4n8xo1',
        event: 'ORDER_CREATED',
        data: {},
        createdAt: new Date('2024-08-15T10:00:00Z'),
      },
    ],
  },
  {
    id: 'clh3sa9g10003qzrm5h4n8xo4',
    orderNumber: 'ORD002',
    merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
    customerId: 'clh3sa9g10004qzrm5h4n8xo5', 
    status: 'CONFIRMED',
    customerName: 'Jane Smith',
    customerPhone: '91234567',
    customerEmail: 'jane@example.com',
    deliveryMethod: 'PICKUP',
    subtotal: 25.00,
    deliveryFee: 0,
    total: 25.00,
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    createdAt: new Date('2024-08-14T10:00:00Z'),
    updatedAt: new Date('2024-08-14T11:00:00Z'),
    items: [],
  },
]

describe('Order Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('list', () => {
    it('should list merchant orders', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue(mockOrders as any)
      vi.mocked(db.order.count).mockResolvedValue(2)

      const result = await caller.list({
        limit: 10,
        page: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })

      expect(result).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            orderNumber: 'ORD001',
            status: 'PENDING',
          }),
        ]),
        total: 2,
      })
    })

    it('should filter by status', async () => {
      const caller = createCaller()

      const pendingOrders = mockOrders.filter(o => o.status === 'PENDING')
      vi.mocked(db.order.findMany).mockResolvedValue(pendingOrders as any)
      vi.mocked(db.order.count).mockResolvedValue(1)

      const result = await caller.list({
        status: OrderStatus.PENDING,
        limit: 10,
        page: 1,
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({
        status: 'PENDING',
      })
    })

    it('should search by order number', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([mockOrders[0]] as any)
      vi.mocked(db.order.count).mockResolvedValue(1)

      const result = await caller.list({
        search: 'ORD001',
        limit: 10,
        page: 1,
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0]?.orderNumber).toBe('ORD001')
    })

    it('should filter by date range', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue(mockOrders as any)
      vi.mocked(db.order.count).mockResolvedValue(2)

      const result = await caller.list({
        dateFrom: new Date('2024-08-14'),
        dateTo: new Date('2024-08-16'),
        limit: 10,
        page: 1,
      })

      // Add assertion to use the result
      expect(result).toBeDefined()
      expect(result.items).toBeDefined()

      expect(paginatedResponse).toHaveBeenCalledWith(
        db.order,
        expect.objectContaining({
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should handle pagination', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([mockOrders[1]] as any)
      vi.mocked(db.order.count).mockResolvedValue(2)

      const result = await caller.list({
        limit: 1,
        page: 1,
      })

      expect(result).toMatchObject({
        items: expect.arrayContaining([]),
        total: 2,
        hasMore: false,
      })
    })

    it('should require merchant authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.list({})).rejects.toThrow()
    })
  })

  describe('get', () => {
    it('should return order details', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue(mockOrders[0] as any)

      const result = await caller.get({ id: 'clh3sa9g10000qzrm5h4n8xo1' })

      expect(result).toMatchObject({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        orderNumber: 'ORD001',
        items: expect.arrayContaining([
          expect.objectContaining({
            productName: 'Burger',
            quantity: 2,
          }),
        ]),
      })

      expect(db.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10000qzrm5h4n8xo1', merchantId: 'clh3sa9g10001qzrm5h4n8xo2' },
        include: expect.objectContaining({
          merchant: true,
          customer: true,
          deliveryAddress: true,
          items: { include: { product: true } },
          payment: true,
          events: expect.any(Object),
        }),
      })
    })

    it('should throw if order not found', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue(null)

      await expect(caller.get({ id: 'clh3sa9g19999qzrm5h4n8x99' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should prevent access to other merchant orders', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue(null) // Simulating not found for wrong merchant

      await expect(caller.get({ id: 'clh3sa9g19999qzrm5h4n8x99' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.get({ id: 'order-1' })).rejects.toThrow()
    })
  })

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: 'PENDING',
      } as any)

      vi.mocked(db.order.update).mockResolvedValue({
        ...mockOrders[0],
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      } as any)

      const result = await caller.updateStatus({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: OrderStatus.CONFIRMED,
        notes: 'Order confirmed',
      })

      expect(result?.status).toBe('CONFIRMED')
      expect(db.order.update).toHaveBeenCalledWith({
        where: { id: 'clh3sa9g10000qzrm5h4n8xo1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          confirmedAt: expect.any(Date),
        }),
      })

      expect(db.orderEvent.create).toHaveBeenCalledWith({
        data: {
          orderId: 'clh3sa9g10000qzrm5h4n8xo1',
          event: 'STATUS_CHANGED_FROM_PENDING_TO_CONFIRMED',
          data: { from: 'PENDING', to: 'CONFIRMED', notes: 'Order confirmed' },
        },
      })
    })

    it('should trigger notifications on status change', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: 'PENDING',
      } as any)

      vi.mocked(db.order.findUnique).mockResolvedValue(mockOrders[0] as any)

      vi.mocked(db.order.update).mockResolvedValue({
        ...mockOrders[0],
        status: 'CONFIRMED',
      } as any)

      await caller.updateStatus({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: OrderStatus.CONFIRMED,
      })

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'clh3sa9g10002qzrm5h4n8xo3',
          type: 'ORDER_CONFIRMED',
          channels: expect.arrayContaining(['in_app', 'email', 'whatsapp']),
          priority: NotificationPriority.NORMAL,
        })
      )
    })

    it('should reject invalid status transitions', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: 'PENDING',
      } as any)

      await expect(
        caller.updateStatus({
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          status: OrderStatus.DELIVERED, // Invalid transition from PENDING
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Invalid status transition'),
      })
    })

    it('should handle same status update (no-op)', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: 'PENDING',
      } as any)

      vi.mocked(db.order.findUnique).mockResolvedValue(mockOrders[0] as any)

      const result = await caller.updateStatus({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: OrderStatus.PENDING,
      })

      expect(result).toBeDefined()
      expect(db.order.update).not.toHaveBeenCalled()
    })

    it('should throw if order not found', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue(null)

      await expect(
        caller.updateStatus({
          id: 'clh3sa9g19999qzrm5h4n8x99',
          status: OrderStatus.CONFIRMED,
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.updateStatus({
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          status: OrderStatus.CONFIRMED,
        })
      ).rejects.toThrow()
    })

    it('should set correct timestamps for each status', async () => {
      const caller = createCaller()
      
      const statusTests = [
        { from: 'PENDING', to: OrderStatus.CONFIRMED, field: 'confirmedAt' },
        { from: 'CONFIRMED', to: OrderStatus.PREPARING, field: 'preparedAt' },
        { from: 'PREPARING', to: OrderStatus.READY, field: 'readyAt' },
        { from: 'READY', to: OrderStatus.DELIVERED, field: 'deliveredAt' },
        { from: 'PENDING', to: OrderStatus.CANCELLED, field: 'cancelledAt' },
        { from: 'DELIVERED', to: OrderStatus.COMPLETED, field: 'completedAt' },
      ]

      for (const test of statusTests) {
        vi.mocked(db.order.findFirst).mockResolvedValue({
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          status: test.from,
        } as any)

        vi.mocked(db.order.update).mockResolvedValue({
          ...mockOrders[0],
          status: test.to,
          [test.field]: new Date(),
        } as any)

        await caller.updateStatus({
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          status: test.to,
        })

        expect(db.order.update).toHaveBeenCalledWith({
          where: { id: 'clh3sa9g10000qzrm5h4n8xo1' },
          data: expect.objectContaining({
            status: test.to,
            [test.field]: expect.any(Date),
          }),
        })

        vi.clearAllMocks()
      }
    })
  })

  // REMOVED: customerHistory tests - no longer applicable

  describe('bulkUpdateStatus', () => {
    it('should bulk update order statuses', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([
        { id: 'clh3sa9g10000qzrm5h4n8xo1', status: 'PENDING', deliveryMethod: 'DELIVERY' },
        { id: 'clh3sa9g10003qzrm5h4n8xo4', status: 'PENDING', deliveryMethod: 'DELIVERY' },
      ] as any)

      vi.mocked(canUpdateOrderStatus).mockReturnValue(true)

      vi.mocked(db.order.update).mockImplementation(({ where }: any) => 
        Promise.resolve({ id: where.id, status: 'CONFIRMED' }) as any
      )

      const result = await caller.bulkUpdateStatus({
        orderIds: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10003qzrm5h4n8xo4'],
        status: OrderStatus.CONFIRMED,
        notes: 'Bulk confirmation',
      })

      expect(result).toEqual({
        successCount: 2,
        totalCount: 2,
        failedCount: 0,
      })

      expect(db.order.update).toHaveBeenCalledTimes(2)
      expect(db.orderEvent.create).toHaveBeenCalledTimes(2)
    })

    it('should filter out invalid transitions', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([
        { id: 'clh3sa9g10000qzrm5h4n8xo1', status: 'PENDING', deliveryMethod: 'DELIVERY' },
        { id: 'clh3sa9g10003qzrm5h4n8xo4', status: 'COMPLETED', deliveryMethod: 'DELIVERY' },
      ] as any)

      vi.mocked(canUpdateOrderStatus)
        .mockReturnValueOnce(true)  // order-1 can transition
        .mockReturnValueOnce(false) // order-2 cannot transition

      const result = await caller.bulkUpdateStatus({
        orderIds: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10003qzrm5h4n8xo4'],
        status: OrderStatus.CONFIRMED,
      })

      expect(result).toEqual({
        successCount: 1,
        totalCount: 2,
        failedCount: 1,
      })

      expect(db.order.update).toHaveBeenCalledTimes(1)
    })

    it('should throw if no orders found', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([])

      await expect(
        caller.bulkUpdateStatus({
          orderIds: ['clh3sa9g19999qzrm5h4n8x99'],
          status: OrderStatus.CONFIRMED,
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'No valid orders found',
      })
    })

    it('should throw if no valid transitions', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([
        { id: 'clh3sa9g10000qzrm5h4n8xo1', status: 'COMPLETED', deliveryMethod: 'DELIVERY' },
      ] as any)

      vi.mocked(canUpdateOrderStatus).mockReturnValue(false)

      await expect(
        caller.bulkUpdateStatus({
          orderIds: ['clh3sa9g10000qzrm5h4n8xo1'],
          status: OrderStatus.PENDING, // Invalid transition
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'No orders can be transitioned to the selected status',
      })
    })

    it('should validate max order count', async () => {
      const caller = createCaller()

      const tooManyOrderIds = Array.from({ length: 101 }, (_, i) => `order-${i}`)

      await expect(
        caller.bulkUpdateStatus({
          orderIds: tooManyOrderIds,
          status: OrderStatus.CONFIRMED,
        })
      ).rejects.toThrow()
    })

    it('should require merchant authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.bulkUpdateStatus({
          orderIds: ['clh3sa9g10000qzrm5h4n8xo1'],
          status: OrderStatus.CONFIRMED,
        })
      ).rejects.toThrow()
    })
  })

  describe('export', () => {
    it('should export orders to CSV', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([mockOrders[0]] as any)

      const result = await caller.export({
        orderIds: ['clh3sa9g10000qzrm5h4n8xo1'],
      })

      expect(result).toMatchObject({
        csv: expect.stringContaining('Order Number'),
        count: 1,
      })

      expect(db.order.findMany).toHaveBeenCalledWith({
        where: {
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
          id: { in: ['clh3sa9g10000qzrm5h4n8xo1'] },
        },
        include: {
          items: true,
          customer: true,
          deliveryAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      })
    })

    it('should export with filters', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue(mockOrders as any)

      const result = await caller.export({
        filters: {
          status: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
          search: 'John',
          dateFrom: '2024-08-14',
          dateTo: '2024-08-16',
        },
      })

      expect(result.count).toBe(2)

      expect(db.order.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: ['PENDING', 'CONFIRMED'] },
          OR: expect.arrayContaining([
            { orderNumber: expect.any(Object) },
            { customerName: expect.any(Object) },
          ]),
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: 1000,
      })
    })

    it('should throw if no orders found', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([])

      await expect(
        caller.export({ orderIds: ['clh3sa9g19999qzrm5h4n8x99'] })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'No orders found to export',
      })
    })

    it('should format CSV data correctly', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([mockOrders[0]] as any)

      const result = await caller.export({ orderIds: ['clh3sa9g10000qzrm5h4n8xo1'] })

      // Just check the CSV result contains expected headers
      expect(result.csv).toContain('Order Number')
      expect(result.csv).toContain('Date')
      expect(result.csv).toContain('Time')
      expect(result.csv).toContain('Status')
      expect(result.csv).toContain('Customer Name')
      expect(result.csv).toContain('Total')
      expect(result.csv).toBeDefined()
    })

    it('should limit to 1000 orders', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue(mockOrders as any)

      await caller.export({})

      expect(db.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000,
        })
      )
    })

    it('should require merchant authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.export({})).rejects.toThrow()
    })
  })

  describe('getPrintData', () => {
    it('should return orders for printing', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([mockOrders[0]] as any)

      const result = await caller.getPrintData({
        orderIds: ['clh3sa9g10000qzrm5h4n8xo1'],
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        orderNumber: 'ORD001',
        merchant: expect.any(Object),
        customer: expect.any(Object),
        deliveryAddress: expect.any(Object),
        items: expect.arrayContaining([]),
      })

      expect(db.order.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['clh3sa9g10000qzrm5h4n8xo1'] },
          merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
        },
        include: {
          merchant: true,
          customer: true,
          deliveryAddress: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should validate max order count', async () => {
      const caller = createCaller()

      const tooManyOrderIds = Array.from({ length: 51 }, (_, i) => `order-${i}`)

      await expect(
        caller.getPrintData({
          orderIds: tooManyOrderIds,
        })
      ).rejects.toThrow()
    })

    it('should throw if no orders found', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([])

      await expect(
        caller.getPrintData({
          orderIds: ['clh3sa9g19999qzrm5h4n8x99'],
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'No orders found',
      })
    })

    it('should only return merchant own orders', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findMany).mockResolvedValue([])

      await caller.getPrintData({
        orderIds: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10003qzrm5h4n8xo4'],
      }).catch(() => {})

      expect(db.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['clh3sa9g10000qzrm5h4n8xo1', 'clh3sa9g10003qzrm5h4n8xo4'] },
            merchantId: 'clh3sa9g10001qzrm5h4n8xo2',
          },
        })
      )
    })

    it('should require merchant authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.getPrintData({
          orderIds: ['clh3sa9g10000qzrm5h4n8xo1'],
        })
      ).rejects.toThrow()
    })
  })

  describe('notification error handling', () => {
    it('should not throw if notification service fails', async () => {
      const caller = createCaller()

      vi.mocked(db.order.findFirst).mockResolvedValue({
        id: 'clh3sa9g10000qzrm5h4n8xo1',
        status: 'PENDING',
      } as any)

      vi.mocked(db.order.findUnique).mockResolvedValue(mockOrders[0] as any)

      vi.mocked(db.order.update).mockResolvedValue({
        ...mockOrders[0],
        status: 'CONFIRMED',
      } as any)

      vi.mocked(NotificationService.createNotification).mockRejectedValue(
        new Error('Notification service error')
      )

      // Should not throw despite notification error
      await expect(
        caller.updateStatus({
          id: 'clh3sa9g10000qzrm5h4n8xo1',
          status: OrderStatus.CONFIRMED,
        })
      ).resolves.toBeDefined()

      expect(NotificationService.createNotification).toHaveBeenCalled()
    })
  })
})