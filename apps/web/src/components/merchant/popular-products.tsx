'use client'

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Button } from "@kitchencloud/ui"
import { ArrowUpRight, Package } from "lucide-react"

interface PopularProductsProps {
  topProducts: Array<{
    productId: string
    productName: string
    _sum: {
      quantity: number | null
    }
  }>
}

export function PopularProducts({ topProducts }: PopularProductsProps) {
  if (topProducts.length === 0) {
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
          {topProducts.slice(0, 4).map((product, index) => {
            const orderCount = product._sum.quantity || 0
            
            return (
              <div key={product.productId} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Link
                      href={`/products/${product.productId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {product.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {orderCount} orders
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}