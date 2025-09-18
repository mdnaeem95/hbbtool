'use client'

import { Button, Card } from "@kitchencloud/ui"
import { Minus, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import { CartItem as CartItemType } from "../../stores/cart-store"

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

  const itemTotal = item.price * item.quantity

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
            <div>
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.merchantName}</p>
              {item.notes && (
                <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
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

            {/* Price */}
            <div className="text-right">
              <p className="font-semibold">${itemTotal.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">
                ${item.price.toFixed(2)} each
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}