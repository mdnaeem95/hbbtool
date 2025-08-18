// Update your OrderKanban component with mobile optimization
"use client"

import { useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kitchencloud/ui"
import { RouterOutputs } from "@/lib/trpc/types"
import { OrderStatus } from "@kitchencloud/database/types"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"
import { canUpdateOrderStatus } from "@/lib/helpers/order"
import { api } from "@/lib/trpc/client"
import { useToast } from "@kitchencloud/ui"
import { OrderDetail } from "./order-detail"
import { useMediaQuery } from "@/hooks/use-media-query"
import { CheckCircle, Clock, ChefHat, Package, Truck } from "lucide-react"

type Order = RouterOutputs["order"]["list"]["items"][0]

interface OrderKanbanProps {
  orders: Order[]
  isLoading: boolean
}

interface ColumnConfig {
  title: string
  icon: any
  color: string
  acceptsFrom: OrderStatus[]
}

// Column configuration
const COLUMN_CONFIG: Record<OrderStatus, ColumnConfig> = {
  [OrderStatus.PENDING]: {
    title: "Pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    acceptsFrom: [],
  },
  [OrderStatus.CONFIRMED]: {
    title: "Confirmed", 
    icon: CheckCircle,
    color: "bg-blue-100 text-blue-800 border-blue-300",
    acceptsFrom: [OrderStatus.PENDING],
  },
  [OrderStatus.PREPARING]: {
    title: "Preparing",
    icon: ChefHat,
    color: "bg-purple-100 text-purple-800 border-purple-300",
    acceptsFrom: [OrderStatus.CONFIRMED],
  },
  [OrderStatus.READY]: {
    title: "Ready",
    icon: Package,
    color: "bg-green-100 text-green-800 border-green-300",
    acceptsFrom: [OrderStatus.CONFIRMED, OrderStatus.PREPARING],
  },
  [OrderStatus.DELIVERED]: {
    title: "Delivered",
    icon: Truck,
    color: "bg-orange-100 text-orange-800 border-orange-300",
    acceptsFrom: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY],
  },
  [OrderStatus.COMPLETED]: {
    title: "Completed",
    icon: CheckCircle,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    acceptsFrom: [OrderStatus.READY, OrderStatus.DELIVERED],
  },
  [OrderStatus.CANCELLED]: {
    title: "Cancelled",
    icon: CheckCircle,
    color: "bg-red-100 text-red-800 border-red-300", 
    acceptsFrom: [],
  },
  [OrderStatus.REFUNDED]: {
    title: "Refunded",
    icon: CheckCircle,
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    acceptsFrom: [],
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    title: "Out for Delivery",
    icon: Truck,
    color: "bg-orange-100 text-orange-800 border-orange-300",
    acceptsFrom: [OrderStatus.READY],
  },
}

const STATUS_COLUMNS = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
] as const

export function OrderKanban({ orders, isLoading }: OrderKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [mobileSelectedStatus, setMobileSelectedStatus] = useState<OrderStatus>(OrderStatus.PENDING)
  const { toast } = useToast()
  const utils = api.useUtils()
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Configure sensors for better mobile support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  // Update status mutation
  const updateStatus = api.order.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      await utils.order.list.cancel()
      const previousData = utils.order.list.getData()
      
      // Get current query input to maintain filters
      const queryInput = utils.order.list.getData() as any
      
      // Optimistic update
      utils.order.list.setData(queryInput?.input || {}, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === id ? { ...item, status } : item
          ),
        }
      })
      
      return { previousData }
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        const queryInput = utils.order.list.getData() as any
        utils.order.list.setData(queryInput?.input || {}, context.previousData)
      }
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      })
    },
    onSuccess: () => {
      toast({
        title: "Order Updated",
        description: "Order status updated successfully",
      })
    },
    onSettled: () => {
      utils.order.list.invalidate()
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const order = orders.find((o) => o.id === active.id)
    const newStatus = over.id as OrderStatus

    if (!order) return

    const isPickup = order.deliveryMethod === "PICKUP"
    if (!canUpdateOrderStatus(order.status as OrderStatus, newStatus, isPickup)) {
      toast({
        title: "Invalid Status Change",
        description: "This status transition is not allowed",
        variant: "destructive",
      })
      return
    }

    await updateStatus.mutateAsync({
      id: order.id,
      status: newStatus,
    })
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const activeOrder = activeId ? orders.find((o) => o.id === activeId) : null

  // Group orders by status
  const ordersByStatus = STATUS_COLUMNS.reduce((acc, status) => {
    acc[status] = orders.filter((order) => order.status === status)
    return acc
  }, {} as Record<OrderStatus, Order[]>)

  if (isLoading && orders.length === 0) {
    return (
      <Card className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Loading orders...</div>
        </div>
      </Card>
    )
  }

  // Mobile view - show one status at a time
  if (isMobile) {
    return (
      <>
        <div className="mb-4">
          <Select
            value={mobileSelectedStatus}
            onValueChange={(value) => setMobileSelectedStatus(value as OrderStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_COLUMNS.map((status) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <span>{status.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">
                      ({ordersByStatus[status].length})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {ordersByStatus[mobileSelectedStatus].map((order) => (
            <Card
              key={order.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setDetailOrder(order)}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium">#{order.orderNumber}</h4>
                <span className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleTimeString("en-SG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm mb-2">{order.customerName}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold">${order.total.toFixed(2)}</span>
                <span className="text-xs px-2 py-1 bg-muted rounded">
                  {order.items.length} items
                </span>
              </div>
            </Card>
          ))}
          
          {ordersByStatus[mobileSelectedStatus].length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              No orders in this status
            </Card>
          )}
        </div>

        {/* Order Detail */}
        {detailOrder && (
          <OrderDetail
            order={detailOrder}
            open={!!detailOrder}
            onClose={() => setDetailOrder(null)}
          />
        )}
      </>
    )
  }

  // Desktop Kanban view
  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((status) => {
            const config = COLUMN_CONFIG[status]
            const column = {
              id: status,
              ...config,
            }
            
            return (
              <KanbanColumn
                key={status}
                column={column}
                orders={ordersByStatus[status]}
                isLoading={isLoading}
                isDragging={!!activeId}
                activeOrder={activeOrder}
                onOrderClick={setDetailOrder}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeOrder && <KanbanCard order={activeOrder} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Order Detail */}
      {detailOrder && (
        <OrderDetail
          order={detailOrder}
          open={!!detailOrder}
          onClose={() => setDetailOrder(null)}
        />
      )}
    </>
  )
}