'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
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
  const { isLoading, user, userType } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        router.push(redirectTo)
      } else if (requireMerchant && userType !== 'merchant') {
        router.push('/')
      }
    }
  }, [isLoading, user, userType, requireAuth, requireMerchant, router, redirectTo])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (requireAuth && !user) {
    return null
  }

  if (requireMerchant && userType !== 'merchant') {
    return null
  }

  return <>{children}</>
}