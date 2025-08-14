'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './use-auth'

export function useMerchant() {
  const { user, loading, isMerchant } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    // Don’t redirect if we’re already on the merchant login page
    if (pathname?.startsWith('/merchant/login')) return

    if (!user || !isMerchant) {
      const next = encodeURIComponent(pathname ?? '/merchant')
      router.replace(`/merchant/login?next=${next}`)
    }
  }, [user, isMerchant, loading, pathname, router])

  return {
    user,
    loading,
    isAuthenticated: !!user && isMerchant,
  }
}
