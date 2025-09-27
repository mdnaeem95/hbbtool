'use client'

import { Button, Card } from "@homejiak/ui"
import { Minus, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import { CartItem as CartItemType, formatCustomizations } from "../../stores/cart-store"
import { formatPrice } from "../../lib/utils"

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleIncrement = () => {
    const newQuantity = item.quantity + 1
    if (!item.maxQuantity || newQuantity <= item.maxQuantity) {
      onUpdateQuantity(item.id, newQuantity)
    }
  }

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1)
    }
  }

  // Calculate prices including customizations
  const unitPrice = item.price + (item.customizationPrice || 0)
  const itemTotal = unitPrice * item.quantity
  const customizationsText = formatCustomizations(item.customizations)

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-1 flex-col">
          <div className="flex justify-between">
            <div className="flex-1">
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.merchantName}</p>
              
              {/* Display customizations if any */}
              {customizationsText && (
                <div className="mt-1">
                  <p className="text-sm text-muted-foreground">
                    {customizationsText}
                  </p>
                </div>
              )}
              
              {/* Display notes if any */}
              {item.notes && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  Note: {item.notes}
                </p>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            {/* Quantity Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleDecrement}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-12 text-center font-medium">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleIncrement}
                disabled={item.maxQuantity ? item.quantity >= item.maxQuantity : false}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Price Display */}
            <div className="text-right">
              <p className="font-semibold">{formatPrice(itemTotal)}</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {/* Show base price */}
                <p>{formatPrice(item.price)} base</p>
                
                {/* Show customization price if any */}
                {item.customizationPrice && item.customizationPrice > 0 && (
                  <p>+{formatPrice(item.customizationPrice)} extras</p>
                )}
                
                {/* Show unit price if quantity > 1 */}
                {item.quantity > 1 && (
                  <p className="pt-1 border-t">
                    {formatPrice(unitPrice)} × {item.quantity}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}