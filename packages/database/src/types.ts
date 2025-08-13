import { Prisma } from "@prisma/client"

// Merchant with relations
export type MerchantWithCategories = Prisma.MerchantGetPayload<{
  include: {
    categories: {
      where: { deletedAt: null }
      orderBy: { sortOrder: "asc" }
    }
  }
}>

export type MerchantWithProducts = Prisma.MerchantGetPayload<{
  include: {
    categories: {
      where: { deletedAt: null }
      orderBy: { sortOrder: "asc" }
      include: {
        products: {
          where: { deletedAt: null; status: "ACTIVE" }
          // Remove sortOrder from products - it doesn't exist
          orderBy: { createdAt: "desc" }
        }
      }
    }
  }
}>

// Order with relations
export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true
      }
    }
    customer: true
    merchant: true
  }
}>

// Product with merchant
export type ProductWithMerchant = Prisma.ProductGetPayload<{
  include: {
    merchant: true
    category: true
  }
}>

// Input types for creation
export type CreateMerchantInput = Omit<
  Prisma.MerchantCreateInput,
  "slug" | "createdAt" | "updatedAt"
>

export type CreateProductInput = Omit<
  Prisma.ProductCreateInput,
  "slug" | "createdAt" | "updatedAt" | "merchant"
> & {
  merchantId: string
}

export type CreateOrderInput = {
  merchantId: string
  customerId?: string
  deliveryMethod: "PICKUP" | "DELIVERY"
  deliveryAddressId?: string
  items: Array<{
    productId: string
    quantity: number
    variant?: any
    notes?: string
  }>
  scheduledFor?: Date
  notes?: string
}