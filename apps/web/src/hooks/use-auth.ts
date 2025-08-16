'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/trpc/client'

interface AuthState {
  isLoading: boolean
  user: any | null
  userType: 'customer' | 'merchant' | null
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any | null>(null)
  const [userType, setUserType] = useState<'customer' | 'merchant' | null>(null)
  
  const supabase = createClient()
  const { mutate: signOut } = api.auth.signOut.useMutation()

  useEffect(() => {
    // Check Supabase auth (merchants)
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        setUserType(data.user.user_metadata?.userType || null)
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user)
        setUserType(session.user.user_metadata?.userType || null)
      } else {
        setUser(null)
        setUserType(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    // Clear customer token
    localStorage.removeItem('customerToken')
    
    // Sign out from tRPC
    signOut(undefined, {
      onSuccess: () => {
        router.push('/')
        router.refresh()
      }
    })
  }

  return {
    isLoading,
    user,
    userType,
    signOut: handleSignOut,
  }
}