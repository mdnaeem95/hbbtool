import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Use vi.hoisted for mock functions
const mocks = vi.hoisted(() => ({
  mockTwilioMessagesCreate: vi.fn(),
  mockMerchantFindUnique: vi.fn(),
  mockCustomerFindUnique: vi.fn(),
}))

// Mock Twilio
vi.mock('twilio', () => ({
  Twilio: vi.fn(() => ({
    messages: {
      create: mocks.mockTwilioMessagesCreate
    }
  }))
}))

// Mock database
vi.mock('@homejiak/database', () => ({
  db: {
    merchant: {
      findUnique: mocks.mockMerchantFindUnique
    },
    customer: {
      findUnique: mocks.mockCustomerFindUnique
    }
  }
}))

// Set up environment variables
process.env.TWILIO_ACCOUNT_SID = 'test_account_sid'
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token'
process.env.TWILIO_PHONE_NUMBER = '+12345678901'
process.env.APP_URL = 'https://test.homejiak.sg'

// Import after mocking
import { smsProvider } from '../sms'

describe('SMS Provider', () => {
  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test'
    
    // Clear all mocks
    vi.clearAllMocks()
    Object.values(mocks).forEach(mock => mock.mockClear())
    
    // Suppress console logs for clean test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('send', () => {
    it('should send SMS to merchant successfully', async () => {
      // Setup mocks
      const merchantData = {
        id: 'merchant-123',
        phone: '91234567', // Singapore local number
        businessName: 'Test Restaurant',
        smsNotifications: true,
        orderNotificationPhone: null,
      }
      
      mocks.mockMerchantFindUnique.mockResolvedValue(merchantData)
      mocks.mockTwilioMessagesCreate.mockResolvedValue({
        sid: 'sms-123',
        status: 'sent',
        to: '+6591234567'
      })

      // Execute
      const result = await smsProvider.send({
        userId: 'merchant-123',
        message: 'New order #ORD-001 received from John Doe - $25.00',
        data: { orderNumber: 'ORD-001', customerName: 'John Doe', amount: 25 }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(result.id).toBe('sms-123')
      
      expect(mocks.mockTwilioMessagesCreate).toHaveBeenCalledWith({
        body: 'New order #ORD-001 received from John Doe - $25.00',
        from: '+12345678901',
        to: '+6591234567',
        statusCallback: 'https://test.homejiak.sg/api/webhooks/twilio/status'
      })
    })

    it('should send SMS to customer successfully', async () => {
      // Setup mocks - merchant returns null, customer succeeds
      mocks.mockMerchantFindUnique.mockResolvedValue(null)
      mocks.mockCustomerFindUnique.mockResolvedValue({
        id: 'customer-123',
        phone: '+6587654321',
        name: 'Jane Smith',
        smsNotifications: true,
      })
      
      mocks.mockTwilioMessagesCreate.mockResolvedValue({
        sid: 'sms-456',
        status: 'sent',
        to: '+6587654321'
      })

      // Execute
      const result = await smsProvider.send({
        userId: 'customer-123',
        message: 'Your order ORD-001 is ready for pickup',
        data: { orderNumber: 'ORD-001' }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(result.id).toBe('sms-456')
      
      expect(mocks.mockCustomerFindUnique).toHaveBeenCalledWith({
        where: { id: 'customer-123' },
        select: {
          id: true,
          phone: true,
          name: true,
          smsNotifications: true,
        }
      })
    })

    it('should use dedicated notification phone when available', async () => {
      // Setup merchant with dedicated notification phone
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: '91234567', // Main phone
        businessName: 'Test Restaurant',
        orderNotificationPhone: '87654321', // Dedicated notification phone
        smsNotifications: true,
      })
      
      mocks.mockTwilioMessagesCreate.mockResolvedValue({
        sid: 'sms-789',
        status: 'sent'
      })

      // Execute
      await smsProvider.send({
        userId: 'merchant-123',
        message: 'Test message',
        data: {}
      })

      // Verify it used the dedicated notification phone (+6587654321)
      expect(mocks.mockTwilioMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+6587654321'
        })
      )
    })

    it('should handle user not found', async () => {
      // Setup mocks - both return null
      mocks.mockMerchantFindUnique.mockResolvedValue(null)
      mocks.mockCustomerFindUnique.mockResolvedValue(null)

      // Execute
      const result = await smsProvider.send({
        userId: 'non-existent',
        message: 'Test message',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should handle user without phone number', async () => {
      // Setup merchant without phone
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: null,
        businessName: 'Test Restaurant',
        smsNotifications: true,
      })

      // Execute
      const result = await smsProvider.send({
        userId: 'merchant-123',
        message: 'Test message',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(result.error).toBe('No phone number on file')
    })

    it('should handle invalid phone number format', async () => {
      // Setup merchant with invalid phone
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: 'invalid-phone',
        businessName: 'Test Restaurant',
        smsNotifications: true,
      })

      // Execute
      const result = await smsProvider.send({
        userId: 'merchant-123',
        message: 'Test message',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid phone number format')
    })

    // it('should truncate long messages to 160 characters', async () => {
    //   const longMessage = 'A'.repeat(200) // 200 character message
      
    //   mocks.mockMerchantFindUnique.mockResolvedValue({
    //     id: 'merchant-123',
    //     phone: '91234567',
    //     businessName: 'Test Restaurant',
    //     smsNotifications: true,
    //   })
      
    //   mocks.mockTwilioMessagesCreate.mockResolvedValue({
    //     sid: 'sms-long',
    //     status: 'sent'
    //   })

    //   // Execute
    //   await smsProvider.send({
    //     userId: 'merchant-123',
    //     message: longMessage,
    //     data: {}
    //   })

    //   // Verify message was truncated to 160 chars
    //   const sentMessage = mocks!.mockTwilioMessagesCreate!.mock!.calls[0][0]!.body!
    //   expect(sentMessage.length).toBe(160)
    //   expect(sentMessage.endsWith('...')).toBe(true)
    // })

    it('should handle Twilio API errors', async () => {
      // Setup mocks
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: '91234567',
        businessName: 'Test Restaurant',
        smsNotifications: true,
      })
      
      // Mock Twilio error
      mocks.mockTwilioMessagesCreate.mockRejectedValue(
        new Error('Invalid phone number')
      )

      // Execute
      const result = await smsProvider.send({
        userId: 'merchant-123',
        message: 'Test message',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid phone number')
      expect(console.error).toHaveBeenCalledWith(
        '[sms.provider] SMS send failed:',
        expect.any(Error)
      )
    })

    // it('should format message with variables', async () => {
    //   mocks.mockMerchantFindUnique.mockResolvedValue({
    //     id: 'merchant-123',
    //     phone: '91234567',
    //     businessName: 'Amazing Kitchen',
    //     smsNotifications: true,
    //   })
      
    //   mocks.mockTwilioMessagesCreate.mockResolvedValue({
    //     sid: 'sms-vars',
    //     status: 'sent'
    //   })

    //   // Execute
    //   await smsProvider.send({
    //     userId: 'merchant-123',
    //     message: 'Order {{orderNumber}} from {{customerName}} ready at {{businessName}}',
    //     data: { 
    //       orderNumber: 'ORD-001', 
    //       customerName: 'John Doe' 
    //     }
    //   })

    //   // Verify message formatting
    //   const sentMessage = mocks.mockTwilioMessagesCreate.mock.calls[0][0].body
    //   expect(sentMessage).toBe('Order ORD-001 from John Doe ready at Amazing Kitchen')
    // })
  })

  describe('formatSingaporePhone', () => {
    it('should format 8-digit local numbers', () => {
      expect(smsProvider.formatSingaporePhone('91234567')).toBe('+6591234567')
    })

    it('should format 9-digit numbers with leading zero', () => {
      expect(smsProvider.formatSingaporePhone('091234567')).toBe('+6591234567')
    })

    it('should format 10-digit numbers with 65 prefix', () => {
      expect(smsProvider.formatSingaporePhone('6591234567')).toBe('+6591234567')
    })

    it('should handle already formatted numbers', () => {
      expect(smsProvider.formatSingaporePhone('+6591234567')).toBe('+6591234567')
    })

    it('should return null for invalid formats', () => {
      expect(smsProvider.formatSingaporePhone('123')).toBe(null)
      expect(smsProvider.formatSingaporePhone('')).toBe(null)
      expect(smsProvider.formatSingaporePhone('invalid')).toBe(null)
    })

    it('should handle numbers with spaces and dashes', () => {
      expect(smsProvider.formatSingaporePhone('9123-4567')).toBe('+6591234567')
      expect(smsProvider.formatSingaporePhone('9123 4567')).toBe('+6591234567')
      expect(smsProvider.formatSingaporePhone('+65 9123 4567')).toBe('+6591234567')
    })
  })
})