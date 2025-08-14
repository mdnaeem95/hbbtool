import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, BadgeProps } from "@kitchencloud/ui"
import { formatDistanceToNow } from "date-fns"
import { ArrowUpRight } from "lucide-react"
import { OrderStatus } from "@kitchencloud/database"
import { getServerCaller } from "@/app/api/trpc/server"

interface RecentOrdersProps {
  merchantId: string
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  PENDING: { label: "Pending", variant: "default" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  PREPARING: { label: "Preparing", variant: "secondary" },
  READY: { label: "Ready", variant: "default" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", variant: "default" },
  DELIVERED: { label: "Delivered", variant: "default" },
  COMPLETED: { label: "Completed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "outline" },
}

export async function RecentOrders({ merchantId }: RecentOrdersProps) {

  // Fetch recent orders using the list method (works for both merchant and customer)
  const api = await getServerCaller()
  const orders = await api.order.list({
    limit: 5,
  })

  console.log(`Merchant ID: ${merchantId}`)

  if (orders.items.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No orders yet. Your first order will appear here!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            View All
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.items.map((order: any) => (
            <div
              key={order.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    #{order.orderNumber}
                  </Link>
                  <Badge
                    //@ts-ignore
                    variant={statusConfig[order.status].variant}
                    className="text-xs"
                  >
                    {statusConfig[order.status].label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{order.customerName}</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">${order.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {order.items.length} items
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}