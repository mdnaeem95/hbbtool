import { describe, it, expect, beforeEach, vi } from 'vitest'

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

describe('Email Provider - With Console', () => {
  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test'
    
    // Clear all mocks
    vi.clearAllMocks()
    Object.values(mocks).forEach(mock => mock.mockClear())
    
    // DON'T suppress console logs - we want to see what's happening
  })

  describe('send', () => {
    it('should send email to merchant successfully - with debug output', async () => {
      console.log('=== STARTING TEST ===')
      
      // Setup mocks
      const merchantData = {
        id: 'merchant-123',
        email: 'merchant@example.com',
        businessName: 'Test Business'
      }
      
      console.log('Setting up mocks...')
      mocks.mockMerchantFindUnique.mockResolvedValue(merchantData)
      mocks.mockEmailsSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })
      
      console.log('Mock setup complete. Mock will return:', {
        data: { id: 'email-123' },
        error: null
      })
      console.log('Calling emailProvider.send...')

      // Execute
      const result = await emailProvider.send({
        userId: 'merchant-123',
        subject: 'Test Subject',
        body: 'Test Body',
        data: { orderId: 'order-123' }
      })

      console.log('=== FINAL RESULT ===')
      console.log('Result:', result)
      console.log('Mock calls:')
      console.log('  mockMerchantFindUnique:', mocks.mockMerchantFindUnique.mock.calls)
      console.log('  mockEmailsSend:', mocks.mockEmailsSend.mock.calls)
      console.log('  mockEmailsSend return value:', mocks.mockEmailsSend.mock.results)
      console.log('=== END TEST ===')

      // Verify - but let's see the result first
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
      
      if (!result.success) {
        console.error('TEST FAILED - result.success is false')
        console.error('Expected success but got:', result)
      }
      
      if (result.success && !result.id) {
        console.error('TEST ISSUE - success is true but ID is missing')
        console.error('Result ID:', result.id)
        console.error('Expected ID: email-123')
      }
      
      // Now do the real assertions
      expect(result.success).toBe(true)
      expect(result.id).toBe('email-123')
    })
  })
})