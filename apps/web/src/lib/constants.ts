export const APP_NAME = "KitchenCloud"
export const APP_DESCRIPTION = "Order delicious home-cooked meals from local home-based businesses in Singapore"

export const ROUTES = {
  // Public routes
  HOME: "/",
  BROWSE: "/browse",
  CART: "/cart",
  
  // Auth routes (simplified)
  AUTH: "/auth",
  
  // Customer routes
  ORDERS: "/orders",
  ACCOUNT: "/account",
  
  // Merchant routes  
  DASHBOARD: "/dashboard",
  PRODUCTS: "/dashboard/products",
  MERCHANT_ORDERS: "/dashboard/orders",
  SETTINGS: "/dashboard/settings",
} as const

export const QUERY_KEYS = {
  MERCHANTS: "merchants",
  MERCHANT: "merchant",
  PRODUCTS: "products",
  CART: "cart",
  ORDERS: "orders",
  USER: "user",
  SESSION: "session",
} as const