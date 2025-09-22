import { OrderStatus } from "@homejiak/database/types"// or whatever your color/variant union is

// --- Status UI config
export const ORDER_STATUS_CONFIG = {
  [OrderStatus.PENDING]:   { label: "Pending",   color: "warning",    description: "Waiting for merchant confirmation" },
  [OrderStatus.CONFIRMED]: { label: "Confirmed", color: "info",       description: "Order confirmed by merchant" },
  [OrderStatus.PREPARING]: { label: "Preparing", color: "secondary",  description: "Your order is being prepared" },
  [OrderStatus.READY]:     { label: "Ready",     color: "success",    description: "Ready for pickup/delivery" },
  [OrderStatus.OUT_FOR_DELIVERY]: { label: "Out for Delivery", color: "info", description: "Your order is on the way" },
  [OrderStatus.DELIVERED]: { label: "Delivered", color: "success",    description: "Order has been delivered" },
  [OrderStatus.COMPLETED]: { label: "Completed", color: "default",    description: "Order completed successfully" },
  [OrderStatus.CANCELLED]: { label: "Cancelled", color: "destructive",description: "Order has been cancelled" },
  [OrderStatus.REFUNDED]:  { label: "Refunded",  color: "warning",    description: "Order has been refunded" },
} as const satisfies Record<OrderStatus, { label: string; color: string | string; description: string }>

export function getOrderStatusConfig(status: OrderStatus) {
  return ORDER_STATUS_CONFIG[status]
}

// --- Allowed transitions
type Flow = Record<OrderStatus, readonly OrderStatus[]>

const pickupFlow = {
  [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY,     OrderStatus.CANCELLED],
  [OrderStatus.READY]:     [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]:  [],
  [OrderStatus.OUT_FOR_DELIVERY]: [],
  [OrderStatus.DELIVERED]: [],
} as const satisfies Flow

const deliveryFlow = {
  [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED,       OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING,       OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY,           OrderStatus.CANCELLED],
  [OrderStatus.READY]:     [OrderStatus.OUT_FOR_DELIVERY,OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED,       OrderStatus.REFUNDED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]:  [],
} as const satisfies Flow

export function canUpdateOrderStatus(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  isPickup: boolean
): boolean {
  const flow: Flow = isPickup ? pickupFlow : deliveryFlow
  return flow[currentStatus].includes(newStatus)
}
