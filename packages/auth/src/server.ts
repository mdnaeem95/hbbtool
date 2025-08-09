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
  
  return session
}

export async function requireCustomer() {
  const session = await getServerSession()
  
  if (!session) {
    throw new Error('Unauthorized: Authentication required')
  }
  
  if (session.user.userType !== 'customer') {
    throw new Error('Unauthorized: Customer access required')
  }
  
  return session
}

export async function optionalAuth() {
  try {
    return await getServerSession()
  } catch {
    return null
  }
}