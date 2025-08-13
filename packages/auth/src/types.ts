export type UserRole = 'merchant' | 'customer'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

export interface MerchantSignUpData {
  email: string
  password: string
  businessName: string
  phone: string
  cuisineType?: string[]
  description?: string
}

export interface CustomerSignUpData {
  email: string
  password: string
  name: string
  phone: string
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthError {
  message: string
  code?: string
}