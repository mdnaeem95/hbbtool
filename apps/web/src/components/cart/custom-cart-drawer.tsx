'use client'

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Separator, cn } from "@kitchencloud/ui"
import { X, ShoppingCart, Trash2, Plus, Minus, AlertCircle, ArrowRight } from "lucide-react"
import { useCart } from "../../stores/cart-store"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@kitchencloud/ui"
import { useMerchant } from "../../contexts/merchant-context"

interface CustomCartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomCartDrawer({ open, onOpenChange }: CustomCartDrawerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { merchant } = useMerchant()
  const { items, updateQuantity, removeItem, clearCart, getSubtotal } = useCart()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  // Calculate totals
  const subtotal = getSubtotal()
  const isEmpty = items.length === 0
  
  // Use merchant data from context
  const minimumOrder = merchant?.minimumOrder || 0
  const canCheckout = subtotal >= minimumOrder
  const amountToMinimum = Math.max(0, minimumOrder - subtotal)
  const displayMerchantName = merchant?.businessName || "Loading..."

  // Handle escape key and focus trap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      
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
    if (window.confirm("Are you sure you want to clear your cart?")) {
      clearCart()
      onOpenChange(false)
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
      })
    }
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
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
            <div className="flex items-center justify-between border-b p-6 bg-gradient-to-r from-orange-50/50 to-orange-100/30">
              <div>
                <h2 className="text-lg font-semibold">Shopping Cart</h2>
                <p className="text-sm text-muted-foreground">
                  {isEmpty
                    ? "Your cart is empty"
                    : `${items.length} ${items.length === 1 ? "item" : "items"} from ${displayMerchantName}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="hover:bg-white/80 hover:scale-110 transition-all duration-200"
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isEmpty ? (
              // Empty cart state
              <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-full bg-gradient-to-br from-orange-100 to-orange-50 p-6"
                >
                  <ShoppingCart className="h-10 w-10 text-orange-600" />
                </motion.div>
                <h3 className="text-lg font-medium">Your cart is empty</h3>
                <p className="text-center text-muted-foreground">
                  Add delicious items to your cart to get started
                </p>
                <Button 
                  onClick={() => onOpenChange(false)}
                  className="bg-orange-600 hover:bg-orange-700 hover:scale-105 transition-all duration-200"
                >
                  Continue Shopping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="popLayout">
                    {items.map((item, index) => (
                      // Cart item component (unchanged)
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
                          "hover:border-orange-200 hover:bg-orange-50/30 transition-all duration-200",
                          removingItemId === item.id && "opacity-50"
                        )}
                      >
                        {/* Item content - same as before */}
                        {item.image && (
                          <div className="h-20 w-20 overflow-hidden rounded-lg bg-muted flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-medium line-clamp-1">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.price)} each
                            </p>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className={cn(
                                "h-7 w-7",
                                "hover:bg-gray-100 hover:border-gray-400",
                                "active:scale-90 transition-all duration-200"
                              )}
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
                              className={cn(
                                "h-7 w-7",
                                "hover:bg-gray-100 hover:border-gray-400",
                                "active:scale-90 transition-all duration-200",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.maxQuantity ? item.quantity >= item.maxQuantity : false}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between">
                          <p className="font-semibold">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "h-8 w-8 text-muted-foreground",
                              "hover:text-destructive hover:bg-red-50",
                              "hover:scale-110 transition-all duration-200"
                            )}
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
                <div className="border-t p-6 space-y-4 bg-gradient-to-t from-gray-50/50 to-white">
                  {/* Minimum order warning */}
                  {minimumOrder > 0 && !canCheckout && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200"
                    >
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900 dark:text-amber-100">
                          Minimum order: {formatPrice(minimumOrder)}
                        </p>
                        <p className="text-amber-700 dark:text-amber-200">
                          Add {formatPrice(amountToMinimum)} more to checkout
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-base font-medium">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    
                    {merchant?.deliveryEnabled && (
                      <p className="text-xs text-muted-foreground italic">
                        {merchant.pickupEnabled 
                          ? "Delivery or pickup options available at checkout"
                          : "Delivery fee will be calculated at checkout"}
                      </p>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-orange-600">{formatPrice(subtotal)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full",
                        "hover:bg-gray-50 hover:border-gray-400",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        "transition-all duration-200"
                      )}
                      onClick={handleViewFullCart}
                    >
                      View Full Cart
                    </Button>
                    <Button 
                      className={cn(
                        "w-full",
                        canCheckout 
                          ? "bg-orange-600 hover:bg-orange-700 hover:shadow-lg" 
                          : "bg-gray-400 cursor-not-allowed",
                        canCheckout && "hover:scale-[1.02] active:scale-[0.98]",
                        "transition-all duration-200"
                      )}
                      onClick={handleCheckout}
                      disabled={!canCheckout}
                    >
                      {canCheckout ? (
                        <>
                          Proceed to Checkout
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      ) : minimumOrder > 0 ? (
                        `Add ${formatPrice(amountToMinimum)} more`
                      ) : (
                        "Proceed to Checkout"
                      )}
                    </Button>
                  </div>

                  {/* Clear Cart */}
                  <div className="text-center">
                    <button
                      className={cn(
                        "text-sm text-muted-foreground",
                        "hover:text-destructive hover:underline",
                        "transition-all duration-200"
                      )}
                      onClick={handleClearCart}
                    >
                      Clear Cart
                    </button>
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