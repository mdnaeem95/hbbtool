// packages/database/src/client.ts
import { Prisma, PrismaClient } from "@prisma/client"
import { softDeleteExtension } from "./extensions"

// Global singleton for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create the base Prisma client with logging
const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })
}

// Create or reuse the singleton instance
const baseClient = globalForPrisma.prisma ?? prismaClientSingleton()

// Apply the soft delete extension
export const db = baseClient.$extends(softDeleteExtension)

// Store in global for development hot reloading
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = baseClient
}

// Type for the extended client
export type ExtendedPrismaClient = typeof db

// For transactions, use db.$transaction directly in your code
// Example:
// const result = await db.$transaction(async (tx) => {
//   const order = await tx.order.create({...})
//   const payment = await tx.payment.create({...})
//   return { order, payment }
// })

// Soft delete utilities
export const excludeDeleted: Prisma.MerchantWhereInput = { deletedAt: null }

// Common includes with proper type safety
export const merchantIncludes = {
  basic: {
    // Categories are now global, not merchant-specific
    // Query categories separately if needed
  },
  withProducts: {
    products: {
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { createdAt: "desc" as const },
      include: {
        category: true, // Include the global category
      },
    },
  },
  full: {
    products: {
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: [
        { featured: "desc" as const },
        { createdAt: "desc" as const }
      ],
      include: {
        category: true, // Include the global category
      },
    },
    reviews: {
      where: { isVisible: true },
      orderBy: { createdAt: "desc" as const },
      take: 5,
    },
  },
} satisfies Record<string, Prisma.MerchantInclude>

// Product includes
export const productIncludes = {
  basic: {
    merchant: {
      select: {
        id: true,
        businessName: true,
        slug: true,
      }
    },
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      }
    }
  },
  withVariants: {
    merchant: {
      select: {
        id: true,
        businessName: true,
        slug: true,
      }
    },
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      }
    },
    ProductVariant: {
      where: { isDefault: false },
      orderBy: { name: "asc" as const }
    }
  },
  full: {
    merchant: true,
    category: true,
    ProductVariant: true,
    _count: {
      select: {
        orderItems: true,
        reviews: true,
        ProductView: true,
      }
    }
  }
} as const

// Order includes
export const orderIncludes = {
  basic: {
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          }
        }
      }
    }
  },
  withPayment: {
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          }
        }
      }
    },
    payment: true,
  },
  full: {
    merchant: true,
    customer: true,
    deliveryAddress: true,
    items: {
      include: {
        product: true
      }
    },
    payment: {
      include: {
        paymentProofs: true
      }
    },
    events: {
      orderBy: { createdAt: "desc" as const }
    }
  }
} as const

// Helper to safely get merchant by slug
export async function getMerchantBySlug(slug: string) {
  return db.merchant.findFirst({
    where: { 
      slug,
      deletedAt: null,
      status: "ACTIVE"
    },
    include: merchantIncludes.basic
  })
}

// Helper to get active products for a merchant
export async function getMerchantProducts(merchantId: string) {
  return db.product.findMany({
    where: {
      merchantId,
      deletedAt: null,
      status: "ACTIVE",
      OR: [
        { availableFrom: null },
        { availableFrom: { lte: new Date() } }
      ],
      AND: [
        { availableTo: null },
        { availableTo: { gte: new Date() } }
      ]
    },
    include: productIncludes.basic,
    orderBy: [
      { featured: "desc" },
      { createdAt: "desc" }
    ]
  })
}

// Export all Prisma types and enums
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

// Re-export types from the Prisma client for convenience
export type {
  Merchant,
  Product,
  Category,
  Order,
  OrderItem,
  Customer,
  Payment,
  Review,
} from "@prisma/client"