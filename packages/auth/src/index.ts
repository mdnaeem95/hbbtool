// packages/auth/src/index.ts

// This is the main entry point - it should export server code for server components
// Client components should import from './client-exports.ts' instead

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

// Types can be exported here as they're safe for both
export * from './types'

// Note: Client utilities should be imported from '@kitchencloud/auth/client'
// to avoid server/client mixing issues