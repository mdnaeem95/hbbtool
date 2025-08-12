import { createServerSupabaseClient } from './lib/supabase-server'
import { db } from '@kitchencloud/database'

export async function getServerSession() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  return {
    user: {
      ...user,
      userType: user.user_metadata.userType as 'merchant' | 'customer',
    }
  }
}

export async function requireMerchant() {
  const session = await getServerSession()
  
  if (!session) {
    throw new Error('Unauthorized: Authentication required')
  }
  
  if (session.user.userType !== 'merchant') {
    throw new Error('Unauthorized: Merchant access required')
  }
  
  const merchant = await db.merchant.findUnique({
    where: { id: session.user.id }
  })
  
  if (!merchant) {
    throw new Error('Merchant profile not found')
  }
  
  if (merchant.status !== 'ACTIVE') {
    throw new Error('Unauthorized: Merchant account is not active')
  }
  
  return { session, merchant }
}

export async function requireCustomer() {
  const session = await getServerSession()
  
  if (!session) {
    throw new Error('Unauthorized: Authentication required')
  }
  
  if (session.user.userType !== 'customer') {
    throw new Error('Unauthorized: Customer access required')
  }
  
  const customer = await db.customer.findUnique({
    where: { id: session.user.id }
  })
  
  if (!customer) {
    throw new Error('Customer profile not found')
  }
  
  return { session, customer }
}

export async function optionalAuth() {
  try {
    const session = await getServerSession()
    
    if (!session) return { session: null, user: null }
    
    // Get the appropriate user profile based on type
    if (session.user.userType === 'merchant') {
      const merchant = await db.merchant.findUnique({
        where: { id: session.user.id }
      })
      return { session, user: merchant, userType: 'merchant' as const }
    } else {
      const customer = await db.customer.findUnique({
        where: { id: session.user.id }
      })
      return { session, user: customer, userType: 'customer' as const }
    }
  } catch {
    return { session: null, user: null }
  }
}

// Helper to get customer or guest session
export async function getCustomerOrGuest() {
  const auth = await optionalAuth()
  
  if (auth.user && auth.userType === 'customer') {
    return {
      isAuthenticated: true,
      customer: auth.user,
      guestId: null
    }
  }
  
  // For guest users, you might want to use a session ID or cookie
  // This is a placeholder - implement based on your guest tracking needs
  return {
    isAuthenticated: false,
    customer: null,
    guestId: 'guest-' + Math.random().toString(36).substr(2, 9)
  }
}