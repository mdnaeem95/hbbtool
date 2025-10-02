'use client'

// Import and re-export types from centralized package
export type {
  AuthUser,
  AuthSession,
  AuthState,
  SignUpParams,
  SignInParams,
} from '@homejiak/types'

// Export auth-specific types
export type { AuthContextValue } from './types'

// Export constants from centralized package
export { AUTH_STORAGE_KEYS, isMerchantUser } from '@homejiak/types'

// Export React components and hooks
export { AuthProvider, useAuth } from './provider'

// Export client functions
export { 
  createBrowserSupabaseClient,
  signInMerchant,
  signUpMerchant,
  signOut,
  refreshSession 
} from './client'