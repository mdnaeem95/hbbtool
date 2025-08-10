'use client'

import { Card } from "@kitchencloud/ui"
import { Separator } from "@kitchencloud/ui"

interface CartSummaryProps {
  subtotal: number
  deliveryFee: number
  total: number
  minimumOrder?: number
  showMinimumWarning?: boolean
}

export function CartSummary({
  subtotal,
  deliveryFee,
  total,
  minimumOrder,
  showMinimumWarning,
}: CartSummaryProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Order Summary</h2>
      
      <div className="mt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span>
          <span>
            {deliveryFee === 0 ? (
              <span className="text-muted-foreground">-</span>
            ) : (
              `$${deliveryFee.toFixed(2)}`
            )}
          </span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {showMinimumWarning && minimumOrder && subtotal < minimumOrder && (
        <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          <p className="font-medium">Minimum order not met</p>
          <p className="mt-1">
            Add ${(minimumOrder - subtotal).toFixed(2)} more to meet the minimum order
            requirement of ${minimumOrder.toFixed(2)}
          </p>
        </div>
      )}

      {subtotal === 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Your cart is empty
        </div>
      )}
    </Card>
  )
}