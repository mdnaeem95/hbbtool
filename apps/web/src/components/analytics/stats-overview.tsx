import { Card, CardContent } from "@kitchencloud/ui"
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown,
  Users,
  Package,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface StatCard {
  title: string
  value: string | number
  change: number
  trend: 'up' | 'down'
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBgColor: string
}

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

function StatCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  iconColor, 
  iconBgColor 
}: StatCard) {
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${Math.abs(change).toFixed(1)}%`
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change !== 0 && (
              <div className="flex items-center gap-1 text-sm">
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {formatChange(change)}
                </span>
                <span className="text-muted-foreground">vs prev period</span>
              </div>
            )}
          </div>
          <div className={`rounded-lg p-3 ${iconBgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards: StatCard[] = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.revenue.value),
      change: stats.revenue.change,
      trend: stats.revenue.trend,
      icon: DollarSign,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-50",
    },
    {
      title: "Total Orders",
      value: stats.orders.value.toLocaleString(),
      change: stats.orders.change,
      trend: stats.orders.trend,
      icon: ShoppingBag,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-50",
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(stats.avgOrderValue.value),
      change: stats.avgOrderValue.change,
      trend: stats.avgOrderValue.trend,
      icon: TrendingUp,
      iconColor: "text-purple-600",
      iconBgColor: "bg-purple-50",
    },
    {
      title: "Total Customers",
      value: stats.customers.value.toLocaleString(),
      change: stats.customers.change,
      trend: stats.customers.trend,
      icon: Users,
      iconColor: "text-orange-600",
      iconBgColor: "bg-orange-50",
    },
    {
      title: "Products Sold",
      value: stats.products.value.toLocaleString(),
      change: stats.products.change,
      trend: stats.products.trend,
      icon: Package,
      iconColor: "text-indigo-600",
      iconBgColor: "bg-indigo-50",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  )
}