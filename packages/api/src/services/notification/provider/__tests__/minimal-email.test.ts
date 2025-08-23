import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Use vi.hoisted for mock functions
const mocks = vi.hoisted(() => ({
  mockEmailsSend: vi.fn(),
  mockMerchantFindUnique: vi.fn(),
  mockCustomerFindUnique: vi.fn(),
}))

// Mock modules at the top level
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { 
      send: mocks.mockEmailsSend 
    }
  }))
}))

vi.mock('@kitchencloud/database', () => ({
  db: {
    merchant: {
      findUnique: mocks.mockMerchantFindUnique
    },
    customer: {
      findUnique: mocks.mockCustomerFindUnique
    }
  }
}))

// Import after mocking
import { emailProvider } from '../email'

describe('Email Provider', () => {
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
    it('should send email to merchant successfully', async () => {
      // Setup mocks
      const merchantData = {
        id: 'merchant-123',
        email: 'merchant@example.com',
        businessName: 'Test Business'
      }
      
      mocks.mockMerchantFindUnique.mockResolvedValue(merchantData)
      mocks.mockEmailsSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      // Execute
      const result = await emailProvider.send({
        userId: 'merchant-123',
        subject: 'Test Subject',
        body: 'Test Body',
        data: { orderId: 'order-123' }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(result.id).toBe('email-123')
      
      expect(mocks.mockMerchantFindUnique).toHaveBeenCalledWith({
        where: { id: 'merchant-123' },
        select: { email: true, businessName: true }
      })
      
      expect(mocks.mockEmailsSend).toHaveBeenCalledWith({
        from: 'KitchenCloud <noreply@kitchencloud.sg>',
        to: 'merchant@example.com',
        subject: 'Test Subject',
        html: expect.stringContaining('Test Business')
      })
    })

    it('should send email to customer successfully', async () => {
      // Setup mocks - merchant returns null, customer succeeds
      mocks.mockMerchantFindUnique.mockResolvedValue(null)
      mocks.mockCustomerFindUnique.mockResolvedValue({
        id: 'customer-123',
        email: 'customer@example.com',
        name: 'John Doe'
      })
      
      mocks.mockEmailsSend.mockResolvedValue({
        data: { id: 'email-456' },
        error: null
      })

      // Execute
      const result = await emailProvider.send({
        userId: 'customer-123',
        subject: 'Test Subject',
        body: 'Test Body',
        data: { orderId: 'order-123' }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(result.id).toBe('email-456')
      
      expect(mocks.mockCustomerFindUnique).toHaveBeenCalledWith({
        where: { id: 'customer-123' },
        select: { email: true, name: true }
      })
    })

    it('should handle user not found', async () => {
      // Setup mocks - both return null
      mocks.mockMerchantFindUnique.mockResolvedValue(null)
      mocks.mockCustomerFindUnique.mockResolvedValue(null)

      // Execute
      const result = await emailProvider.send({
        userId: 'non-existent',
        subject: 'Test',
        body: 'Test',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        '[email.provider] User not found:',
        'non-existent'
      )
    })

    it('should handle Resend API errors', async () => {
      // Setup mocks
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        email: 'merchant@example.com',
        businessName: 'Test Business'
      })
      
      // Mock Resend error response
      mocks.mockEmailsSend.mockResolvedValue({
        data: null,
        error: {
          message: 'API key invalid',
          name: 'validation_error'
        }
      })

      // Execute
      const result = await emailProvider.send({
        userId: 'merchant-123',
        subject: 'Test',
        body: 'Test',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        '[email.provider] Resend error:',
        expect.objectContaining({
          message: 'API key invalid'
        })
      )
    })

    it('should handle database errors', async () => {
      // Setup mock to throw error
      mocks.mockMerchantFindUnique.mockRejectedValue(
        new Error('Database connection failed')
      )

      // Execute
      const result = await emailProvider.send({
        userId: 'merchant-123',
        subject: 'Test',
        body: 'Test',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        '[email.provider] Database error:',
        expect.any(Error)
      )
    })

    it('should handle Resend send exceptions', async () => {
      // Setup mocks
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        email: 'merchant@example.com',
        businessName: 'Test Business'
      })
      
      // Mock Resend throwing exception
      mocks.mockEmailsSend.mockRejectedValue(new Error('Network error'))

      // Execute
      const result = await emailProvider.send({
        userId: 'merchant-123',
        subject: 'Test',
        body: 'Test',
        data: {}
      })

      // Verify
      expect(result.success).toBe(false)
      expect(console.error).toHaveBeenCalledWith(
        '[email.provider] Send failed:',
        expect.any(Error)
      )
    })

    it('should format email with business name', async () => {
      // Setup mocks
      mocks.mockMerchantFindUnique.mockResolvedValue({
        id: 'merchant-123',
        email: 'merchant@example.com',
        businessName: 'Amazing Kitchen'
      })
      
      mocks.mockEmailsSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      // Execute
      const result = await emailProvider.send({
        userId: 'merchant-123',
        subject: 'Order Confirmation',
        body: 'Your order has been confirmed',
        data: { orderNumber: 'ORD-001' }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(mocks.mockEmailsSend).toHaveBeenCalledWith({
        from: 'KitchenCloud <noreply@kitchencloud.sg>',
        to: 'merchant@example.com',
        subject: 'Order Confirmation',
        html: expect.stringContaining('Amazing Kitchen')
      })
    })

    it('should include data in email template', async () => {
      // Setup mocks
      mocks.mockMerchantFindUnique.mockResolvedValue(null)
      mocks.mockCustomerFindUnique.mockResolvedValue({
        id: 'customer-123',
        email: 'customer@example.com',
        name: 'John Doe'
      })
      
      mocks.mockEmailsSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      // Execute
      const result = await emailProvider.send({
        userId: 'customer-123',
        subject: 'Order Update',
        body: 'Your order {{orderNumber}} for ${{amount}} has been updated',
        data: {
          orderNumber: 'ORD-001',
          amount: 25.50
        }
      })

      // Verify
      expect(result.success).toBe(true)
      expect(mocks.mockEmailsSend).toHaveBeenCalledWith({
        from: 'KitchenCloud <noreply@kitchencloud.sg>',
        to: 'customer@example.com',
        subject: 'Order Update',
        html: expect.stringContaining('ORD-001')
      })
    })
  })
})