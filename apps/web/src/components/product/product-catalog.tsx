"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import {
  ProductGrid,
  ProductFilters,
  ActiveFilters,
  Input,
  useToast,
  Spinner,
  Button,
} from "@kitchencloud/ui"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { QuickViewModal } from "./quick-view-modal"
import { useCartStore } from "@/stores/cart-store"
import { api } from "@/lib/trpc/client"

interface Category {
  id: string
  name: string
  slug: string
  productCount?: number
}

interface Product {
  id: string
  merchantId: string
  name: string
  description?: string | null  // Fix: Allow null
  price: number
  compareAtPrice?: number | null  // Fix: Allow null
  effectivePrice: number
  images?: string[]
  categoryId?: string
  category?: { id: string; name: string; slug: string } | null  // Fix: Allow null
  featured: boolean
  tags?: string[]
  inStock: boolean
  lowStock?: boolean
  discountPercentage?: number | null  // Fix: Allow null
  isOnSale?: boolean | null  // Fix: Allow null
  trackInventory: boolean
  inventory: number
  status?: "ACTIVE" | "SOLD_OUT" | "UNAVAILABLE"  // Optional status field
  preparationTime?: number | string  // Optional preparation time
  _count?: { orderItems: number; reviews: number }
  [key: string]: any  // Allow extra properties from API
}

interface ProductCatalogProps {
  merchantSlug: string
  categories: Category[]
  initialSearchParams?: Record<string, string>
}

export function ProductCatalog({
  merchantSlug,
  categories,
}: ProductCatalogProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const addToCart = useCartStore((s: any) => s.addItem)

  // State Management
  const [quickViewProductId, setQuickViewProductId] = React.useState<string | null>(null)
  const [allProducts, setAllProducts] = React.useState<Product[]>([]) // Store all products
  const [filteredProducts, setFilteredProducts] = React.useState<Product[]>([]) // Store filtered results
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [showMobileFilters, setShowMobileFilters] = React.useState(false)
  
  // Price range from all products
  const [globalPriceRange, setGlobalPriceRange] = React.useState<{
    min: number
    max: number
  } | null>(null)

  // Parse filters from URL params
  const parseFiltersFromURL = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    return {
      categories: params.get("category")?.split(",").filter(Boolean) || [],
      minPrice: params.get("min") ? Number(params.get("min")) : undefined,
      maxPrice: params.get("max") ? Number(params.get("max")) : undefined,
      search: params.get("search") || "",
      sort: params.get("sort") || "featured",
      featured: params.get("featured") === "true",
      inStock: params.get("inStock") === "true",
      tags: params.get("tags")?.split(",").filter(Boolean) || [],
    }
  }, [searchParams])

  // Initialize filters from URL
  const [filters, setFilters] = React.useState(parseFiltersFromURL)
  const [localSearch, setLocalSearch] = React.useState(filters.search)
  
  // Debounce search input and price range
  const debouncedSearch = useDebounce(localSearch, 500)
  const debouncedFilters = useDebounce(filters, 800) // Debounce all filters for URL update

  // Fetch ALL products once on mount (no filtering on backend)
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError,
  } = api.public.listProducts.useQuery(
    {
      merchantSlug,
      page: 1,
      limit: 100, // API max limit is 100, which is plenty for most home-based merchants
      sort: "featured", // Default sort
    },
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false,
    }
  )

  // Set all products and calculate price range on data load
  React.useEffect(() => {
    if (productsData?.items) {
      // Type assertion to handle the API response
      const products = productsData.items as Product[]
      setAllProducts(products)
      setIsInitialLoading(false)
      
      // Calculate global price range
      const prices = products.map(p => p.effectivePrice || p.price)
      if (prices.length > 0) {
        setGlobalPriceRange({
          min: Math.floor(Math.min(...prices)),
          max: Math.ceil(Math.max(...prices)),
        })
      }
    }
  }, [productsData])

  // Client-side filtering and sorting
  const applyFiltersAndSort = React.useCallback((
    products: Product[],
    currentFilters: typeof filters
  ) => {
    let filtered = [...products]

    // Category filter
    if (currentFilters.categories.length > 0) {
      filtered = filtered.filter(p => 
        p.categoryId && currentFilters.categories.includes(p.categoryId)
      )
    }

    // Search filter
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Price range filter
    if (currentFilters.minPrice !== undefined || currentFilters.maxPrice !== undefined) {
      filtered = filtered.filter(p => {
        const price = p.effectivePrice || p.price
        if (currentFilters.minPrice !== undefined && price < currentFilters.minPrice) return false
        if (currentFilters.maxPrice !== undefined && price > currentFilters.maxPrice) return false
        return true
      })
    }

    // Featured filter
    if (currentFilters.featured) {
      filtered = filtered.filter(p => p.featured)
    }

    // In stock filter
    if (currentFilters.inStock) {
      filtered = filtered.filter(p => p.inStock)
    }

    // Tags filter
    if (currentFilters.tags.length > 0) {
      filtered = filtered.filter(p => 
        p.tags?.some(tag => currentFilters.tags.includes(tag))
      )
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (currentFilters.sort) {
        case "price-asc":
          return (a.effectivePrice || a.price) - (b.effectivePrice || b.price)
        case "price-desc":
          return (b.effectivePrice || b.price) - (a.effectivePrice || a.price)
        case "newest":
          // Assuming products are already sorted by created date from server
          return 0 
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "popular":
          return (b._count?.orderItems || 0) - (a._count?.orderItems || 0)
        case "featured":
        default:
          // Featured first, then by order count
          if (a.featured !== b.featured) return b.featured ? 1 : -1
          return (b._count?.orderItems || 0) - (a._count?.orderItems || 0)
      }
    })

    return filtered
  }, [])

  // Apply filters whenever they change or products load
  React.useEffect(() => {
    if (allProducts.length > 0) {
      const filtered = applyFiltersAndSort(allProducts, filters)
      setFilteredProducts(filtered)
    }
  }, [allProducts, filters, applyFiltersAndSort])

  // Update URL params only after debounce
  React.useEffect(() => {
    const params = new URLSearchParams()
    
    // Only add non-default values to URL
    if (debouncedFilters.categories.length > 0) {
      params.set("category", debouncedFilters.categories.join(","))
    }
    if (debouncedFilters.minPrice !== undefined) {
      params.set("min", String(debouncedFilters.minPrice))
    }
    if (debouncedFilters.maxPrice !== undefined) {
      params.set("max", String(debouncedFilters.maxPrice))
    }
    if (debouncedFilters.search) {
      params.set("search", debouncedFilters.search)
    }
    if (debouncedFilters.sort && debouncedFilters.sort !== "featured") {
      params.set("sort", debouncedFilters.sort)
    }
    if (debouncedFilters.featured) {
      params.set("featured", "true")
    }
    if (debouncedFilters.inStock) {
      params.set("inStock", "true")
    }
    if (debouncedFilters.tags.length > 0) {
      params.set("tags", debouncedFilters.tags.join(","))
    }

    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname
    
    // Update URL without causing re-render
    router.replace(url, { scroll: false })
  }, [debouncedFilters, pathname, router])

  // Handle filter changes (immediate for UI, debounced for URL)
  const handleFilterChange = React.useCallback((filterKey: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }))
  }, [])

  // Handle search separately with its own debounce
  React.useEffect(() => {
    handleFilterChange("search", debouncedSearch)
  }, [debouncedSearch, handleFilterChange])

  // Clear all filters
  const clearAllFilters = React.useCallback(() => {
    const defaultFilters = {
      categories: [],
      minPrice: undefined,
      maxPrice: undefined,
      search: "",
      sort: "featured",
      featured: false,
      inStock: false,
      tags: [],
    }
    setFilters(defaultFilters)
    setLocalSearch("")
  }, [])

  // Add to cart handler
  const handleAddToCart = React.useCallback((productId: string, quantity = 1) => {
    const product = allProducts.find(p => p.id === productId)
    if (!product) return
    
    addToCart({
      productId: product.id,
      merchantId: product.merchantId,
      name: product.name,
      price: product.effectivePrice || product.price,
      image: product.images?.[0],
      quantity,
    })
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    })
  }, [allProducts, addToCart, toast])

  // Active filters for display
  const activeFilters = React.useMemo(() => {
    const active: Array<{ key: string; value: string; label: string }> = []
    
    filters.categories.forEach(categoryId => {
      const category = categories.find(c => c.id === categoryId)
      if (category) {
        active.push({ key: "category", value: categoryId, label: category.name })
      }
    })
    
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      active.push({
        key: "price",
        value: "range",
        label: `$${filters.minPrice ?? globalPriceRange?.min ?? 0} - $${filters.maxPrice ?? globalPriceRange?.max ?? "∞"}`,
      })
    }
    
    if (filters.search) {
      active.push({ key: "search", value: filters.search, label: `Search: ${filters.search}` })
    }
    
    if (filters.featured) {
      active.push({ key: "featured", value: "true", label: "Featured" })
    }
    
    if (filters.inStock) {
      active.push({ key: "inStock", value: "true", label: "In Stock" })
    }
    
    filters.tags.forEach(tag => {
      active.push({ key: "tag", value: tag, label: tag })
    })
    
    return active
  }, [filters, categories, globalPriceRange])

  // Remove individual filter
  const removeFilter = React.useCallback((key: string, value?: string) => {
    switch (key) {
      case "category":
        if (value) {
          handleFilterChange("categories", filters.categories.filter(c => c !== value))
        }
        break
      case "price":
        handleFilterChange("minPrice", undefined)
        handleFilterChange("maxPrice", undefined)
        break
      case "search":
        setLocalSearch("")
        handleFilterChange("search", "")
        break
      case "featured":
        handleFilterChange("featured", false)
        break
      case "inStock":
        handleFilterChange("inStock", false)
        break
      case "tag":
        if (value) {
          handleFilterChange("tags", filters.tags.filter(t => t !== value))
        }
        break
    }
  }, [filters, handleFilterChange])

  // Category options with counts (calculated from filtered products)
  const categoryOptions = React.useMemo(() => {
    const counts: Record<string, number> = {}
    
    // Count products per category from current filtered results
    allProducts.forEach(product => {
      if (product.categoryId) {
        counts[product.categoryId] = (counts[product.categoryId] || 0) + 1
      }
    })
    
    return categories.map(category => ({
      value: category.id,
      label: category.name,
      count: counts[category.id] || 0,
    }))
  }, [categories, allProducts])

  // Price range for slider
  const priceRange = React.useMemo(() => {
    if (!globalPriceRange) return undefined
    return {
      min: globalPriceRange.min,
      max: globalPriceRange.max,
      current: [
        filters.minPrice ?? globalPriceRange.min,
        filters.maxPrice ?? globalPriceRange.max
      ] as [number, number],
    }
  }, [globalPriceRange, filters.minPrice, filters.maxPrice])

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Desktop Filters - Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <ProductFilters
              categories={categoryOptions}
              priceRange={priceRange}
              selectedFilters={{
                categories: filters.categories,
                priceRange: (filters.minPrice !== undefined || filters.maxPrice !== undefined)
                  ? [filters.minPrice ?? priceRange?.min ?? 0, filters.maxPrice ?? priceRange?.max ?? 100]
                  : undefined,
                sort: filters.sort,
                featured: filters.featured,
                availability: filters.inStock,
              }}
              onChange={(newFilters) => {
                Object.entries(newFilters).forEach(([key, value]) => {
                  if (key === "priceRange" && Array.isArray(value)) {
                    handleFilterChange("minPrice", value[0])
                    handleFilterChange("maxPrice", value[1])
                  } else if (key === "availability") {
                    handleFilterChange("inStock", value)
                  } else {
                    handleFilterChange(key, value)
                  }
                })
              }}
              onClear={clearAllFilters}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Bar and Mobile Filter Toggle */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowMobileFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <ActiveFilters
              filters={activeFilters}
              onRemove={removeFilter}
              onClearAll={clearAllFilters}
            />
          )}

          {/* Products Grid */}
          {isInitialLoading || isLoadingProducts ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="h-8 w-8" />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Failed to load products</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {allProducts.length === 0 ? "No products available" : "No products match your filters"}
              </p>
              {activeFilters.length > 0 && (
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Results count */}
              <p className="text-sm text-muted-foreground">
                Showing {filteredProducts.length} of {allProducts.length} products
              </p>
              
              {/* Product Grid - No loading states needed since filtering is instant */}
              <ProductGrid
                products={filteredProducts.map(p => ({
                  id: p.id,
                  name: p.name,
                  description: p.description || undefined,  // Convert null to undefined
                  price: p.price,
                  images: p.images || [],
                  status: (p.status as "ACTIVE" | "SOLD_OUT" | "UNAVAILABLE") || "ACTIVE",  // Provide default status
                  featured: p.featured || undefined,  // Make optional
                  inventory: p.inventory || undefined,  // Make optional
                  preparationTime: p.preparationTime 
                    ? (typeof p.preparationTime === 'number' 
                      ? `${p.preparationTime} min` 
                      : String(p.preparationTime))
                    : undefined,  // Ensure it's always string or undefined
                  merchant: p.merchantId ? { 
                    name: "", // These will be populated if needed
                    slug: merchantSlug 
                  } : undefined,
                }))}
                onAddToCart={handleAddToCart}
                onQuickView={setQuickViewProductId}
              />
            </div>
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

      {/* Mobile Filters Sheet */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-xs bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-80px)] p-4">
              <ProductFilters
                categories={categoryOptions}
                priceRange={priceRange}
                selectedFilters={{
                  categories: filters.categories,
                  priceRange: (filters.minPrice !== undefined || filters.maxPrice !== undefined)
                    ? [filters.minPrice ?? priceRange?.min ?? 0, filters.maxPrice ?? priceRange?.max ?? 100]
                    : undefined,
                  sort: filters.sort,
                  featured: filters.featured,
                  availability: filters.inStock,
                }}
                onChange={(newFilters) => {
                  Object.entries(newFilters).forEach(([key, value]) => {
                    if (key === "priceRange" && Array.isArray(value)) {
                      handleFilterChange("minPrice", value[0])
                      handleFilterChange("maxPrice", value[1])
                    } else if (key === "availability") {
                      handleFilterChange("inStock", value)
                    } else {
                      handleFilterChange(key, value)
                    }
                  })
                }}
                onClear={clearAllFilters}
                variant="mobile"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}