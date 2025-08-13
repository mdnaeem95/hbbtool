import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Create browser Supabase client
export function createBrowserSupabaseClient(): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Sign in merchant
export async function signInMerchant(
  email: string,
  password: string
) {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  
  // Verify user is a merchant
  if (data.user?.user_metadata?.userType !== 'merchant') {
    throw new Error('Not a merchant account')
  }
  
  return data
}

// Sign up merchant
export async function signUpMerchant(
  email: string,
  password: string
) {
  const supabase = createBrowserSupabaseClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        userType: 'merchant',
      },
    },
  })
  
  if (error) throw error
  
  return data
}

// Sign in customer (simplified for MVP)
export async function signInCustomer(
  phone: string
) {
  // For MVP, we're using a simplified flow
  // In production, this would integrate with SMS OTP
  return {
    phone,
    requiresOtp: true,
  }
}

// Sign out
export async function signOut() {
  const supabase = createBrowserSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}