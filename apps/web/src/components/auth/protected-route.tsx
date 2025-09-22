'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@homejiak/auth/client'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireMerchant?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireMerchant = false,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isLoading, isAuthenticated, isMerchant } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      // Check basic auth requirement
      if (requireAuth && !isAuthenticated) {
        router.push(redirectTo)
      } 
      // Check merchant requirement (all authenticated users are merchants now)
      else if (requireMerchant && !isMerchant) {
        router.push(redirectTo)
      }
    }
  }, [isLoading, isAuthenticated, isMerchant, requireAuth, requireMerchant, router, redirectTo])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Don't render if auth requirements not met
  if (requireAuth && !isAuthenticated) {
    return null
  }

  if (requireMerchant && !isMerchant) {
    return null
  }

  return <>{children}</>
}

// Convenience wrapper for merchant-only routes
export function MerchantRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAuth requireMerchant>
      {children}
    </ProtectedRoute>
  )
}