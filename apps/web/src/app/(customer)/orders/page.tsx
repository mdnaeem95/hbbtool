import { Metadata } from "next"
import { AuthGuard } from "../../../components/auth/auth-guard"
import { Card } from "@kitchencloud/ui"
import { Package } from "lucide-react"

export const metadata: Metadata = {
  title: "My Orders",
  description: "View your order history",
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="container py-8">
          <h1 className="text-2xl font-bold">My Orders</h1>
          
          {/* Placeholder - will be replaced with actual orders */}
          <div className="mt-8">
            <Card className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">No orders yet</h2>
              <p className="mt-2 text-muted-foreground">
                When you place your first order, it will appear here
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}