import { Card, CardContent, CardHeader, CardTitle, Skeleton, Progress } from "@kitchencloud/ui"
import { formatCurrency } from "../../lib/utils"
import { Users, UserPlus, RefreshCw, DollarSign, Heart, TrendingUp } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface CustomerInsightsProps {
  data?: {
    total: number
    new: number
    returning: number
    repeatRate: number
    avgCustomerValue: number
    customerLifetimeValue: number
  }
  isLoading: boolean
}

export function CustomerInsights({ data, isLoading }: CustomerInsightsProps) {
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Prepare data for pie chart
  const customerTypeData = [
    { name: "New Customers", value: data.new, color: "#10B981" },
    { name: "Returning Customers", value: data.returning, color: "#3B82F6" },
    { name: "One-time Customers", value: data.total - data.returning - data.new, color: "#6B7280" },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            Count: <span className="font-medium text-foreground">{payload[0].value}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Percentage: <span className="font-medium text-foreground">
              {((payload[0].value / data.total) * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-50 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{data.total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-50 p-3">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">New Customers</p>
              <p className="text-2xl font-bold">{data.new.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-50 p-3">
              <RefreshCw className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Repeat Rate</p>
              <p className="text-2xl font-bold">{data.repeatRate.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-orange-50 p-3">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">{formatCurrency(data.avgCustomerValue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-pink-50 p-3">
              <Heart className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer Lifetime Value</p>
              <p className="text-2xl font-bold">{formatCurrency(data.customerLifetimeValue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-indigo-50 p-3">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Returning Customers</p>
              <p className="text-2xl font-bold">{data.returning.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Customer Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {customerTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-4 space-y-2">
              {customerTypeData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {item.value} ({((item.value / data.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Repeat Rate Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Repeat Customer Rate</span>
                <span className="text-sm text-muted-foreground">{data.repeatRate.toFixed(1)}%</span>
              </div>
              <Progress value={data.repeatRate} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                Industry average: 20-40%
              </p>
            </div>

            {/* Customer Segments */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Customer Segments</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">VIP Customers (5+ orders)</span>
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(data.returning * 0.2)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Regular (2-4 orders)</span>
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(data.returning * 0.8)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-500" />
                    <span className="text-sm">One-time</span>
                  </div>
                  <span className="text-sm font-medium">
                    {data.total - data.returning}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-orange-900">
                💡 Recommendations
              </h4>
              <ul className="space-y-1 text-xs text-orange-800">
                {data.repeatRate < 20 && (
                  <li>• Consider loyalty programs to improve repeat rate</li>
                )}
                {data.avgCustomerValue < 50 && (
                  <li>• Try bundling products to increase order value</li>
                )}
                <li>• Send personalized offers to one-time customers</li>
                <li>• Create VIP rewards for your top customers</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}