"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/trpc/client"
import { useSession } from "@/hooks/use-session"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  Spinner,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kitchencloud/ui"
import { 
  Download, 
  Calendar,
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
} from "lucide-react"
import { StatsOverview } from "@/components/analytics/stats-overview"
import { RevenueChart } from "@/components/analytics/revenue-chart"
import { OrderAnalytics } from "@/components/analytics/order-analytics"
import { ProductPerformance } from "@/components/analytics/product-performance"
import { CustomerInsights } from "@/components/analytics/customer-insights"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import { startOfDay, endOfDay, subDays } from "date-fns"

type DatePreset = 'today' | '7days' | '30days' | '90days' | 'custom'

// Stable date range calculator
function getStableDateRange(preset: DatePreset, customRange?: { from: Date; to: Date }) {
  if (preset === 'custom' && customRange) {
    return {
      from: startOfDay(customRange.from),
      to: endOfDay(customRange.to),
    }
  }
  
  const now = new Date()
  const today = startOfDay(now)
  const todayEnd = endOfDay(now)
  
  switch (preset) {
    case 'today':
      return { from: today, to: todayEnd }
    case '7days':
      return { from: startOfDay(subDays(today, 7)), to: todayEnd }
    case '30days':
      return { from: startOfDay(subDays(today, 30)), to: todayEnd }
    case '90days':
      return { from: startOfDay(subDays(today, 90)), to: todayEnd }
    default:
      return { from: startOfDay(subDays(today, 30)), to: todayEnd }
  }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const [datePreset, setDatePreset] = useState<DatePreset>('30days')
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date()
    return {
      from: startOfDay(subDays(now, 30)),
      to: endOfDay(now),
    }
  })
  
  // Track if we've done the initial auth check
  const authChecked = useRef(false)
  
  // Redirect if not authenticated after loading
  useEffect(() => {
    if (!sessionLoading && !user && !authChecked.current) {
      authChecked.current = true
      router.push("/auth?redirect=/dashboard/analytics")
    }
  }, [sessionLoading, user, router])

  // Calculate stable date range
  const dateRange = React.useMemo(
    () => getStableDateRange(datePreset, customDateRange),
    [datePreset, customDateRange]
  )

  // Create stable query input - serialize dates to ISO strings for stability
  const queryInput = React.useMemo(() => ({
    preset: datePreset === 'custom' ? undefined : datePreset,
    from: dateRange.from,
    to: dateRange.to,
  }), [datePreset, dateRange.from.toISOString(), dateRange.to.toISOString()])

  // Query options with proper caching
  const queryOptions = React.useMemo(() => ({
    enabled: !sessionLoading && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  }), [sessionLoading, user])

  // Fetch analytics data
  const statsQuery = api.analytics.getDashboardStats.useQuery(queryInput, queryOptions)
  const revenueQuery = api.analytics.getRevenueChart.useQuery(queryInput, queryOptions)
  const orderMetricsQuery = api.analytics.getOrderMetrics.useQuery(queryInput, queryOptions)
  const productQuery = api.analytics.getProductPerformance.useQuery(queryInput, queryOptions)
  const customerQuery = api.analytics.getCustomerInsights.useQuery(queryInput, queryOptions)

  // Handle date preset change
  const handleDatePresetChange = useCallback((value: string) => {
    setDatePreset(value as DatePreset)
  }, [])

  // Handle custom date range change
  const handleCustomDateChange = useCallback((range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setCustomDateRange({
        from: startOfDay(range.from),
        to: endOfDay(range.to),
      })
    }
  }, [])

  // Show loading state while checking session
  if (sessionLoading || (!user && !authChecked.current)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // Don't render if no user (will redirect)
  if (!user) {
    return null
  }

  // Show loading state while fetching initial data
  const isInitialLoading = statsQuery.isLoading && !statsQuery.data

  if (isInitialLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your business performance and customer insights
          </p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {datePreset === 'custom' ? (
              <DateRangePicker
                from={customDateRange.from}
                to={customDateRange.to}
                onSelect={handleCustomDateChange}
              />
            ) : (
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Export Button */}
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {statsQuery.data && <StatsOverview stats={statsQuery.data} />}

      {/* Tabs for different analytics sections */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] md:grid-cols-4">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueChart 
            data={revenueQuery.data || []} 
            isLoading={revenueQuery.isLoading}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <OrderAnalytics 
            data={orderMetricsQuery.data} 
            isLoading={orderMetricsQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <ProductPerformance 
            products={productQuery.data || []} 
            isLoading={productQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <CustomerInsights 
            data={customerQuery.data} 
            isLoading={customerQuery.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}