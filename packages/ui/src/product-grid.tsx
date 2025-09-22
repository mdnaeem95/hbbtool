import * as React from "react"
import { cn } from "@homejiak/ui"
import { ProductCard, ProductCardSkeleton, type ProductCardProps } from "./product-card"
import { Button } from "./button"
import { Loader2 } from "lucide-react"

export interface ProductGridProps extends React.HTMLAttributes<HTMLDivElement> {
  products: ProductCardProps["product"][]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onAddToCart?: (productId: string) => void
  onQuickView?: (productId: string) => void
  showMerchant?: boolean
  variant?: "default" | "compact"
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  emptyState?: React.ReactNode
}

export function ProductGrid({
  className,
  products,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onAddToCart,
  onQuickView,
  showMerchant = false,
  variant = "default",
  columns = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  },
  emptyState,
  ...props
}: ProductGridProps) {
  const gridClasses = cn(
    "grid gap-4",
    {
      "grid-cols-1": columns.mobile === 1,
      "grid-cols-2": columns.mobile === 2,
      "sm:grid-cols-2": columns.tablet === 2,
      "sm:grid-cols-3": columns.tablet === 3,
      "lg:grid-cols-3": columns.desktop === 3,
      "lg:grid-cols-4": columns.desktop === 4,
    },
    className
  )

  // Initial loading state
  if (loading && products.length === 0) {
    return (
      <div className={gridClasses} {...props}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} variant={variant} />
        ))}
      </div>
    )
  }

  // Empty state
  if (!loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {emptyState || (
          <>
            <p className="text-lg font-medium">No products found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters or check back later
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className={gridClasses} {...props}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            variant={variant}
            onAddToCart={onAddToCart}
            onQuickView={onQuickView}
            showMerchant={showMerchant}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="min-w-[200px]"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              "Load more products"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// Virtualized grid for large catalogs
export function VirtualizedProductGrid({
  products,
  height = "calc(100vh - 200px)",
  ...props
}: ProductGridProps & { height?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 20 })

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const itemHeight = 300 // Approximate height of product card
      const containerHeight = container.clientHeight
      const buffer = 5 // Number of items to render outside viewport

      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
      const end = Math.min(
        products.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
      )

      setVisibleRange({ start, end })
    }

    container.addEventListener("scroll", handleScroll)
    handleScroll() // Initial calculation

    return () => container.removeEventListener("scroll", handleScroll)
  }, [products.length])

  const visibleProducts = products.slice(visibleRange.start, visibleRange.end)
  const spacerHeight = visibleRange.start * 300

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height }}
      {...props}
    >
      <div style={{ paddingTop: spacerHeight }}>
        <ProductGrid
          products={visibleProducts}
          hasMore={false}
          {...props}
        />
      </div>
    </div>
  )
}