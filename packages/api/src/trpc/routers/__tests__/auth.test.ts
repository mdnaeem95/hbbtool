import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TRPCError } from '@trpc/server'
import { authRouter } from '../auth'
import { db, cache } from '@kitchencloud/database'
import bcrypt from 'bcryptjs'
import type { AuthSession } from '@kitchencloud/auth'

// Mock dependencies
vi.mock('@kitchencloud/database', () => ({
  db: {
    merchant: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
  cache: {
    set: vi.fn(() => Promise.resolve('OK')),
    get: vi.fn(() => Promise.resolve(null)),
    del: vi.fn(() => Promise.resolve(1)),
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn((password) => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn(),
  },
}))

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test_nanoid_123'),
}))

vi.mock('../../../utils/slug', () => ({
  slugify: vi.fn((text) => text.toLowerCase().replace(/\s+/g, '-')),
}))

// Define Context type for testing
interface Context {
  db: typeof db
  session: AuthSession | null
  supabase: any
  req: Request
  resHeaders: Headers
  ip?: string
}

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
}

// Helper to create test context
const createTestContext = (session: AuthSession | null = null, customHeaders?: Record<string, string>): Context => {
  const headers = new Headers(customHeaders)
  
  return {
    session,
    db,
    supabase: mockSupabase,
    req: new Request('http://localhost:3000', { headers }),
    resHeaders: new Headers(),
    ip: '127.0.0.1',
  }
}

// Helper to create caller
const createCaller = (session: AuthSession | null = null, customHeaders?: Record<string, string>) => {
  const context = createTestContext(session, customHeaders)
  return authRouter.createCaller(context)
}

describe('Auth Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set test environment
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSession', () => {
    it('should return null when no session exists', async () => {
      const caller = createCaller(null)
      const result = await caller.getSession()
      
      expect(result).toBeNull()
    })

    it('should return session data when authenticated', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'merchant-123',
          email: 'test@merchant.com',
          userType: 'merchant',
          merchant: {
            id: 'merchant-123',
            email: 'test@merchant.com',
            businessName: 'Test Restaurant',
            phone: '91234567',
            status: 'ACTIVE',
          } as any,
        },
      }

      const caller = createCaller(mockSession)
      const result = await caller.getSession()
      
      expect(result).toEqual({
        user: mockSession.user,
        type: 'merchant',
      })
    })
  })

  describe('merchantSignUp', () => {
    const validInput = {
      email: 'new@merchant.com',
      password: 'password123',
      businessName: 'New Restaurant',
      phone: '91234567',
    }

    it('should create a new merchant account successfully', async () => {
      const caller = createCaller()
      
      // Mock database checks
      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)
      
      // Mock Supabase signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'supabase-user-123',
            email: validInput.email,
            user_metadata: { userType: 'merchant' },
          },
        },
        error: null,
      })

      // Mock merchant creation
      const mockMerchant = {
        id: 'supabase-user-123',
        email: validInput.email,
        phone: validInput.phone,
        businessName: validInput.businessName,
        slug: 'new-restaurant',
        status: 'PENDING_VERIFICATION',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(db.merchant.create).mockResolvedValue(mockMerchant as any)

      const result = await caller.merchantSignUp(validInput)

      expect(result).toEqual({
        user: {
          id: 'supabase-user-123',
          email: validInput.email,
          userType: 'merchant',
        },
        merchant: mockMerchant,
      })

      // Verify correct calls
      expect(db.merchant.findUnique).toHaveBeenCalledWith({
        where: { email: validInput.email },
      })
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: validInput.email,
        password: validInput.password,
        options: {
          data: { userType: 'merchant' },
        },
      })

      expect(bcrypt.hash).toHaveBeenCalledWith(validInput.password, 10)
      
      expect(db.merchant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'supabase-user-123',
          email: validInput.email,
          phone: validInput.phone,
          businessName: validInput.businessName,
          slug: 'new-restaurant',
          password: `hashed_${validInput.password}`,
          status: 'PENDING_VERIFICATION',
        }),
      })
    })

    it('should throw error if email already exists', async () => {
      const caller = createCaller()
      
      vi.mocked(db.merchant.findUnique).mockResolvedValue({
        id: 'existing-merchant',
        email: validInput.email,
      } as any)

      await expect(
        caller.merchantSignUp(validInput)
      ).rejects.toThrow(TRPCError)

      await expect(
        caller.merchantSignUp(validInput)
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message: 'Email already registered',
      })
    })

    it('should handle Supabase signup failure', async () => {
      const caller = createCaller()
      
      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Supabase error' },
      })

      await expect(
        caller.merchantSignUp(validInput)
      ).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Supabase error',
      })
    })

    it('should validate phone number format', async () => {
      const caller = createCaller()
      
      const invalidPhones = ['12345678', '71234567', '+6512345678', 'abcdefgh']
      
      for (const phone of invalidPhones) {
        await expect(
          caller.merchantSignUp({ ...validInput, phone })
        ).rejects.toThrow()
      }
    })

    it('should validate email format', async () => {
      const caller = createCaller()
      
      await expect(
        caller.merchantSignUp({ ...validInput, email: 'invalid-email' })
      ).rejects.toThrow()
    })

    it('should validate password length', async () => {
      const caller = createCaller()
      
      await expect(
        caller.merchantSignUp({ ...validInput, password: 'short' })
      ).rejects.toThrow()
    })
  })

  describe('merchantSignIn', () => {
    const validCredentials = {
      email: 'test@merchant.com',
      password: 'password123',
    }

    it('should sign in merchant successfully', async () => {
      const caller = createCaller()
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'merchant-123',
            email: validCredentials.email,
            user_metadata: { userType: 'merchant' },
          },
        },
        error: null,
      })

      const mockMerchant = {
        id: 'merchant-123',
        email: validCredentials.email,
        businessName: 'Test Restaurant',
        phone: '91234567',
        status: 'ACTIVE',
      }
      vi.mocked(db.merchant.findUnique).mockResolvedValue(mockMerchant as any)

      const result = await caller.merchantSignIn(validCredentials)

      expect(result).toEqual({
        user: {
          id: 'merchant-123',
          email: validCredentials.email,
          userType: 'merchant',
        },
        merchant: mockMerchant,
      })
    })

    it('should reject invalid credentials', async () => {
      const caller = createCaller()
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      })

      await expect(
        caller.merchantSignIn(validCredentials)
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      })
    })

    it('should reject non-merchant accounts', async () => {
      const caller = createCaller()
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'customer-123',
            email: validCredentials.email,
            user_metadata: { userType: 'customer' },
          },
        },
        error: null,
      })

      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      await expect(
        caller.merchantSignIn(validCredentials)
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Not a merchant account',
      })

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should handle missing merchant profile', async () => {
      const caller = createCaller()
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'merchant-123',
            email: validCredentials.email,
            user_metadata: { userType: 'merchant' },
          },
        },
        error: null,
      })

      vi.mocked(db.merchant.findUnique).mockResolvedValue(null)

      await expect(
        caller.merchantSignIn(validCredentials)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Merchant profile not found',
      })
    })
  })

  describe('customerSignIn', () => {
    const validInput = {
      phone: '91234567',
      name: 'John Doe',
    }

    it('should create new customer and send OTP', async () => {
      const caller = createCaller()
      
      vi.mocked(db.customer.findUnique).mockResolvedValue(null)
      
      const mockCustomer = {
        id: 'customer-123',
        phone: validInput.phone,
        name: validInput.name,
        phoneVerified: false,
      }
      vi.mocked(db.customer.create).mockResolvedValue(mockCustomer as any)
      
      vi.mocked(cache.set).mockResolvedValue('OK')

      const result = await caller.customerSignIn(validInput)

      expect(result).toMatchObject({
        customerId: 'customer-123',
        message: 'OTP sent to your phone',
      })

      expect(db.customer.create).toHaveBeenCalledWith({
        data: {
          phone: validInput.phone,
          name: validInput.name,
          phoneVerified: false,
        },
      })

      expect(cache.set).toHaveBeenCalledWith(
        'otp:customer-123',
        expect.objectContaining({
          otp: expect.stringMatching(/^\d{6}$/),
          attempts: 0,
        }),
        300
      )
    })

    it('should use existing customer if phone exists', async () => {
      const caller = createCaller()
      
      const mockCustomer = {
        id: 'existing-customer',
        phone: validInput.phone,
        name: 'Existing User',
        phoneVerified: true,
      }
      vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer as any)
      
      vi.mocked(cache.set).mockResolvedValue('OK')

      const result = await caller.customerSignIn(validInput)

      expect(result.customerId).toBe('existing-customer')
      expect(db.customer.create).not.toHaveBeenCalled()
    })

    it('should include OTP in development mode', async () => {
      process.env.NODE_ENV = 'development'
      const caller = createCaller()
      
      vi.mocked(db.customer.findUnique).mockResolvedValue(null)
      vi.mocked(db.customer.create).mockResolvedValue({
        id: 'customer-123',
        phone: validInput.phone,
      } as any)
      vi.mocked(cache.set).mockResolvedValue('OK')

      const result = await caller.customerSignIn(validInput)

      expect(result).toHaveProperty('otp')
      expect(result.otp).toMatch(/^\d{6}$/)
    })

    it('should validate Singapore phone numbers', async () => {
      const caller = createCaller()
      
      const invalidPhones = ['12345678', '71234567', 'abcdefgh']
      
      for (const phone of invalidPhones) {
        await expect(
          caller.customerSignIn({ phone, name: 'Test' })
        ).rejects.toThrow()
      }

      // Valid formats
      const validPhones = ['91234567', '81234567', '+6591234567']
      vi.mocked(db.customer.findUnique).mockResolvedValue(null)
      vi.mocked(db.customer.create).mockResolvedValue({ id: 'customer-123' } as any)
      
      for (const phone of validPhones) {
        await expect(
          caller.customerSignIn({ phone, name: 'Test' })
        ).resolves.toBeDefined()
      }
    })
  })

  describe('verifyOtp', () => {
    const validInput = {
      customerId: 'customer-123',
      otp: '123456',
    }

    it('should verify OTP and create session successfully', async () => {
      const caller = createCaller(null, { 'user-agent': 'Test Browser' })
      
      vi.mocked(cache.get).mockResolvedValue({
        otp: '123456',
        attempts: 0,
      })

      const mockCustomer = {
        id: 'customer-123',
        phone: '91234567',
        name: 'John Doe',
      }
      vi.mocked(db.customer.findUnique).mockResolvedValue(mockCustomer as any)
      const updatedCustomer = {
        ...mockCustomer,
        phoneVerified: true
        }
        vi.mocked(db.customer.update).mockResolvedValue(updatedCustomer as any)
      
      vi.mocked(db.session.create).mockResolvedValue({
        id: 'session-123',
        token: 'sess_test_nanoid_123',
      } as any)
      
      vi.mocked(cache.del).mockResolvedValue(1)

      const result = await caller.verifyOtp(validInput)

      expect(result).toEqual({
        customer: {
            id: 'customer-123',
            phone: '91234567',
            name: 'John Doe',
        },
        sessionToken: 'sess_test_nanoid_123',
        })

      expect(db.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-123' },
        data: { phoneVerified: true },
      })

      expect(db.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'sess_test_nanoid_123',
          customerId: 'customer-123',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Browser',
          expiresAt: expect.any(Date),
        }),
      })

      expect(cache.del).toHaveBeenCalledWith('otp:customer-123')
    })

    it('should reject invalid OTP', async () => {
      const caller = createCaller()
      
      vi.mocked(cache.get).mockResolvedValue({
        otp: '654321',
        attempts: 0,
      })

      await expect(
        caller.verifyOtp(validInput)
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid OTP',
      })

      // Verify attempts were incremented
      expect(cache.set).toHaveBeenCalledWith(
        'otp:customer-123',
        expect.objectContaining({
          otp: '654321',
          attempts: 1,
        }),
        300
      )
    })

    it('should reject after too many attempts', async () => {
      const caller = createCaller()
      
      vi.mocked(cache.get).mockResolvedValue({
        otp: '123456',
        attempts: 3,
      })

      await expect(
        caller.verifyOtp(validInput)
      ).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts. Please request a new OTP.',
      })
    })

    it('should handle expired OTP', async () => {
      const caller = createCaller()
      
      vi.mocked(cache.get).mockResolvedValue(null)

      await expect(
        caller.verifyOtp(validInput)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'OTP expired or not found',
      })
    })

    it('should handle missing customer', async () => {
      const caller = createCaller()
      
      vi.mocked(cache.get).mockResolvedValue({
        otp: '123456',
        attempts: 0,
      })
      
      vi.mocked(db.customer.findUnique).mockResolvedValue(null)

      await expect(
        caller.verifyOtp(validInput)
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Customer not found',
      })
    })
  })

  describe('signOut', () => {
    it('should sign out merchant successfully', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'merchant-123',
          email: 'test@merchant.com',
          userType: 'merchant',
        },
      }

      const caller = createCaller(mockSession)
      
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      const result = await caller.signOut()

      expect(result).toEqual({ success: true })
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('should sign out customer and invalidate token', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'customer-123',
          email: 'customer@test.com',
          userType: 'customer',
        },
        token: 'sess_customer_token',
      } as any

      const caller = createCaller(mockSession)
      
      vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 1 } as any)

      const result = await caller.signOut()

      expect(result).toEqual({ success: true })
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { token: 'sess_customer_token' },
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)
      
      await expect(caller.signOut()).rejects.toThrow()
    })
  })

  describe('refreshSession', () => {
    it('should refresh merchant session via Supabase', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'merchant-123',
          email: 'test@merchant.com',
          userType: 'merchant',
        },
      }

      const caller = createCaller(mockSession)
      
      mockSupabase.auth.refreshSession.mockResolvedValue({ error: null })

      const result = await caller.refreshSession()

      expect(result).toEqual({ success: true })
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled()
    })

    it('should extend customer session expiry', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'customer-123',
          email: 'customer@test.com',
          userType: 'customer',
        },
        token: 'sess_customer_token',
      } as any

      const caller = createCaller(mockSession)
      
      vi.mocked(db.session.update).mockResolvedValue({} as any)

      const result = await caller.refreshSession()

      expect(result).toEqual({ success: true })
      expect(db.session.update).toHaveBeenCalledWith({
        where: { token: 'sess_customer_token' },
        data: {
          expiresAt: expect.any(Date),
        },
      })
    })

    it('should handle Supabase refresh failure', async () => {
      const mockSession: AuthSession = {
        user: {
          id: 'merchant-123',
          email: 'test@merchant.com',
          userType: 'merchant',
        },
      }

      const caller = createCaller(mockSession)
      
      mockSupabase.auth.refreshSession.mockResolvedValue({
        error: { message: 'Session expired' },
      })

      await expect(
        caller.refreshSession()
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Failed to refresh session',
      })
    })

    it('should require authentication', async () => {
      const caller = createCaller(null)
      
      await expect(caller.refreshSession()).rejects.toThrow()
    })
  })

  describe('Input Validation', () => {
    it('should validate email format across all endpoints', async () => {
      const caller = createCaller()
      const invalidEmails = ['notanemail', '@invalid.com', 'test@', 'test@.com']
      
      for (const email of invalidEmails) {
        await expect(
          caller.merchantSignUp({
            email,
            password: 'password123',
            businessName: 'Test',
            phone: '91234567',
          })
        ).rejects.toThrow()
        
        await expect(
          caller.merchantSignIn({
            email,
            password: 'password123',
          })
        ).rejects.toThrow()
      }
    })

    it('should validate password requirements', async () => {
      const caller = createCaller()
      const invalidPasswords = ['short', '', 'a'.repeat(101)]
      
      for (const password of invalidPasswords) {
        await expect(
          caller.merchantSignUp({
            email: 'test@test.com',
            password,
            businessName: 'Test',
            phone: '91234567',
          })
        ).rejects.toThrow()
      }
    })

    it('should validate OTP format', async () => {
      const caller = createCaller()
      const invalidOtps = ['12345', '1234567', 'abcdef', '']
      
      for (const otp of invalidOtps) {
        await expect(
          caller.verifyOtp({
            customerId: 'customer-123',
            otp,
          })
        ).rejects.toThrow()
      }
    })
  })
})