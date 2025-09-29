import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@homejiak/database'
import type { AuthUser, AuthSession } from './types'

/**
 * Create server-side Supabase client with cookie handling
 */
export async function createServerSupabaseClient() {
  console.log('\n=== createServerSupabaseClient ===')
  
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  console.log('Cookies found:', allCookies.length)
  allCookies.forEach(cookie => {
    if (cookie.name.startsWith('sb-')) {
      console.log(`  ${cookie.name}: [${cookie.value.length} chars]`)
    }
  })

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          console.log('  getAll() called')
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          console.log('  setAll() called with', cookiesToSet.length, 'cookies')
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error: any) {
            console.log('  setAll error (expected in route handlers):', error.message)
          }
        },
      },
    }
  )
}

/**
 * Get the current merchant auth session from cookies
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  console.log('\n=== getAuthSession START ===')
  
  try {
    const supabase = await createServerSupabaseClient()
    
    console.log('Getting user from Supabase...')
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('Supabase auth error:', error.message)
      return null
    }
    
    console.log('Supabase user:', supabaseUser ? 'FOUND' : 'NOT FOUND')
    if (supabaseUser) {
      console.log('  User ID:', supabaseUser.id)
      console.log('  User email:', supabaseUser.email)
      console.log('  User metadata:', JSON.stringify(supabaseUser.user_metadata))
      
      // All authenticated users should be merchants
      const userType = supabaseUser.user_metadata?.userType
      console.log('  User type:', userType)
      
      // Verify it's a merchant (or handle legacy users without userType)
      if (userType === 'merchant' || !userType) {
        console.log('Looking up merchant in database...')
        const merchant = await db.merchant.findUnique({
          where: { supabaseId: supabaseUser.id }
        })
        
        console.log('Merchant found:', merchant ? 'YES' : 'NO')
        
        if (merchant) {
          const user: AuthUser = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            merchant,
          }
          
          console.log('=== getAuthSession SUCCESS - Merchant ===')
          return { user }
        }
      } else {
        console.log('  Non-merchant user type detected, ignoring')
      }
    }

    console.log('=== getAuthSession FAILED - No valid session ===')
    return null
  } catch (error) {
    console.error('=== getAuthSession ERROR ===')
    console.error(error)
    return null
  }
}

/**
 * Require authenticated merchant or throw
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthSession()
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session
}

/**
 * Require merchant user or throw
 * (Now just an alias for requireAuth since all authenticated users are merchants)
 */
export async function requireMerchant() {
  return requireAuth()
}

/**
 * Get merchant by ID
 */
export async function getMerchantById(id: string) {
  return db.merchant.findUnique({
    where: { id }
  })
}

/**
 * Get merchant session helper for server components
 */
export async function getMerchantSession(): Promise<AuthSession | null> {
  return getAuthSession()
}