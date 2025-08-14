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
import { api } from "@/app/api/trpc/client"

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
    if (product?.trackQuantity && quantity >= product.quantity) return
    setQuantity(q => q + 1)
  }

  const decrementQuantity = () => {
    if (quantity <= 1) return
    setQuantity(q => q - 1)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
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
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((image: any, index: any) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 ${
                        selectedImage === index ? "border-primary" : "border-transparent"
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
                <p className="text-muted-foreground">{product.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.comparePrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      ${product.comparePrice.toFixed(2)}
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
                    disabled={product.trackQuantity && quantity >= product.quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {product.trackQuantity && product.quantity > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {product.quantity} available
                  </p>
                )}
              </div>

              {/* Add to Cart Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={product.status !== "ACTIVE" || (product.trackQuantity && product.quantity === 0)}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>

              {/* Product Variants */}
              {product.ProductVariant && product.ProductVariant.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="mb-3 font-medium">Available Options</h4>
                  <div className="space-y-2">
                    {product.ProductVariant.map((variant: any) => (
                      <div key={variant.id} className="flex items-center justify-between text-sm">
                        <span>{variant.name}</span>
                        <span className="font-medium">+${variant.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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