import { db } from "./client"

// Export the main database client and utilities
export {
  db,
  excludeDeleted,
  merchantIncludes,
  productIncludes,
  orderIncludes,
  getMerchantBySlug,
  getMerchantProducts,
  type ExtendedPrismaClient,
} from "./client"

// Export all types
export * from "./types"

// Export cache utilities
export * from "./cache"

// Export Prisma namespace and enums
export { Prisma, type PrismaClient } from "@prisma/client"
export { type Decimal } from "@prisma/client/runtime/library.js"
export type DB = typeof db
export {
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  MerchantStatus,
  DeliveryMethod,
  PaymentMethod,
  NotificationType,
} from "@prisma/client"

// Re-export generated types for convenience
export type {
  Merchant,
  Product,
  Category,
  Order,
  OrderItem,
  Customer,
  Address,
  Payment,
  Review,
  Session,
  CheckoutSession,
  Analytics,
  Notification,
  ProductVariant,
  ProductView,
} from "@prisma/client"