// packages/api/src/services/notification/__tests__/integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NotificationService } from '../index'
import { NotificationType, NotificationPriority } from '@kitchencloud/database'

// Mock external APIs AND database operations for integration tests
const mocks = vi.hoisted(() => ({
  mockTwilioMessagesCreate: vi.fn(),
  mockFetch: vi.fn(),
  mockEmailsSend: vi.fn(),
  // Database mocks
  mockNotificationCreate: vi.fn(),
  mockNotificationFindMany: vi.fn(),
  mockNotificationUpdate: vi.fn(),
  mockNotificationUpdateMany: vi.fn(),
  mockNotificationCount: vi.fn(),
  mockNotificationDelete: vi.fn(),
  mockNotificationDeleteMany: vi.fn(),
  mockMerchantFindUnique: vi.fn(),
  mockCustomerFindUnique: vi.fn(),
}))

vi.mock('twilio', () => ({
  Twilio: vi.fn(() => ({
    messages: { create: mocks.mockTwilioMessagesCreate }
  }))
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: mocks.mockEmailsSend }
  }))
}))

vi.mock('@kitchencloud/database', () => ({
  db: {
    notification: {
      create: mocks.mockNotificationCreate,
      findMany: mocks.mockNotificationFindMany,
      update: mocks.mockNotificationUpdate,
      updateMany: mocks.mockNotificationUpdateMany,
      count: mocks.mockNotificationCount,
      delete: mocks.mockNotificationDelete,
      deleteMany: mocks.mockNotificationDeleteMany,
    },
    merchant: {
      findUnique: mocks.mockMerchantFindUnique,
    },
    customer: {
      findUnique: mocks.mockCustomerFindUnique,
    },
  },
  NotificationType: {
    ORDER_PLACED: 'ORDER_PLACED',
    ORDER_CONFIRMED: 'ORDER_CONFIRMED',
    ORDER_READY: 'ORDER_READY',
    ORDER_DELIVERED: 'ORDER_DELIVERED',
    ORDER_CANCELLED: 'ORDER_CANCELLED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
  },
  NotificationPriority: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
  },
}))

global.fetch = mocks.mockFetch

// Set up test environment
process.env.RESEND_API_KEY = 'test_resend_key'
process.env.TWILIO_ACCOUNT_SID = 'test_twilio_sid'
process.env.TWILIO_AUTH_TOKEN = 'test_twilio_token'
process.env.TWILIO_PHONE_NUMBER = '+12345678901'
process.env.WHATSAPP_ACCESS_TOKEN = 'test_whatsapp_token'
process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789'

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful database operations
    mocks.mockNotificationCreate.mockResolvedValue({
      id: 'notification-123',
      merchantId: 'merchant-test-123',
      customerId: null,
      type: 'ORDER_PLACED',
      title: 'New Order Received',
      message: 'Order ORD-2024-001 from John Doe - $28.50',
      data: { orderNumber: 'ORD-2024-001', customerName: 'John Doe', amount: 28.50 },
      channels: ['in_app', 'email', 'sms', 'whatsapp'],
      priority: 'HIGH',
      read: false,
      delivered: false,
      createdAt: new Date(),
    })

    mocks.mockNotificationFindMany.mockResolvedValue([
      {
        id: 'notification-123',
        type: 'ORDER_PLACED',
        title: 'Test Notification',
        message: 'Test message',
        read: false,
        createdAt: new Date(),
      }
    ])

    mocks.mockNotificationCount.mockResolvedValue(5)
    mocks.mockNotificationUpdate.mockResolvedValue({ id: 'notification-123', read: true })
    mocks.mockNotificationUpdateMany.mockResolvedValue({ count: 3 })
    mocks.mockNotificationDelete.mockResolvedValue({ id: 'notification-123' })
    mocks.mockNotificationDeleteMany.mockResolvedValue({ count: 2 })

    // Mock user settings - default to notifications enabled
    mocks.mockMerchantFindUnique.mockResolvedValue({
      id: 'merchant-test-123',
      emailNotifications: true,
      smsNotifications: true,
      whatsappNotifications: true,
      orderNotificationEmail: 'merchant@test.com',
      orderNotificationPhone: '+6591234567',
    })

    mocks.mockCustomerFindUnique.mockResolvedValue({
      id: 'customer-test-789',
      emailNotifications: true,
      smsNotifications: true,
      whatsappNotifications: true,
    })
    
    // Mock successful API responses
    mocks.mockEmailsSend.mockResolvedValue({
      data: { id: 'email-123' },
      error: null
    })
    
    mocks.mockTwilioMessagesCreate.mockResolvedValue({
      sid: 'sms-123',
      status: 'sent'
    })
    
    mocks.mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        messages: [{ id: 'whatsapp-123' }]
      })
    })
    
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('End-to-End Notification Flow', () => {
    it('should handle complete order placement notification flow', async () => {
      // This test simulates a real order placement notification
      const result = await NotificationService.orderPlaced({
        merchantId: 'merchant-test-123',
        orderId: 'order-test-456',
        orderNumber: 'ORD-2024-001',
        customerName: 'John Doe',
        amount: 28.50,
        channels: ['in_app', 'email', 'sms', 'whatsapp'],
        priority: NotificationPriority.HIGH
      })

      // Verify notification was created
      expect(result.success).toBe(true)
      expect(result.channels.in_app).toBe(true)

      // Verify all channels attempted (success depends on user preferences)
      expect(result.channels).toHaveProperty('email')
      expect(result.channels).toHaveProperty('sms') 
      expect(result.channels).toHaveProperty('whatsapp')
    })

    it('should handle order ready notification with customer preferences', async () => {
      const result = await NotificationService.orderReady({
        customerId: 'customer-test-789',
        orderId: 'order-test-456',
        orderNumber: 'ORD-2024-001',
        deliveryMethod: 'pickup',
        channels: ['in_app', 'sms', 'whatsapp']
      })

      expect(result.success).toBe(true)
      expect(result.channels.in_app).toBe(true)
    })

    it('should respect user notification preferences', async () => {
      // Test with different preference scenarios
      const testScenarios = [
        {
          name: 'Email only',
          channels: ['email'],
          expectedChannels: 1
        },
        {
          name: 'SMS and WhatsApp', 
          channels: ['sms', 'whatsapp'],
          expectedChannels: 2
        },
        {
          name: 'All channels',
          channels: ['in_app', 'email', 'sms', 'whatsapp'],
          expectedChannels: 4
        }
      ]

      for (const scenario of testScenarios) {
        // Reset only the specific mocks we need to change, not all mocks
        mocks.mockNotificationCreate.mockClear()
        mocks.mockMerchantFindUnique.mockClear()
        
        // Setup database mocks for this scenario
        mocks.mockNotificationCreate.mockResolvedValue({
          id: `notification-${scenario.name}`,
          merchantId: 'merchant-test-preferences',
          type: 'ORDER_CONFIRMED',
          title: 'Order Confirmed',
          message: `PREF-TEST order confirmed`,
          data: { orderNumber: `PREF-TEST-${Date.now()}`, estimatedTime: 30 },
          channels: scenario.channels,
          priority: 'NORMAL',
          read: false,
          createdAt: new Date(),
        })

        // Mock user settings for the specific merchant ID  
        mocks.mockMerchantFindUnique.mockResolvedValue({
          id: 'merchant-test-preferences',
          emailNotifications: true,
          smsNotifications: true,
          whatsappNotifications: true,
          orderNotificationEmail: 'merchant@test.com',
          orderNotificationPhone: '+6591234567',
        })

        const result = await NotificationService.createNotification({
          merchantId: 'merchant-test-preferences',
          type: 'ORDER_CONFIRMED',
          channels: scenario.channels as any,
          data: {
            orderNumber: `PREF-TEST-${Date.now()}`,
            estimatedTime: 30
          }
        })

        console.log(`Scenario "${scenario.name}":`, { 
          success: result.success, 
          channels: Object.keys(result.channels),
          channelResults: result.channels 
        })

        expect(result.success).toBe(true)
        expect(Object.keys(result.channels)).toHaveLength(scenario.expectedChannels)
      }
    })

    it('should handle notification failures gracefully', async () => {
      // Mock API failures
      mocks.mockEmailsSend.mockRejectedValue(new Error('Email service down'))
      mocks.mockTwilioMessagesCreate.mockRejectedValue(new Error('SMS service down'))
      mocks.mockFetch.mockRejectedValue(new Error('WhatsApp service down'))

      const result = await NotificationService.createNotification({
        merchantId: 'merchant-test-failure',
        type: 'ORDER_PLACED',
        channels: ['in_app', 'email', 'sms', 'whatsapp'],
        data: { orderNumber: 'FAIL-TEST-001' }
      })

      // In-app should still succeed even if external services fail
      expect(result.channels.in_app).toBe(true)
      
      // External channels should fail gracefully
      expect(result.channels.email?.success).toBe(false)
      expect(result.channels.sms?.success).toBe(false)
      expect(result.channels.whatsapp?.success).toBe(false)
      
      // Overall should still be considered successful if in-app worked
      expect(result.success).toBe(true)
    })
  })

  describe('Notification Management', () => {
    it('should retrieve notifications for a user', async () => {
      // First create some notifications
      await NotificationService.createNotification({
        merchantId: 'merchant-retrieve-test',
        type: 'ORDER_PLACED',
        data: { orderNumber: 'RETRIEVE-001' }
      })

      await NotificationService.createNotification({
        merchantId: 'merchant-retrieve-test', 
        type: 'ORDER_READY',
        data: { orderNumber: 'RETRIEVE-002' }
      })

      // Then retrieve them
      const notifications = await NotificationService.getNotifications({
        userId: 'merchant-retrieve-test',
        isCustomer: false,
        limit: 10
      })

      expect(Array.isArray(notifications)).toBe(true)
      // Note: Actual count depends on database state
    })

    it('should get unread count correctly', async () => {
      const unreadCount = await NotificationService.getUnreadCount('merchant-unread-test', false)
      expect(typeof unreadCount).toBe('number')
      expect(unreadCount).toBeGreaterThanOrEqual(0)
    })

    it('should mark notifications as read', async () => {
      // Create a notification
      const createResult = await NotificationService.createNotification({
        merchantId: 'merchant-read-test',
        type: 'ORDER_PLACED',
        data: { orderNumber: 'READ-TEST-001' }
      })

      expect(createResult.success).toBe(true)

      // Get notifications to find the ID
      const notifications = await NotificationService.getNotifications({
        userId: 'merchant-read-test',
        isCustomer: false,
        unreadOnly: true,
        limit: 1
      })

      if (notifications.length > 0) {
        // Mark as read
        const markResult = await NotificationService.markAsRead(notifications[0]?.id!)
        expect(markResult).toBeDefined()
      }
    })

    it('should mark all notifications as read', async () => {
      const result = await NotificationService.markAllAsRead('merchant-mark-all-test', false)
      expect(result).toBeDefined()
      expect(typeof result.count).toBe('number')
    })
  })

  describe('Template System', () => {
    it('should format notification messages correctly', async () => {
      const testData = {
        orderNumber: 'TEMPLATE-001',
        customerName: 'Jane Smith',
        amount: 45.75,
        estimatedTime: 25
      }

      const notificationTypes: NotificationType[] = [
        'ORDER_PLACED',
        'ORDER_CONFIRMED', 
        'ORDER_READY',
        'ORDER_DELIVERED'
      ]

      for (const type of notificationTypes) {
        const result = await NotificationService.createNotification({
          merchantId: 'merchant-template-test',
          type,
          channels: ['in_app'],
          data: testData
        })

        expect(result.success).toBe(true)
        expect(result.channels.in_app).toBe(true)
      }
    })
  })

  describe('Performance Tests', () => {
    it('should handle multiple concurrent notifications', async () => {
      const promises = []
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          NotificationService.createNotification({
            merchantId: 'merchant-concurrent-test',
            type: 'ORDER_PLACED',
            channels: ['in_app'],
            data: { orderNumber: `CONCURRENT-${i}` }
          })
        )
      }

      const results = await Promise.all(promises)
      
      results.forEach((result) => {
        expect(result.success).toBe(true)
        expect(result.channels.in_app).toBe(true)
      })
    })

    it('should complete notifications within reasonable time', async () => {
      const startTime = Date.now()
      
      await NotificationService.createNotification({
        merchantId: 'merchant-performance-test',
        type: 'ORDER_PLACED',
        channels: ['in_app', 'email', 'sms', 'whatsapp'],
        data: { orderNumber: 'PERF-001' }
      })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within 5 seconds (generous for external API calls)
      expect(duration).toBeLessThan(5000)
    })
  })
})