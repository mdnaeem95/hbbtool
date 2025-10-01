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

export enum IngredientCategory {
  FLOUR_GRAINS = "FLOUR_GRAINS",
  DAIRY_EGGS = "DAIRY_EGGS",
  SWEETENERS = "SWEETENERS",
  FATS_OILS = "FATS_OILS",
  LEAVENING = "LEAVENING",
  CHOCOLATE_COCOA = "CHOCOLATE_COCOA",
  NUTS_SEEDS = "NUTS_SEEDS",
  FRUITS = "FRUITS",
  VEGETABLES = "VEGETABLES",
  MEAT_SEAFOOD = "MEAT_SEAFOOD",
  SPICES_HERBS = "SPICES_HERBS",
  FLAVORINGS_EXTRACTS = "FLAVORINGS_EXTRACTS",
  BEVERAGES = "BEVERAGES",
  PACKAGING = "PACKAGING",
  SUPPLIES = "SUPPLIES",
  OTHER = "OTHER",
}

export enum MeasurementUnit {
  // Weight
  GRAMS = "GRAMS",
  KG = "KG",
  OUNCES = "OUNCES",
  POUNDS = "POUNDS",

  // Volume
  ML = "ML",
  LITERS = "LITERS",
  TSP = "TSP",
  TBSP = "TBSP",
  CUPS = "CUPS",

  // Count
  PIECES = "PIECES",
  SERVINGS = "SERVINGS",
  BATCHES = "BATCHES",
  DOZEN = "DOZEN",
}

// Define DTOs once (can be moved to a shared types file if you like)
export type CustomIngredientDto = {
  id: string
  name: string
  description: string | null
  category: IngredientCategory
  purchaseUnit: MeasurementUnit

  currentPricePerUnit: number
  currentStock: number
  preferredStore: string | null
  reorderPoint: number | null
  shelfLifeDays: number | null
  allergens: string[]
  notes: string | null

  isCustom: true
  isGlobal: false

  recipeUsages: Array<{
    id: string
    recipe: { id: string; name: string }
    // add other fields you actually use
  }>
}

export type GlobalIngredientDto = {
  id: string
  name: string
  description: string | null
  category: IngredientCategory
  purchaseUnit: MeasurementUnit

  // value resolved for display
  pricePerUnit: number
  currentStock: number

  isCustom: false
  isGlobal: true

  merchantPricing:
    | {
        id: string
        currentPricePerUnit: number
        currentStock: number
        preferredStore: string | null
        brandPreference: string | null
        priceHistory: Array<{
          id: string
          pricePerUnit: number
          totalPaid: number
          purchaseDate: Date
          store: string | null
          notes: string | null
        }>
      }
    | undefined

  recipeUsages: Array<{
    id: string
    recipe: { id: string; name: string }
  }>
}

// Return type is a discriminated union by `isCustom`
export type IngredientByIdDto = CustomIngredientDto | GlobalIngredientDto

export enum RecipeCategory {
  BAKED_GOODS = "BAKED_GOODS",
  PASTRIES = "PASTRIES",
  CAKES = "CAKES",
  COOKIES = "COOKIES",
  BREADS = "BREADS",
  DESSERTS = "DESSERTS",
  MAINS = "MAINS",
  APPETIZERS = "APPETIZERS",
  SIDES = "SIDES",
  BEVERAGES = "BEVERAGES",
  SAUCES_CONDIMENTS = "SAUCES_CONDIMENTS",
  MEAL_PREP = "MEAL_PREP",
  CATERING = "CATERING",
  SNACKS = "SNACKS",
  OTHER = "OTHER",
}

export type CostConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"