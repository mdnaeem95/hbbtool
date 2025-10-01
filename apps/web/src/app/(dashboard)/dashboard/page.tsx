'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardStats, RecentOrders, PopularProducts, QuickStats, DashboardOnboarding } from "../../../components/merchant"
import { DashboardStatsSkeleton, RecentOrdersSkeleton, PopularProductsSkeleton, QuickStatsSkeleton } from "../../../components/merchant/dashboard"
import { AlertCircle, ArrowUpRight, Loader2 } from "lucide-react"
import { Alert, AlertDescription, Button } from "@homejiak/ui"
import Link from "next/link"
import { api } from "../../../lib/trpc/client"
import { useAuth } from "@homejiak/auth/client"

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isMerchant } = useAuth()
  const [authChecked, setAuthChecked] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Fetch dashboard data - only enable when we're sure user is a merchant
  const { data: dashboardData, isLoading, error } = api.merchant.getDashboard.useQuery(
    undefined,
    {
      enabled: authChecked && !!user && isMerchant,
      retry: 1
    }
  )

  // Fetch onboarding progress
  const { data: onboardingProgress } = api.onboarding.getProgress.useQuery(
    undefined,
    {
      enabled: authChecked && !!user && isMerchant,
    }
  )

  // Mutations for onboarding
  const updateTourStatus = api.onboarding.updateTourStatus.useMutation()
  const skipOnboarding = api.onboarding.skipOnboarding.useMutation()

  // Handle authentication
  useEffect(() => {
    // wait for auth to finish loading
    if (authLoading) return

    //mark auth as checked
    setAuthChecked(true)

    //if no user or not a merchant after auth loaded, redirect
    if (!user || !isMerchant) {
      router.push("/auth?redirect=/dashboard")
    }
  }, [authLoading, user, isMerchant, router])

  // Check if we should show onboarding
  useEffect(() => {
    if (onboardingProgress && dashboardData) {
      // Show onboarding if:
      // 1. It's their first login
      // 2. They haven't completed the tour
      // 3. They're within first 7 days
      const shouldShow = 
        onboardingProgress.isFirstLogin ||
        (!onboardingProgress.tourCompleted && onboardingProgress.daysSinceSignup < 7)
      
      setShowOnboarding(shouldShow)
    }
  }, [onboardingProgress, dashboardData])

  // Handle onboarding complete
  const handleOnboardingComplete = async () => {
    await updateTourStatus.mutateAsync({
      step: 7, // Last step
      completed: true
    })
    setShowOnboarding(false)
  }

  // Handle onboarding skip
  const handleOnboardingSkip = async () => {
    await skipOnboarding.mutateAsync()
    setShowOnboarding(false)
  }

  // Show loading state while auth is loading or hasn't been checked yet
  if (authLoading || !authChecked) {
    return <DashboardLoadingState />
  }

  // If auth is checked but no user/not merchant, show loading while redirecting
  if (!user || !isMerchant) {
    return <DashboardLoadingState />
  }

  // Show loading state while fetching dashboard data
  if (isLoading) {
    return <DashboardLoadingState />
  }

  // Handle errors
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  return (
    <>
      {/* Onboarding overlay - renders on top of dashboard */}
      {showOnboarding && (
        <DashboardOnboarding
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
          dashboardData={dashboardData}
        />
      )}

      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {dashboardData.merchant.businessName}! Here's what's happening with your business today.
          </p>
        </div>

        {/* Pending Orders Alert */}
        {dashboardData.stats.pendingOrders > 0 && (
          <Alert className="border-orange-200 bg-orange-50 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <AlertDescription className="flex items-center justify-between flex-1">
              <span className="text-sm font-medium text-orange-900">
                You have {dashboardData.stats.pendingOrders} orders waiting for confirmation
              </span>
              <Button asChild size="sm" variant="outline" className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-800 hover:scale-105 transition-all duration-200 hover:shadow-md group">
                <Link href="/dashboard/orders">
                  View Orders
                  <ArrowUpRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid - Add data-tour attribute */}
        <div data-tour="dashboard-stats">
          <DashboardStats stats={dashboardData.stats} />
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Orders - Add data-tour attribute */}
          <div data-tour="recent-orders">
            <RecentOrders orders={dashboardData.recentOrders} />
          </div>

          {/* Popular Products - Add data-tour attribute */}
          <div data-tour="popular-products">
            <PopularProducts topProducts={dashboardData.topProducts} />
          </div>
        </div>

        {/* Quick Stats - Add data-tour attribute */}
        <div data-tour="quick-stats">
          <QuickStats stats={dashboardData.stats} />
        </div>
      </div>
    </>
  )
}

// Full page loading state
function DashboardLoadingState() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Loading your dashboard...
        </p>
      </div>

      {/* Loading spinner */}
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      {/* Stats Grid Skeleton */}
      <DashboardStatsSkeleton />

      {/* Content Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentOrdersSkeleton />
        <PopularProductsSkeleton />
      </div>

      {/* Quick Stats Skeleton */}
      <QuickStatsSkeleton />
    </div>
  )
}