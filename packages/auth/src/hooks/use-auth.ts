'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '../client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )
    
    return () => subscription.unsubscribe()
  }, [])
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
    isMerchant: user?.user_metadata?.userType === 'merchant',
    isCustomer: user?.user_metadata?.userType === 'customer',
  }
}