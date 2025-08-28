"use client"

import * as React from "react"
import { X, ShoppingCart, Clock, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { api } from "@/lib/trpc/client"
import { toNumber } from "@/lib/utils"
import { cn } from "@kitchencloud/ui"

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
  const [isOpen, setIsOpen] = React.useState(true)

  // Fetch product details
  const { data: product, isLoading } = api.public.getProduct.useQuery({
    merchantSlug,
    productId,
  })

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(onClose, 200) // Allow animation to complete
  }

  const handleAddToCart = () => {
    onAddToCart(productId, quantity)
    handleClose()
  }

  const incrementQuantity = () => {
    if (product?.trackInventory && product.inventory !== null && quantity >= product.inventory) return
    setQuantity(q => q + 1)
  }

  const decrementQuantity = () => {
    if (quantity <= 1) return
    setQuantity(q => q - 1)
  }

  const nextImage = () => {
    if (product?.images && product.images.length > 1) {
      setSelectedImage(prev => (prev + 1) % product.images!.length)
    }
  }

  const prevImage = () => {
    if (product?.images && product.images.length > 1) {
      setSelectedImage(prev => (prev - 1 + product.images!.length) % product.images!.length)
    }
  }

  // Format price safely
  const formatPrice = (price: any) => {
    const numPrice = typeof price === 'number' ? price : Number(price)
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[101] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal Content */}
          <div 
            className={cn(
              "relative w-full max-w-4xl rounded-xl bg-white shadow-2xl transition-all duration-200",
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 p-2 text-gray-500 backdrop-blur-sm transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="max-h-[90vh] overflow-y-auto rounded-xl">
              {isLoading ? (
                <div className="flex h-96 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
                </div>
              ) : product ? (
                <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
                  {/* Image Gallery */}
                  <div className="space-y-4">
                    <div className="group relative aspect-square overflow-hidden rounded-lg bg-gray-50">
                      {product.images && product.images.length > 0 ? (
                        <>
                          <Image
                            src={product.images[selectedImage]!}
                            alt={product.name}
                            width={500}
                            height={500}
                            className="h-full w-full object-contain"
                            priority
                          />
                          
                          {/* Image Navigation Arrows */}
                          {product.images.length > 1 && (
                            <>
                              <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                                aria-label="Previous image"
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </button>
                              <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                                aria-label="Next image"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gray-100 p-3">
                              <ShoppingCart className="h-full w-full" />
                            </div>
                            <p className="text-sm">No image available</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Thumbnail Gallery */}
                    {product.images && product.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {product.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={cn(
                              "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all",
                              selectedImage === index 
                                ? "border-orange-500 shadow-md" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
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
                  <div className="flex flex-col space-y-6">
                    {/* Header */}
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-900">{product.name}</h2>
                      
                      {product.category && (
                        <span className="mt-2 inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">
                          {product.category.name}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div>
                        <h3 className="mb-2 text-sm font-medium text-gray-900">Description</h3>
                        <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                          {product.description}
                        </p>
                      </div>
                    )}

                    {/* Price */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">
                          ${formatPrice(product.price)}
                        </span>
                        {product.compareAtPrice && (
                          <span className="text-lg text-gray-500 line-through">
                            ${formatPrice(product.compareAtPrice)}
                          </span>
                        )}
                      </div>

                      {product.preparationTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Ready in {product.preparationTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={decrementQuantity}
                          disabled={quantity <= 1}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center font-medium text-gray-900">{quantity}</span>
                        <button
                          onClick={incrementQuantity}
                          disabled={product.trackInventory && product.inventory !== null && quantity >= product.inventory}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {product.trackInventory && product.inventory !== null && product.inventory > 0 && (
                        <p className="text-sm text-gray-600">
                          Only {product.inventory} left in stock
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    {product.status !== "ACTIVE" && (
                      <div className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                        {product.status === "SOLD_OUT" ? "Sold Out" : "Unavailable"}
                      </div>
                    )}

                    {/* Add to Cart Button */}
                    <button
                      onClick={handleAddToCart}
                      disabled={
                        product.status !== "ACTIVE" || 
                        (product.trackInventory && product.inventory === 0)
                      }
                      className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-white font-medium shadow-lg transition-all hover:bg-orange-600 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {product.status === "SOLD_OUT" ? "Out of Stock" : `Add to Cart - $${formatPrice(toNumber(product.price) * quantity)}`}
                    </button>

                    {/* Additional Info */}
                    {(product.sku || (product._count && product._count.orderItems > 0)) && (
                      <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                        {product.sku && (
                          <div className="flex justify-between">
                            <span>SKU:</span>
                            <span className="font-medium">{product.sku}</span>
                          </div>
                        )}
                        {product._count && product._count.orderItems > 0 && (
                          <div className="flex justify-between">
                            <span>Popularity:</span>
                            <span className="font-medium">{product._count.orderItems} orders</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center">
                  <p className="text-gray-500">Product not found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}