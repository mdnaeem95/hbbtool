'use client'

import Link from "next/link"
import { Button } from "@kitchencloud/ui"
import { ShoppingCart } from "lucide-react"
import { useCartCount } from "@/stores/cart-store"
import { cn } from "@/lib/utils"

interface CartBadgeProps {
  className?: string
}

export function CartBadge({ className }: CartBadgeProps) {
  const itemCount = useCartCount()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      asChild
    >
      <Link href="/cart">
        <ShoppingCart className="h-5 w-5" />
        
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
        
        <span className="sr-only">
          Shopping cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
      </Link>
    </Button>
  )
}