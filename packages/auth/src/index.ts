// Server utilities
export {
  getServerSession,
  requireMerchant,
  getCustomerSession,
  getMerchantById,
  createServerSupabaseClient,
  type AuthUser,
  type MerchantSession,
  type CustomerSession,
} from './server'

// Client utilities
export {
  createBrowserSupabaseClient,
  signInMerchant,
  signUpMerchant,
  signInCustomer,
  signOut,
} from './client'

// Hooks
export { useAuth } from './hooks/use-auth'
export { useMerchant } from './hooks/use-merchant'

// Middleware
export { middleware } from './middleware'
export { config as middlewareConfig } from './middleware'