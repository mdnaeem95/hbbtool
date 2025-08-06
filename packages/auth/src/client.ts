import { createAuthClient } from "better-auth/react"
import { auth } from "./server"
import type { User } from "./server"
import type { BetterFetchError } from "@better-fetch/fetch"

// Create the auth client
const _create = createAuthClient
export const authClient: ReturnType<typeof _create> = _create({
  handler: auth.handler,
  api:     auth.api,
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  credentials: "include",
})

// Export client methods explicitly
export const signIn:     typeof authClient.signIn     = authClient.signIn
export const signUp:     typeof authClient.signUp     = authClient.signUp
export const signOut:    typeof authClient.signOut    = authClient.signOut
export const useSession: typeof authClient.useSession = authClient.useSession

// Define a MultiUser type that includes userType
export type MultiUser = User & { userType: "merchant" | "customer" }

// Shared return type for role-based hooks
type UseRoleReturn = {
  merchant?: MultiUser | null
  customer?: MultiUser | null
  isPending: boolean
  isAuthenticated: boolean
  error: BetterFetchError | null
}

// Hook for merchants
export function useMerchant(): UseRoleReturn {
  const session = useSession()
  // Cast session.user to MultiUser so userType is recognized
  const user = session.data?.user as MultiUser | undefined
  const isMerchant = user?.userType === "merchant"

  return {
    merchant: isMerchant ? user : null,
    isPending: session.isPending,
    isAuthenticated: isMerchant,
    error: session.error,
  }
}

// Hook for customers
export function useCustomer(): UseRoleReturn {
  const session = useSession()
  const user = session.data?.user as MultiUser | undefined
  const isCustomer = user?.userType === "customer"

  return {
    customer: isCustomer ? user : null,
    isPending: session.isPending,
    isAuthenticated: isCustomer,
    error: session.error,
  }
}
