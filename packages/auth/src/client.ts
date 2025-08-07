'use client'

import { createClient } from './lib/supabase-browser'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

export type UserType = 'merchant' | 'customer'

export interface AuthUser extends User {
  userType: UserType
}

// Sign up function
export async function signUp({
  email,
  password,
  userType,
  metadata,
}: {
  email: string
  password: string
  userType: UserType
  metadata: Record<string, any>
}) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        userType,
        ...metadata,
      },
    },
  })

  return { data, error }
}

// Sign in function
export async function signIn({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

// Sign out function
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Phone sign in
export async function signInWithPhone(phone: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: 'sms',
    },
  })

  return { data, error }
}

// Verify OTP
export async function verifyOtp({
  phone,
  token,
}: {
  phone: string
  token: string
}) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  return { data, error }
}

// useSession hook
export function useSession() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    data: user ? { user } : null,
    isPending: loading,
    error: null,
  }
}

// useMerchant hook
export function useMerchant() {
  const { data, isPending, error } = useSession()
  const user = data?.user as AuthUser | null
  const isMerchant = user?.user_metadata?.userType === 'merchant'

  return {
    merchant: isMerchant ? user : null,
    customer: null,
    isPending,
    isAuthenticated: isMerchant,
    error,
  }
}

// useCustomer hook
export function useCustomer() {
  const { data, isPending, error } = useSession()
  const user = data?.user as AuthUser | null
  const isCustomer = user?.user_metadata?.userType === 'customer'

  return {
    merchant: null,
    customer: isCustomer ? user : null,
    isPending,
    isAuthenticated: isCustomer,
    error,
  }
}