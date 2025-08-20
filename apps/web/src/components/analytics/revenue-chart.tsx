import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@kitchencloud/ui"
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import { format, differenceInDays } from "date-fns"

interface RevenueChartProps {
  data: Array<{
    date: string
    revenue: number
  }>
  isLoading: boolean
  dateRange: {
    from: Date
    to: Date
  }
}

export function RevenueChart({ data, isLoading, dateRange }: RevenueChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Format date based on range
  const daysDiff = differenceInDays(dateRange.to, dateRange.from)
  const dateFormat = daysDiff <= 7 ? "EEE" : daysDiff <= 31 ? "MMM d" : "MMM"

  const formattedData = data.map(item => ({
    ...item,
    displayDate: format(new Date(item.date), dateFormat),
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            Revenue: <span className="font-medium text-foreground">
              {formatCurrency(payload[0].value)}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Revenue Trends</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Revenue</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="displayDate"
                className="text-xs"
                tick={{ fill: '#888' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: '#888' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value: any) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ff6b35"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-semibold">
              {formatCurrency(data.reduce((sum, d) => sum + d.revenue, 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Daily Average</p>
            <p className="text-xl font-semibold">
              {formatCurrency(
                data.length > 0 
                  ? data.reduce((sum, d) => sum + d.revenue, 0) / data.length 
                  : 0
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Best Day</p>
            <p className="text-xl font-semibold">
              {formatCurrency(Math.max(...data.map(d => d.revenue), 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}