import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@kitchencloud/database'
import { AccountContent } from "./account-content"

export default async function AccountPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get customer data
  const customer = await db.customer.findUnique({
    where: { id: user.id },
    include: {
      addresses: true,
      _count: {
        select: { orders: true }
      }
    }
  })

  if (!customer) {
    redirect('/login')
  }

  return <AccountContent user={user} customer={customer} />
}