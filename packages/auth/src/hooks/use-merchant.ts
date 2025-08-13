'use client'

import { useAuth } from './use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useMerchant(redirectTo = '/merchant/login') {
  const { user, loading, isMerchant } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !isMerchant)) {
      router.push(redirectTo)
    }
  }, [user, loading, isMerchant, router, redirectTo])

  return {
    user,
    loading,
    isAuthenticated: !!user && isMerchant,
  }
}