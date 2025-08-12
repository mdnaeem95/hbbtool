import { redirect } from "next/navigation"
import { MerchantSidebar, MerchantHeader, MerchantMobileNav } from "@/components/merchant"

import { createClient } from "@/lib/supabase/server"
import { api } from "@/lib/trpc/server"

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check authentication
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/dashboard")
  }

  // Fetch merchant data
  let dashboardData
  try {
    dashboardData = await api.merchant.getDashboard.query()
  } catch (error) {
    // If user is not a merchant, redirect to customer area
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <MerchantSidebar dashboardData={dashboardData} className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64" />
      
      {/* Mobile navigation */}
      <MerchantMobileNav dashboardData={dashboardData} />
      
      {/* Main content area */}
      <div className="lg:pl-64">
        <MerchantHeader dashboardData={dashboardData} />
        
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}