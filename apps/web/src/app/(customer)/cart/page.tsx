import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@kitchencloud/ui"
import { ShoppingBag } from "lucide-react"

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "Review your order before checkout",
}

export default function CartPage() {
  // This is a placeholder - cart functionality will be implemented later
  const isEmpty = true

  if (isEmpty) {
    return (
      <div className="min-h-screen">
        <div className="container py-16">
          <div className="mx-auto max-w-md text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
            <p className="mt-2 text-muted-foreground">
              Add some delicious items from our merchants to get started
            </p>
            <Button asChild className="mt-6">
              <Link href="/browse">Browse Merchants</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container py-8">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        {/* Cart items will be displayed here */}
      </div>
    </div>
  )
}