// ===============================================
// SINGLE SOURCE OF TRUTH FOR ALL TYPES
// ===============================================

// ===============================================
// 1. ENUMS (Database & Business Logic)
// ===============================================

// Product & Order Enums
export enum ProductStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
  SOLD_OUT = "SOLD_OUT",
  DISCONTINUED = "DISCONTINUED"
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED"
}

export enum PaymentMethod {
  PAYNOW = "PAYNOW",
  CASH = "CASH",
}

export enum MerchantStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING = "PENDING"
}

export enum DeliveryMethod {
  DELIVERY = "DELIVERY",
  PICKUP = "PICKUP"
}

// Notification Enums
export enum NotificationType {
  ORDER_PLACED = "ORDER_PLACED",
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  ORDER_PREPARING = "ORDER_PREPARING",
  ORDER_READY = "ORDER_READY",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  REVIEW_RECEIVED = "REVIEW_RECEIVED",
  LOW_STOCK_ALERT = "LOW_STOCK_ALERT",
  PROMOTION_STARTED = "PROMOTION_STARTED",
  PROMOTION_ENDING = "PROMOTION_ENDING",
  SYSTEM_MAINTENANCE = "SYSTEM_MAINTENANCE",
  ACCOUNT_VERIFICATION = "ACCOUNT_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET"
}

export enum NotificationPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

// Recipe & Ingredient Enums
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

// ===============================================
// 2. DATABASE MODELS (Prisma-compatible)
// ===============================================

export interface Merchant {
  id: string
  email: string
  phone: string | null
  businessName: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  cuisineType: string[]
  operatingHours: any // Consider creating OperatingHours type
  deliveryEnabled: boolean
  pickupEnabled: boolean
  deliveryFee: number
  minimumOrder: number
  deliveryRadius: number
  preparationTime: number
  rating: number
  reviewCount: number
  status: MerchantStatus
  isVerified: boolean
  address: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface Product {
  id: string
  merchantId: string
  name: string
  description: string | null
  price: number
  compareAtPrice: number | null
  cost: number | null
  sku: string | null
  trackInventory: boolean
  inventory: number
  images: string[]
  category: string | null
  tags: string[]
  status: ProductStatus
  featured: boolean
  displayOrder: number
  preparationTime: number | null
  availableStartTime: string | null
  availableEndTime: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface Order {
  id: string
  orderNumber: string
  merchantId: string
  customerId: string | null
  status: OrderStatus
  deliveryMethod: DeliveryMethod
  deliveryAddressId: string | null
  scheduledFor: Date | null
  subtotal: number
  deliveryFee: number
  serviceFee: number
  discount: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentReference: string | null
  customerName: string
  customerEmail: string | null
  customerPhone: string
  deliveryNotes: string | null
  kitchenNotes: string | null
  confirmedAt: Date | null
  preparingAt: Date | null
  readyAt: Date | null
  deliveredAt: Date | null
  completedAt: Date | null
  cancelledAt: Date | null
  refundedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  email: string | null
  phone: string
  name: string
  avatarUrl: string | null
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Ingredient {
  id: string
  name: string
  description: string | null
  category: IngredientCategory
  purchaseUnit: MeasurementUnit
  pricePerUnit: number
  currentStock: number
  reorderPoint: number | null
  preferredStore: string | null
  allergens: string[]
  shelfLifeDays: number | null
  isGlobal: boolean
  isCustom: boolean
}

export interface Recipe {
  id: string
  merchantId: string
  name: string
  description: string | null
  category: RecipeCategory
  servings: number
  prepTime: number
  bakeTime: number | null
  totalTime: number
  instructions: string[]
  notes: string | null
  costPerServing: number
  sellingPrice: number | null
  profitMargin: number | null
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

// ===============================================
// 3. AUTHENTICATION TYPES
// ===============================================

export interface AuthUser {
  id: string
  email: string
  userType: 'merchant' | 'customer'
  merchant?: Merchant
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

export interface AuthState {
  user: AuthUser | null
  session: AuthSession | null  // Make sure this property exists!
  isLoading: boolean
  isAuthenticated: boolean
  isMerchant: boolean
  error: Error | null
}

export interface SignUpParams {
  email: string
  password: string
  businessName?: string
  phone?: string
}

export interface SignInParams {
  email: string
  password: string
}

// Auth helper types
export const AUTH_STORAGE_KEYS = {
  accessToken: 'homejiak_access_token',
  refreshToken: 'homejiak_refresh_token',
  user: 'homejiak_user',
} as const

export const isMerchantUser = (user: AuthUser | null): boolean => {
  return user?.userType === 'merchant'
}

// ===============================================
// 4. API REQUEST/RESPONSE TYPES
// ===============================================

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

export interface ApiError {
  code: ErrorCode
  message: string
  details?: unknown
}

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR'

// ===============================================
// 5. BUSINESS LOGIC TYPES
// ===============================================

export interface OrderTotals {
  subtotal: number
  discount: number
  tax: number
  deliveryFee: number
  serviceFee: number
  total: number
}

export interface DeliveryEstimate {
  min: number // minutes
  max: number // minutes
  distance?: number // km
}

export type CostConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"

// Merchant-specific types
export interface MerchantSettings {
  merchantId: string
  autoConfirmOrders: boolean
  notificationPreferences: {
    email: boolean
    sms: boolean
    whatsapp: boolean
  }
  operatingHours: OperatingHours
  holidayDates: Date[]
  preparationTimeBuffer: number // minutes
  maxOrdersPerSlot: number
}

export interface OperatingHours {
  [key: string]: DaySchedule | null // monday, tuesday, etc.
}

export interface DaySchedule {
  isOpen: boolean
  slots: TimeSlot[]
}

export interface TimeSlot {
  start: string // "09:00"
  end: string   // "18:00"
}

// ===============================================
// 6. DTO TYPES (Data Transfer Objects)
// ===============================================

export interface CreateOrderDto {
  merchantId: string
  customerId?: string
  items: OrderItemDto[]
  deliveryMethod: DeliveryMethod
  paymentMethod: PaymentMethod
  deliveryAddress?: AddressDto
  scheduledFor?: Date
  customerInfo: {
    name: string
    phone: string
    email?: string
  }
  notes?: {
    delivery?: string
    kitchen?: string
  }
}

export interface OrderItemDto {
  productId: string
  quantity: number
  price: number
  notes?: string
  modifiers?: OrderItemModifier[]
}

export interface OrderItemModifier {
  id: string
  name: string
  price: number
}

export interface AddressDto {
  line1: string
  line2?: string
  postalCode: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
}

export interface UpdateMerchantDto {
  businessName?: string
  description?: string
  logoUrl?: string
  coverImageUrl?: string
  categories?: string[]
  cuisineType?: string[]
  operatingHours?: OperatingHours
  deliveryEnabled?: boolean
  pickupEnabled?: boolean
  deliveryFee?: number
  minimumOrder?: number
  deliveryRadius?: number
  preparationTime?: number
}

// Recipe DTOs
export interface CreateRecipeDto {
  name: string
  description?: string
  category: RecipeCategory
  servings: number
  prepTime: number
  bakeTime?: number
  instructions: string[]
  ingredients: RecipeIngredientDto[]
  notes?: string
  sellingPrice?: number
  isPublic?: boolean
}

export interface RecipeIngredientDto {
  ingredientId: string
  quantity: number
  unit: MeasurementUnit
  notes?: string
}

// Ingredient DTOs
export interface CustomIngredientDto {
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
  }>
}

export interface GlobalIngredientDto {
  id: string
  name: string
  description: string | null
  category: IngredientCategory
  purchaseUnit: MeasurementUnit
  pricePerUnit: number
  currentStock: number
  isCustom: false
  isGlobal: true
  merchantPricing?: {
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
  recipeUsages: Array<{
    id: string
    recipe: { id: string; name: string }
  }>
}

export type IngredientByIdDto = CustomIngredientDto | GlobalIngredientDto

// ===============================================
// 7. UTILITY TYPES
// ===============================================

// Make all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Extract keys with specific value types
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

// Nullable type helper
export type Nullable<T> = T | null

// Type-safe Omit
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

// Type-safe string literals from enums
export type RecipeCategoryType = `${RecipeCategory}`
export type MeasurementUnitType = `${MeasurementUnit}`
export type IngredientCategoryType = `${IngredientCategory}`

// ===============================================
// 8. CONTEXT TYPES (for tRPC/API)
// ===============================================

export interface AuthDeps<Session = unknown, SupabaseClient = unknown> {
  getSession(): Promise<Session | null>
  getSupabase(): SupabaseClient
}

// Database client type (avoid direct import)
type DBClient = any // Replace with your actual DB client type when needed

export type Context<S = unknown, SC = unknown> = {
  db: DBClient
  session: S | null
  supabase: SC
  req: Request
  res?: Response
  resHeaders?: Headers
  ip?: string
  header(name: string): string | undefined
}

// ===============================================
// 9. SUPABASE TYPES (if using Supabase)
// ===============================================

export interface SupabaseUser {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

export interface SupabaseSession {
  access_token: string
  refresh_token?: string
  expires_at?: number
  user: SupabaseUser
}

export interface SupabaseAuthAPI {
  signUp(args: {
    email: string
    password: string
    options?: { data?: Record<string, unknown> }
  }): Promise<{ 
    data: { 
      user: SupabaseUser | null
      session: SupabaseSession | null 
    }
    error: { message: string } | null 
  }>

  signInWithPassword(args: {
    email: string
    password: string
  }): Promise<{ 
    data: { 
      user: SupabaseUser | null
      session: SupabaseSession | null 
    }
    error: { message: string } | null 
  }>

  signOut(): Promise<{ error: { message: string } | null }>
}

export interface SupabaseLike {
  auth: SupabaseAuthAPI
}

// ===============================================
// 10. CONSTANTS
// ===============================================

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const DEFAULT_CURRENCY = 'SGD'
export const DEFAULT_LOCALE = 'en-SG'
export const DEFAULT_TIMEZONE = 'Asia/Singapore'

// Singapore-specific
export const SG_POSTAL_CODE_REGEX = /^[0-9]{6}$/
export const SG_PHONE_REGEX = /^(\+65)?[689]\d{7}$/

// Business rules
export const MIN_ORDER_AMOUNT = 10 // SGD
export const MAX_DELIVERY_RADIUS = 10 // km
export const DEFAULT_PREPARATION_TIME = 30 // minutes
export const ORDER_CANCELLATION_WINDOW = 60 // minutes before scheduled time

// File upload limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Type guards
export const isCustomIngredient = (
  ingredient: IngredientByIdDto
): ingredient is CustomIngredientDto => {
  return ingredient.isCustom === true
}

export const isGlobalIngredient = (
  ingredient: IngredientByIdDto
): ingredient is GlobalIngredientDto => {
  return ingredient.isGlobal === true
}