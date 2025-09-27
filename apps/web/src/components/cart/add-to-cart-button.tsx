'use client'

import { useState } from "react"
import { Button, useToast } from "@homejiak/ui"
import { ShoppingCart, Plus, Minus, Check } from "lucide-react"
import { useCart } from "../../stores/cart-store"
import { cn } from "../../lib/utils"
import { api } from "../../lib/trpc/client"
import { ProductCustomizationSheet } from "../product/product-customisation-sheet"

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    price: number
    image?: string
    merchantId?: string
    modifierGroups?: any[] // Optional if already fetched
  }
  merchant: {
    id: string
    name: string
  }
  size?: "sm" | "default" | "lg"
  className?: string
}

export function AddToCartButton({
  product,
  merchant,
  size = "sm",
  className
}: AddToCartButtonProps) {
  const [showCustomization, setShowCustomization] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const { addItem, updateQuantity, removeItem, canAddItem, items } = useCart()
  const { toast } = useToast()

  // Fetch product with modifiers if not already included
  const { data: productWithModifiers } = api.product.getWithModifiers.useQuery(
    { id: product.id },
    { 
      enabled: !product.modifierGroups && !!product.id,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Merge product data with fetched modifiers
  const fullProduct = productWithModifiers || product

  // Get all cart items for this product (may have different customizations)
  const productCartItems = items.filter(item => item.productId === product.id)
  const totalQuantity = productCartItems.reduce((sum, item) => sum + item.quantity, 0)
  
  // Get the item without customizations (for simple increment/decrement)
  const simpleCartItem = productCartItems.find(item => 
    !item.customizations || item.customizations.length === 0
  )

  const hasModifiers = fullProduct.modifierGroups && 
    fullProduct.modifierGroups.length > 0 && 
    fullProduct.modifierGroups.some((g: any) => 
      g.isActive && g.modifiers && g.modifiers.length > 0
    )

  const handleAddToCart = () => {
    // Check if we can add items from this merchant
    if (!canAddItem(merchant.id)) {
      toast({
        title: "Different merchant",
        description: "You can only order from one merchant at a time. Please clear your cart first.",
        variant: "destructive",
      })
      return
    }

    // If product has modifiers, show customization sheet
    if (hasModifiers) {
      setShowCustomization(true)
      return
    }

    // Otherwise add directly to cart
    try {
      addItem({
        productId: product.id,
        merchantId: merchant.id || product.merchantId || "",
        merchantName: merchant.name,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      })

      // Trigger animation
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 600)

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (hasModifiers) {
      // If product has modifiers, show customization sheet for new item
      setShowCustomization(true)
    } else if (simpleCartItem) {
      // Increment the simple item without customizations
      updateQuantity(simpleCartItem.id, simpleCartItem.quantity + 1)
    } else {
      // Add new simple item
      handleAddToCart()
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // If there are multiple items with different customizations
    if (productCartItems.length > 1) {
      toast({
        title: "Multiple customizations",
        description: "Please remove items from your cart directly.",
        variant: "default",
      })
      return
    }
    
    // Handle single item decrement
    const item = productCartItems[0]
    if (item) {
      if (item.quantity > 1) {
        updateQuantity(item.id, item.quantity - 1)
      } else {
        removeItem(item.id)
        toast({
          title: "Removed from cart",
          description: `${product.name} has been removed from your cart.`,
        })
      }
    }
  }

  // Not in cart - show Add to Cart button
  if (totalQuantity === 0) {
    return (
      <>
        <Button
          size={size}
          onClick={handleAddToCart}
          className={cn(
            "transition-all duration-200",
            isAnimating && "scale-95",
            className
          )}
        >
          {isAnimating ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <ShoppingCart className="mr-2 h-4 w-4" />
          )}
          Add to Cart
        </Button>

        {hasModifiers && (
          <ProductCustomizationSheet
            product={{
              ...fullProduct,
              merchantId: merchant.id || product.merchantId,
              merchant: merchant
            }}
            isOpen={showCustomization}
            onClose={() => setShowCustomization(false)}
          />
        )}
      </>
    )
  }

  // In cart - show quantity controls
  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={handleDecrement}
          disabled={totalQuantity <= 0}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <span className="min-w-[2rem] text-center font-medium">
          {totalQuantity}
        </span>
        
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={handleIncrement}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {hasModifiers && (
        <ProductCustomizationSheet
          product={{
            ...fullProduct,
            merchantId: merchant.id || product.merchantId,
            merchant: merchant
          }}
          isOpen={showCustomization}
          onClose={() => setShowCustomization(false)}
        />
      )}
    </>
  )
}