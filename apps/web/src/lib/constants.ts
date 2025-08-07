export const APP_NAME = "KitchenCloud"
export const APP_DESCRIPTION = "Order delicious home-cooked meals from local home-based businesses in Singapore"

export const ROUTES = {
  HOME: "/",
  BROWSE: "/browse",
  CART: "/cart",
  CHECKOUT: "/checkout",
  ORDERS: "/orders",
  LOGIN: "/login",
  SIGNUP: "/signup",
  ACCOUNT: "/account",
} as const

export const API_ROUTES = {
  AUTH: "/api/auth",
} as const

export const QUERY_KEYS = {
  MERCHANTS: "merchants",
  MERCHANT: "merchant",
  PRODUCTS: "products",
  CART: "cart",
  ORDERS: "orders",
  USER: "user",
} as const