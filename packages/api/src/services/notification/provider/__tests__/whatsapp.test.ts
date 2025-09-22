// packages/api/src/services/notification/provider/__tests__/whatsapp.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Use vi.hoisted for mock functions
const mocks = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockMerchantFindUnique: vi.fn(),
  mockCustomerFindUnique: vi.fn(),
  mockMerchantUpdate: vi.fn(),
  mockMerchantUpsert: vi.fn(),
}))

// Mock fetch globally
global.fetch = mocks.mockFetch

// Mock database
vi.mock('@homejiak/database', () => ({
  db: {
    merchant: {
      findUnique: mocks.mockMerchantFindUnique,
      update: mocks.mockMerchantUpdate,
      upsert: mocks.mockMerchantUpsert,
    },
    customer: {
      findUnique: mocks.mockCustomerFindUnique
    }
  }
}))

// Set up environment variables
process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789'
process.env.WHATSAPP_ACCESS_TOKEN = 'test_access_token'

// Import after mocking
import { whatsappProvider, whatsappOptIn } from '../whatsapp'

describe('WhatsApp Provider', () => {
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
    it('should send template message to merchant successfully', async () => {
      // Setup mocks
      const merchantData = {
        id: 'merchant-123',
        phone: '91234567',
        businessName: 'Test Restaurant',
        whatsappNotifications: true,
        orderNotificationPhone: null,
      }
      
      mocks.mockMerchantFindUnique.mockResolvedValue(merchantData)
      
      // Mock successful WhatsApp API response
      mocks.mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          messaging_product: 'whatsapp',
          contacts: [{ input: '6591234567', wa_id: '6591234567' }],
          messages: [{ id: 'wamid.123' }]
        })
      })

      // Execute with ORDER_PLACED data to trigger template
      const result = await whatsappProvider.send({
        userId: 'merchant-123',
        title: 'New Order',
        message: 'Order {{orderNumber}} received',
        data: { 
          type: 'ORDER_PLACED',
          orderNumber: 'ORD-001', 
          customerName: 'John Doe',
          amount: 25.00
        }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(result.id).toBe('wamid.123')
      
      // Verify template message was sent
      expect(mocks.mockFetch).toHaveBeenCalledWith(
        `https://graph.facebook.com/v18.0/123456789/messages`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test_access_token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '6591234567',
            type: 'template',
            template: {
              name: 'order_confirmation',
              language: { code: 'en' },
              components: [{
                type: 'body',
                parameters: [
                  { type: 'text', text: 'ORD-001' },
                  { type: 'text', text: 'John Doe' },
                  { type: 'text', text: '25' }
                ]
              }]
            }
          })
        })
      )
    })

    it('should send text message when no template matches', async () => {
      // Setup mocks
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: '91234567',
        businessName: 'Test Restaurant',
        whatsappNotifications: true,
      })
      
      // Mock successful WhatsApp API response
      mocks.mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          messaging_product: 'whatsapp',
          contacts: [{ input: '6591234567', wa_id: '6591234567' }],
          messages: [{ id: 'wamid.456' }]
        })
      })

      // Execute with custom message (no template match)
      const result = await whatsappProvider.send({
        userId: 'merchant-123',
        title: 'Custom Message',
        message: 'Hello {{businessName}}! This is a custom message.',
        data: { type: 'CUSTOM_MESSAGE' }
      })

      // Verify text message was sent
      expect(result.success).toBe(true)
      expect(mocks.mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '6591234567',
            type: 'text',
            text: { body: 'Hello Test Restaurant! This is a custom message.' }
          })
        })
      )
    })

    it('should send to customer successfully', async () => {
      // Setup mocks - merchant returns null, customer succeeds
      mocks.mockMerchantFindUnique.mockResolvedValue(null)
      mocks.mockCustomerFindUnique.mockResolvedValue({
        id: 'customer-123',
        phone: '+6587654321',
        name: 'Jane Smith',
        whatsappNotifications: true,
      })
      
      mocks.mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          messages: [{ id: 'wamid.customer' }]
        })
      })

      // Execute
      const result = await whatsappProvider.send({
        userId: 'customer-123',
        title: 'Order Ready',
        message: 'Your order is ready',
        data: { type: 'ORDER_READY', orderNumber: 'ORD-001' }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(result.id).toBe('wamid.customer')
    })

    it('should handle user not found', async () => {
      // Setup mocks - both return null
      mocks.mockMerchantFindUnique.mockResolvedValue(null)
      mocks.mockCustomerFindUnique.mockResolvedValue(null)

      // Execute
      const result = await whatsappProvider.send({
        userId: 'non-existent',
        title: 'Test',
        message: 'Test message',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should handle user without phone number', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: null,
        businessName: 'Test Restaurant',
        whatsappNotifications: true,
      })

      const result = await whatsappProvider.send({
        userId: 'merchant-123',
        title: 'Test',
        message: 'Test message',
        data: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('No WhatsApp number on file')
    })

    it('should respect WhatsApp notification preferences', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: '91234567',
        businessName: 'Test Restaurant',
        whatsappNotifications: false, // Disabled
      })

      const result = await whatsappProvider.send({
        userId: 'merchant-123',
        title: 'Test',
        message: 'Test message',
        data: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('WhatsApp notifications disabled')
    })

    it('should handle WhatsApp API errors', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: '91234567',
        businessName: 'Test Restaurant',
        whatsappNotifications: true,
      })
      
      // Mock API error response
      mocks.mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            message: 'Invalid phone number format',
            type: 'invalid_parameter',
            code: 100
          }
        })
      })

      const result = await whatsappProvider.send({
        userId: 'merchant-123',
        title: 'Test',
        message: 'Test message',
        data: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid phone number format')
    })

    it('should handle network errors', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        phone: '91234567',
        businessName: 'Test Restaurant',
        whatsappNotifications: true,
      })
      
      // Mock network error
      mocks.mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await whatsappProvider.send({
        userId: 'merchant-123',
        title: 'Test',
        message: 'Test message',
        data: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('formatWhatsAppPhone', () => {
    it('should format 8-digit local numbers (no + prefix)', () => {
      expect(whatsappProvider.formatWhatsAppPhone('91234567')).toBe('6591234567')
    })

    it('should format numbers with leading zero', () => {
      expect(whatsappProvider.formatWhatsAppPhone('091234567')).toBe('6591234567')
    })

    it('should format numbers with +65 prefix', () => {
      expect(whatsappProvider.formatWhatsAppPhone('+6591234567')).toBe('6591234567')
    })

    it('should handle already correct format', () => {
      expect(whatsappProvider.formatWhatsAppPhone('6591234567')).toBe('6591234567')
    })

    it('should return null for invalid formats', () => {
      expect(whatsappProvider.formatWhatsAppPhone('123')).toBe(null)
      expect(whatsappProvider.formatWhatsAppPhone('')).toBe(null)
      expect(whatsappProvider.formatWhatsAppPhone('invalid')).toBe(null)
    })
  })

  describe('selectTemplate', () => {
    it('should select order_confirmation template for ORDER_PLACED', () => {
      const template = whatsappProvider.selectTemplate({ type: 'ORDER_PLACED' })
      expect(template).toEqual({
        name: 'order_confirmation',
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: '' },
            { type: 'text', text: '' },
            { type: 'text', text: '' }
          ]
        }]
      })
    })

    it('should select order_ready template for ORDER_READY', () => {
      const template = whatsappProvider.selectTemplate({ type: 'ORDER_READY' })
      expect(template).toEqual({
        name: 'order_ready',
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: '' },
            { type: 'text', text: '' }
          ]
        }]
      })
    })

    it('should return null for unsupported types', () => {
      const template = whatsappProvider.selectTemplate({ type: 'CUSTOM_MESSAGE' })
      expect(template).toBe(null)
    })
  })
})

describe('WhatsApp Opt-In Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(mocks).forEach(mock => mock.mockClear())
    
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('recordOptIn', () => {
    it('should record opt-in for existing merchant', async () => {
      // Setup existing merchant
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123'
      })
      
      mocks.mockMerchantUpdate.mockResolvedValue({
        id: 'merchant-123',
        whatsappNotifications: true
      })

      // Execute
      await expect(
        whatsappOptIn.recordOptIn('merchant-123', '91234567')
      ).resolves.not.toThrow()

      // Verify
      expect(mocks.mockMerchantFindUnique).toHaveBeenCalledWith({
        where: { id: 'merchant-123' },
        select: { id: true }
      })
      
      expect(mocks.mockMerchantUpdate).toHaveBeenCalledWith({
        where: { id: 'merchant-123' },
        data: {
          phone: '91234567',
          whatsappNotifications: true,
        }
      })
    })

    it('should throw error for non-existent merchant', async () => {
      // Setup: merchant not found
      mocks.mockMerchantFindUnique.mockResolvedValue(null)

      // Execute and verify it throws
      await expect(
        whatsappOptIn.recordOptIn('non-existent', '91234567')
      ).rejects.toThrow('Merchant non-existent not found - cannot record WhatsApp opt-in')

      // Verify database was checked
      expect(mocks.mockMerchantFindUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        select: { id: true }
      })

      // Verify update was never called
      expect(mocks.mockMerchantUpdate).not.toHaveBeenCalled()
    })
  })

  describe('recordOptOut', () => {
    it('should record opt-out for existing merchant', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123'
      })
      
      mocks.mockMerchantUpdate.mockResolvedValue({
        id: 'merchant-123',
        whatsappNotifications: false
      })

      await expect(
        whatsappOptIn.recordOptOut('merchant-123')
      ).resolves.not.toThrow()

      // Verify the update was called (be flexible about the exact data structure)
      expect(mocks.mockMerchantUpdate).toHaveBeenCalledWith({
        where: { id: 'merchant-123' },
        data: expect.objectContaining({
          whatsappNotifications: false,
        })
      })
    })

    it('should throw error for non-existent merchant', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue(null)

      await expect(
        whatsappOptIn.recordOptOut('non-existent')
      ).rejects.toThrow('Merchant non-existent not found - cannot record WhatsApp opt-out')

      // Verify database was checked
      expect(mocks.mockMerchantFindUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        select: { id: true }
      })

      // Verify update was never called
      expect(mocks.mockMerchantUpdate).not.toHaveBeenCalled()
    })
  })

  describe('checkOptInStatus', () => {
    it('should return true for opted-in merchant', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue({
        whatsappNotifications: true
      })

      const result = await whatsappOptIn.checkOptInStatus('merchant-123')
      expect(result).toBe(true)
    })

    it('should return false for opted-out merchant', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue({
        whatsappNotifications: false
      })

      const result = await whatsappOptIn.checkOptInStatus('merchant-123')
      expect(result).toBe(false)
    })

    it('should return false when merchant not found', async () => {
      mocks.mockMerchantFindUnique.mockResolvedValue(null)

      const result = await whatsappOptIn.checkOptInStatus('non-existent')
      expect(result).toBe(false)
    })
  })
})