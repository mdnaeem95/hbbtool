"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Spinner,
} from "@kitchencloud/ui"
import { ShoppingCart, Clock, Minus, Plus } from "lucide-react"
import Image from "next/image"
import { api } from "@/lib/trpc/client"

interface QuickViewModalProps {
  productId: string
  merchantSlug: string
  onClose: () => void
  onAddToCart: (productId: string, quantity?: number) => void
}

export function QuickViewModal({
  productId,
  merchantSlug,
  onClose,
  onAddToCart,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = React.useState(1)
  const [selectedImage, setSelectedImage] = React.useState(0)

  // Fetch product details
  const { data: product, isLoading } = api.public.getProduct.useQuery({
    merchantSlug,
    productId,
  })

  const handleAddToCart = () => {
    onAddToCart(productId, quantity)
    onClose()
  }

  const incrementQuantity = () => {
    if (product?.trackInventory && product.inventory !== null && quantity >= product.inventory) return
    setQuantity(q => q + 1)
  }

  const decrementQuantity = () => {
    if (quantity <= 1) return
    setQuantity(q => q - 1)
  }

  // Format price safely
  const formatPrice = (price: any) => {
    const numPrice = typeof price === 'number' ? price : Number(price)
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : product ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[selectedImage]!}
                    alt={product.name}
                    width={500}
                    height={500}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>
              
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                        selectedImage === index ? "border-primary" : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{product.name}</DialogTitle>
                </DialogHeader>
                
                {product.category && (
                  <Badge variant="secondary" className="mt-2">
                    {product.category.name}
                  </Badge>
                )}
              </div>

              {product.description && (
                <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    ${formatPrice(product.price)}
                  </span>
                  {product.compareAtPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      ${formatPrice(product.compareAtPrice)}
                    </span>
                  )}
                </div>

                {product.preparationTime && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{product.preparationTime}</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={incrementQuantity}
                    disabled={product.trackInventory && product.inventory !== null && quantity >= product.inventory}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {product.trackInventory && product.inventory !== null && product.inventory > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {product.inventory} available
                  </p>
                )}
              </div>

              {/* Status Badge */}
              {product.status !== "ACTIVE" && (
                <Badge variant="destructive">
                  {product.status === "SOLD_OUT" ? "Sold Out" : "Unavailable"}
                </Badge>
              )}

              {/* Add to Cart Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={
                  product.status !== "ACTIVE" || 
                  (product.trackInventory && product.inventory === 0)
                }
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {product.status === "SOLD_OUT" ? "Out of Stock" : "Add to Cart"}
              </Button>

              {/* Product Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="mb-3 font-medium">Available Options</h4>
                  <div className="space-y-2">
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{variant.name}</span>
                          {variant.options && typeof variant.options === 'object' && (
                            <span className="text-xs text-muted-foreground">
                              ({Object.entries(variant.options as Record<string, any>)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')})
                            </span>
                          )}
                      </div>
                      <span className="font-medium">
                        {Number(variant.priceAdjustment) > 0 && "+"}
                        ${formatPrice(variant.priceAdjustment)}
                      </span>
                    </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
                {product.sku && (
                  <div className="flex justify-between">
                    <span>SKU:</span>
                    <span>{product.sku}</span>
                  </div>
                )}
                {product._count && product._count.orderItems > 0 && (
                  <div className="flex justify-between">
                    <span>Orders:</span>
                    <span>{product._count.orderItems} sold</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-96 items-center justify-center">
            <p className="text-muted-foreground">Product not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}