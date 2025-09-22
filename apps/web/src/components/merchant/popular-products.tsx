'use client'

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Button } from "@homejiak/ui"
import { ArrowUpRight, Package, TrendingUp } from "lucide-react"

interface PopularProductsProps {
  topProducts: Array<{
    id: string
    name: string
    quantitySold: number
    revenue: number
  }>
}

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
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
            <div className="text-center space-y-2">
              <Package className="h-8 w-8 mx-auto opacity-50" />
              <p>Add products to see your best sellers here!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Popular Products</CardTitle>
        <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100 hover:text-gray-900 hover:scale-105 transition-all duration-200 hover:shadow-sm group">
          <Link href="/dashboard/products">
            View All
            <ArrowUpRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-8">
          {topProducts.slice(0, 5).map((product, index) => {
            return (
              <div key={product.id} className="flex items-center gap-3">
                {/* Ranking badge */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  index === 0 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : index === 1 
                    ? 'bg-gray-100 text-gray-700'
                    : index === 2
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex flex-1 items-center gap-3">
                  {/* Product icon */}
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-500" />
                  </div>
                  
                  {/* Product details */}
                  <div className="flex-1 space-y-0.5">
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="text-sm font-medium hover:underline text-gray-900 block"
                    >
                      {product.name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{product.quantitySold} sold</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatCurrency(product.revenue)}
                      </span>
                    </div>
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