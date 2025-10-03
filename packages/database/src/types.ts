import { Prisma, DeliveryMethod, PaymentMethod } from "@prisma/client"
// Replace the deep import with Prisma.Decimal:
type Decimal = Prisma.Decimal

/* =========================
   Read models with relations
   ========================= */

// Merchant with basic info
export type MerchantWithProducts = Prisma.MerchantGetPayload<{
  include: {
    products: {
      where: { deletedAt: null, status: "ACTIVE" }
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
      include: {
        category: true // Include the global category
      }
    }
  }
}>

// Category with products from specific merchant
export type CategoryWithProducts = Prisma.CategoryGetPayload<{
  include: {
    products: {
      where: { 
        deletedAt: null, 
        status: "ACTIVE",
        // merchantId can be filtered at query time
      }
      orderBy: [{ featured: "desc" }, { popularityScore: "desc" }]
    }
  }
}>

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: true } }
    customer: true
    merchant: true
  }
}>

export type ProductWithMerchant = Prisma.ProductGetPayload<{
  include: { merchant: true; category: true }
}>

/* =========================
   “Safe” return types
   ========================= */

type MerchantSensitive =
  | "password"
  | "twoFactorSecret"
  | "bankAccountNumber"
  | "nric"
  | "orderNotificationEmail"
  | "orderNotificationPhone"
  | "cachedStats"
  | "settings"
  | "searchVector"

export type PublicMerchant = Omit<
  Prisma.MerchantGetPayload<{}>,
  MerchantSensitive
>

export type ProductListItem = Pick<
  Prisma.ProductGetPayload<{}>,
  | "id"
  | "merchantId"
  | "categoryId"
  | "name"
  | "slug"
  | "price"
  | "images"
  | "status"
  | "featured"
  | "sortOrder"
>

/* =========================
   Create/Update inputs
   ========================= */

export type CreateMerchantInput = Omit<
  Prisma.MerchantUncheckedCreateInput,
  | "id"
  | "slug"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "averageRating"
  | "totalReviews"
  | "totalOrders"
  | "totalRevenue"
  | "responseRate"
  | "averageResponseTime"
  | "completionRate"
  | "statsUpdatedAt"
> & { password: string }

export type UpdateMerchantInput = Omit<
  Prisma.MerchantUncheckedUpdateInput,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "totalOrders"
  | "totalRevenue"
>

export type CreateProductInput = Omit<
  Prisma.ProductUncheckedCreateInput,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "publishedAt"
  | "availableFrom"
  | "availableTo"
  | "viewCount"
  | "orderCount"
  | "popularityScore"
  | "lastOrderedAt"
> & {
  merchantId: string
  price: number | Decimal
  compareAtPrice?: number | Decimal | null
  cost?: number | Decimal | null
}

export type UpdateProductInput = Omit<
  Prisma.ProductUncheckedUpdateInput,
  | "id"
  | "merchantId"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
>

export type CreateOrderItemDraft = {
  productId: string
  quantity: number
  variant?: any
  specialRequest?: string
}

export type CreateOrderInput = {
  merchantId: string
  customerId?: string
  deliveryMethod: DeliveryMethod
  deliveryAddressId?: string
  items: CreateOrderItemDraft[]
  scheduledFor?: Date
  customerNotes?: string
  paymentMethod?: PaymentMethod
}

/* =========================
   Utility types
   ========================= */

export type WithCount<T> = T & { _count: { [k: string]: number } }

export type Paginated<T> = {
  data: T[]
  page: number
  limit: number
  total: number
}

/* =========================
   Query helpers (shapes)
   ========================= */

// Common “active” product filter
export const activeProductFilter: Prisma.ProductWhereInput = {
  deletedAt: null,
  status: "ACTIVE", // <-- fixed
}

// Common order include (items + product)
export const orderInclude = {
  items: { include: { product: true } },
  customer: true,
  merchant: true,
} satisfies Prisma.OrderInclude
