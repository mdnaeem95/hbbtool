import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { emailProvider } from '../email'

// Mock Resend
const mockResendSend = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}))

// Mock database
const mockMerchantFindUnique = vi.fn()
const mockCustomerFindUnique = vi.fn()

vi.mock('@kitchencloud/database', () => ({
  db: {
    merchant: {
      findUnique: mockMerchantFindUnique,
    },
    customer: {
      findUnique: mockCustomerFindUnique,
    },
  },
}))

describe('EmailProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set required environment variables
    process.env.RESEND_API_KEY = 'test_api_key'
    process.env.RESEND_FROM_EMAIL = 'test@kitchencloud.sg'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('send', () => {
    it('successfully sends email to merchant', async () => {
      // Mock merchant data
      mockMerchantFindUnique.mockResolvedValue({
        email: 'merchant@example.com',
        businessName: 'Test Restaurant',
        contactName: 'John Doe',
      })

      // Mock successful Resend response
      mockResendSend.mockResolvedValue({
        data: { id: 'email_123' },
        error: null,
      })

      const result = await emailProvider.send({
        userId: 'merchant_123',
        subject: 'New Order',
        body: 'You have a new order #ORD001',
        data: {
          type: 'ORDER_PLACED',
          orderNumber: 'ORD001',
          customerName: 'Jane Smith',
          amount: 25.50,
        },
      })

      expect(result).toEqual({
        id: 'email_123',
        success: true,
      })

      expect(mockMerchantFindUnique).toHaveBeenCalledWith({
        where: { id: 'merchant_123' },
        select: { email: true, businessName: true, contactName: true },
      })

      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'test@kitchencloud.sg',
        to: 'merchant@example.com',
        subject: 'New Order',
        html: expect.stringContaining('You have a new order #ORD001'),
        text: expect.stringContaining('You have a new order #ORD001'),
        tags: [
          { name: 'service', value: 'notifications' },
          { name: 'type', value: 'ORDER_PLACED' },
          { name: 'userId', value: 'merchant_123' },
        ],
      })
    })

    it('successfully sends email to customer', async () => {
      // Merchant not found, try customer
      mockMerchantFindUnique.mockResolvedValue(null)
      mockCustomerFindUnique.mockResolvedValue({
        email: 'customer@example.com',
        name: 'Jane Smith',
        preferredName: 'Jane',
      })

      mockResendSend.mockResolvedValue({
        data: { id: 'email_456' },
        error: null,
      })

      const result = await emailProvider.send({
        userId: 'customer_123',
        subject: 'Order Confirmed',
        body: 'Your order #ORD001 has been confirmed',
        data: {
          type: 'ORDER_CONFIRMED',
          orderNumber: 'ORD001',
        },
      })

      expect(result).toEqual({
        id: 'email_456',
        success: true,
      })

      expect(mockCustomerFindUnique).toHaveBeenCalledWith({
        where: { id: 'customer_123' },
        select: { email: true, name: true, preferredName: true },
      })
    })

    it('handles user not found', async () => {
      mockMerchantFindUnique.mockResolvedValue(null)
      mockCustomerFindUnique.mockResolvedValue(null)

      const result = await emailProvider.send({
        userId: 'nonexistent_123',
        subject: 'Test',
        body: 'Test message',
        data: {},
      })

      expect(result).toEqual({
        id: '',
        success: false,
      })

      expect(mockResendSend).not.toHaveBeenCalled()
    })

    it('handles user without email', async () => {
      mockMerchantFindUnique.mockResolvedValue({
        email: null,
        businessName: 'Test Restaurant',
      })

      const result = await emailProvider.send({
        userId: 'merchant_no_email',
        subject: 'Test',
        body: 'Test message',
        data: {},
      })

      expect(result).toEqual({
        id: '',
        success: false,
      })

      expect(mockResendSend).not.toHaveBeenCalled()
    })

    it('handles Resend API error', async () => {
      mockMerchantFindUnique.mockResolvedValue({
        email: 'merchant@example.com',
        businessName: 'Test Restaurant',
      })

      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'API rate limit exceeded' },
      })

      const result = await emailProvider.send({
        userId: 'merchant_123',
        subject: 'Test',
        body: 'Test message',
        data: {},
      })

      expect(result).toEqual({
        id: '',
        success: false,
      })
    })

    it('handles network/connection errors', async () => {
      mockMerchantFindUnique.mockResolvedValue({
        email: 'merchant@example.com',
        businessName: 'Test Restaurant',
      })

      mockResendSend.mockRejectedValue(new Error('Network error'))

      const result = await emailProvider.send({
        userId: 'merchant_123',
        subject: 'Test',
        body: 'Test message',
        data: {},
      })

      expect(result).toEqual({
        id: '',
        success: false,
      })
    })

    it('generates proper HTML with order details', async () => {
      mockMerchantFindUnique.mockResolvedValue({
        email: 'merchant@example.com',
        businessName: 'Test Restaurant',
        contactName: 'John Doe',
      })

      mockResendSend.mockResolvedValue({
        data: { id: 'email_123' },
        error: null,
      })

      await emailProvider.send({
        userId: 'merchant_123',
        subject: 'New Order',
        body: 'You have a new order',
        data: {
          orderNumber: 'ORD001',
          customerName: 'Jane Smith',
          amount: 25.50,
          orderId: 'order_123',
        },
      })

      const htmlContent = mockResendSend.mock.calls[0][0].html

      // Check for key elements in HTML
      expect(htmlContent).toContain('KitchenCloud')
      expect(htmlContent).toContain('Hi John Doe')
      expect(htmlContent).toContain('You have a new order')
      expect(htmlContent).toContain('Order Number: ORD001')
      expect(htmlContent).toContain('Customer: Jane Smith')
      expect(htmlContent).toContain('Amount: $25.5')
      expect(htmlContent).toContain('View Order')
      expect(htmlContent).toContain('/dashboard/orders/order_123')
    })

    it('generates proper text version', async () => {
      mockMerchantFindUnique.mockResolvedValue({
        email: 'merchant@example.com',
        businessName: 'Test Restaurant',
      })

      mockResendSend.mockResolvedValue({
        data: { id: 'email_123' },
        error: null,
      })

      await emailProvider.send({
        userId: 'merchant_123',
        subject: 'New Order',
        body: 'You have a new order',
        data: {
          orderNumber: 'ORD001',
          customerName: 'Jane Smith',
          amount: 25.50,
        },
      })

      const textContent = mockResendSend.mock.calls[0][0].text

      expect(textContent).toContain('Hi there')
      expect(textContent).toContain('You have a new order')
      expect(textContent).toContain('Order: ORD001')
      expect(textContent).toContain('Customer: Jane Smith')
      expect(textContent).toContain('Amount: $25.5')
      expect(textContent).toContain('KitchenCloud')
    })
  })

  describe('constructor', () => {
    it('throws error when RESEND_API_KEY is missing', () => {
      delete process.env.RESEND_API_KEY

      expect(() => {
        // This will trigger the constructor
        const { Resend } = require('resend')
        new Resend()
      }).toThrow('RESEND_API_KEY environment variable is required')
    })
  })
})