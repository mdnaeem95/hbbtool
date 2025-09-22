'use client'

import { Card, CardContent } from "@homejiak/ui"
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Clock, Star } from "lucide-react"

interface DashboardStatsProps {
  stats: {
    totalOrders: number
    pendingOrders: number
    revenue: any // Can be number or Prisma Decimal
    // Enhanced analytics data (if using the enhanced endpoint)
    analytics?: {
      revenue: { value: number; change: number; trend: 'up' | 'down' }
      orders: { value: number; change: number; trend: 'up' | 'down' }
      customers: { value: number }
      productsSold: { value: number }
      reviews: { value: number }
    }
  }
}

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  trend?: "up" | "down"
  icon: React.ElementType
  iconColor: string
  iconBgColor: string
}

// Helper function to convert Prisma Decimal to number
function toNumber(value: any): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber()
  }
  return Number(value || 0)
}

// Format percentage change
function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${Math.abs(change).toFixed(1)}%`
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  iconColor,
  iconBgColor,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatChange(change)}
                </span>
                <span className="text-sm text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className={`flex-shrink-0 rounded-lg p-3 ${iconBgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  // Use enhanced analytics data if available, otherwise use basic stats
  const monthRevenue = stats.analytics?.revenue.value ?? toNumber(stats.revenue)
  const totalOrders = stats.analytics?.orders.value ?? stats.totalOrders
  const totalReviews = stats.analytics?.reviews.value ?? 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Month Revenue"
        value={formatCurrency(monthRevenue)}
        change={stats.analytics?.revenue.change}
        trend={stats.analytics?.revenue.trend}
        icon={DollarSign}
        iconColor="text-green-600"
        iconBgColor="bg-green-50"
      />
      <StatCard
        title="Total Orders"
        value={totalOrders.toLocaleString()}
        change={stats.analytics?.orders.change}
        trend={stats.analytics?.orders.trend}
        icon={ShoppingBag}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-50"
      />
      <StatCard
        title="Pending Orders"
        value={stats.pendingOrders}
        // No change data for pending orders since it's a current snapshot
        icon={Clock}
        iconColor="text-orange-600"
        iconBgColor="bg-orange-50"
      />
      <StatCard
        title="Total Reviews"
        value={totalReviews.toLocaleString()}
        // No change calculation for reviews yet
        icon={Star}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-50"
      />
    </div>
  )
}