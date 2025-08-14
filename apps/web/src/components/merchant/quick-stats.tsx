import { getServerCaller } from "@/app/api/trpc/server"
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
  merchantId: string
}

interface StatItemProps {
  icon: React.ElementType
  iconColor: string
  iconBgColor: string
  value: string | number
  label: string
  subLabel?: string
}

function StatItem({
  icon: Icon,
  iconColor,
  iconBgColor,
  value,
  label,
  subLabel,
}: StatItemProps) {
  return (
    <div className="flex flex-col items-center space-y-2 text-center">
      <div className={`rounded-lg p-3 ${iconBgColor}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {subLabel && (
          <p className="text-xs text-muted-foreground">{subLabel}</p>
        )}
      </div>
    </div>
  )
}

export async function QuickStats({ merchantId }: QuickStatsProps) {
  // Fetch dashboard data and additional stats
  const api = await getServerCaller()
  const dashboardData = await api.merchant.getDashboard()
  const { stats } = dashboardData
  console.log(`Merchant Id: ${merchantId}`)

  // Calculate completion rate (mock data for now)
  const completionRate = 98.5
  const avgPreparationTime = 45
  const avgRating = 4.8

  // Calculate monthly growth (mock data)
  const monthlyGrowth = 15.2

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatItem
            icon={CheckCircle}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
            value={`${completionRate}%`}
            label="Completion Rate"
            subLabel="Last 30 days"
          />
          <StatItem
            icon={Clock}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
            value={`${avgPreparationTime} min`}
            label="Avg. Prep Time"
            subLabel="Per order"
          />
          <StatItem
            icon={Package}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
            value={10}
            label="Active Products"
          />
          <StatItem
            icon={Star}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-50"
            value={avgRating}
            label="Average Rating"
            subLabel={`${20} reviews`}
          />
          <StatItem
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBgColor="bg-emerald-50"
            value={`+${monthlyGrowth}%`}
            label="Monthly Growth"
            subLabel="Revenue"
          />
          <StatItem
            icon={AlertCircle}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
            value={stats.pendingOrders}
            label="Action Items"
            subLabel="Needs attention"
          />
        </div>
      </CardContent>
    </Card>
  )
}