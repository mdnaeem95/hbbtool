"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCustomer } from "@kitchencloud/auth/client"

interface AuthGuardProps {
  children: React.ReactNode
  fallbackUrl?: string
}

export function AuthGuard({ children, fallbackUrl = "/login" }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, isPending } = useCustomer()

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      router.push(fallbackUrl)
    }
  }, [isAuthenticated, isPending, router, fallbackUrl])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}