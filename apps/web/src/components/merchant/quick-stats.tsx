'use client'

import { Card, CardContent } from "@kitchencloud/ui"
import {
  CheckCircle,
  Clock,
  Package,
  Star,
  TrendingUp,
  AlertCircle,
} from "lucide-react"

interface QuickStatsProps {
  stats: {
    pendingOrders: number
    // Enhanced stats from the updated getDashboard endpoint
    analytics?: {
      revenue: { value: number; change: number; trend: 'up' | 'down' }
      orders: { value: number; change: number; trend: 'up' | 'down' }
      customers: { value: number }
      productsSold: { value: number }
      reviews: { value: number }
      // Corrected quick stats fields
      completionRate?: number
      avgPreparationTime?: number
      avgRating?: number
      activeProducts?: number
    }
  }
}

interface StatItemProps {
  icon: React.ElementType
  iconColor: string
  iconBgColor: string
  value: string | number
  label: string
  subLabel?: string
  isLoading?: boolean
}

function StatItem({
  icon: Icon,
  iconColor,
  iconBgColor,
  value,
  label,
  subLabel,
  isLoading = false,
}: StatItemProps) {
  return (
    <div className="flex flex-col items-center space-y-2 text-center">
      <div className={`rounded-lg p-3 ${iconBgColor}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div className="space-y-1">
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse bg-gray-200 rounded mx-auto" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
        <p className="text-sm text-muted-foreground">{label}</p>
        {subLabel && !isLoading && (
          <p className="text-xs text-muted-foreground">{subLabel}</p>
        )}
      </div>
    </div>
  )
}

export function QuickStats({ stats }: QuickStatsProps) {
  // Use real data from analytics, with fallbacks
  const analytics = stats.analytics
  
  // Calculate metrics with fallbacks for when analytics aren't available yet
  const completionRate = analytics?.completionRate ?? 0
  const avgPreparationTime = analytics?.avgPreparationTime ?? 0
  const avgRating = analytics?.avgRating ?? 0
  const monthlyGrowth = analytics?.revenue.change ?? 0
  const activeProducts = analytics?.activeProducts ?? 0
  const reviewCount = analytics?.reviews.value ?? 0
  
  // Determine if we're still loading analytics data
  const isLoadingAnalytics = !analytics

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatItem
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
            value={completionRate > 0 ? `${completionRate}%` : '0%'}
            label="Completion Rate"
            subLabel="All time"
            isLoading={isLoadingAnalytics}
          />
          <StatItem
            icon={Clock}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
            value={avgPreparationTime > 0 ? `${avgPreparationTime} min` : '0 min'}
            label="Avg. Prep Time"
            subLabel="Last 30 days"
            isLoading={isLoadingAnalytics}
          />
          <StatItem
            icon={Package}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
            value={activeProducts}
            label="Active Products"
            isLoading={isLoadingAnalytics}
          />
          <StatItem
            icon={Star}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
            value={avgRating > 0 ? avgRating.toFixed(1) : '0.0'}
            label="Average Rating"
            subLabel={reviewCount > 0 ? `${reviewCount} reviews` : 'No reviews yet'}
            isLoading={isLoadingAnalytics}
          />
          <StatItem
            icon={TrendingUp}
            iconColor={monthlyGrowth >= 0 ? "text-emerald-600" : "text-red-600"}
            iconBgColor={monthlyGrowth >= 0 ? "bg-emerald-50" : "bg-red-50"}
            value={monthlyGrowth !== 0 ? `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%` : '0%'}
            label="Monthly Growth"
            subLabel="Revenue"
            isLoading={isLoadingAnalytics}
          />
          <StatItem
            icon={AlertCircle}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
            value={stats.pendingOrders}
            label="Action Items"
            subLabel="Needs attention"
            // Never loading since pendingOrders is always available
          />
        </div>
      </CardContent>
    </Card>
  )
}