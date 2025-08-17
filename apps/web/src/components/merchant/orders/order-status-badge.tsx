import { Badge, BadgeProps } from "@kitchencloud/ui"
import { OrderStatus } from "@kitchencloud/database"

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

const statusConfig: Record<
  OrderStatus,
  { 
    label: string
    variant: BadgeProps["variant"]
    className: string
  }
> = {
  PENDING: { 
    label: "Pending", 
    variant: "default",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
  },
  CONFIRMED: { 
    label: "Confirmed", 
    variant: "default",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-200"
  },
  PREPARING: { 
    label: "Preparing", 
    variant: "default",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-200"
  },
  READY: { 
    label: "Ready", 
    variant: "default",
    className: "bg-green-100 text-green-800 hover:bg-green-200"
  },
  OUT_FOR_DELIVERY: { 
    label: "Out for Delivery", 
    variant: "default",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-200"
  },
  DELIVERED: { 
    label: "Delivered", 
    variant: "default",
    className: "bg-teal-100 text-teal-800 hover:bg-teal-200"
  },
  COMPLETED: { 
    label: "Completed", 
    variant: "default",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-200"
  },
  CANCELLED: { 
    label: "Cancelled", 
    variant: "destructive",
    className: ""
  },
  REFUNDED: { 
    label: "Refunded", 
    variant: "outline",
    className: "border-pink-300 text-pink-800"
  },
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className || ""}`}
    >
      {config.label}
    </Badge>
  )
}