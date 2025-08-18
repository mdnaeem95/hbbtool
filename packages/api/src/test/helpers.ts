import { db } from '@kitchencloud/database'
import type { Session, Context } from '../types'
import { vi } from 'vitest'

/**
 * Creates a test context for tRPC procedures
 * Bypasses the fetch adapter requirements
 */
export function createTestContext(overrides?: Partial<Context<Session, any>>) {
  const defaultSession: Session = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      userType: 'merchant',
    },
  }

  return {
    db,
    session: defaultSession,
    supabase: {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    },
    req: new Request('http://localhost'),
    resHeaders: new Headers(),
    ip: '127.0.0.1',
    header: (name: string) => undefined,
    ...overrides,
  }
}