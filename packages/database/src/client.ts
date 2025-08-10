import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

// Use a stripped-down client type (matches Prisma’s callback overload exactly)
type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

// Helper function for transactions
export async function transaction<T>(
  fn: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(fn) as Promise<T>
}

// Soft delete utilities
export const excludeDeleted = {
  where: {
    deletedAt: null,
  },
}

// Common includes
export const merchantIncludes = {
  basic: {
    categories: {
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" as const },
    },
  },
  withProducts: {
    categories: {
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" as const },
      include: {
        products: {
          where: { deletedAt: null, status: "ACTIVE" },
        },
      },
    },
  },
}

export { Prisma } from "@prisma/client";
export {
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  MerchantStatus,
  DeliveryMethod,
  PaymentMethod,
} from "@prisma/client";