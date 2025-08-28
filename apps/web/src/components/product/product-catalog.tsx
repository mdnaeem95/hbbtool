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
  Spinner,
} from "@kitchencloud/ui"
import { Search } from "lucide-react"
import { QuickViewModal } from "./quick-view-modal"
import { useCartStore } from "@/stores/cart-store"
import { api } from "@/lib/trpc/client"

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

  // Read filters from URL
  const [urlParams, setUrlParams] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search)
    }
    return new URLSearchParams()
  })

  // Update URL params when window location changes
  React.useEffect(() => {
    const handleUrlChange = () => {
      setUrlParams(new URLSearchParams(window.location.search))
    }
    
    window.addEventListener('popstate', handleUrlChange)
    return () => window.removeEventListener('popstate', handleUrlChange)
  }, [])

  const filters = React.useMemo(() => ({
    categories: urlParams.get("category")?.split(",").filter(Boolean) || [],
    minPrice: urlParams.get("min") ? Number(urlParams.get("min")) : undefined,
    maxPrice: urlParams.get("max") ? Number(urlParams.get("max")) : undefined,
    search: debouncedSearch || undefined,
  }), [urlParams, debouncedSearch])

  const sort = urlParams.get("sort") || "featured"

  // Page-based fetch - include all filters
  const { data, isLoading, isError } = api.public.listProducts.useQuery(
    {
      merchantSlug,
      categoryId: filters.categories[0], // API only supports single category
      search: filters.search,
      sort: sort as 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'name',
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

  React.useEffect(() => {
    setPage(1)
    setProducts([])
    setHasMore(true)
  }, [sort])

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

  // Convert Decimal prices to numbers for UI components
  const productsWithNumberPrices = React.useMemo(() => {
    return products.map(product => ({
      ...product,
      price: typeof product.price === 'number' 
        ? product.price 
        : Number(product.price),
      compareAtPrice: product.compareAtPrice 
        ? (typeof product.compareAtPrice === 'number' 
          ? product.compareAtPrice 
          : Number(product.compareAtPrice))
        : undefined
    }))
  }, [products])

  // Price range from loaded items
  const priceRange = React.useMemo(() => {
    if (productsWithNumberPrices.length === 0) return undefined
    const prices = productsWithNumberPrices.map(p => p.price).filter(n => !Number.isNaN(n))
    if (prices.length === 0) return undefined
    const min = Math.floor(Math.min(...prices))
    const max = Math.ceil(Math.max(...prices))
    return { min, max, current: [filters.minPrice ?? min, filters.maxPrice ?? max] as [number, number] }
  }, [productsWithNumberPrices, filters.minPrice, filters.maxPrice])

  // Update URL + reset pagination on filter changes
  const updateFilters = React.useCallback((newFilters: {
    categories?: string[]
    priceRange?: [number, number]
    sort?: string
    search?: string
  }) => {
    const params = new URLSearchParams(window.location.search)
    
    // Preserve existing search if not explicitly changing it
    const currentSearch = params.get("search") || ""
    
    // Clear all params first
    params.delete("category")
    params.delete("sort")
    params.delete("min")
    params.delete("max")
    params.delete("search")
    
    // Set new params
    if (newFilters.categories?.length) {
      params.set("category", newFilters.categories.join(","))
    }
    if (newFilters.sort && newFilters.sort !== "featured") {
      params.set("sort", newFilters.sort)
    }
    if (newFilters.priceRange && newFilters.priceRange[0] !== priceRange?.min) {
      params.set("min", String(newFilters.priceRange[0]))
    }
    if (newFilters.priceRange && newFilters.priceRange[1] !== priceRange?.max) {
      params.set("max", String(newFilters.priceRange[1]))
    }
    // Preserve search unless explicitly changed
    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set("search", newFilters.search)
    } else if (currentSearch) {
      params.set("search", currentSearch)
    }

    const qs = params.toString()
    // Use replace to update URL without adding to history
    router.replace(`/merchant/${merchantSlug}/products${qs ? `?${qs}` : ""}`)

    // reset paging & list
    setPage(1)
    setProducts([])
    setHasMore(true)
  }, [merchantSlug, router, priceRange])

  const handleAddToCart = (productId: string, quantity = 1) => {
    const product = productsWithNumberPrices.find((p: any) => p.id === productId)
    if (!product) return
    addToCart({
      productId: product.id,
      merchantId: product.merchantId,
      name: product.name,
      price: product.price,
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

  const sortOptions = [
    { value: "featured", label: "Featured" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "newest", label: "Newest First" },
    { value: "name", label: "Name (A-Z)" },
  ]

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
    count: category.productCount,
  }))

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Desktop Filters - Always visible */}
        <div className="hidden lg:block">
          <ProductFilters
            categories={categoryOptions}
            priceRange={priceRange}
            sortOptions={sortOptions}
            selectedFilters={{
              categories: filters.categories,
              priceRange: filters.minPrice || filters.maxPrice 
                ? [filters.minPrice ?? priceRange?.min ?? 0, filters.maxPrice ?? priceRange?.max ?? 100] 
                : undefined,
              sort: sort,
            }}
            onChange={(newFilters) => {
              console.log('Filter change:', newFilters)
              // Update URL params and trigger re-render
              updateFilters({
                categories: newFilters.categories,
                priceRange: newFilters.priceRange,
                sort: newFilters.sort,
                search: search || filters.search,
              })
              // Trigger URL params update
              setUrlParams(new URLSearchParams(window.location.search))
            }}
          />
        </div>

        {/* Main Content - Always in grid structure */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <ActiveFilters
              filters={activeFilters}
              onRemove={removeFilter}
            />
          )}

          {/* Loading State */}
          {isLoading && page === 1 ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="h-8 w-8" />
            </div>
          ) : isError ? (
            // Error State
            <div className="text-center py-16">
              <p className="text-muted-foreground">Failed to load products. Please try again.</p>
            </div>
          ) : productsWithNumberPrices.length === 0 ? (
            // Empty State
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-2">No products found</p>
              <p className="text-sm text-muted-foreground">
                {filters.search || filters.categories.length > 0 
                  ? "Try adjusting your filters or search query"
                  : "This merchant hasn't added any products yet"}
              </p>
            </div>
          ) : (
            // Product Grid
            <>
              <ProductGrid
                products={productsWithNumberPrices}
                onAddToCart={handleAddToCart}
                onQuickView={setQuickViewProductId}
              />

              {/* Load More */}
              {hasMore && (
                <div ref={infiniteScrollRef} className="flex justify-center py-8">
                  {isLoadingMore && <Spinner className="h-6 w-6" />}
                </div>
              )}
            </>
          )}
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