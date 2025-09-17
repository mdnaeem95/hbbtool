import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { notificationRouter } from '../notification'
import { db } from '@kitchencloud/database'
import { NotificationType, NotificationPriority } from '@kitchencloud/database'
import type { AuthSession } from '@kitchencloud/auth'

// Mock dependencies
vi.mock('@kitchencloud/database', () => ({
  db: {
    notification: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
  NotificationType: {
    ORDER_PLACED: 'ORDER_PLACED',
    ORDER_CONFIRMED: 'ORDER_CONFIRMED',
    ORDER_PREPARING: 'ORDER_PREPARING',
    ORDER_READY: 'ORDER_READY',
    ORDER_DELIVERED: 'ORDER_DELIVERED',
    ORDER_CANCELLED: 'ORDER_CANCELLED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    REVIEW_RECEIVED: 'REVIEW_RECEIVED',
    LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
    PROMOTION_STARTED: 'PROMOTION_STARTED',
    PROMOTION_ENDING: 'PROMOTION_ENDING',
    SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
    ACCOUNT_VERIFICATION: 'ACCOUNT_VERIFICATION',
    PASSWORD_RESET: 'PASSWORD_RESET',
  },
  NotificationPriority: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
}))

vi.mock('../../../services/notification', () => ({
  NotificationService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    createNotification: vi.fn(),
  },
}))

// Import after mocking
import { NotificationService } from '../../../services/notification'

// Define Context type for testing
interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: any
  req: Request
  resHeaders: Headers
}

// Mock sessions
const mockMerchantSession: AuthSession = {
  user: {
    id: 'merchant-123',
    email: 'merchant@test.com',
    userType: 'merchant',
    merchant: {
      id: 'merchant-123',
      email: 'merchant@test.com',
      businessName: 'Test Restaurant',
      phone: '91234567',
      status: 'ACTIVE',
    } as any,
  },
}

const mockCustomerSession: AuthSession = {
  user: {
    id: 'customer-456',
    email: 'customer@test.com',
    userType: 'customer',
    phone: '98765432',
    customer: {
      id: 'customer-456',
      email: 'customer@test.com',
      name: 'John Doe',
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
  return notificationRouter.createCaller(context)
}

// Test data
const mockNotifications = [
  {
    id: 'notif-1',
    merchantId: 'merchant-123',
    customerId: null,
    type: 'ORDER_PLACED',
    title: 'New Order Received',
    message: 'You have a new order #ORD001',
    data: { orderId: 'order-1', orderNumber: 'ORD001' },
    read: false,
    priority: 'HIGH',
    createdAt: new Date('2024-08-15T10:00:00Z'),
    updatedAt: new Date('2024-08-15T10:00:00Z'),
  },
  {
    id: 'notif-2',
    merchantId: 'merchant-123',
    customerId: null,
    type: 'REVIEW_RECEIVED',
    title: 'New Review',
    message: 'A customer left a 5-star review',
    data: { reviewId: 'review-1', rating: 5 },
    read: true,
    priority: 'NORMAL',
    createdAt: new Date('2024-08-14T10:00:00Z'),
    updatedAt: new Date('2024-08-14T12:00:00Z'),
  },
]

const mockCustomerNotifications = [
  {
    id: 'notif-3',
    merchantId: null,
    customerId: 'customer-456',
    type: 'ORDER_CONFIRMED',
    title: 'Order Confirmed',
    message: 'Your order #ORD002 has been confirmed',
    data: { orderId: 'order-2', orderNumber: 'ORD002' },
    read: false,
    priority: 'HIGH',
    createdAt: new Date('2024-08-15T09:00:00Z'),
    updatedAt: new Date('2024-08-15T09:00:00Z'),
  },
]

describe('Notification Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set NODE_ENV for test notifications
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getNotifications', () => {
    it('should return notifications for merchant', async () => {
      const caller = createCaller(mockMerchantSession)

      vi.mocked(NotificationService.getNotifications).mockResolvedValue(mockNotifications as any)

      const result = await caller.getNotifications({
        limit: 20,
        offset: 0,
        unreadOnly: false,
      })

      expect(result).toEqual(mockNotifications)

      expect(NotificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'merchant-123',
        isCustomer: false,
        limit: 20,
        offset: 0,
        unreadOnly: false,
        type: undefined,
      })
    })

    it('should return notifications for customer', async () => {
      const caller = createCaller(mockCustomerSession)

      vi.mocked(NotificationService.getNotifications).mockResolvedValue(mockCustomerNotifications as any)

      const result = await caller.getNotifications({
        limit: 10,
        offset: 0,
        unreadOnly: false,
      })

      expect(result).toEqual(mockCustomerNotifications)
      expect(NotificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'customer-456',
        isCustomer: true,
        limit: 10,
        offset: 0,
        unreadOnly: false,
        type: undefined,
      })
    })

    it('should filter by unread only', async () => {
      const caller = createCaller()

      const unreadNotifications = mockNotifications.filter(n => !n.read)
      vi.mocked(NotificationService.getNotifications).mockResolvedValue(unreadNotifications as any)

      const result = await caller.getNotifications({
        unreadOnly: true,
      })

      expect(result).toHaveLength(1)
      expect((result as any[])[0].read).toBe(false)
      expect(NotificationService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ unreadOnly: true })
      )
    })

    it('should filter by notification type', async () => {
      const caller = createCaller()

      const orderNotifications = mockNotifications.filter(n => n.type === 'ORDER_PLACED')
      vi.mocked(NotificationService.getNotifications).mockResolvedValue(orderNotifications as any)

      const result = await caller.getNotifications({
        type: NotificationType.ORDER_PLACED,
      } as any)

      expect(result).toHaveLength(1)
      expect((result as any)[0].type).toBe('ORDER_PLACED')
    })

    it('should handle pagination', async () => {
      const caller = createCaller()

      vi.mocked(NotificationService.getNotifications).mockResolvedValue([mockNotifications[1]] as any)

      const result = await caller.getNotifications({
        limit: 1,
        offset: 1,
      })

      expect(result).toHaveLength(1)   
      expect(NotificationService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 1, offset: 1 })
      )
    })

    it('should handle service errors gracefully', async () => {
      const caller = createCaller()

      vi.mocked(NotificationService.getNotifications).mockRejectedValue(
        new Error('Service unavailable')
      )

      const result = await caller.getNotifications({})

      // Should return empty array instead of throwing
      expect(result).toEqual({
        notifications: [],
        total: 0,
        hasMore: false,
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.getNotifications({})).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('should validate input limits', async () => {
      const caller = createCaller()

      // Test max limit
      await expect(
        caller.getNotifications({ limit: 100 })
      ).rejects.toThrow()

      // Test min limit
      await expect(
        caller.getNotifications({ limit: 0 })
      ).rejects.toThrow()

      // Test negative offset
      await expect(
        caller.getNotifications({ offset: -1 })
      ).rejects.toThrow()
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count for merchant', async () => {
      const caller = createCaller(mockMerchantSession)

      vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(5)

      const result = await caller.getUnreadCount()

      expect(result).toBe(5)
      expect(NotificationService.getUnreadCount).toHaveBeenCalledWith(
        'merchant-123',
        false
      )
    })

    it('should return unread count for customer', async () => {
      const caller = createCaller(mockCustomerSession)

      vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(3)

      const result = await caller.getUnreadCount()

      expect(result).toBe(3)
      expect(NotificationService.getUnreadCount).toHaveBeenCalledWith(
        'customer-456',
        true
      )
    })

    it('should return zero when no unread notifications', async () => {
      const caller = createCaller()

      vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(0)

      const result = await caller.getUnreadCount()

      expect(result).toBe(0)
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.getUnreadCount()).rejects.toThrow()
    })
  })

  describe('markAsRead', () => {
    it('should mark merchant notification as read', async () => {
      const caller = createCaller(mockMerchantSession)

      vi.mocked(db.notification.findUnique).mockResolvedValue({
        id: 'notif-1',
        merchantId: 'merchant-123',
        customerId: null,
      } as any)

      vi.mocked(NotificationService.markAsRead).mockResolvedValue({
        ...mockNotifications[0],
        read: true,
      } as any)

      const result = await caller.markAsRead({ notificationId: 'notif-1' })

      expect(result.read).toBe(true)
      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif-1')
    })

    it('should mark customer notification as read', async () => {
      const caller = createCaller(mockCustomerSession)

      vi.mocked(db.notification.findUnique).mockResolvedValue({
        id: 'notif-3',
        merchantId: null,
        customerId: 'customer-456',
      } as any)

      vi.mocked(NotificationService.markAsRead).mockResolvedValue({
        ...mockCustomerNotifications[0],
        read: true,
      } as any)

      const result = await caller.markAsRead({ notificationId: 'notif-3' })

      expect(result.read).toBe(true)
    })

    it('should throw if notification not found', async () => {
      const caller = createCaller()

      vi.mocked(db.notification.findUnique).mockResolvedValue(null)

      await expect(
        caller.markAsRead({ notificationId: 'nonexistent' })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('should throw if user does not own notification', async () => {
      const caller = createCaller(mockMerchantSession)

      // Notification belongs to different merchant
      vi.mocked(db.notification.findUnique).mockResolvedValue({
        id: 'notif-999',
        merchantId: 'other-merchant',
        customerId: null,
      } as any)

      await expect(
        caller.markAsRead({ notificationId: 'notif-999' })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('should prevent customer from marking merchant notification', async () => {
      const caller = createCaller(mockCustomerSession)

      vi.mocked(db.notification.findUnique).mockResolvedValue({
        id: 'notif-1',
        merchantId: 'merchant-123',
        customerId: null,
      } as any)

      await expect(
        caller.markAsRead({ notificationId: 'notif-1' })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.markAsRead({ notificationId: 'notif-1' })
      ).rejects.toThrow()
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all merchant notifications as read', async () => {
      const caller = createCaller(mockMerchantSession)

      vi.mocked(NotificationService.markAllAsRead).mockResolvedValue({
        count: 5,
      } as any)

      const result = await caller.markAllAsRead()

      expect(result.count).toBe(5)
      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith(
        'merchant-123',
        false
      )
    })

    it('should mark all customer notifications as read', async () => {
      const caller = createCaller(mockCustomerSession)

      vi.mocked(NotificationService.markAllAsRead).mockResolvedValue({
        count: 3,
      } as any)

      const result = await caller.markAllAsRead()

      expect(result.count).toBe(3)
      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith(
        'customer-456',
        true
      )
    })

    it('should handle zero notifications', async () => {
      const caller = createCaller()

      vi.mocked(NotificationService.markAllAsRead).mockResolvedValue({
        count: 0,
      } as any)

      const result = await caller.markAllAsRead()

      expect(result.count).toBe(0)
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)

      await expect(caller.markAllAsRead()).rejects.toThrow()
    })
  })

  describe('sendTestNotification', () => {
    it('should send test notification in development', async () => {
      const caller = createCaller(mockMerchantSession)
      process.env.NODE_ENV = 'development'

      const testNotification = {
        id: 'test-notif',
        merchantId: 'merchant-123',
        type: 'ORDER_PLACED',
        title: 'Test Notification',
        message: 'This is a test',
        channels: ['in_app', 'email'],
        priority: 'HIGH',
      }

      vi.mocked(NotificationService.createNotification).mockResolvedValue(
        testNotification as any
      )

      const result = await caller.sendTestNotification({
        type: NotificationType.ORDER_PLACED,
        channels: ['in_app', 'email'],
        priority: NotificationPriority.HIGH,
      })

      expect(result).toEqual(testNotification)
      expect(NotificationService.createNotification).toHaveBeenCalledWith({
        merchantId: 'merchant-123',
        type: NotificationType.ORDER_PLACED,
        channels: ['in_app', 'email'],
        priority: NotificationPriority.HIGH,
        data: expect.objectContaining({
          test: true,
          timestamp: expect.any(String),
        }),
      })
    })

    it('should allow test notification in staging', async () => {
      const caller = createCaller(mockMerchantSession)
      process.env.NODE_ENV = 'staging'

      vi.mocked(NotificationService.createNotification).mockResolvedValue({
        id: 'test-notif',
      } as any)

      await expect(
        caller.sendTestNotification({
          type: NotificationType.SYSTEM_MAINTENANCE,
        })
      ).resolves.toBeDefined()
    })

    it('should block test notification in production', async () => {
      const caller = createCaller(mockMerchantSession)
      process.env.NODE_ENV = 'production'

      await expect(
        caller.sendTestNotification({
          type: NotificationType.ORDER_PLACED,
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Test notifications not allowed in production',
      })

      expect(NotificationService.createNotification).not.toHaveBeenCalled()
    })

    it('should use default values for optional fields', async () => {
      const caller = createCaller(mockMerchantSession)
      process.env.NODE_ENV = 'development'

      vi.mocked(NotificationService.createNotification).mockResolvedValue({
        id: 'test-notif',
      } as any)

      await caller.sendTestNotification({
        type: NotificationType.PROMOTION_STARTED,
      })

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: ['in_app'],
          priority: 'NORMAL',
        })
      )
    })

    it('should require merchant authentication', async () => {
      // Customer should not be able to send test notifications
      const caller = createCaller(mockCustomerSession)

      await expect(
        caller.sendTestNotification({
          type: NotificationType.ORDER_PLACED,
        })
      ).rejects.toThrow()
    })

    it('should not be accessible without authentication', async () => {
      const caller = createCaller(null)

      await expect(
        caller.sendTestNotification({
          type: NotificationType.ORDER_PLACED,
        })
      ).rejects.toThrow()
    })

    it('should validate notification channels', async () => {
      const caller = createCaller(mockMerchantSession)
      process.env.NODE_ENV = 'development'

      await expect(
        caller.sendTestNotification({
          type: NotificationType.ORDER_PLACED,
          channels: ['invalid_channel'] as any,
        })
      ).rejects.toThrow()
    })
  })
})