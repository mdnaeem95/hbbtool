// packages/auth/src/types.ts

// Import shared types from central package
import type { 
  Merchant,
  AuthUser as BaseAuthUser,
  AuthSession as BaseAuthSession,
  AuthState as BaseAuthState,
  SignUpParams as BaseSignUpParams,
} from '@homejiak/types'

// Re-export the base types
export type { 
  AuthUser,
  AuthSession,
  AuthState,
  SignUpParams,
  SignInParams 
} from '@homejiak/types'

// Re-export helpers and constants
export { 
  AUTH_STORAGE_KEYS, 
  isMerchantUser 
} from '@homejiak/types'

// Auth-specific extensions (if needed)
export interface AuthContextValue extends BaseAuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (params: BaseSignUpParams) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

// Supabase-specific types (keep these here as they're auth-specific)
export interface SupabaseAuthSession {
  access_token: string
  refresh_token?: string
  expires_at?: number
  user: {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }
}

export type { Merchant, BaseAuthUser, BaseAuthSession, BaseAuthState, BaseSignUpParams }