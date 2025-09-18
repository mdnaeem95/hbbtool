import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { AccountContent } from "./account-content"
import { db } from '@kitchencloud/database'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
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
    redirect('/auth')
  }

  return <AccountContent user={user} customer={customer} />
}