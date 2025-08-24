'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardStats, RecentOrders, PopularProducts, QuickStats } from "@/components/merchant"
import { AlertCircle, ArrowUpRight, Loader2 } from "lucide-react"
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, Skeleton } from "@kitchencloud/ui"
import Link from "next/link"
import { api } from "@/lib/trpc/client"
import { useAuth } from "@kitchencloud/auth/client"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, isMerchant } = useAuth()
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = api.merchant.getDashboard.useQuery(
    undefined,
    {
      enabled: !!user && isMerchant,
    }
  )

  // Handle authentication
  useEffect(() => {
    if (!authLoading && (!user || !isMerchant)) {
      router.push("/auth?redirect=/dashboard")
    }
  }, [authLoading, user, isMerchant, router])

  // Show loading state
  if (authLoading || isLoading) {
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
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-900">
                You have {dashboardData.stats.pendingOrders} orders waiting for confirmation
              </span>
              <Button asChild size="sm" variant="outline" className="ml-4">
                <Link href="/orders?status=pending">
                  View Orders
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <DashboardStats stats={dashboardData.stats} />

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Orders */}
          <RecentOrders orders={dashboardData.recentOrders} />

          {/* Popular Products */}
          <PopularProducts topProducts={dashboardData.topProducts} />
        </div>

        {/* Quick Stats */}
        <QuickStats stats={dashboardData.stats} />
      </div>
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

// Loading skeletons - exported from here
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RecentOrdersSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b pb-4 last:border-0"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PopularProductsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickStatsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}