'use client'

// Export types
export type {
  UserType,
  BaseUser,
  MerchantUser,
  CustomerUser,
  AuthUser,
  AuthSession,
  AuthState,
  AuthContextValue,
  SignInParams,
  SignUpParams,
} from './types'

// Export constants
export { AUTH_STORAGE_KEYS, isMerchantUser, isCustomerUser } from './types'

// Export React components and hooks
export { AuthProvider, useAuth } from './provider'

// Export client functions
export { 
  createBrowserSupabaseClient,
  signInMerchant,
  signUpMerchant,
  signInCustomer,
  signOut,
  refreshSession 
} from './client'