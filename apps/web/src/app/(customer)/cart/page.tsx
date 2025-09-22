'use client'

import { useRouter } from "next/navigation"
import { Button } from "@homejiak/ui"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useCart, useCartTotal } from "../../../stores/cart-store"
import { EmptyCart } from "../../../components/cart/empty-cart"
import { CartItem } from "../../../components/cart/cart-item"
import { CartSummary } from "../../../components/cart/cart-summary"


// Note: In a real implementation, this would be fetched from the database
const MERCHANT_MINIMUM_ORDER = 20.00

export default function CartPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, clearCart } = useCart()
  const { subtotal, deliveryFee, total } = useCartTotal()

  const isEmpty = items.length === 0
  const canCheckout = subtotal >= MERCHANT_MINIMUM_ORDER

  const handleCheckout = () => {
    if (canCheckout) {
      router.push('/checkout')
    }
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen">
        <div className="container py-8">
          <EmptyCart />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Shopping Cart</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-destructive hover:text-destructive"
            >
              Clear Cart
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item: any) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <CartSummary
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                total={total}
                minimumOrder={MERCHANT_MINIMUM_ORDER}
                showMinimumWarning={true}
              />

              <Button
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={!canCheckout}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Secure checkout powered by HomeJiak
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}