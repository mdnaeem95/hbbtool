import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getMerchantSession } from "../../../actions/merchant-auth"
import { OrdersContent } from "../../../../components/merchant/orders/orders-content"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Orders - HomeJiak",
  description: "Manage your orders",
}

export default async function OrdersPage() {
  // Check authentication
  const session = await getMerchantSession()
  
  if (!session) {
    redirect("/auth?redirect=/orders")
  }

  return (
    <div className="flex flex-1 flex-col">
      <OrdersContent />
    </div>
  )
}