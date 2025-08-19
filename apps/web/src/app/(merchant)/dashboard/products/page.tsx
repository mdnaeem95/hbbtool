"use client"

import { Suspense, use, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, toast } from "@kitchencloud/ui"
import { Loader2, Package, Plus } from "lucide-react"
import { ProductList } from "@/components/product/product-list"
import { ProductListSkeleton } from "@/components/product/product-list-skeleton"
import { ProductStats } from "@/components/product/product-stats"
import { Button } from "@kitchencloud/ui"
import { useSession } from "@/hooks/use-session"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    category?: string
    sort?: string
  }>
}) {
  const router = useRouter()
  const { user, loading } = useSession()
  const params = use(searchParams)
  const [isImporting, setIsImporting] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth?redirect=/dashboard/products")
    }
  }, [user, loading, router])

  if (loading) {
    return <ProductListSkeleton />
  }

  if (!user) {
    return null
  }

  // Handle import action
  const handleImport = async () => {
    setIsImporting(true)
    
    // Simulate import process
    setTimeout(() => {
      setIsImporting(false)
      toast({
        title: "Import feature coming soon",
        description: "This feature will be available in the next update.",
      })
    }, 1500)
  }

  const handleAddProductClick = () => {
    setIsNavigating(true)
    router.push("/dashboard/products/new")
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your menu items and inventory
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
          <Button
            onClick={handleAddProductClick}
            disabled={isNavigating}
            className="bg-orange-600 hover:bg-orange-700 text-white transition-all duration-200 hover:shadow-md"
          >
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<ProductStatsSkeleton />}>
        <ProductStats />
      </Suspense>

      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            View and manage your product catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ProductListSkeleton />}>
            <ProductList searchParams={params} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function ProductStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-7 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}