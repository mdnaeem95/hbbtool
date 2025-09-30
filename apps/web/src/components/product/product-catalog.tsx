"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useDebounce } from "../../hooks/use-debounce"
import { ProductGrid, ProductFilters, ActiveFilters, Input, useToast, Spinner, Button } from "@homejiak/ui"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { QuickViewModal } from "./quick-view-modal"
import { ProductCustomizationSheet } from "./product-customisation-sheet"
import { useCartStore } from "../../stores/cart-store"
import { api } from "../../lib/trpc/client"
import { keepPreviousData } from "@tanstack/react-query"

interface Category {
  id: string
  name: string
  slug: string
  productCount?: number
}

interface ProductCatalogProps {
  merchantSlug: string
  merchantId: string
  merchantName: string
  categories: Category[]
  initialSearchParams?: Record<string, string>
}

export function ProductCatalog({
  merchantSlug,
  merchantId,
  merchantName,
  categories,
}: ProductCatalogProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { addItem, canAddItem } = useCartStore()

  // State Management
  const [quickViewProductId, setQuickViewProductId] = React.useState<string | null>(null)
  const [showMobileFilters, setShowMobileFilters] = React.useState(false)
  const [customizationProduct, setCustomizationProduct] = React.useState<any | null>(null)
  
  // Define sort type
  type SortOption = "featured" | "rating" | "price-asc" | "price-desc" | "newest" | "popular" | "name-asc" | "name-desc"
  
  // Define filters type
  interface Filters {
    categories: string[]
    minPrice?: number
    maxPrice?: number
    search: string
    sort: SortOption
    featured: boolean
    inStock: boolean
    tags: string[]
  }
  
  // Parse filters from URL params
  const parseFiltersFromURL = React.useCallback((): Filters => {
    const params = new URLSearchParams(searchParams.toString())
    return {
      categories: params.get("category")?.split(",").filter(Boolean) || [],
      minPrice: params.get("min") ? Number(params.get("min")) : undefined,
      maxPrice: params.get("max") ? Number(params.get("max")) : undefined,
      search: params.get("search") || "",
      sort: (params.get("sort") || "featured") as SortOption,
      featured: params.get("featured") === "true",
      inStock: params.get("inStock") === "true",
      tags: params.get("tags")?.split(",").filter(Boolean) || [],
    }
  }, [searchParams])

  // Initialize filters from URL
  const [filters, setFilters] = React.useState<Filters>(parseFiltersFromURL())
  const [localSearch, setLocalSearch] = React.useState(filters.search)
  
  // Debounce search input
  const debouncedSearch = useDebounce(localSearch, 500)
  const debouncedFilters = useDebounce(filters, 300)

  // Fetch products with modifiers included
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError,
  } = api.public.listProducts.useQuery(
    {
      merchantSlug,
      page: 1,
      limit: 50,
      categoryIds: debouncedFilters.categories.length > 0 ? debouncedFilters.categories : undefined,
      search: debouncedFilters.search || undefined,
      minPrice: debouncedFilters.minPrice,
      maxPrice: debouncedFilters.maxPrice,
      featured: debouncedFilters.featured || undefined,
      inStock: debouncedFilters.inStock || undefined,
      tags: debouncedFilters.tags.length > 0 ? debouncedFilters.tags : undefined,
      sort: debouncedFilters.sort,
    },
    {
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    }
  )

  // Use aggregations from the API response for price range
  const globalPriceRange = React.useMemo(() => {
    if (productsData?.aggregations?.priceRange) {
      return {
        min: Math.floor(productsData.aggregations.priceRange.min),
        max: Math.ceil(productsData.aggregations.priceRange.max),
      }
    }
    return null
  }, [productsData])

  // Update URL params after debounce
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
    
    router.replace(url, { scroll: false })
  }, [debouncedFilters, pathname, router])

  // Handle filter changes
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
    const defaultFilters: Filters = {
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

  // Check if product has modifiers
  const hasModifiers = React.useCallback((product: any): boolean => {
    return !!(
      product.modifierGroups &&
      product.modifierGroups.length > 0 &&
      product.modifierGroups.some((g: any) =>
        g.isActive && g.modifiers && g.modifiers.length > 0
      )
    )
  }, [])

  // Add to cart handler with modifier support
  const handleAddToCart = React.useCallback((productId: string, quantity = 1) => {
    const product = productsData?.items.find(p => p.id === productId)
    if (!product) return
    
    // Check if we can add items from this merchant
    if (!canAddItem(merchantId)) {
      toast({
        title: "Different merchant",
        description: "You can only order from one merchant at a time. Please clear your cart first.",
        variant: "destructive",
      })
      return
    }
    
    // Check if product has modifiers
    if (hasModifiers(product)) {
      // Open customization sheet for products with modifiers
      setCustomizationProduct({
        ...product,
        merchantId: merchantId,
        merchant: {
          id: merchantId,
          businessName: merchantName
        }
      })
    } else {
      // Add directly to cart for products without modifiers
      addItem({
        productId: product.id,
        merchantId: merchantId,
        merchantName: merchantName,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        quantity,
      })
      
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      })
    }
  }, [productsData, canAddItem, merchantId, merchantName, hasModifiers, addItem, toast])

  // Handle add from quick view (may already have modifiers selected)
  const handleQuickViewAddToCart = React.useCallback((productId: string, quantity = 1) => {
    // Quick view should close and trigger the main add to cart flow
    setQuickViewProductId(null)
    handleAddToCart(productId, quantity)
  }, [handleAddToCart])

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

  // Category options with counts from API aggregations
  const categoryOptions = React.useMemo(() => {
    const counts = productsData?.aggregations?.categoryCount || {}
    
    return categories.map(category => ({
      value: category.id,
      label: category.name,
      count: counts[category.id] || 0,
    }))
  }, [categories, productsData])

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

  // Products from API
  const products = productsData?.items || []
  const totalProducts = productsData?.pagination?.total || 0

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
              onChange={(newFilters: any) => {
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
                onChange={(e: any) => setLocalSearch(e.target.value)}
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
          {isLoadingProducts ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="h-8 w-8" />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Failed to load products</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {totalProducts === 0 ? "No products available" : "No products match your filters"}
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
                Showing {products.length} of {totalProducts} products
              </p>
              
              {/* Product Grid with modifiers passed through */}
              <ProductGrid
                products={products.map(p => ({
                  id: p.id,
                  name: p.name,
                  description: p.description || undefined,
                  price: p.price,
                  images: p.images || [],
                  status: (p.status as "ACTIVE" | "SOLD_OUT" | "UNAVAILABLE") || "ACTIVE",
                  featured: p.featured || undefined,
                  inventory: p.inventory || undefined,
                  preparationTime: p.preparationTime 
                    ? (typeof p.preparationTime === 'number' 
                      ? `${p.preparationTime} min` 
                      : String(p.preparationTime))
                    : undefined,
                  merchant: {
                    id: merchantId,
                    name: merchantName,
                    slug: merchantSlug
                  },
                  modifierGroups: p.modifierGroups, // Pass modifiers to product grid
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
          onAddToCart={handleQuickViewAddToCart}
        />
      )}

      {/* Only render sheet when product exists */}
      {customizationProduct && (
        <ProductCustomizationSheet
          product={customizationProduct}
          isOpen={!!customizationProduct}
          onClose={() => setCustomizationProduct(null)}
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
                onChange={(newFilters: any) => {
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