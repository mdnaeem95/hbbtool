// packages/auth/src/index.ts

// Server utilities
export {
  createServerSupabaseClient,
  getAuthSession,
  requireAuth,
  requireMerchant,
  getMerchantById,
} from './server'

// Re-export types from centralized package
export type {
  AuthUser,
  AuthSession,
  AuthState,
  SignUpParams,
  SignInParams,
} from '@homejiak/types'

// Export auth-specific types
export type { AuthContextValue } from './types'

// Re-export helpers
export { AUTH_STORAGE_KEYS, isMerchantUser } from '@homejiak/types'

// Note: Client utilities should be imported from '@homejiak/auth/client'