"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "../client"
import type { User } from "../server"

// Extend the base User to include auth-specific fields
type ExtendedUser = User & {
  userType: "merchant" | "customer"
  verified: boolean
  phoneVerified: boolean
}

type ProtectedRouteProps = {
  children: React.ReactNode
  userType?: "merchant" | "customer"
  fallbackUrl?: string
  requireVerified?: boolean
}

export function ProtectedRoute({
  children,
  userType,
  fallbackUrl = "/login",
  requireVerified = false,
}: ProtectedRouteProps) {
  const router = useRouter()
  const session = useSession()
  const user = session.data?.user as ExtendedUser | undefined

  useEffect(() => {
    if (!session.isPending) {
      if (!user) {
        router.push(fallbackUrl)
        return
      }

      if (userType && user.userType !== userType) {
        router.push(fallbackUrl)
        return
      }

      if (requireVerified) {
        if (userType === "merchant" && !user.verified) {
          router.push("/verify-email")
          return
        }
        
        if (userType === "customer" && !user.phoneVerified) {
          router.push("/verify-phone")
          return
        }
      }
    }
  }, [session, userType, fallbackUrl, requireVerified, router])

  if (session.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || (userType && user.userType !== userType)) {
    return null
  }

  return <>{children}</>
}