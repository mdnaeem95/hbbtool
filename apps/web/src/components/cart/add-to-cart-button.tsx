'use client'

import { useState } from "react"
import { Button, useToast } from "@kitchencloud/ui"
import { ShoppingCart, Plus, Minus, Check } from "lucide-react"
import { useCart, useCartItemQuantity } from "@/stores/cart-store"
import { cn } from "@/lib/utils"

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    price: number
    image?: string
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
  const { addItem, updateQuantity, removeItem, findItem, canAddItem } = useCart()
  const quantity = useCartItemQuantity(product.id)
  const { toast } = useToast()
  const [isAnimating, setIsAnimating] = useState(false)

  const cartItem = findItem(product.id)
  const isInCart = quantity > 0

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

    try {
      addItem({
        productId: product.id,
        merchantId: merchant.id,
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
    if (cartItem) {
      updateQuantity(cartItem.id, quantity + 1)
    }
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cartItem && quantity > 1) {
      updateQuantity(cartItem.id, quantity - 1)
    } else if (cartItem) {
      removeItem(cartItem.id)
      toast({
        title: "Removed from cart",
        description: `${product.name} has been removed from your cart.`,
      })
    }
  }

  if (!isInCart) {
    return (
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
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8"
        onClick={handleDecrement}
      >
        <Minus className="h-3 w-3" />
      </Button>
      
      <span className="min-w-[2rem] text-center font-medium">
        {quantity}
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
  )
}