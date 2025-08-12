"use client"

import { useState } from "react"

import {
  ProductGrid,
  ProductFilters,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  useToast,
} from "@kitchencloud/ui"
import { Search, Package, Store } from "lucide-react"
import { api } from "@/lib/trpc/client"

export default function TestCatalogPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [selectedMerchant, setSelectedMerchant] = useState<string>("")
  const [filters, setFilters] = useState({
    categories: [] as string[],
    priceRange: undefined as [number, number] | undefined,
    sort: "featured" as any,
  })

  // Fetch merchants
  const { data: merchants } = api.merchant.list.useQuery({
    limit: 10,
  })

  // Fetch products with filters
  const { data: productsData, isLoading } = api.product.list.useQuery({
    filters: {
      merchantId: selectedMerchant || undefined,
      search: search || undefined,
      categories: filters.categories.length > 0 ? filters.categories : undefined,
      minPrice: filters.priceRange?.[0],
      maxPrice: filters.priceRange?.[1],
    },
    sort: { sortBy: filters.sort },
    pagination: { limit: 20 },
  })

  // Fetch categories for selected merchant
  const { data: categories } = api.category.list.useQuery(
    { merchantId: selectedMerchant },
    { enabled: !!selectedMerchant }
  )

  const handleAddToCart = (productId: string) => {
    toast({
      title: "Added to cart",
      description: "Product has been added to your cart",
    })
    console.log("Add to cart:", productId)
  }

  const handleQuickView = (productId: string) => {
    toast({
      title: "Quick view",
      description: `Opening quick view for product ${productId}`,
    })
    console.log("Quick view:", productId)
  }

  const products = productsData?.items || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container py-8">
          <h1 className="text-4xl font-bold">Product Catalog Test</h1>
          <p className="mt-2 text-muted-foreground">
            Test the product catalog functionality with tRPC integration
          </p>
        </div>
      </div>

      {/* Test Controls */}
      <div className="border-b bg-muted/50">
        <div className="container py-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Merchant Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4" />
                  Select Merchant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={selectedMerchant}
                  onChange={(e) => setSelectedMerchant(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="">All Merchants</option>
                  {merchants?.items.map((merchant: any) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.name} ({merchant._count.products} products)
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* API Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  API Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>
                    Products: {products.length} loaded
                    {isLoading && " (loading...)"}
                  </p>
                  <p>Categories: {categories?.length || 0} available</p>
                  <p>Merchants: {merchants?.items.length || 0} active</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearch("")
                    setFilters({
                      categories: [],
                      priceRange: undefined,
                      sort: "featured",
                    })
                    setSelectedMerchant("")
                  }}
                >
                  Reset All Filters
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filters */}
          <div className="lg:col-span-1">
            <ProductFilters
              categories={
                categories?.map((cat: any) => ({
                  value: cat.id,
                  label: cat.name,
                  count: cat.productCount,
                })) || []
              }
              priceRange={
                products.length > 0
                  ? {
                      min: 0,
                      max: 100,
                      current: [0, 100],
                    }
                  : undefined
              }
              selectedFilters={filters}
              onChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
              onClear={() =>
                setFilters({
                  categories: [],
                  priceRange: undefined,
                  sort: "featured",
                })
              }
            />
          </div>

          {/* Products */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Product Grid */}
            <ProductGrid
              products={products.map((product: any) => ({
                ...product,
                price: product.price,
                images: product.images || ["/placeholder-food.jpg"],
                status: product.status as any,
              }))}
              loading={isLoading}
              onAddToCart={handleAddToCart}
              onQuickView={handleQuickView}
              showMerchant={!selectedMerchant}
            />
          </div>
        </div>
      </div>
    </div>
  )
}