import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@kitchencloud/database'
import type { Merchant, Customer } from '@kitchencloud/database'
import { SupabaseClient } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  email: string
  userType: 'merchant' | 'customer'
}

export type MerchantSession = {
  user: AuthUser
  merchant: Merchant
}

export type CustomerSession = {
  user: AuthUser
  customer: Customer
} | null // null for guest users

// Create Supabase server client
export function createServerSupabaseClient(): SupabaseClient {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component boundary - ignore
          }
        },
      },
    }
  )
}

// Get current auth session
export async function getServerSession(): Promise<{ user: AuthUser } | null> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  return {
    user: {
      id: user.id,
      email: user.email!,
      userType: user.user_metadata.userType as 'merchant' | 'customer',
    }
  }
}

// Require merchant authentication
export async function requireMerchant(): Promise<MerchantSession> {
  const session = await getServerSession()
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  if (session.user.userType !== 'merchant') {
    throw new Error('Merchant access required')
  }
  
  const merchant = await db.merchant.findFirst({
    where: { id: session.user.id }
  })
  
  if (!merchant) {
    throw new Error('Merchant profile not found')
  }
  
  if (merchant.status !== 'ACTIVE') {
    throw new Error('Merchant account is not active')
  }
  
  return { user: session.user, merchant }
}

// Get customer session (optional auth)
export async function getCustomerSession(): Promise<CustomerSession> {
  const session = await getServerSession()
  
  if (!session || session.user.userType !== 'customer') {
    return null // Guest user
  }
  
  const customer = await db.customer.findFirst({
    where: { id: session.user.id }
  })
  
  if (!customer) {
    return null
  }
  
  return { user: session.user, customer }
}

// Get merchant by ID (for public pages)
export async function getMerchantById(merchantId: string) {
  return db.merchant.findFirst({
    where: { 
      id: merchantId,
      status: 'ACTIVE',
      deletedAt: null
    }
  })
}