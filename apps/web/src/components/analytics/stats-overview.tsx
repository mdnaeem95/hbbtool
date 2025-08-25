'use client'

import { formatCurrency } from "@/lib/utils"
import { Card, CardContent } from "@kitchencloud/ui"
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
} from "lucide-react"

interface StatsOverviewProps {
  stats: {
    revenue: {
      value: number
      change: number
      trend: 'up' | 'down'
    }
    orders: {
      value: number
      change: number
      trend: 'up' | 'down'
    }
    avgOrderValue: {
      value: number
      change: number
      trend: 'up' | 'down'
    }
    customers: {
      value: number
      change: number
      trend: 'up' | 'down'
    }
    products: {
      value: number
      change: number
      trend: 'up' | 'down'
    }
  }
}

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down'
  icon: React.ElementType
  iconColor: string
  iconBgColor: string
}

function formatChange(change?: number): string {
  if (!change) return '0%'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
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
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Left side - Content */}
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {value}
            </p>
            {change !== undefined && trend && (
              <div className="flex items-center gap-1 text-xs">
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`font-medium ${
                  trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatChange(change)}
                </span>
                <span className="text-muted-foreground">
                  vs prev period
                </span>
              </div>
            )}
          </div>
          
          {/* Right side - Icon */}
          <div className={`rounded-xl p-2.5 ${iconBgColor}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.revenue.value),
      change: stats.revenue.change,
      trend: stats.revenue.trend,
      icon: DollarSign,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-100",
    },
    {
      title: "Total Orders",
      value: stats.orders.value.toLocaleString(),
      change: stats.orders.change,
      trend: stats.orders.trend,
      icon: ShoppingBag,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-100",
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(stats.avgOrderValue.value),
      change: stats.avgOrderValue.change,
      trend: stats.avgOrderValue.trend,
      icon: TrendingUp,
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-100",
    },
    {
      title: "Total Customers",
      value: stats.customers.value.toLocaleString(),
      change: stats.customers.change,
      trend: stats.customers.trend,
      icon: Users,
      iconColor: "text-orange-600",
      iconBgColor: "bg-orange-100",
    },
    {
      title: "Products Sold",
      value: stats.products.value.toLocaleString(),
      change: stats.products.change,
      trend: stats.products.trend,
      icon: Package,
      iconColor: "text-indigo-600",
      iconBgColor: "bg-indigo-100",
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  )
}