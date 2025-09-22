"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@homejiak/ui"
import { Package, PackageCheck, PackageX, TrendingUp } from "lucide-react"
import { api } from "../../lib/trpc/client"
import { ProductStatus } from "@homejiak/database/types"

export function ProductStats() {
  // For now, we'll use the list API to calculate stats
  const { data } = api.product.list.useQuery({ 
    page: 1, 
    limit: 100  // Get enough to calculate basic stats
  })

  if (!data) {
    return null
  }

  const products = data.items
  const stats = {
    total: products.length,
    active: products.filter((p: any) => p.status === ProductStatus.ACTIVE).length,
    outOfStock: products.filter((p: any) => p.trackInventory && p.inventory === 0).length,
    featured: products.filter((p: any) => p.featured).length,
  }

  const cards = [
    {
      title: "Total Products",
      value: stats.total,
      description: "Products in your catalog",
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Active Products",
      value: stats.active,
      description: `${Math.round((stats.active / stats.total) * 100)}% of total`,
      icon: PackageCheck,
      color: "text-green-600",
    },
    {
      title: "Out of Stock",
      value: stats.outOfStock,
      description: "Need restocking",
      icon: PackageX,
      color: "text-red-600",
    },
    {
      title: "Best Sellers",
      value: stats.featured,
      description: "Featured products",
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}