'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '../client'
import type { AuthUser } from '../server'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          userType: session.user.user_metadata.userType,
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          userType: session.user.user_metadata.userType,
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return {
    user,
    loading,
    isMerchant: user?.userType === 'merchant',
    isCustomer: user?.userType === 'customer',
    isAuthenticated: !!user,
  }
}