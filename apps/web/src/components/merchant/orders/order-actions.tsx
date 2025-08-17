"use client"

import { useState } from "react"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@kitchencloud/ui"
import {
  CheckCircle,
  XCircle,
  ChefHat,
  Package,
  Truck,
  MoreVertical,
  Phone,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  Printer,
} from "lucide-react"
import { OrderStatus } from "@kitchencloud/database"
import { useToast } from "@kitchencloud/ui"
import { RouterOutputs } from "@/lib/trpc/types"

type Order = RouterOutputs["order"]["list"]["items"][0] | RouterOutputs["order"]["get"]

interface OrderActionsProps {
  order: Order
  onStatusUpdate: (status: OrderStatus) => void
  isUpdating?: boolean
}

// Define allowed transitions
const STATUS_TRANSITIONS: Record<OrderStatus, Array<{ status: OrderStatus; label: string; icon: any; variant?: any }>> = {
  PENDING: [
    { status: "CONFIRMED", label: "Confirm Order", icon: CheckCircle, variant: "default" },
    { status: "CANCELLED", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  CONFIRMED: [
    { status: "PREPARING", label: "Start Preparing", icon: ChefHat, variant: "default" },
    { status: "READY", label: "Mark as Ready", icon: Package, variant: "default" },
    { status: "CANCELLED", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  PREPARING: [
    { status: "READY", label: "Mark as Ready", icon: Package, variant: "default" },
    { status: "CANCELLED", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  READY: [
    { status: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: Truck, variant: "default" },
    { status: "DELIVERED", label: "Mark Delivered", icon: CheckCircle, variant: "default" },
    { status: "COMPLETED", label: "Complete Order", icon: CheckCircle, variant: "default" },
    { status: "CANCELLED", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  OUT_FOR_DELIVERY: [
    { status: "DELIVERED", label: "Mark Delivered", icon: CheckCircle, variant: "default" },
    { status: "CANCELLED", label: "Cancel Order", icon: XCircle, variant: "destructive" },
  ],
  DELIVERED: [
    { status: "COMPLETED", label: "Complete Order", icon: CheckCircle, variant: "default" },
    { status: "REFUNDED", label: "Process Refund", icon: DollarSign, variant: "destructive" },
  ],
  COMPLETED: [
    { status: "REFUNDED", label: "Process Refund", icon: DollarSign, variant: "destructive" },
  ],
  CANCELLED: [
    { status: "REFUNDED", label: "Process Refund", icon: DollarSign, variant: "destructive" },
  ],
  REFUNDED: [],
}

export function OrderActions({ order, onStatusUpdate, isUpdating }: OrderActionsProps) {
  const { toast } = useToast()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [refundReason, setRefundReason] = useState("")

  const transitions = STATUS_TRANSITIONS[order.status as OrderStatus] || []
  const primaryTransition = transitions.find((t: any) => t.variant !== "destructive")
  const otherTransitions = transitions.filter((t: any) => t !== primaryTransition)

  const handleStatusUpdate = (status: OrderStatus) => {
    if (status === "CANCELLED") {
      setShowCancelDialog(true)
      return
    }
    if (status === "REFUNDED") {
      setShowRefundDialog(true)
      return
    }
    onStatusUpdate(status)
    toast({
      title: "Order Updated",
      description: `Order status changed to ${status.toLowerCase().replace(/_/g, ' ')}`,
    })
  }

  const handleCancel = () => {
    onStatusUpdate("CANCELLED")
    toast({
      title: "Order Cancelled",
      description: "The order has been cancelled",
      variant: "destructive",
    })
    setShowCancelDialog(false)
    setCancelReason("")
  }

  const handleRefund = () => {
    onStatusUpdate("REFUNDED")
    toast({
      title: "Refund Processed",
      description: "The refund has been initiated",
    })
    setShowRefundDialog(false)
    setRefundReason("")
  }

  const handlePrint = () => {
    // In production, this would generate a PDF or print view
    window.print()
    toast({
      title: "Print Order",
      description: "Opening print dialog...",
    })
  }

  const handleContactCustomer = () => {
    if (order.customerPhone) {
      window.location.href = `tel:${order.customerPhone}`
    }
  }

  const handleWhatsApp = () => {
    if (order.customerPhone) {
      const message = `Hi! This is regarding your order #${order.orderNumber} from our store.`
      const whatsappUrl = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {/* Primary Action */}
        {primaryTransition && (
          <Button
            onClick={() => handleStatusUpdate(primaryTransition.status)}
            disabled={isUpdating}
            className="flex-1"
          >
            <primaryTransition.icon className="h-4 w-4 mr-2" />
            {primaryTransition.label}
          </Button>
        )}

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isUpdating}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Other Status Transitions */}
            {otherTransitions.length > 0 && (
              <>
                {otherTransitions.map((transition: any) => (
                  <DropdownMenuItem
                    key={transition.status}
                    onClick={() => handleStatusUpdate(transition.status)}
                    className={transition.variant === "destructive" ? "text-destructive" : ""}
                  >
                    <transition.icon className="h-4 w-4 mr-2" />
                    {transition.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Contact Options */}
            {order.customerPhone && (
              <>
                <DropdownMenuItem onClick={handleContactCustomer}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Customer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleWhatsApp}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp Customer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Print */}
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Process Refund
            </DialogTitle>
            <DialogDescription>
              Process a refund for order #{order.orderNumber}. The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Refund Reason</Label>
              <Textarea
                id="refund-reason"
                placeholder="Enter reason for refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Order Total</span>
                <span className="font-medium">
                  ${typeof order.total === 'number' ? order.total.toFixed(2) : order.total}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Refund Amount</span>
                <span className="font-medium text-destructive">
                  -${typeof order.total === 'number' ? order.total.toFixed(2) : order.total}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={!refundReason.trim()}>
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}