'use client'

import { Card, CardContent } from "@kitchencloud/ui"
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Users,
  Clock,
} from "lucide-react"

interface DashboardStatsProps {
  stats: {
    totalOrders: number
    pendingOrders: number
    revenue: any // Can be number or Prisma Decimal
  }
}

interface StatCardProps {
  title: string
  value: string | number
  change?: string
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
            {change && (
              <div className="flex items-center gap-1">
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm ${
                    trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {change}
                </span>
                <span className="text-sm text-muted-foreground">vs last week</span>
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
  // Convert revenue to a number
  const monthRevenue = toNumber(stats.revenue)

  // Calculate week-over-week changes (mock data for now)
  const weeklyStats = {
    revenueChange: "+12.5%",
    revenueTrend: "up" as const,
    ordersChange: "+8.2%",
    ordersTrend: "up" as const,
    customersChange: "+5.1%",
    customersTrend: "up" as const,
  }

  // Mock review count for now
  const totalReviews = 20

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Month Revenue"
        value={`$${monthRevenue.toFixed(2)}`}
        change={weeklyStats.revenueChange}
        trend={weeklyStats.revenueTrend}
        icon={DollarSign}
        iconColor="text-green-600"
        iconBgColor="bg-green-50"
      />
      <StatCard
        title="Total Orders"
        value={stats.totalOrders}
        change={weeklyStats.ordersChange}
        trend={weeklyStats.ordersTrend}
        icon={ShoppingBag}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-50"
      />
      <StatCard
        title="Pending Orders"
        value={stats.pendingOrders}
        icon={Clock}
        iconColor="text-orange-600"
        iconBgColor="bg-orange-50"
      />
      <StatCard
        title="Total Reviews"
        value={totalReviews}
        change={weeklyStats.customersChange}
        trend={weeklyStats.customersTrend}
        icon={Users}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-50"
      />
    </div>
  )
}