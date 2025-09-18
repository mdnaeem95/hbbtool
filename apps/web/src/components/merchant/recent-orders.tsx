'use client'

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Button } from "@kitchencloud/ui"
import { formatDistanceToNow } from "date-fns"
import { ArrowUpRight, Clock } from "lucide-react"
import { OrderStatusBadge } from "./orders/order-status-badge"
import { RouterOutputs } from "../../lib/trpc/types"

// Use the actual type from tRPC RouterOutputs - no more manual interface!
type RecentOrdersProps = {
  orders: RouterOutputs["merchant"]["getDashboard"]["recentOrders"]
}

// Helper function to convert Prisma Decimal to number
function toNumber(value: any): number {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber()
  }
  return Number(value || 0)
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
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
            <div className="text-center space-y-2">
              <Clock className="h-8 w-8 mx-auto opacity-50" />
              <p>No orders yet. Your first order will appear here!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
        <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100 hover:text-gray-900 hover:scale-105 transition-all duration-200 hover:shadow-sm group">
          <Link href="/dashboard/orders">
            View All
            <ArrowUpRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {orders.slice(0, 5).map((order) => {
            const total = toNumber(order.total)
            const createdAt = typeof order.createdAt === 'string' 
              ? new Date(order.createdAt) 
              : order.createdAt
            
            return (
              <div
                key={order.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 last:pb-0"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-sm font-medium hover:underline text-gray-900"
                    >
                      #{order.orderNumber}
                    </Link>
                    <OrderStatusBadge status={order.status} className="p-1" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{order.customer?.name || order.customerName || "Guest"}</span>
                    <span>{formatDistanceToNow(createdAt)} ago</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(total)}</p>
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