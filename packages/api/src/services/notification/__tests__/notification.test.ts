import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest'
import { db, NotificationType, NotificationPriority } from '@kitchencloud/database'
import { NotificationService } from '../index'
import { emailProvider } from '../provider/email'

// Mock the database
vi.mock('@kitchencloud/database', () => ({
  db: {
    notification: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    merchant: {
      findUnique: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
  },
  NotificationType: {
    ORDER_PLACED: 'ORDER_PLACED',
    ORDER_CONFIRMED: 'ORDER_CONFIRMED',
    ORDER_READY: 'ORDER_READY',
    ORDER_DELIVERED: 'ORDER_DELIVERED',
    ORDER_CANCELLED: 'ORDER_CANCELLED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    REVIEW_RECEIVED: 'REVIEW_RECEIVED',
    LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
    SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
    PROMOTION_ENDING: 'PROMOTION_ENDING',
  },
  NotificationPriority: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
}))

// Mock the email provider
vi.mock('../provider/email', () => ({
  emailProvider: {
    send: vi.fn(),
  },
}))

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createNotification', () => {
    it('should create a notification for merchant with all channels', async () => {
      const merchantId = 'merchant-123'
      const orderId = 'order-456'
      
      // Mock successful database creation
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({
        id: 'notification-123',
        merchantId,
        customerId: null,
        type: 'ORDER_PLACED',
        title: 'New Order Received',
        message: 'Order ORD-001 from John Doe - $25.00',
        data: { orderId, type: 'ORDER_PLACED', customerName: 'John Doe', orderNumber: 'ORD-001', amount: 25 },
        channels: ['in_app', 'email'],
        priority: 'NORMAL',
        read: false,
        delivered: false,
        createdAt: new Date(),
      })

      // Mock user settings
      ;(db.merchant.findUnique as MockedFunction<any>).mockResolvedValue({
        emailNotifications: true,
        smsNotifications: false,
        whatsappNotifications: false,
      })

      // Mock email success
      ;(emailProvider.send as MockedFunction<any>).mockResolvedValue({
        success: true,
        id: 'email-123',
      })

      const result = await NotificationService.createNotification({
        merchantId,
        orderId,
        type: 'ORDER_PLACED' as NotificationType,
        channels: ['in_app', 'email'],
        data: {
          customerName: 'John Doe',
          orderNumber: 'ORD-001',
          amount: 25,
        },
      })

      expect(result.success).toBe(true)
      expect(result.channels.in_app).toBe(true)
      expect(result.channels.email).toEqual({ success: true, id: 'email-123' })
      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          merchant: { connect: { id: merchantId } },
          type: 'ORDER_PLACED',
          title: 'New Order Received',
          message: 'Order ORD-001 from John Doe - $25.00',
          data: { orderId, type: 'ORDER_PLACED', customerName: 'John Doe', orderNumber: 'ORD-001', amount: 25 },
          channels: ['in_app', 'email'],
          priority: 'NORMAL',
        },
      })
    })

    it('should create a notification for customer', async () => {
      const customerId = 'customer-123'
      const orderId = 'order-456'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({
        id: 'notification-123',
        merchantId: null,
        customerId,
        type: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        message: 'Your order ORD-001 has been confirmed. Estimated time: 30 minutes',
        data: { orderId, type: 'ORDER_CONFIRMED', orderNumber: 'ORD-001', estimatedTime: 30 },
        channels: ['in_app'],
        priority: 'NORMAL',
        read: false,
        delivered: false,
        createdAt: new Date(),
      })

      const result = await NotificationService.createNotification({
        customerId,
        orderId,
        type: 'ORDER_CONFIRMED' as NotificationType,
        channels: ['in_app'],
        data: {
          orderNumber: 'ORD-001',
          estimatedTime: 30,
        },
      })

      expect(result.success).toBe(true)
      expect(result.channels.in_app).toBe(true)
      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          customer: { connect: { id: customerId } },
          type: 'ORDER_CONFIRMED',
          title: 'Order Confirmed',
          message: 'Your order ORD-001 has been confirmed. Estimated time: 30 minutes',
          data: { orderId, type: 'ORDER_CONFIRMED', orderNumber: 'ORD-001', estimatedTime: 30 },
          channels: ['in_app'],
          priority: 'NORMAL',
        },
      })
    })

    it('should create notification for both merchant and customer', async () => {
      const merchantId = 'merchant-123'
      const customerId = 'customer-456'
      const orderId = 'order-789'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({
        id: 'notification-123',
        merchantId,
        customerId,
        type: 'ORDER_READY',
        title: 'Order Ready',
        message: 'Your order ORD-001 is ready for pickup',
        data: { orderId, type: 'ORDER_READY', orderNumber: 'ORD-001' },
        channels: ['in_app'],
        priority: 'HIGH',
        read: false,
        delivered: false,
        createdAt: new Date(),
      })

      const result = await NotificationService.createNotification({
        merchantId,
        customerId,
        orderId,
        type: 'ORDER_READY' as NotificationType,
        channels: ['in_app'],
        priority: NotificationPriority.HIGH,
        data: {
          orderNumber: 'ORD-001',
        },
      })

      expect(result.success).toBe(true)
      expect(result.channels.in_app).toBe(true)
      expect(db.notification.create).toHaveBeenCalledWith({
        data: {
          merchant: { connect: { id: merchantId } },
          customer: { connect: { id: customerId } },
          type: 'ORDER_READY',
          title: 'Order Ready',
          message: 'Your order ORD-001 is ready for {{deliveryMethod}}',
          data: { orderId, type: 'ORDER_READY', orderNumber: 'ORD-001' },
          channels: ['in_app'],
          priority: 'HIGH',
        },
      })
    })

    it('should throw error when no recipient is provided', async () => {
      await expect(
        NotificationService.createNotification({
          type: 'ORDER_PLACED' as NotificationType,
          orderId: 'order-123',
        })
      ).rejects.toThrow('Notification requires a merchantId or customerId')
    })

    it('should handle database errors gracefully', async () => {
      const merchantId = 'merchant-123'
      
      ;(db.notification.create as MockedFunction<any>).mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await NotificationService.createNotification({
        merchantId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
        channels: ['in_app'],
      })

      expect(result.success).toBe(false)
      expect(result.channels.in_app).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        '[notification.service] In-app notification failed:',
        expect.any(Error)
      )
    })

    it('should skip email when user has disabled email notifications', async () => {
      const merchantId = 'merchant-123'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })
      ;(db.merchant.findUnique as MockedFunction<any>).mockResolvedValue({
        emailNotifications: false,
        smsNotifications: false,
        whatsappNotifications: false,
      })

      const result = await NotificationService.createNotification({
        merchantId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
        channels: ['in_app', 'email'],
      })

      expect(result.success).toBe(true)
      expect(result.channels.in_app).toBe(true)
      expect(result.channels.email).toEqual({ success: false })
      expect(emailProvider.send).not.toHaveBeenCalled()
    })

    it('should handle email provider failures', async () => {
      const merchantId = 'merchant-123'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })
      ;(db.merchant.findUnique as MockedFunction<any>).mockResolvedValue({
        emailNotifications: true,
      })
      ;(emailProvider.send as MockedFunction<any>).mockRejectedValue(
        new Error('Email provider error')
      )

      const result = await NotificationService.createNotification({
        merchantId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
        channels: ['in_app', 'email'],
      })

      expect(result.success).toBe(true) // Still successful because in_app worked
      expect(result.channels.in_app).toBe(true)
      expect(result.channels.email).toEqual({ success: false })
    })

    it('should use default priority when not specified', async () => {
      const merchantId = 'merchant-123'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

      await NotificationService.createNotification({
        merchantId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
      })

      expect(db.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'NORMAL',
        }),
      })
    })
  })

  describe('convenience methods', () => {
    describe('orderPlaced', () => {
      it('should create ORDER_PLACED notification with correct data', async () => {
        const merchantId = 'merchant-123'
        const orderId = 'order-456'
        
        ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

        const result = await NotificationService.orderPlaced({
          merchantId,
          orderId,
          customerName: 'John Doe',
          orderNumber: 'ORD-001',
          amount: 25.50,
          channels: ['in_app'],
          priority: NotificationPriority.HIGH,
        })

        expect(result.success).toBe(true)
        expect(db.notification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: 'ORDER_PLACED',
            priority: 'HIGH',
            data: expect.objectContaining({
              customerName: 'John Doe',
              orderNumber: 'ORD-001',
              amount: 25.50,
            }),
          }),
        })
      })
    })

    describe('orderReady', () => {
      it('should default to HIGH priority', async () => {
        const customerId = 'customer-123'
        const orderId = 'order-456'
        
        ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

        await NotificationService.orderReady({
          customerId,
          orderId,
          orderNumber: 'ORD-001',
        })

        expect(db.notification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: 'ORDER_READY',
            priority: 'HIGH',
          }),
        })
      })

      it('should support both merchant and customer notifications', async () => {
        const merchantId = 'merchant-123'
        const customerId = 'customer-456'
        const orderId = 'order-789'
        
        ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

        await NotificationService.orderReady({
          merchantId,
          customerId,
          orderId,
          orderNumber: 'ORD-001',
        })

        expect(db.notification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            merchant: { connect: { id: merchantId } },
            customer: { connect: { id: customerId } },
            type: 'ORDER_READY',
          }),
        })
      })
    })

    describe('lowStockAlert', () => {
      it('should create LOW_STOCK_ALERT notification', async () => {
        const merchantId = 'merchant-123'
        
        ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

        const result = await NotificationService.lowStockAlert({
          merchantId,
          productId: 'product-123',
          productName: 'Chocolate Cake',
          currentStock: 2,
          threshold: 5,
        })

        expect(result.success).toBe(true)
        expect(db.notification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: 'LOW_STOCK_ALERT',
            priority: 'HIGH',
            title: 'Low Stock Alert',
            message: 'Chocolate Cake is running low (2 left)',
            data: expect.objectContaining({
              productId: 'product-123',
              productName: 'Chocolate Cake',
              currentStock: 2,
              threshold: 5,
            }),
          }),
        })
      })
    })
  })

  describe('bulk operations', () => {
    describe('markAsRead', () => {
      it('should mark notification as read', async () => {
        const notificationId = 'notif-123'
        
        ;(db.notification.update as MockedFunction<any>).mockResolvedValue({ id: notificationId })

        const result = await NotificationService.markAsRead(notificationId)

        expect(result).toBe(true)
        expect(db.notification.update).toHaveBeenCalledWith({
          where: { id: notificationId },
          data: {
            read: true,
            readAt: expect.any(Date),
          },
        })
      })

      it('should handle update errors', async () => {
        const notificationId = 'notif-123'
        
        ;(db.notification.update as MockedFunction<any>).mockRejectedValue(
          new Error('Update failed')
        )

        const result = await NotificationService.markAsRead(notificationId)

        expect(result).toBe(false)
        expect(console.error).toHaveBeenCalledWith(
          '[notification.service] Mark as read failed:',
          expect.any(Error)
        )
      })
    })

    describe('markAllAsRead', () => {
      it('should mark all merchant notifications as read', async () => {
        const userId = 'merchant-123'
        
        ;(db.notification.updateMany as MockedFunction<any>).mockResolvedValue({ count: 5 })

        const result = await NotificationService.markAllAsRead(userId, false)

        expect(result).toBe(true)
        expect(db.notification.updateMany).toHaveBeenCalledWith({
          where: {
            merchantId: userId,
            read: false,
          },
          data: {
            read: true,
            readAt: expect.any(Date),
          },
        })
      })

      it('should mark all customer notifications as read', async () => {
        const userId = 'customer-123'
        
        ;(db.notification.updateMany as MockedFunction<any>).mockResolvedValue({ count: 3 })

        const result = await NotificationService.markAllAsRead(userId, true)

        expect(result).toBe(true)
        expect(db.notification.updateMany).toHaveBeenCalledWith({
          where: {
            customerId: userId,
            read: false,
          },
          data: {
            read: true,
            readAt: expect.any(Date),
          },
        })
      })
    })

    describe('getUnreadCount', () => {
      it('should return unread count for merchant', async () => {
        const userId = 'merchant-123'
        
        ;(db.notification.count as MockedFunction<any>).mockResolvedValue(7)

        const count = await NotificationService.getUnreadCount(userId, false)

        expect(count).toBe(7)
        expect(db.notification.count).toHaveBeenCalledWith({
          where: {
            merchantId: userId,
            read: false,
          },
        })
      })

      it('should return unread count for customer', async () => {
        const userId = 'customer-123'
        
        ;(db.notification.count as MockedFunction<any>).mockResolvedValue(3)

        const count = await NotificationService.getUnreadCount(userId, true)

        expect(count).toBe(3)
        expect(db.notification.count).toHaveBeenCalledWith({
          where: {
            customerId: userId,
            read: false,
          },
        })
      })

      it('should return 0 on error', async () => {
        const userId = 'merchant-123'
        
        ;(db.notification.count as MockedFunction<any>).mockRejectedValue(
          new Error('Count failed')
        )

        const count = await NotificationService.getUnreadCount(userId, false)

        expect(count).toBe(0)
        expect(console.error).toHaveBeenCalledWith(
          '[notification.service] Get unread count failed:',
          expect.any(Error)
        )
      })
    })

    describe('deleteExpired', () => {
      it('should delete expired notifications', async () => {
        ;(db.notification.deleteMany as MockedFunction<any>).mockResolvedValue({ count: 8 })

        const deletedCount = await NotificationService.deleteExpired()

        expect(deletedCount).toBe(8)
        expect(db.notification.deleteMany).toHaveBeenCalledWith({
          where: {
            expiresAt: {
              lt: expect.any(Date),
            },
          },
        })
        expect(console.log).toHaveBeenCalledWith(
          '[notification.service] Deleted 8 expired notifications'
        )
      })

      it('should handle deletion errors', async () => {
        ;(db.notification.deleteMany as MockedFunction<any>).mockRejectedValue(
          new Error('Delete failed')
        )

        const deletedCount = await NotificationService.deleteExpired()

        expect(deletedCount).toBe(0)
        expect(console.error).toHaveBeenCalledWith(
          '[notification.service] Delete expired failed:',
          expect.any(Error)
        )
      })

      it('should not log when no notifications are deleted', async () => {
        ;(db.notification.deleteMany as MockedFunction<any>).mockResolvedValue({ count: 0 })

        const deletedCount = await NotificationService.deleteExpired()

        expect(deletedCount).toBe(0)
        expect(console.log).not.toHaveBeenCalledWith(
          expect.stringContaining('Deleted')
        )
      })
    })
  })

  describe('getNotifications', () => {
    it('should get notifications for merchant with default parameters', async () => {
      const userId = 'merchant-123'
      const mockNotifications = [
        {
          id: 'notif-1',
          merchantId: userId,
          customerId: null,
          type: 'ORDER_PLACED',
          title: 'New Order',
          message: 'Order received',
          read: false,
          createdAt: new Date(),
        },
      ]
      
      ;(db.notification.findMany as MockedFunction<any>).mockResolvedValue(mockNotifications)

      const result = await NotificationService.getNotifications({
        userId,
        isCustomer: false,
      })

      expect(result).toEqual(mockNotifications)
      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: { merchantId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        include: {
          merchant: false,
          customer: true,
        },
      })
    })

    it('should get notifications for customer with filters', async () => {
      const userId = 'customer-123'
      const mockNotifications = [
        {
          id: 'notif-1',
          merchantId: null,
          customerId: userId,
          type: 'ORDER_CONFIRMED',
          title: 'Order Confirmed',
          message: 'Your order has been confirmed',
          read: false,
          createdAt: new Date(),
        },
      ]
      
      ;(db.notification.findMany as MockedFunction<any>).mockResolvedValue(mockNotifications)

      const result = await NotificationService.getNotifications({
        userId,
        isCustomer: true,
        limit: 10,
        offset: 5,
        unreadOnly: true,
        type: 'ORDER_CONFIRMED' as NotificationType,
      })

      expect(result).toEqual(mockNotifications)
      expect(db.notification.findMany).toHaveBeenCalledWith({
        where: {
          customerId: userId,
          read: false,
          type: 'ORDER_CONFIRMED',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 5,
        include: {
          merchant: true,
          customer: false,
        },
      })
    })

    it('should return empty array on database error', async () => {
      const userId = 'user-123'
      
      ;(db.notification.findMany as MockedFunction<any>).mockRejectedValue(
        new Error('Database error')
      )

      const result = await NotificationService.getNotifications({
        userId,
      })

      expect(result).toEqual([])
      expect(console.error).toHaveBeenCalledWith(
        '[notification.service] Get notifications failed:',
        expect.any(Error)
      )
    })
  })

  describe('template system', () => {
    it('should format messages with template variables', async () => {
      const merchantId = 'merchant-123'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

      await NotificationService.createNotification({
        merchantId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
        data: {
          orderNumber: 'ORD-001',
          customerName: 'Jane Smith',
          amount: 42.50,
        },
      })

      expect(db.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'New Order Received',
          message: 'Order ORD-001 from Jane Smith - $42.50',
        }),
      })
    })

    it('should use fallback title for unknown notification types', async () => {
      const merchantId = 'merchant-123'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

      // Cast to bypass TypeScript validation for testing
      await NotificationService.createNotification({
        merchantId,
        type: 'UNKNOWN_TYPE' as any,
        orderId: 'order-123',
      })

      expect(db.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Unknown Type',
          message: 'Event: UNKNOWN_TYPE',
        }),
      })
    })

    it('should handle missing template variables gracefully', async () => {
      const merchantId = 'merchant-123'
      
      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })

      await NotificationService.createNotification({
        merchantId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
        data: {
          orderNumber: 'ORD-001',
          // Missing customerName and amount
        },
      })

      expect(db.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: 'Order ORD-001 from {{customerName}} - ${{amount}}',
        }),
      })
    })
  })

  describe('user settings', () => {
    it('should prioritize merchant settings over customer settings', async () => {
      const userId = 'user-123'
      
      ;(db.merchant.findUnique as MockedFunction<any>).mockResolvedValue({
        emailNotifications: true,
        smsNotifications: false,
      })
      ;(db.customer.findUnique as MockedFunction<any>).mockResolvedValue({
        emailNotifications: false,
        smsNotifications: true,
      })

      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })
      ;(emailProvider.send as MockedFunction<any>).mockResolvedValue({ success: true })

      const result = await NotificationService.createNotification({
        merchantId: userId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
        channels: ['in_app', 'email'],
      })

      expect(result.channels.email).toEqual({ success: true })
      expect(db.merchant.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.objectContaining({
          emailNotifications: true,
        }),
      })
      expect(db.customer.findUnique).not.toHaveBeenCalled()
    })

    it('should fall back to customer settings when user is not a merchant', async () => {
      const userId = 'user-123'
      
      ;(db.merchant.findUnique as MockedFunction<any>).mockResolvedValue(null)
      ;(db.customer.findUnique as MockedFunction<any>).mockResolvedValue({
        emailNotifications: true,
        smsNotifications: false,
      })

      ;(db.notification.create as MockedFunction<any>).mockResolvedValue({ id: 'notif-123' })
      ;(emailProvider.send as MockedFunction<any>).mockResolvedValue({ success: true })

      const result = await NotificationService.createNotification({
        merchantId: userId,
        type: 'ORDER_PLACED' as NotificationType,
        orderId: 'order-123',
        channels: ['in_app', 'email'],
      })

      expect(result.channels.email).toEqual({ success: true })
      expect(db.customer.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.objectContaining({
          emailNotifications: true,
        }),
      })
    })
  })
})