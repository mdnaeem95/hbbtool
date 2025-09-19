'use client'

// Export types
export type {
  AuthUser,
  AuthSession,
  AuthState,
  AuthContextValue,
  SignUpParams,
} from './types'

// Export constants
export { AUTH_STORAGE_KEYS, isMerchantUser } from './types'

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