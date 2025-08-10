"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/trpc/client"
import { useDebounce } from "@/hooks/use-debounce"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { 
  ProductGrid,
  ProductFilters,
  ActiveFilters,
  Input,
  useToast,
} from "@kitchencloud/ui"
import { Search } from "lucide-react"
import { useCartStore } from "@/stores/cart"
import { QuickViewModal } from "./quick-view-modal"

interface ProductCatalogProps {
  merchantId: string
  merchantSlug: string
  categories: Array<{
    id: string
    name: string
    slug: string
    productCount?: number
  }>
  searchParams: {
    category?: string
    sort?: string
    min?: string
    max?: string
    search?: string
    page?: string
  }
}

export function ProductCatalog({
  merchantId,
  merchantSlug,
  categories,
  searchParams,
}: ProductCatalogProps) {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()
  const addToCart = useCartStore((state) => state.addItem)

  // State
  const [search, setSearch] = React.useState(searchParams.search || "")
  const [quickViewProductId, setQuickViewProductId] = React.useState<string | null>(null)
  const [showMobileFilters, setShowMobileFilters] = React.useState(false)
  
  const debouncedSearch = useDebounce(search, 300)

  // Parse filters from URL
  const filters = React.useMemo(() => ({
    categories: searchParams.category?.split(",").filter(Boolean) || [],
    minPrice: searchParams.min ? parseFloat(searchParams.min) : undefined,
    maxPrice: searchParams.max ? parseFloat(searchParams.max) : undefined,
    search: debouncedSearch,
  }), [searchParams.category, searchParams.min, searchParams.max, debouncedSearch])

  const sort = searchParams.sort || "featured"

  // Fetch products with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = api.product.list.useInfiniteQuery(
    {
      filters: {
        merchantId,
        ...filters,
        status: "ACTIVE",
        available: true,
      },
      sort: { sortBy: sort as any },
      pagination: { limit: 20 },
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Infinite scroll trigger
  const { ref: infiniteScrollRef } = useIntersectionObserver({
    threshold: 0.5,
    onIntersect: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
  })

  // All products flattened
  const products = React.useMemo(
    () => data?.pages.flatMap((page) => page.items) || [],
    [data]
  )

  // Price range for filters
  const priceRange = React.useMemo(() => {
    if (products.length === 0) return null
    const prices = products.map((p) => p.price.toNumber())
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
      current: [
        filters.minPrice || Math.floor(Math.min(...prices)),
        filters.maxPrice || Math.ceil(Math.max(...prices)),
      ] as [number, number],
    }
  }, [products, filters.minPrice, filters.maxPrice])

  // Update URL when filters change
  const updateFilters = (newFilters: any) => {
    const params = new URLSearchParams()
    
    if (newFilters.categories?.length) {
      params.set("category", newFilters.categories.join(","))
    }
    if (newFilters.sort && newFilters.sort !== "featured") {
      params.set("sort", newFilters.sort)
    }
    if (newFilters.priceRange) {
      params.set("min", newFilters.priceRange[0].toString())
      params.set("max", newFilters.priceRange[1].toString())
    }
    if (newFilters.search) {
      params.set("search", newFilters.search)
    }

    const queryString = params.toString()
    router.push(`/merchant/${merchantSlug}/products${queryString ? `?${queryString}` : ""}`)
  }

  // Handle add to cart
  const handleAddToCart = async (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    try {
      addToCart({
        productId: product.id,
        merchantId: product.merchantId,
        name: product.name,
        price: product.price.toNumber(),
        image: product.images[0],
        quantity: 1,
      })
      
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      })
    }
  }

  // Get active filters for display
  const activeFilters = React.useMemo(() => {
    const active: Array<{ key: string; value: string; label: string }> = []
    
    filters.categories.forEach((categoryId) => {
      const category = categories.find((c) => c.id === categoryId)
      if (category) {
        active.push({
          key: "category",
          value: categoryId,
          label: category.name,
        })
      }
    })
    
    if (filters.minPrice || filters.maxPrice) {
      active.push({
        key: "price",
        value: "range",
        label: `$${filters.minPrice || 0} - $${filters.maxPrice || "∞"}`,
      })
    }
    
    if (filters.search) {
      active.push({
        key: "search",
        value: filters.search,
        label: `Search: ${filters.search}`,
      })
    }
    
    return active
  }, [filters, categories])

  // Remove filter
  const removeFilter = (key: string, value?: string) => {
    if (key === "category" && value) {
      updateFilters({
        ...filters,
        categories: filters.categories.filter((c) => c !== value),
      })
    } else if (key === "price") {
      updateFilters({
        ...filters,
        priceRange: undefined,
      })
    } else if (key === "search") {
      setSearch("")
      updateFilters({
        ...filters,
        search: "",
      })
    }
  }

  // Category options for filters
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
    count: category.productCount,
  }))

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Desktop Filters */}
        <div className="hidden lg:block">
          <ProductFilters
            categories={categoryOptions}
            priceRange={priceRange || undefined}
            selectedFilters={{
              categories: filters.categories,
              priceRange: filters.minPrice || filters.maxPrice
                ? [filters.minPrice || 0, filters.maxPrice || 999]
                : undefined,
              sort,
            }}
            onChange={updateFilters}
            onClear={() => {
              setSearch("")
              router.push(`/merchant/${merchantSlug}/products`)
            }}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search and Mobile Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Mobile Filter Button */}
            <div className="lg:hidden">
              <ProductFilters
                variant="mobile"
                categories={categoryOptions}
                priceRange={priceRange || undefined}
                selectedFilters={{
                  categories: filters.categories,
                  priceRange: filters.minPrice || filters.maxPrice
                    ? [filters.minPrice || 0, filters.maxPrice || 999]
                    : undefined,
                  sort,
                }}
                onChange={updateFilters}
                onClear={() => {
                  setSearch("")
                  router.push(`/merchant/${merchantSlug}/products`)
                }}
              />
            </div>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="mb-4">
              <ActiveFilters
                filters={activeFilters}
                onRemove={removeFilter}
              />
            </div>
          )}

          {/* Product Grid */}
          <ProductGrid
            products={products}
            loading={isLoading}
            loadingMore={isFetchingNextPage}
            hasMore={hasNextPage || false}
            onLoadMore={fetchNextPage}
            onAddToCart={handleAddToCart}
            onQuickView={setQuickViewProductId}
            emptyState={
              isError ? (
                <div className="text-center">
                  <p className="text-lg font-medium">Something went wrong</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please try refreshing the page
                  </p>
                </div>
              ) : undefined
            }
          />

          {/* Infinite scroll trigger */}
          {hasNextPage && <div ref={infiniteScrollRef} className="h-10" />}
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProductId && (
        <QuickViewModal
          productId={quickViewProductId}
          merchantSlug={merchantSlug}
          onClose={() => setQuickViewProductId(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  )
}