import { describe, it, expect, beforeEach, vi } from 'vitest'
import { orderRouter } from '../index'
import { OrderStatus, DeliveryMethod } from '@kitchencloud/database/types'

// Mock database
vi.mock('@kitchencloud/database', () => ({
  db: {
    order: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    orderEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      order: {
        update: vi.fn(),
      },
      orderEvent: {
        create: vi.fn(),
      },
    })),
  },
}))

const mockSession = {
  user: {
    id: 'merchant-123',
    email: 'merchant@example.com',
    user_metadata: { userType: 'merchant' },
  },
}

const mockOrder = {
  id: 'order-123',
  orderNumber: 'ORD001',
  merchantId: 'merchant-123',
  status: OrderStatus.PENDING,
  deliveryMethod: DeliveryMethod.DELIVERY,
  total: 50.00,
  customerName: 'John Doe',
  customerPhone: '+6591234567',
  createdAt: new Date(),
  items: [],
}

describe('Order Router', () => {
  let caller: ReturnType<typeof orderRouter.createCaller>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create a test context directly
    const ctx = {
      db: require('@kitchencloud/database').db,
      session: mockSession,
      supabase: {
        auth: {
          signUp: vi.fn(),
          signInWithPassword: vi.fn(),
          signOut: vi.fn(),
        },
      },
      req: new Request('http://localhost'),
      resHeaders: new Headers(),
      ip: '127.0.0.1',
      header: (name: string) => undefined,
    }

    caller = orderRouter.createCaller(ctx as any)
  })

  describe('list', () => {
    it('returns paginated orders', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findMany.mockResolvedValue([mockOrder])
      mockDb.order.count.mockResolvedValue(1)

      const result = await caller.list({
        page: 1,
        limit: 10,
      })

      expect(result).toEqual({
        items: [mockOrder],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      })
    })

    it('filters by status', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findMany.mockResolvedValue([])
      mockDb.order.count.mockResolvedValue(0)

      await caller.list({
        page: 1,
        limit: 10,
        status: OrderStatus.CONFIRMED,
      })

      expect(mockDb.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.CONFIRMED,
          }),
        })
      )
    })

    it('searches by order number', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findMany.mockResolvedValue([])
      mockDb.order.count.mockResolvedValue(0)

      await caller.list({
        page: 1,
        limit: 10,
        search: 'ORD001',
      })

      expect(mockDb.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                orderNumber: { contains: 'ORD001', mode: 'insensitive' },
              }),
            ]),
          }),
        })
      )
    })
  })

  describe('updateStatus', () => {
    it('updates order status with valid transition', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findFirst.mockResolvedValue(mockOrder)
      mockDb.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          order: {
            update: vi.fn().mockResolvedValue({
              ...mockOrder,
              status: OrderStatus.CONFIRMED,
            }),
          },
          orderEvent: {
            create: vi.fn(),
          },
        }
        return fn(tx)
      })

      const result = await caller.updateStatus({
        id: 'order-123',
        status: OrderStatus.CONFIRMED,
      })

      expect(result?.status).toBe(OrderStatus.CONFIRMED)
    })

    it('throws error for invalid transition', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findFirst.mockResolvedValue(mockOrder)

      await expect(
        caller.updateStatus({
          id: 'order-123',
          status: OrderStatus.COMPLETED, // Invalid from PENDING
        })
      ).rejects.toThrow('Invalid status transition')
    })

    it('throws error if order not found', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findFirst.mockResolvedValue(null)

      await expect(
        caller.updateStatus({
          id: 'non-existent',
          status: OrderStatus.CONFIRMED,
        })
      ).rejects.toThrow()
    })
  })

  describe('bulkUpdateStatus', () => {
    it('updates multiple orders', async () => {
      const mockDb = require('@kitchencloud/database').db
      const orders = [
        { ...mockOrder, id: '1' },
        { ...mockOrder, id: '2' },
      ]
      mockDb.order.findMany.mockResolvedValue(orders)
      mockDb.$transaction.mockResolvedValue({
        successCount: 2,
        totalCount: 2,
        failedCount: 0,
      })

      const result = await caller.bulkUpdateStatus({
        orderIds: ['1', '2'],
        status: OrderStatus.CONFIRMED,
      })

      expect(result.successCount).toBe(2)
      expect(result.failedCount).toBe(0)
    })
  })

  describe('export', () => {
    it('exports orders to CSV', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findMany.mockResolvedValue([mockOrder])

      const result = await caller.export({
        orderIds: ['order-123'],
      })

      expect(result.csv).toContain('Order Number')
      expect(result.csv).toContain('ORD001')
      expect(result.count).toBe(1)
    })

    it('throws error if no orders found', async () => {
      const mockDb = require('@kitchencloud/database').db
      mockDb.order.findMany.mockResolvedValue([])

      await expect(
        caller.export({
          orderIds: ['non-existent'],
        })
      ).rejects.toThrow('No orders found to export')
    })
  })
})