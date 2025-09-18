'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MerchantSidebar, MerchantHeader, MerchantMobileNav } from "../../components/merchant"
import { useAuth } from "@kitchencloud/auth/client"
import { api } from "../../lib/trpc/client"
import { Loader2 } from "lucide-react"
import { OrderStreamProvider } from "../../providers/order-stream-provider"

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isLoading: authLoading, isMerchant } = useAuth()
  const [authChecked, setAuthChecked] = useState(false)
  
  // Fetch merchant dashboard data only when auth confirmed
  const { data: dashboardData, isLoading: dashboardLoading, error } = api.merchant.getDashboard.useQuery(
    undefined,
    {
      enabled: authChecked && !!user && isMerchant,
      retry: 1, // Limit retries
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Handle authentication check
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return
    
    // Mark auth as checked
    setAuthChecked(true)
    
    // If no user or not a merchant after auth has loaded, redirect
    if (!user || !isMerchant) {
      router.push("/auth?redirect=/dashboard")
    }
  }, [authLoading, user, isMerchant, router])

  // Handle API errors (like FORBIDDEN/UNAUTHORIZED)
  useEffect(() => {
    if (error?.data?.code === 'FORBIDDEN' || error?.data?.code === 'UNAUTHORIZED') {
      // Clear any stale auth state and redirect
      router.push("/auth?redirect=/dashboard")
    }
  }, [error, router])

  // Show loading state
  if (authLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If auth is checked but no user/not merchant, show loading while redirecting
  if (!user || !isMerchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Show loading state while fetching dashboard data
  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If we have an error that's not auth-related, show error state
  if (error && error.data?.code !== 'FORBIDDEN' && error.data?.code !== 'UNAUTHORIZED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Unable to load merchant data</p> 
          <p className="text-xs text-muted-foreground mt-2">Please try refreshing the page</p>
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
    <OrderStreamProvider>
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
    </OrderStreamProvider>
  )
}