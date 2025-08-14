'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServerCaller } from '../api/trpc/server'

export async function verifyMerchantAccess() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/merchant/login')
  }

  if (user.user_metadata?.userType !== 'merchant') {
    redirect('/')
  }

  // Verify merchant exists and is active
  try {
    const trpc = await getServerCaller()
    const merchant = await trpc.merchant.get()
    if (!merchant || merchant.status !== 'ACTIVE') {
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
    const trpc = await getServerCaller()
    const merchant = await trpc.merchant.get()
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