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

// Helper function for transactions
export async function transaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return db.$transaction(fn)
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