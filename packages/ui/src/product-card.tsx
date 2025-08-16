import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { Button } from "./button"
import { cn } from "@kitchencloud/ui"
import { ShoppingCart, Heart, Share2 } from "lucide-react"

const productCardVariants = cva(
  "group relative overflow-hidden transition-all duration-300",
  {
    variants: {
      variant: {
        default: "hover:shadow-lg",
        compact: "hover:shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ProductCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof productCardVariants> {
  product: {
    id: string
    name: string
    description?: string
    price: number
    images: string[]
    merchant?: {
      name: string
      slug: string
    }
    status: "ACTIVE" | "SOLD_OUT" | "UNAVAILABLE"
    featured?: boolean
    inventory?: number
    preparationTime?: string
  }
  onAddToCart?: (productId: string) => void
  onQuickView?: (productId: string) => void
  showMerchant?: boolean
  loading?: boolean
}

export function ProductCard({
  className,
  variant,
  product,
  onAddToCart,
  onQuickView,
  showMerchant = false,
  loading = false,
  ...props
}: ProductCardProps) {
  const [imageLoading, setImageLoading] = React.useState(true)
  const [, setImageError] = React.useState(false)
  const [isFavorited, setIsFavorited] = React.useState(false)

  if (loading) {
    return <ProductCardSkeleton variant={variant!} />
  }

  const isAvailable = product.status === "ACTIVE" && (!product.inventory || product.inventory > 0)
  const isLowStock = product.inventory && product.inventory <= 5

  return (
    <Card
      className={cn(productCardVariants({ variant }), "flex flex-col h-full", className)}
      {...props}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {product.featured && (
          <Badge className="absolute left-2 top-2 z-10" variant="default">
            Featured
          </Badge>
        )}
        
        {!isAvailable && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <Badge variant="secondary" className="text-lg">
              {product.status === "SOLD_OUT" ? "Sold Out" : "Unavailable"}
            </Badge>
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-white/90 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault()
              setIsFavorited(!isFavorited)
            }}
          >
            <Heart className={cn("h-4 w-4", isFavorited && "fill-red-500 text-red-500")} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-white/90 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault()
              // Share functionality
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Product Image */}
        <img
          src={product.images[0] || "/placeholder-food.jpg"}
          alt={product.name}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
            imageLoading && "blur-sm"
          )}
          loading="lazy"
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true)
            setImageLoading(false)
          }}
        />
      </div>

      <CardContent className="flex flex-col flex-1 p-4">
        {/* Product info section - flex-1 to take available space */}
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold line-clamp-1">{product.name}</h3>
          
          {variant === "default" && product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
          
          {showMerchant && product.merchant && (
            <p className="text-xs text-muted-foreground">by {product.merchant.name}</p>
          )}
          
          {isLowStock && isAvailable && (
            <p className="text-xs font-medium text-orange-600">
              Only {product.inventory} left
            </p>
          )}
        </div>

        {/* Price and Actions - Always at bottom */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
            {product.preparationTime && (
              <span className="ml-2 text-xs text-muted-foreground">
                ~{product.preparationTime}
              </span>
            )}
          </div>

          <div className="flex gap-1">
            {variant === "default" && onQuickView && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault()
                  onQuickView(product.id)
                }}
              >
                Quick View
              </Button>
            )}
            <Button
              size="sm"
              disabled={!isAvailable}
              onClick={(e) => {
                e.preventDefault()
                onAddToCart?.(product.id)
              }}
            >
              <ShoppingCart className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton Component
export function ProductCardSkeleton({
  variant = "default",
}: {
  variant?: "default" | "compact"
}) {
  return (
    <Card className={cn(productCardVariants({ variant }))}>
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <CardContent className="p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        {variant === "default" && (
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}