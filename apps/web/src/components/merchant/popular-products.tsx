import Link from "next/link"
import { api } from "@/lib/trpc/server"
import { Card, CardContent, CardHeader, CardTitle, Button } from "@kitchencloud/ui"
import { ArrowUpRight } from "lucide-react"

interface PopularProductsProps {
  merchantId: string
}

interface ProductStats {
  productId: string
  productName: string
  imageUrl?: string
  orderCount: number
  revenue: number
}

export async function PopularProducts({ merchantId }: PopularProductsProps) {
  // Fetch products with order stats
  // Note: This would need a custom query in your API to get order statistics
  // For now, we'll fetch products and simulate the stats
  const products = await api.product.list.query({
    filters: {
        merchantId,
        status: "ACTIVE"
    },
    pagination: {
        limit: 4
    },
    sort: {
        sortBy: "featured"
    }
  })

  // In a real implementation, you'd have an API endpoint that returns
  // products with their order counts and revenue
  const productStats: ProductStats[] = products.items.map((product: any) => ({
    productId: product.id,
    productName: product.name,
    imageUrl: product.images?.[0],
    // Mock data - replace with actual order statistics
    orderCount: Math.floor(Math.random() * 50) + 10,
    revenue: product.price * (Math.floor(Math.random() * 50) + 10),
  }))

  // Sort by order count
  productStats.sort((a, b) => b.orderCount - a.orderCount)

  if (productStats.length === 0) {
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