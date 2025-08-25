"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Separator,
  ScrollArea,
  Alert,
  AlertDescription,
} from "@kitchencloud/ui"
import { 
  Clock, 
  Phone, 
  User, 
  DollarSign,
  Package,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Truck,
  ChefHat,
} from "lucide-react"
import { api } from "@/lib/trpc/client"
import { OrderStatus } from "@kitchencloud/database/types"
import { RouterOutputs } from "@/lib/trpc/types"
import { OrderStatusBadge } from "./order-status-badge"
import { useOrderStore } from "@/stores/order-store"
// import { OrderActions } from "./order-actions"

type Order = RouterOutputs["order"]["list"]["items"][0]
type OrderDetail = RouterOutputs["order"]["get"]

interface OrderDetailProps {
  order: Order
  open: boolean
  onClose: () => void
}

export function OrderDetail({ order, open, onClose }: OrderDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { addOptimisticUpdate, removeOptimisticUpdate } = useOrderStore()
  const utils = api.useUtils()

  // Fetch full order details
  const { data: orderDetail, isLoading } = api.order.get.useQuery(
    { id: order.id },
    { enabled: open }
  )

  // Update status mutation
  const updateStatus = api.order.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      setIsUpdating(true)
      // Optimistic update
      addOptimisticUpdate(id, { status })
      
      // Cancel outgoing refetches
      await utils.order.list.cancel()
      await utils.order.get.cancel({ id })
      
      // Snapshot previous values
      const previousList = utils.order.list.getData()
      const previousDetail = utils.order.get.getData({ id })
      
      // Optimistically update the data
      const currentListInput = utils.order.list.getData() as any
      if (currentListInput) {
        utils.order.list.setData(currentListInput, (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item: any) => 
              item.id === id ? { ...item, status } : item
            )
          }
        })
      }
      
      utils.order.get.setData({ id }, (old) => {
        if (!old) return old
        return { ...old, status }
      })
      
      return { previousList, previousDetail }
    },
    onError: (err, variables, context) => {
      // Revert optimistic update
      removeOptimisticUpdate(variables.id)
      if (context) {
        const currentListInput = utils.order.list.getData() as any
        if (currentListInput) {
          utils.order.list.setData(currentListInput, context.previousList)
        }
        utils.order.get.setData({ id: variables.id }, context.previousDetail)
      }
    },
    onSettled: (_, __, { id }) => {
      setIsUpdating(false)
      removeOptimisticUpdate(id)
      // Refetch to ensure consistency
      utils.order.list.invalidate()
      utils.order.get.invalidate({ id })
    },
  })

  const handleStatusUpdate = (newStatus: OrderStatus) => {
    updateStatus.mutate({
      id: order.id,
      status: newStatus,
    })
  }

  // Format helpers
  const formatCurrency = (amount: any) => {
    const value = typeof amount === 'number' ? amount : amount?.toNumber?.() || 0
    return `${value.toFixed(2)}`
  }

  const formatPhone = (phone: string) => {
    // Format Singapore phone numbers
    if (phone.startsWith('+65')) {
      return phone.replace(/(\+65)(\d{4})(\d{4})/, '$1 $2 $3')
    }
    return phone
  }

  if (!orderDetail && !isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const currentOrder = orderDetail || order

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">
                Order #{currentOrder.orderNumber}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(currentOrder.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <OrderStatusBadge status={currentOrder.status} className="text-sm" />
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-6 space-y-6">
            {/* Quick Actions */}
            {/* <OrderActions
              order={currentOrder}
              onStatusUpdate={handleStatusUpdate}
              isUpdating={isUpdating}
            /> */}

            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground w-20">Name:</span>
                  <span className="font-medium">{currentOrder.customerName || "Guest"}</span>
                </div>
                {currentOrder.customerPhone && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-20">Phone:</span>
                    <a 
                      href={`tel:${currentOrder.customerPhone}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhone(currentOrder.customerPhone)}
                    </a>
                  </div>
                )}
                {currentOrder.customerEmail && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-20">Email:</span>
                    <a 
                      href={`mailto:${currentOrder.customerEmail}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {currentOrder.customerEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Delivery/Pickup Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                {currentOrder.deliveryMethod === "DELIVERY" ? (
                  <>
                    <Truck className="h-4 w-4" />
                    Delivery Information
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Pickup Information
                  </>
                )}
              </h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-muted-foreground w-20">Method:</span>
                  <Badge variant="outline">
                    {currentOrder.deliveryMethod === "DELIVERY" ? "Delivery" : "Pickup"}
                  </Badge>
                </div>
                {currentOrder.deliveryMethod === "DELIVERY" && orderDetail?.deliveryAddress && (
                  <div className="flex items-start gap-3">
                    <span className="text-muted-foreground w-20">Address:</span>
                    <div className="space-y-1">
                      <p className="font-medium">{orderDetail.deliveryAddress.line1}</p>
                      {orderDetail.deliveryAddress.line2 && (
                        <p className="text-muted-foreground">{orderDetail.deliveryAddress.line2}</p>
                      )}
                      <p className="text-muted-foreground">
                        {orderDetail.deliveryAddress.postalCode}
                      </p>
                      {orderDetail.deliveryAddress.deliveryInstructions && (
                        <p className="text-sm italic">
                          Note: {orderDetail.deliveryAddress.deliveryInstructions}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {currentOrder.scheduledFor && (
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-20">Scheduled:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(currentOrder.scheduledFor), "MMM d, h:mm a")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Order Items
              </h3>
              <div className="space-y-3">
                {currentOrder.items.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.quantity}x {item.productName}
                      </p>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          Note: {item.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant={item.isPrepared ? "default" : "outline"}
                          className="text-xs"
                        >
                          {item.isPrepared ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Prepared
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payment Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(currentOrder.subtotal)}</span>
                </div>
                {currentOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{formatCurrency(currentOrder.deliveryFee)}</span>
                  </div>
                )}
                {currentOrder.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">-{formatCurrency(currentOrder.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(currentOrder.total)}</span>
                </div>
                
                {orderDetail?.payment && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Payment Method</span>
                      <Badge variant="outline">{orderDetail.payment.method}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Payment Status</span>
                      <Badge 
                        variant={orderDetail.payment.status === "COMPLETED" ? "default" : "secondary"}
                      >
                        {orderDetail.payment.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Timeline */}
            {orderDetail?.events && orderDetail.events.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Order Timeline
                  </h3>
                  <div className="space-y-3">
                    {orderDetail.events.map((event) => (
                      <div key={event.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{event.event.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Internal Notes */}
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Internal Notes
              </h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Internal notes feature coming soon. You'll be able to add private notes about this order.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}