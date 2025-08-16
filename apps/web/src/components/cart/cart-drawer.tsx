'use client'

import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Button,
  Separator,
} from "@kitchencloud/ui"
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react"
import { useCart, useCartTotal } from "@/stores/cart-store"

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const router = useRouter()
  const { items, merchantName, updateQuantity, removeItem, clearCart } = useCart()
  const { subtotal, deliveryFee, total } = useCartTotal()

  const isEmpty = items.length === 0

  const handleCheckout = () => {
    onOpenChange(false)
    router.push("/checkout")
  }

  const handleViewFullCart = () => {
    onOpenChange(false)
    router.push("/cart")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg z-[100]">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {isEmpty
              ? "Your cart is empty"
              : `${items.length} ${items.length === 1 ? "item" : "items"} from ${merchantName}`}
          </SheetDescription>
        </SheetHeader>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-center text-muted-foreground">
              Add items to your cart to get started
            </p>
            <Button onClick={() => onOpenChange(false)}>Continue Shopping</Button>
          </div>
        ) : (
          <>
            {/* Cart Items - Simple version without ScrollArea */}
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-lg border p-4">
                    {/* Item Image */}
                    {item.image && (
                      <div className="h-20 w-20 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h4 className="font-medium line-clamp-1">{item.name}</h4>
                        <p className="text-sm font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(item.id, item.quantity - 1)
                              : removeItem(item.id)
                          }
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
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Cart Summary */}
            <div className="space-y-2 py-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <SheetFooter className="gap-2 sm:space-x-0">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleViewFullCart}
              >
                View Full Cart
              </Button>
              <Button className="w-full" onClick={handleCheckout}>
                Checkout • ${total.toFixed(2)}
              </Button>
            </SheetFooter>

            {/* Clear Cart Option */}
            <div className="mt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  clearCart()
                  onOpenChange(false)
                }}
              >
                Clear Cart
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}