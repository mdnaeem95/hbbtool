// packages/database/src/types-only.ts
// This file exports only types and enums without any Prisma client code
// Safe to import in client components

// Export enums (these are just TypeScript enums, no Prisma code)
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

export enum PaymentMethod {
  PAYNOW = "PAYNOW",
  CASH = "CASH",
  CARD = "CARD"
}

export enum NotificationType {
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  ORDER_READY = "ORDER_READY",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  REVIEW_RECEIVED = "REVIEW_RECEIVED"
}

// Export type definitions (these are just TypeScript interfaces, no Prisma code)
export interface Merchant {
  id: string
  email: string
  phone: string | null
  businessName: string
  slug: string
  description: string | null
  logoUrl: string | null
  coverImageUrl: string | null
  categories: string[]
  cuisineType: string[]
  operatingHours: any
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