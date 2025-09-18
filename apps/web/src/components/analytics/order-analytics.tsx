import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@kitchencloud/ui"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Clock, CheckCircle2, XCircle, Truck } from "lucide-react"

interface OrderAnalyticsProps {
  data?: {
    byStatus: Array<{
      status: string
      count: number
    }>
    hourlyDistribution: Array<{
      hour: number
      orders: number
    }>
    avgPreparationTime: number
    fulfillmentRate: number
  }
  isLoading: boolean
}

const STATUS_COLORS = {
  PENDING: "#FFA500",
  CONFIRMED: "#3B82F6",
  PREPARING: "#8B5CF6",
  READY: "#10B981",
  COMPLETED: "#059669",
  CANCELLED: "#EF4444",
  DELIVERED: "#06B6D4",
}

const STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DELIVERED: "Delivered",
}

export function OrderAnalytics({ data, isLoading }: OrderAnalyticsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Format status data for pie chart
  const statusData = data.byStatus.map(item => ({
    name: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || "#888888",
  }))

  // Format hourly data
  const hourlyData = data.hourlyDistribution.map(item => ({
    hour: `${item.hour}:00`,
    orders: item.orders,
  }))

  // Find peak hours
  const peakHours = [...data.hourlyDistribution]
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 3)
    .map(h => `${h.hour}:00`)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="text-sm font-medium">{payload[0].name || payload[0].dataKey}</p>
          <p className="text-sm text-muted-foreground">
            Count: <span className="font-medium text-foreground">{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-50 p-3">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Prep Time</p>
              <p className="text-2xl font-bold">{Math.round(data.avgPreparationTime)} min</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-50 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold">
                {((statusData.find(s => s.name === 'Completed')?.value || 0) / 
                  statusData.reduce((sum, s) => sum + s.value, 0) * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-red-50 p-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cancellation Rate</p>
              <p className="text-2xl font-bold">
                {((statusData.find(s => s.name === 'Cancelled')?.value || 0) / 
                  statusData.reduce((sum, s) => sum + s.value, 0) * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-orange-50 p-3">
              <Truck className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Peak Hours</p>
              <p className="text-lg font-bold">{peakHours[0]}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent?: number }) => `${name} ${(percent! * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  {/* @ts-ignore */}
                  <XAxis 
                    dataKey="hour"
                    className="text-xs"
                    tick={{ fill: '#888' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  {/* @ts-ignore */}
                  <YAxis
                    className="text-xs"
                    tick={{ fill: '#888' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="orders" 
                    fill="#ff6b35"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}