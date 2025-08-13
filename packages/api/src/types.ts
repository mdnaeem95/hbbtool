import type { DB } from '@kitchencloud/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  userType: 'merchant' | 'customer'
}

export interface Session {
  user: AuthUser
}

export interface Context<Req = unknown, Res = unknown> {
  db: DB
  session: Session | null
  supabase: SupabaseClient
  req: Req
  res: Res
  ip?: string
  header: (name: string) => string | undefined
}

// Input types for common operations
export interface PaginationInput {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Business logic types
export interface OrderTotals {
  subtotal: number
  discount: number
  tax: number
  deliveryFee: number
  total: number
}

export interface DeliveryEstimate {
  min: number
  max: number
}

// Error types
export type ErrorCode = 
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'