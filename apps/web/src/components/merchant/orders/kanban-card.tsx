"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, Badge, cn } from "@kitchencloud/ui"
import { 
  GripVertical, 
  Clock, 
  User, 
  Phone, 
  Package,
  DollarSign,
  Truck,
  Store,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { RouterOutputs } from "@/lib/trpc/types"
import { OrderDetail } from "./order-detail"

type Order = RouterOutputs["order"]["list"]["items"][0]

interface KanbanCardProps {
  order: Order
  isDragging?: boolean
}

export function KanbanCard({ order, isDragging = false }: KanbanCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: order.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Format currency
  const formatCurrency = (amount: any) => {
    const value = typeof amount === 'number' ? amount : amount?.toNumber?.() || 0
    return `$${value.toFixed(2)}`
  }

  // Format phone for display
  const formatPhone = (phone: string) => {
    if (phone.startsWith('+65')) {
      return phone.replace(/(\+65)(\d{4})(\d{4})/, '$1 $2 $3')
    }
    return phone
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open detail if clicking on drag handle
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      return
    }
    setShowDetail(true)
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "cursor-pointer select-none space-y-3 p-4 hover:shadow-md transition-all",
          (isSortableDragging || isDragging) && "opacity-50 shadow-lg",
          !isDragging && "hover:scale-[1.02]"
        )}
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <div
              {...attributes}
              {...listeners}
              data-drag-handle
              className="mt-0.5 cursor-grab touch-none hover:text-primary active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">#{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge 
            variant={order.deliveryMethod === "DELIVERY" ? "default" : "secondary"}
            className="text-xs"
          >
            {order.deliveryMethod === "DELIVERY" ? (
              <Truck className="mr-1 h-3 w-3" />
            ) : (
              <Store className="mr-1 h-3 w-3" />
            )}
            {order.deliveryMethod === "DELIVERY" ? "Delivery" : "Pickup"}
          </Badge>
        </div>

        {/* Customer Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{order.customerName || "Guest"}</span>
          </div>
          {order.customerPhone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{formatPhone(order.customerPhone)}</span>
            </div>
          )}
        </div>

        {/* Order Items Summary */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span>
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          {order.items.length > 0 && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {order.items.map((item: any) => `${item.quantity}x ${item.productName}`).join(', ')}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{formatCurrency(order.total)}</span>
          </div>
          {order.scheduledFor && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(order.scheduledFor).toLocaleTimeString('en-SG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Order Detail */}
      {showDetail && (
        <OrderDetail
          order={order}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}