// Types
export * from './types'

// Server utilities
export {
  createServerSupabaseClient,
  getAuthSession,
  requireAuth,
  requireMerchant,
  requireCustomer,
  getMerchantById,
  getCustomerById,
} from './server'

// Client utilities  
export {
  createBrowserSupabaseClient,
  signInMerchant,
  signUpMerchant,
  signInCustomer,
  signOut,
  refreshSession,
} from './client'

// React Provider and Hook
export { AuthProvider, useAuth } from './provider'

// Re-export useful Supabase types
export type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js'