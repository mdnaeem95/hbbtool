'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserSupabaseClient } from '../client'
import type { User, Session } from '@supabase/supabase-js'

const supabase = createBrowserSupabaseClient()

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Initial load
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        setUser(null)
        setSession(null)
      } else {
        setUser(data.session?.user ?? null)
        setSession(data.session ?? null)
      }
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return
      setUser(newSession?.user ?? null)
      setSession(newSession ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setUser(data.session?.user ?? null)
    setSession(data.session ?? null)
    return data.session
  }, [])

  const userType = user?.user_metadata?.userType as 'merchant' | 'customer' | undefined

  return {
    user,
    session,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    loading,
    isAuthenticated: !!user,
    isMerchant: userType === 'merchant',
    isCustomer: userType === 'customer',
    refresh,
  }
}
