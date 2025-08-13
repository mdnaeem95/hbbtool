'use client'

import { useAuth } from './use-auth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useMerchant() {
  const { user, loading, isMerchant } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && (!user || !isMerchant)) {
      router.push('/merchant/login')
    }
  }, [user, loading, isMerchant, router])
  
  return {
    user,
    loading,
    isAuthenticated: !!user && isMerchant,
  }
}