import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { Button } from "./button"
import { cn } from "@homejiak/ui"
import { ShoppingCart, Eye, Heart, Clock } from "lucide-react"

const productCardVariants = cva(
  "group relative overflow-hidden transition-all duration-300",
  {
    variants: {
      variant: {
        default: "hover:shadow-xl hover:-translate-y-1",
        compact: "hover:shadow-lg hover:-translate-y-0.5",
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
    compareAtPrice?: number
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
  const [imageError, setImageError] = React.useState(false)
  const [isFavorited, setIsFavorited] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)

  if (loading) {
    return <ProductCardSkeleton variant={variant!} />
  }

  const isAvailable = product.status === "ACTIVE" && (!product.inventory || product.inventory > 0)
  const isLowStock = product.inventory && product.inventory <= 5
  const discountPercentage = product.compareAtPrice 
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0

  // Format price to ensure proper display
  const formatPrice = (price: number) => {
    return price.toFixed(2)
  }

  return (
    <Card
      className={cn(productCardVariants({ variant }), "flex flex-col h-full cursor-pointer", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onQuickView?.(product.id)}
      {...props}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        {/* Badges */}
        <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
          {product.featured && (
            <Badge className="bg-orange-500 text-white border-0">
              Featured
            </Badge>
          )}
          {discountPercentage > 0 && (
            <Badge className="bg-red-500 text-white border-0">
              -{discountPercentage}%
            </Badge>
          )}
        </div>
        
        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <Badge variant="secondary" className="text-lg bg-white/90 text-gray-900">
              {product.status === "SOLD_OUT" ? "Sold Out" : "Unavailable"}
            </Badge>
          </div>
        )}

        {/* Favorite Button */}
        <button
          className={cn(
            "absolute right-2 top-2 z-10 rounded-full bg-white/90 p-2 backdrop-blur-sm transition-all duration-200",
            "hover:bg-white hover:shadow-md hover:scale-110",
            isFavorited && "text-red-500"
          )}
          onClick={(e) => {
            e.stopPropagation()
            setIsFavorited(!isFavorited)
          }}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart 
            className={cn(
              "h-4 w-4 transition-all duration-200",
              isFavorited && "fill-current"
            )} 
          />
        </button>

        {/* Quick Actions Overlay - Appears on Hover */}
        <div 
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 flex gap-2 p-3 transition-all duration-300",
            "bg-gradient-to-t from-black/70 via-black/50 to-transparent",
            isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 bg-white/95 text-gray-900 hover:bg-white hover:scale-[1.02] transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation()
              onQuickView?.(product.id)
            }}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Quick View
          </Button>
          
          <Button
            size="sm"
            className="flex-1 bg-orange-500 hover:bg-orange-600 hover:scale-[1.02] transition-all duration-200 text-white border-0"
            onClick={(e) => {
              e.stopPropagation()
              onAddToCart?.(product.id)
            }}
            disabled={!isAvailable}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {/* Product Image */}
        {imageError ? (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gray-200 p-3">
                <ShoppingCart className="h-full w-full text-gray-400" />
              </div>
              <p className="text-xs text-gray-500">No image</p>
            </div>
          </div>
        ) : (
          <img
            src={product.images[0] || "/placeholder-food.jpg"}
            alt={product.name}
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              isHovered && "scale-110",
              imageLoading && "blur-sm"
            )}
            loading="lazy"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true)
              setImageLoading(false)
            }}
          />
        )}
      </div>

      <CardContent className="flex flex-col flex-1 p-4">
        {/* Product info section - flex-1 to take available space */}
        <div className="flex-1 space-y-1.5">
          <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors duration-200">
            {product.name}
          </h3>
          
          {variant === "default" && product.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {product.description}
            </p>
          )}
          
          {/* Price and Meta Info */}
          <div className="flex items-end justify-between pt-2">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-900">
                  ${formatPrice(product.price)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    ${formatPrice(product.compareAtPrice)}
                  </span>
                )}
              </div>
              
              {/* Preparation Time */}
              {product.preparationTime && (
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>{product.preparationTime}</span>
                </div>
              )}
            </div>

            {/* Stock Indicator */}
            {isLowStock && isAvailable && (
              <Badge variant="outline" className="text-xs border-orange-200 bg-orange-50 text-orange-700">
                {product.inventory} left
              </Badge>
            )}
          </div>
          
          {/* Merchant Info */}
          {showMerchant && product.merchant && (
            <p className="pt-2 text-xs text-gray-500 border-t">
              by <span className="font-medium hover:text-gray-700 transition-colors">{product.merchant.name}</span>
            </p>
          )}
        </div>

        {/* Desktop: Action buttons at bottom (hidden, shown on hover via overlay) */}
        {/* Mobile: Always visible buttons */}
        <div className="mt-3 flex gap-2 sm:hidden">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onQuickView?.(product.id)
            }}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
          
          <Button
            size="sm"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            onClick={(e) => {
              e.stopPropagation()
              onAddToCart?.(product.id)
            }}
            disabled={!isAvailable}
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton component for loading state
function ProductCardSkeleton({ variant }: { variant: "default" | "compact" }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] bg-gray-100 animate-pulse" />
      
      <CardContent className="flex flex-col flex-1 p-4 space-y-2">
        {/* Title skeleton */}
        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
        
        {/* Description skeleton */}
        {variant === "default" && (
          <div className="space-y-1.5">
            <div className="h-3.5 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-3.5 w-2/3 bg-gray-200 rounded animate-pulse" />
          </div>
        )}
        
        {/* Price skeleton */}
        <div className="flex items-end justify-between pt-2">
          <div className="space-y-1">
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { ProductCardSkeleton }