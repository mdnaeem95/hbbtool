import type { Merchant, Customer } from '@kitchencloud/database'

// Unified user types
export type UserType = 'merchant' | 'customer'

export interface BaseUser {
  id: string
  email?: string | null
  phone?: string | null
  userType: UserType
}

export interface MerchantUser extends BaseUser {
  userType: 'merchant'
  email: string
  merchant?: Merchant
}

export interface CustomerUser extends BaseUser {
  userType: 'customer'
  phone: string
  customer?: Customer
}

export type AuthUser = MerchantUser | CustomerUser

// Session types
export interface AuthSession {
  user: AuthUser
  token?: string // For customer sessions
  expiresAt?: Date
}

// Auth state for hooks
export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  isAuthenticated: boolean
  isMerchant: boolean
  isCustomer: boolean
  error: Error | null
}

// Auth context value
export interface AuthContextValue extends AuthState {
  signIn: (params: SignInParams) => Promise<void>
  signUp: (params: SignUpParams) => Promise<void>
  signOut: () => Promise<void>
  verifyOtp: (otp: string) => Promise<void>
  refresh: () => Promise<void>
}

// Auth method params
export type SignInParams = 
  | { type: 'merchant'; email: string; password: string }
  | { type: 'customer'; phone: string; name?: string }

export type SignUpParams = {
  type: 'merchant'
  email: string
  password: string
  businessName: string
  phone: string
}

// Storage keys
export const AUTH_STORAGE_KEYS = {
  CUSTOMER_TOKEN: 'kc_customer_token',
  PENDING_OTP: 'kc_pending_otp',
} as const

// Helpers
export function isMerchantUser(user: AuthUser | null): user is MerchantUser {
  return user?.userType === 'merchant'
}

export function isCustomerUser(user: AuthUser | null): user is CustomerUser {
  return user?.userType === 'customer'
}