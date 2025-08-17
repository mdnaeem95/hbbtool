'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@kitchencloud/database'

export async function verifyMerchantAccess() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/merchant/login')
  }

  if (user.user_metadata?.userType !== 'merchant') {
    redirect('/')
  }

  // Verify merchant exists and is active directly from database
  try {
    const merchant = await db.merchant.findFirst({
      where: { 
        id: user.id, 
        deletedAt: null,
        status: 'ACTIVE'
      }
    })
    
    if (!merchant) {
      throw new Error('Merchant account is not active')
    }
    
    return merchant
  } catch (error) {
    redirect('/merchant/inactive')
  }
}

export async function getMerchantSession() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.userType !== 'merchant') {
    return null
  }

  try {
    const merchant = await db.merchant.findFirst({
      where: { 
        id: user.id, 
        deletedAt: null,
        status: 'ACTIVE'
      }
    })
    
    if (!merchant) {
      return null
    }
    
    return {
      user: {
        id: user.id,
        email: user.email!,
        userType: 'merchant' as const,
      },
      merchant,
    }
  } catch (error) {
    return null
  }
}