// packages/database/src/index.ts

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
export { Prisma } from "@prisma/client"
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
  PaymentProof,
  Review,
  Session,
  CheckoutSession,
  Analytics,
  Notification,
  ProductVariant,
  ProductView,
} from "@prisma/client"