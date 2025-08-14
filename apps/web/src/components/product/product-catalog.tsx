"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { QuickViewModal } from "./quick-view-modal"
import { useCartStore } from "@/stores/cart-store"
import { api } from "@/app/api/trpc/client"

interface ProductCatalogProps {
  merchantId: string
  merchantSlug: string
  categories: Array<{ id: string; name: string; slug: string; productCount?: number }>
  searchParams: { category?: string; sort?: string; min?: string; max?: string; search?: string; page?: string }
}

export function ProductCatalog({
  merchantSlug,
  categories,
  searchParams,
}: ProductCatalogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const addToCart = useCartStore((s: any) => s.addItem)

  const [search, setSearch] = React.useState(searchParams.search || "")
  const [quickViewProductId, setQuickViewProductId] = React.useState<string | null>(null)

  // local pagination + merged list
  const [products, setProducts] = React.useState<any[]>([])
  const [page, setPage] = React.useState<number>(1)
  const [hasMore, setHasMore] = React.useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false)

  const debouncedSearch = useDebounce(search, 300)

  const filters = React.useMemo(() => ({
    categories: searchParams.category?.split(",").filter(Boolean) || [],
    minPrice: searchParams.min ? Number(searchParams.min) : undefined,
    maxPrice: searchParams.max ? Number(searchParams.max) : undefined,
    search: debouncedSearch || undefined,
  }), [searchParams.category, searchParams.min, searchParams.max, debouncedSearch])

  const sort = searchParams.sort || "featured"

  // Page-based fetch
  const { data, isLoading, isError } = api.public.listProducts.useQuery(
    {
      merchantSlug,
      categoryId: filters.categories[0],
      search: filters.search,
      page,
      limit: 20,
    },
  )

  // Merge/replace items + compute hasMore
  React.useEffect(() => {
    if (!data) return
    if (page === 1) setProducts(data.items)
    else setProducts(prev => [...prev, ...data.items])
    const { page: p, totalPages } = data.pagination
    setHasMore(p < totalPages)
    setIsLoadingMore(false)
  }, [data, page])

  // Load more: just bump the page (no .fetch)
  const loadMore = React.useCallback(() => {
    if (!hasMore || isLoadingMore) return
    setIsLoadingMore(true)
    setPage(p => p + 1)
  }, [hasMore, isLoadingMore])

  // Infinite scroll trigger
  const { ref: infiniteScrollRef } = useIntersectionObserver({
    threshold: 0.5,
    onIntersect: loadMore,
    enabled: hasMore && !isLoadingMore,
  })

  // Price range from loaded items
  const priceRange = React.useMemo(() => {
    if (products.length === 0) return undefined
    const prices = products.map((p: any) => Number(p.price)).filter(n => !Number.isNaN(n))
    if (prices.length === 0) return undefined
    const min = Math.floor(Math.min(...prices))
    const max = Math.ceil(Math.max(...prices))
    return { min, max, current: [filters.minPrice ?? min, filters.maxPrice ?? max] as [number, number] }
  }, [products, filters.minPrice, filters.maxPrice])

  // Update URL + reset pagination on filter changes
  const updateFilters = (newFilters: {
    categories?: string[]
    priceRange?: [number, number]
    sort?: string
    search?: string
  }) => {
    const params = new URLSearchParams()
    if (newFilters.categories?.length) params.set("category", newFilters.categories.join(","))
    if (newFilters.sort && newFilters.sort !== "featured") params.set("sort", newFilters.sort)
    if (newFilters.priceRange) {
      params.set("min", String(newFilters.priceRange[0]))
      params.set("max", String(newFilters.priceRange[1]))
    }
    if (newFilters.search) params.set("search", newFilters.search)

    const qs = params.toString()
    router.push(`/merchant/${merchantSlug}/products${qs ? `?${qs}` : ""}`)

    // reset paging & list
    setPage(1)
    setProducts([])
    setHasMore(true)
  }

  const handleAddToCart = (productId: string, quantity = 1) => {
    const product = products.find((p: any) => p.id === productId)
    if (!product) return
    const price = Number(product.price)
    addToCart({
      productId: product.id,
      merchantId: product.merchantId,
      name: product.name,
      price: Number.isNaN(price) ? 0 : price,
      image: product.images?.[0],
      quantity,
    })
    toast({ title: "Added to cart", description: `${product.name} has been added to your cart` })
  }

  const activeFilters = React.useMemo(() => {
    const active: Array<{ key: string; value: string; label: string }> = []
    filters.categories.forEach((categoryId) => {
      const category = categories.find((c) => c.id === categoryId)
      if (category) active.push({ key: "category", value: categoryId, label: category.name })
    })
    if (filters.minPrice || filters.maxPrice) {
      active.push({ key: "price", value: "range", label: `$${filters.minPrice ?? 0} - $${filters.maxPrice ?? "∞"}` })
    }
    if (filters.search) active.push({ key: "search", value: filters.search, label: `Search: ${filters.search}` })
    return active
  }, [filters, categories])

  const removeFilter = (key: string, value?: string) => {
    if (key === "category" && value) {
      updateFilters({ ...filters, categories: filters.categories.filter((c) => c !== value) })
    } else if (key === "price") {
      updateFilters({ ...filters, priceRange: undefined })
    } else if (key === "search") {
      setSearch("")
      updateFilters({ ...filters, search: "" })
    }
  }

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
            priceRange={priceRange}
            selectedFilters={{
              categories: filters.categories,
              priceRange: filters.minPrice || filters.maxPrice ? [filters.minPrice ?? 0, filters.maxPrice ?? 999] : undefined,
              sort,
            }}
            onChange={updateFilters}
            onClear={() => {
              setSearch("")
              router.push(`/merchant/${merchantSlug}/products`)
              setPage(1)
              setProducts([])
              setHasMore(true)
            }}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Search + Mobile Filters */}
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

            <div className="lg:hidden">
              <ProductFilters
                variant="mobile"
                categories={categoryOptions}
                priceRange={priceRange}
                selectedFilters={{
                  categories: filters.categories,
                  priceRange: filters.minPrice || filters.maxPrice ? [filters.minPrice ?? 0, filters.maxPrice ?? 999] : undefined,
                  sort,
                }}
                onChange={updateFilters}
                onClear={() => {
                  setSearch("")
                  router.push(`/merchant/${merchantSlug}/products`)
                  setPage(1)
                  setProducts([])
                  setHasMore(true)
                }}
              />
            </div>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="mb-4">
              <ActiveFilters filters={activeFilters} onRemove={removeFilter} />
            </div>
          )}

          {/* Product Grid */}
          <ProductGrid
            products={products}
            loading={isLoading}
            loadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onAddToCart={(productId) => handleAddToCart(productId)}
            onQuickView={setQuickViewProductId}
            emptyState={
              isError ? (
                <div className="text-center">
                  <p className="text-lg font-medium">Something went wrong</p>
                  <p className="mt-2 text-sm text-muted-foreground">Please try refreshing the page</p>
                </div>
              ) : undefined
            }
          />

          {/* Infinite scroll trigger */}
          {hasMore && !isLoadingMore && <div ref={infiniteScrollRef} className="h-10" />}
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