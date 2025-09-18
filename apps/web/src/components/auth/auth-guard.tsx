'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthGuardProps {
  children: React.ReactNode
  fallbackUrl?: string
  userType?: 'customer' | 'merchant'
}

export function AuthGuard({ 
  children, 
  fallbackUrl = '/login',
  userType = 'customer'
}: AuthGuardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push(fallbackUrl)
        return
      }

      // Check user type if specified
      if (userType && user.user_metadata.userType !== userType) {
        router.push(fallbackUrl)
        return
      }

      setUser(user)
      setIsLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push(fallbackUrl)
        } else if (session?.user) {
          setUser(session.user)
          setIsLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router, fallbackUrl, userType, supabase])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}