'use client'

import { useEffect } from "react"
import { redirect } from "next/navigation"
import { MerchantSidebar, MerchantHeader, MerchantMobileNav } from "@/components/merchant"
import { useAuth } from "@kitchencloud/auth/client"
import { api } from "@/lib/trpc/client"
import { Loader2 } from "lucide-react"

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading: authLoading, isMerchant } = useAuth()
  
  // Fetch merchant dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, error } = api.merchant.getDashboard.useQuery(
    undefined,
    {
      enabled: !!user && isMerchant,
    }
  )

  // Handle authentication
  useEffect(() => {
    if (!authLoading && (!user || !isMerchant)) {
      redirect("/login?redirect=/dashboard")
    }
  }, [authLoading, user, isMerchant])

  // Handle merchant verification errors (user is not a merchant)
  useEffect(() => {
    if (error?.data?.code === 'FORBIDDEN' || error?.data?.code === 'UNAUTHORIZED') {
      redirect("/")
    }
  }, [error])

  // Show loading state
  if (authLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If no dashboard data at this point, something went wrong
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Unable to load merchant data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <MerchantSidebar 
        dashboardData={dashboardData} 
        className="lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64" 
      />
      
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