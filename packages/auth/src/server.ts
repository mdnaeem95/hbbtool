import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@kitchencloud/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthUser, AuthSession } from './types'

/**
 * Create server-side Supabase client with cookie handling
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get the current auth session from cookies/headers
 * Handles both merchant (Supabase) and customer (token) auth
 */
export async function getAuthSession(
  request?: Request
): Promise<AuthSession | null> {
  try {
    // Check Supabase session first (merchants)
    const supabase = await createServerSupabaseClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    
    if (supabaseUser) {
      const userType = supabaseUser.user_metadata?.userType as 'merchant' | 'customer'
      
      if (userType === 'merchant') {
        const merchant = await db.merchant.findUnique({
          where: { id: supabaseUser.id }
        })
        
        if (merchant) {
          const user: AuthUser = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            userType: 'merchant',
            merchant,
          }
          
          return { user }
        }
      }
    }

    // Check for customer token in Authorization header
    if (request) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : null
      
      if (token) {
        const session = await db.session.findFirst({
          where: {
            token,
            expiresAt: { gt: new Date() },
            customerId: { not: null },
          },
          include: {
            customer: true,
          },
        })
        
        if (session?.customer) {
          const user: AuthUser = {
            id: session.customer.id,
            phone: session.customer.phone,
            userType: 'customer',
            customer: session.customer,
          }
          
          return { 
            user,
            token,
            expiresAt: session.expiresAt,
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error getting auth session:', error)
    return null
  }
}

/**
 * Require authenticated user or throw
 */
export async function requireAuth(request?: Request): Promise<AuthSession> {
  const session = await getAuthSession(request)
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  return session
}

/**
 * Require merchant user or throw
 */
export async function requireMerchant(request?: Request): Promise<AuthSession> {
  const session = await requireAuth(request)
  
  if (session.user.userType !== 'merchant') {
    throw new Error('Merchant access required')
  }
  
  return session
}

/**
 * Require customer user or throw  
 */
export async function requireCustomer(request?: Request): Promise<AuthSession> {
  const session = await requireAuth(request)
  
  if (session.user.userType !== 'customer') {
    throw new Error('Customer access required')
  }
  
  return session
}

/**
 * Get merchant by ID with proper typing
 */
export async function getMerchantById(id: string) {
  return db.merchant.findUnique({
    where: { id },
    include: {
      categories: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })
}

/**
 * Get customer by ID with proper typing
 */
export async function getCustomerById(id: string) {
  return db.customer.findUnique({
    where: { id },
    include: {
      addresses: true,
    },
  })
}