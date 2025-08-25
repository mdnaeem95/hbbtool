"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Checkbox,
  Button,
  Card,
  cn,
} from "@kitchencloud/ui"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { RouterOutputs } from "@/lib/trpc/types"
import { OrderStatusBadge } from "./order-status-badge"
import { useOrderStore } from "@/stores/order-store"
import { OrderBulkActions } from "./order-bulk-actions"
import { formatCurrency } from "@/lib/utils"
import { OrderRowActions } from "./order-actions"

type Order = RouterOutputs["order"]["list"]["items"][0]

interface OrderListProps {
  orders: Order[]
  isLoading: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function OrderList({
  orders,
  isLoading,
  page,
  totalPages,
  onPageChange,
}: OrderListProps) {
  const { selectedOrders, toggleOrderSelection, clearSelection, lastUpdate } = useOrderStore()
  const [, setDetailOrder] = useState<Order | null>(null)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())

  // Track new orders (appeared since last update)
  useEffect(() => {
    if (lastUpdate) {
      const newIds = new Set<string>()
      orders.forEach(order => {
        const orderTime = new Date(order.createdAt)
        // If order was created within the last minute and after last update
        if (orderTime > lastUpdate && (Date.now() - orderTime.getTime()) < 60000) {
          newIds.add(order.id)
        }
      })
      setNewOrderIds(newIds)
      
      // Clear highlights after 5 seconds
      if (newIds.size > 0) {
        setTimeout(() => setNewOrderIds(new Set()), 5000)
      }
    }
  }, [orders, lastUpdate])

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      orders.forEach(order => toggleOrderSelection(order.id))
    } else {
      clearSelection()
    }
  }

  const allSelected = orders.length > 0 && orders.every(order => selectedOrders.has(order.id))
  const someSelected = orders.some(order => selectedOrders.has(order.id))

  if (isLoading && orders.length === 0) {
    return (
      <Card className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Loading orders...</div>
        </div>
      </Card>
    )
  }

  if (!isLoading && orders.length === 0) {
    return (
      <Card className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <h3 className="text-lg font-medium">No orders found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or wait for new orders to come in.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {someSelected && (
        <OrderBulkActions
          selectedCount={selectedOrders.size}
          selectedOrders={Array.from(selectedOrders)}
          onComplete={clearSelection}
        />
      )}

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className={cn("cursor-pointer hover:bg-muted/50 transition-colors",
                  newOrderIds.has(order.id) && "bg-orange-50 animate-pulse"
                )}
                onClick={() => setDetailOrder(order)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={() => toggleOrderSelection(order.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">#{order.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.deliveryMethod === "DELIVERY" ? "Delivery" : "Pickup"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customerName || "Guest"}</div>
                    {order.customerPhone && (
                      <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} className="p-1" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <OrderRowActions
                    order={order}
                    onViewDetails={() => setDetailOrder(order)}
                    onOrderUpdate={() => {
                      // Refresh the list when an order is updated
                      // This is already handled by the mutation's onSuccess
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hover:bg-muted hover:border-gray-300 transition-all"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 " />
            Previous
          </Button>
          <Button
            variant="outline"
            className="hover:bg-muted hover:border-gray-300 transition-all"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}