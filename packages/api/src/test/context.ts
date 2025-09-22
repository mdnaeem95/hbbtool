import { vi } from 'vitest'
import type { TRPCContext } from '../trpc/context'
import type { AuthSession } from '@homejiak/auth'
import { db } from '@homejiak/database'

/**
 * Creates a mock tRPC context for testing
 */
export function createMockContext(options?: {
  session?: AuthSession | null
  ip?: string
  headers?: Record<string, string>
}): TRPCContext {
  const mockRequest = new Request('http://localhost:3000/api/trpc', {
    headers: new Headers(options?.headers || { cookie: 'test-cookie' }),
  })

  return {
    db,
    session: options?.session ?? null,
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as any,
    req: mockRequest,
    resHeaders: new Headers(),
    ip: options?.ip ?? '127.0.0.1',
  }
}

/**
 * Creates a mock merchant session for testing
 */
export function createMerchantSession(overrides?: {
  id?: string
  email?: string
  merchant?: any
}): AuthSession {
  return {
    user: {
      id: overrides?.id ?? 'merchant-test-123',
      email: overrides?.email ?? 'test@merchant.com',
      merchant: overrides?.merchant ?? {
        id: overrides?.id ?? 'merchant-test-123',
        email: overrides?.email ?? 'test@merchant.com',
        businessName: 'Test Restaurant',
        phone: '91234567',
        status: 'ACTIVE',
      },
    },
  }
}

/**
 * Creates a mock customer session for testing
 * Note: Since customer auth is removed, this might be used for 
 * temporary/guest sessions or notification context only
 */
export function createCustomerSession(overrides?: {
  id?: string
  phone?: string
  email?: string | null
  customer?: any
}): AuthSession {
  return {
    user: {
      id: overrides?.id ?? 'customer-test-456',
      email: overrides?.email ?? '',
    },
  }
}

/**
 * Creates a mock context with merchant authentication
 */
export function createMerchantContext(merchantId?: string): TRPCContext {
  return createMockContext({
    session: createMerchantSession({ id: merchantId }),
  })
}

/**
 * Creates a mock context with customer session (for notifications/orders)
 * Note: This may be a temporary session created during order placement
 */
export function createCustomerContext(customerId?: string): TRPCContext {
  return createMockContext({
    session: createCustomerSession({ id: customerId }),
  })
}

/**
 * Creates an unauthenticated context for testing
 */
export function createUnauthContext(): TRPCContext {
  return createMockContext({ session: null })
}