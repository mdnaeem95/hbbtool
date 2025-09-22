export interface AuthDeps<Session = unknown, SupabaseClient = unknown> {
  getSession(): Promise<Session | null>
  getSupabase(): SupabaseClient
}

export interface AuthUser {
  id: string
  email: string
  userType: 'merchant' | 'customer'
}

export interface Session {
  user: AuthUser
}

// Use the actual db value type without importing it as a value here.
type DBClient = typeof import('@homejiak/database').db

export type Context<S = unknown, SC = unknown> = {
  db: DBClient
  session: S | null
  supabase: SC
  req: Request
  /** Optional fetch Response (not used by fetch adapter, but available) */
  res?: Response
  /** Populated by fetch adapter, use this to set headers (e.g., cookies) */
  resHeaders?: Headers
  ip?: string
  header(name: string): string | undefined
}

// Common helpers (unchanged)
export interface PaginationInput {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

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

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'

  export interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

export interface SupabaseSession {
  // add fields you actually read; keep it loose
  [k: string]: unknown
}

export interface SupabaseAuthAPI {
  signUp(args: {
    email: string
    password: string
    options?: { data?: Record<string, unknown> }
  }): Promise<{ data: { user: SupabaseUser | null; session: SupabaseSession | null }; error: { message: string } | null }>

  signInWithPassword(args: {
    email: string
    password: string
  }): Promise<{ data: { user: SupabaseUser | null; session: SupabaseSession | null }; error: { message: string } | null }>

  signOut(): Promise<{ error: { message: string } | null }>
}

export interface SupabaseLike {
  auth: SupabaseAuthAPI
}