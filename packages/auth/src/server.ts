import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db, Prisma, MerchantStatus } from '@kitchencloud/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  email: string
  userType: 'merchant' | 'customer'
}

export type MerchantSession = {
  user: AuthUser
  merchant: Prisma.MerchantGetPayload<{}>
}

export type CustomerSession = {
  user: AuthUser
  customer: Prisma.CustomerGetPayload<{}>
} | null

export function createServerSupabaseClient(): SupabaseClient {
  const store = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            )
          } catch {
            // RSC boundary – ignore
          }
        },
      },
    }
  )
}

export async function getServerSession(): Promise<{ user: AuthUser } | null> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    user: {
      id: user.id,
      email: user.email!,
      userType: (user.user_metadata?.userType ?? 'customer') as 'merchant' | 'customer',
    },
  }
}

/**
 * IMPORTANT:
 * This assumes your Merchant.id == Supabase auth user id.
 * If that’s *not* guaranteed, fall back to find by email or add an `authUserId` column.
 */
export async function requireMerchant(): Promise<MerchantSession> {
  const session = await getServerSession()
  if (!session) throw new Error('Authentication required')
  if (session.user.userType !== 'merchant') throw new Error('Merchant access required')

  let merchant = await db.merchant.findFirst({
    where: { id: session.user.id, deletedAt: null },
  })

  // Fallback by email if id not aligned (helps during migrations)
  if (!merchant) {
    merchant = await db.merchant.findFirst({
      where: { email: session.user.email, deletedAt: null },
    })
  }

  if (!merchant) throw new Error('Merchant profile not found')
  if (merchant.status !== MerchantStatus.ACTIVE) throw new Error('Merchant account is not active')

  return { user: session.user, merchant }
}

export async function getCustomerSession(): Promise<CustomerSession> {
  const session = await getServerSession()
  if (!session || session.user.userType !== 'customer') return null

  // Same alignment caveat as merchants
  let customer = await db.customer.findFirst({
    where: { id: session.user.id, deletedAt: null },
  })
  if (!customer) {
    customer = await db.customer.findFirst({
      where: { email: session.user.email, deletedAt: null },
    })
  }
  if (!customer) return null
  return { user: session.user, customer }
}

export async function getMerchantById(merchantId: string) {
  return db.merchant.findFirst({
    where: { id: merchantId, status: MerchantStatus.ACTIVE, deletedAt: null },
  })
}