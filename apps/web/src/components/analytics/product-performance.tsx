import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from "@homejiak/ui"
import { formatCurrency } from "../../lib/utils"
import { Eye, ShoppingBag, TrendingUp, AlertCircle } from "lucide-react"

interface ProductPerformanceProps {
  products: Array<{
    id: string
    name: string
    quantity: number
    revenue: number
    views: number
    conversionRate: number
  }>
  isLoading: boolean
}

export function ProductPerformance({ products, isLoading }: ProductPerformanceProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No product data available</p>
            <p className="text-sm text-muted-foreground">
              Product analytics will appear once you have sales data
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0)
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Products</CardTitle>
          <Badge variant="secondary">
            {products.length} Products
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Product List */}
          <div className="space-y-4">
            {products.map((product, index) => {
              const revenuePercentage = (product.revenue / totalRevenue) * 100
              const quantityPercentage = (product.quantity / totalQuantity) * 100
              
              return (
                <div
                  key={product.id}
                  className="relative rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  {/* Rank Badge */}
                  <div className="absolute -left-3 -top-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Product Name & Revenue */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {product.quantity} sold
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                        <p className="text-xs text-muted-foreground">
                          {revenuePercentage.toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {product.views.toLocaleString()} views
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatCurrency(product.revenue / product.quantity)} avg
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className={
                          product.conversionRate > 10 
                            ? "text-green-600" 
                            : product.conversionRate > 5 
                            ? "text-yellow-600" 
                            : "text-red-600"
                        }>
                          {product.conversionRate.toFixed(1)}% CVR
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bars */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Revenue Share</span>
                          <span>{revenuePercentage.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-orange-500 transition-all"
                            style={{ width: `${revenuePercentage}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Quantity Share</span>
                          <span>{quantityPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${quantityPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-semibold">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Sold</p>
              <p className="text-xl font-semibold">{totalQuantity.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}