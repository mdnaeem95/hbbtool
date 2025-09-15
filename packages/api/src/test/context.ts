import { vi } from 'vitest'
import type { TRPCContext } from '../trpc/context'
import type { AuthSession, MerchantUser, CustomerUser } from '@kitchencloud/auth'
import { db } from '@kitchencloud/database'

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
export function createMerchantSession(overrides?: Partial<Omit<MerchantUser, 'userType'>>): AuthSession {
  const merchantUser: MerchantUser = {
    id: overrides?.id ?? 'merchant-test-123',
    email: overrides?.email ?? 'test@merchant.com',
    userType: 'merchant' as const,
    merchant: overrides?.merchant,
  }

  return {
    user: merchantUser,
    token: 'test-merchant-token',
  }
}

/**
 * Creates a mock customer session for testing
 */
export function createCustomerSession(overrides?: Partial<Omit<CustomerUser, 'userType'>>): AuthSession {
  const customerUser: CustomerUser = {
    id: overrides?.id ?? 'customer-test-456',
    phone: overrides?.phone ?? '91234567',
    email: overrides?.email ?? null,
    userType: 'customer' as const,
    customer: overrides?.customer,
  }

  return {
    user: customerUser,
    token: 'test-customer-token',
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
 * Creates a mock context with customer authentication
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