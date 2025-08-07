"use client"

import { AuthGuard } from "@/components/auth/auth-guard"
import { Button, Card } from "@kitchencloud/ui"
import { User, MapPin, ShoppingBag, LogOut } from "lucide-react"
import { signOut } from "@kitchencloud/auth/client"

export default function AccountPage() {
  async function handleSignOut() {
    await signOut()
    window.location.href = "/"
  }

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="container py-8">
          <h1 className="text-2xl font-bold">My Account</h1>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Profile Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your personal details
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
                    Manage your saved addresses
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
                    View your past orders
                  </p>
                </div>
              </div>
              <Button variant="outline" className="mt-4 w-full" asChild>
                <a href="/orders">View Orders</a>
              </Button>
            </Card>

            {/* Sign Out Card */}
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <LogOut className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Sign Out</h2>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your account
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="mt-4 w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}