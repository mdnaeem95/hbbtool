'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@kitchencloud/auth/'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireMerchant?: boolean
  requireCustomer?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireMerchant = false,
  requireCustomer = false,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isLoading, isAuthenticated, isMerchant, isCustomer } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.push(redirectTo)
      } else if (requireMerchant && !isMerchant) {
        router.push('/')
      } else if (requireCustomer && !isCustomer) {
        router.push('/')
      }
    }
  }, [isLoading, isAuthenticated, isMerchant, isCustomer, requireAuth, requireMerchant, requireCustomer, router, redirectTo])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return null
  }

  if (requireMerchant && !isMerchant) {
    return null
  }

  if (requireCustomer && !isCustomer) {
    return null
  }

  return <>{children}</>
}