'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import Link from 'next/link'
import { Button } from '@kitchencloud/ui'
import type { User } from '@supabase/supabase-js'

export function Navigation() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <nav className="flex items-center justify-between p-4">
      <Link href="/" className="text-xl font-bold">
        KitchenCloud
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/orders">
              <Button variant="ghost">Orders</Button>
            </Link>
            <Link href="/account">
              <Button variant="ghost">Account</Button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}