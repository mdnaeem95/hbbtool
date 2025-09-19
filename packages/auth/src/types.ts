import type { Merchant } from '@kitchencloud/database'

// Auth user type - merchants only
export interface AuthUser {
  id: string
  email: string
  merchant?: Merchant
}

// Session types
export interface AuthSession {
  user: AuthUser
  expiresAt?: Date
}

// Auth state for hooks
export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  isAuthenticated: boolean
  isMerchant: boolean
  error: Error | null
}

// Auth context value
export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (params: SignUpParams) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

// Auth method params
export type SignUpParams = {
  email: string
  password: string
  businessName: string
  phone: string
}

// Storage keys - if you need any for merchant sessions
export const AUTH_STORAGE_KEYS = {
  // Add any merchant-specific storage keys if needed
} as const

// Helper - simplified since we only have merchants
export function isMerchantUser(user: AuthUser | null): user is AuthUser {
  return !!user
}