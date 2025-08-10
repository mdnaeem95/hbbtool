import Link from "next/link"
import { Button } from "@kitchencloud/ui"
import { ShoppingBag } from "lucide-react"

export function EmptyCart() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h2 className="mt-6 text-2xl font-bold">Your cart is empty</h2>
        
        <p className="mt-2 text-muted-foreground">
          Looks like you haven't added any delicious items to your cart yet.
          Explore our merchants to find your next meal!
        </p>
        
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/browse">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse Merchants
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              Go to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}