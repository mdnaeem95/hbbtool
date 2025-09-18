'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import { Button, Card } from '@kitchencloud/ui'
import { User, MapPin, ShoppingBag, LogOut } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Customer } from '@kitchencloud/database'

interface AccountContentProps {
  user: SupabaseUser
  customer: Customer & {
    addresses: any[]
    _count: { orders: number }
  }
}

export function AccountContent({ user, customer }: AccountContentProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Profile Information</h2>
                <p className="text-sm text-muted-foreground">
                  Phone: {customer.phone}
                </p>
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full">
              Edit Profile
            </Button>
          </Card>

          {/* Addresses Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Delivery Addresses</h2>
                <p className="text-sm text-muted-foreground">
                  {customer.addresses.length} saved addresses
                </p>
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full">
              Manage Addresses
            </Button>
          </Card>

          {/* Orders Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Order History</h2>
                <p className="text-sm text-muted-foreground">
                  {customer._count.orders} total orders
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 w-full"
              onClick={() => router.push('/orders')}
            >
              View Orders
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}