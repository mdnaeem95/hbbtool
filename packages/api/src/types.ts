// Import all shared types from central package
export * from '@homejiak/types'

// Import specific types we need
import type {
  AuthUser,
  AuthSession,
  Context as BaseContext,
  SupabaseLike,
  SupabaseUser,
  SupabaseSession,
  ErrorCode
} from '@homejiak/types'

export type { AuthUser, AuthSession, SupabaseUser, SupabaseSession, SupabaseLike, BaseContext, ErrorCode }

// Import database client type
import type { db } from '@homejiak/database'

// Re-export for backward compatibility
export type {
  // Enums
  RecipeCategory,
  MeasurementUnit,
  IngredientCategory,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  MerchantStatus,
  DeliveryMethod,
  PaymentMethod,
  
  // DTOs
  CreateOrderDto,
  CreateRecipeDto,
  CustomIngredientDto,
  GlobalIngredientDto,
  IngredientByIdDto,
  
  // Common types
  PaginationInput,
  PaginatedResponse,
  OrderTotals,
  DeliveryEstimate,
  CostConfidence,
} from '@homejiak/types'

// API-specific context extension
export type ApiContext = BaseContext<AuthSession, SupabaseLike> & {
  db: typeof db
  merchant?: any // Add merchant from middleware
  isAdmin?: boolean // Add admin flag from middleware
}

// Keep any API-specific types that don't belong in shared
export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    code: ErrorCode
    message: string
  }
}