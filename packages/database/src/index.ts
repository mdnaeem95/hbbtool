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
export * from '@homejiak/types'