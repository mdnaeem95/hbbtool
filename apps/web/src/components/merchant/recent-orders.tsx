'use client'

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, BadgeProps } from "@kitchencloud/ui"
import { formatDistanceToNow } from "date-fns"
import { ArrowUpRight } from "lucide-react"
import { OrderStatus } from "@kitchencloud/database"

interface RecentOrdersProps {
  orders: Array<{
    id: string
    orderNumber: string
    status: OrderStatus
    customerName: string | null
    total: any // Can be number or Prisma Decimal
    deliveryMethod: string
    createdAt: Date | string
  }>
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

// Helper function to convert Prisma Decimal to number
function toNumber(value: any): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber()
  }
  return Number(value || 0)
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  if (orders.length === 0) {
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
          {orders.slice(0, 5).map((order) => {
            const config = statusConfig[order.status]
            const total = toNumber(order.total)
            const createdAt = typeof order.createdAt === 'string' 
              ? new Date(order.createdAt) 
              : order.createdAt
            
            return (
              <div
                key={order.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{order.customerName || "Guest"}</span>
                    <span>{formatDistanceToNow(createdAt)} ago</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${total.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.deliveryMethod === "DELIVERY" ? "Delivery" : "Pickup"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}