import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Button } from "@kitchencloud/ui"
import { ArrowUpRight } from "lucide-react"
import { getServerCaller } from "@/app/api/trpc/server"

interface ProductStats {
  productId: string
  productName: string
  imageUrl?: string
  orderCount: number
  revenue: number
}

export async function PopularProducts() {
  // Fetch dashboard data which includes top products
  const api = await getServerCaller()
  const dashboardData = await api.merchant.getDashboard()
  const { topProducts } = dashboardData

  // If we have topProducts from dashboard, use those
  if (topProducts && topProducts.length > 0) {
    // Map the top products to our ProductStats format
    const productStats: ProductStats[] = topProducts.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      imageUrl: undefined, // We'll need to fetch product details separately if needed
      orderCount: item._sum.quantity || 0,
      revenue: 0, // We don't have revenue data in topProducts
    }))

    // Fetch product details to get images
    const products = await api.product.list({
      status: "ACTIVE",
      limit: 10,
    })

    // Match images to products
    productStats.forEach(stat => {
      const product = products.items.find((p: any) => p.id === stat.productId)
      if (product) {
        stat.imageUrl = product.images?.[0]
        stat.revenue = product.price * stat.orderCount
      }
    })

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Popular Products</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/products">
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productStats.slice(0, 4).map((product, index) => (
              <div key={product.productId} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex flex-1 items-center gap-3">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <Link
                      href={`/products/${product.productId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {product.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {product.orderCount} orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ${product.revenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Fallback: If no top products data, just fetch some products
  const products = await api.product.list({
    status: "ACTIVE",
    limit: 4,
  })

  if (products.items.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Popular Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Add products to see your best sellers here!
          </div>
        </CardContent>
      </Card>
    )
  }

  // Create mock stats for display
  const productStats: ProductStats[] = products.items.map((product: any) => ({
    productId: product.id,
    productName: product.name,
    imageUrl: product.images?.[0],
    // Mock data - in production, use actual order data
    orderCount: Math.floor(Math.random() * 50) + 10,
    revenue: product.price * (Math.floor(Math.random() * 50) + 10),
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Popular Products</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products">
            View All
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {productStats.map((product, index) => (
            <div key={product.productId} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex flex-1 items-center gap-3">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.productName}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <Link
                    href={`/products/${product.productId}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {product.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {product.orderCount} orders
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  ${product.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">revenue</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}