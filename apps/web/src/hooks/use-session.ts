'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Customer } from '@kitchencloud/database'

interface SessionData {
  user: User | null
  customer?: Customer | null
  loading: boolean
  isAuthenticated: boolean
}

export function useSession(): SessionData {
  const [data, setData] = useState<SessionData>({
    user: null,
    customer: null,
    loading: true,
    isAuthenticated: false
  })
  
  useEffect(() => {
    const supabase = createClient()
    
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // For customers, we might want to fetch additional data
          if (user.user_metadata?.userType === 'customer') {
            // Optional: fetch customer data via API
            setData({
              user,
              loading: false,
              isAuthenticated: true
            })
          } else {
            setData({
              user,
              loading: false,
              isAuthenticated: true
            })
          }
        } else {
          setData({
            user: null,
            loading: false,
            isAuthenticated: false
          })
        }
      } catch (error) {
        console.error('Session error:', error)
        setData({
          user: null,
          loading: false,
          isAuthenticated: false
        })
      }
    }
    
    getSession()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setData({
          user: session?.user ?? null,
          loading: false,
          isAuthenticated: !!session?.user
        })
      }
    )
    
    return () => subscription.unsubscribe()
  }, [])
  
  return data
}