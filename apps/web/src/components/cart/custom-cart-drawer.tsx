'use client'

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Separator, cn } from "@kitchencloud/ui"
import { X, ShoppingCart, Trash2, Plus, Minus, AlertCircle } from "lucide-react"
import { useCart, useCartTotal } from "@/stores/cart-store"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@kitchencloud/ui"

interface CustomCartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Minimum order amount - in production, this should come from merchant data
const MERCHANT_MINIMUM_ORDER = 20.00

export function CustomCartDrawer({ open, onOpenChange }: CustomCartDrawerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { items, merchantName, updateQuantity, removeItem, clearCart } = useCart()
  const { subtotal, deliveryFee, total } = useCartTotal()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  const isEmpty = items.length === 0
  const canCheckout = subtotal >= MERCHANT_MINIMUM_ORDER
  const amountToMinimum = MERCHANT_MINIMUM_ORDER - subtotal

  // Handle escape key and focus trap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden'
      
      // Focus trap
      const drawer = document.getElementById('cart-drawer')
      if (drawer) {
        const focusableElements = drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
        
        firstElement?.focus()
        
        const handleTab = (e: KeyboardEvent) => {
          if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
              e.preventDefault()
              lastElement?.focus()
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              e.preventDefault()
              firstElement?.focus()
            }
          }
        }
        
        drawer.addEventListener('keydown', handleTab)
        return () => drawer.removeEventListener('keydown', handleTab)
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])

  const handleCheckout = () => {
    if (!canCheckout) return
    onOpenChange(false)
    router.push("/checkout")
  }

  const handleViewFullCart = () => {
    onOpenChange(false)
    router.push("/cart")
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onOpenChange(false)
    }
  }

  const handleRemoveItem = async (itemId: string, itemName: string) => {
    setRemovingItemId(itemId)
    
    // Small delay for animation
    setTimeout(() => {
      removeItem(itemId)
      setRemovingItemId(null)
      toast({
        title: "Item removed",
        description: `${itemName} has been removed from your cart.`,
      })
    }, 200)
  }

  const handleClearCart = () => {
    clearCart()
    onOpenChange(false)
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    })
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleOverlayClick}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            id="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-background shadow-xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping Cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-lg font-semibold">Shopping Cart</h2>
                <p className="text-sm text-muted-foreground">
                  {isEmpty
                    ? "Your cart is empty"
                    : `${items.length} ${items.length === 1 ? "item" : "items"} from ${merchantName}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-full bg-muted p-4"
                >
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </motion.div>
                <p className="text-center text-muted-foreground">
                  Add items to your cart to get started
                </p>
                <Button onClick={() => onOpenChange(false)}>Continue Shopping</Button>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="popLayout">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ 
                          duration: 0.2,
                          delay: index * 0.05,
                          layout: { type: "spring", damping: 25, stiffness: 300 }
                        }}
                        className={cn(
                          "flex gap-4 rounded-lg border p-4 mb-4",
                          removingItemId === item.id && "opacity-50"
                        )}
                      >
                        {/* Item Image */}
                        {item.image && (
                          <div className="h-20 w-20 overflow-hidden rounded-lg bg-muted flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        {/* Item Details */}
                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-medium line-clamp-1">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() =>
                                item.quantity > 1
                                  ? updateQuantity(item.id, item.quantity - 1)
                                  : handleRemoveItem(item.id, item.name)
                              }
                              aria-label={item.quantity > 1 ? "Decrease quantity" : "Remove item"}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.maxQuantity ? item.quantity >= item.maxQuantity : false}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Price and Remove */}
                        <div className="flex flex-col items-end justify-between">
                          <p className="font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id, item.name)}
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="border-t p-6 space-y-4">
                  {/* Minimum order warning */}
                  {!canCheckout && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg"
                    >
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900 dark:text-amber-100">
                          Minimum order: ${MERCHANT_MINIMUM_ORDER.toFixed(2)}
                        </p>
                        <p className="text-amber-700 dark:text-amber-200">
                          Add ${amountToMinimum.toFixed(2)} more to checkout
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>${deliveryFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleViewFullCart}
                    >
                      View Full Cart
                    </Button>
                    <Button 
                      className="w-full" 
                      onClick={handleCheckout}
                      disabled={!canCheckout}
                    >
                      {canCheckout 
                        ? `Checkout • $${total.toFixed(2)}`
                        : `Add $${amountToMinimum.toFixed(2)} more`
                      }
                    </Button>
                  </div>

                  {/* Clear Cart */}
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={handleClearCart}
                    >
                      Clear Cart
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}