"use client"

import { useState } from "react"
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Textarea, cn } from "@kitchencloud/ui"
import { MoreHorizontal, Eye, CheckCircle, XCircle, ChefHat, Package, Truck, Printer, MessageSquare, Copy } from "lucide-react"
import { useToast } from "@kitchencloud/ui"
import { api } from "../../../lib/trpc/client"
import { RouterOutputs } from "../../../lib/trpc/types"
import { OrderStatus } from "@kitchencloud/database/types"
import Link from "next/link"

type Order = RouterOutputs["order"]["list"]["items"][0]

interface OrderRowActionsProps {
  order: Order
  onViewDetails: () => void
  onOrderUpdate?: () => void
}

// Define quick status transitions for dropdown
const getQuickActions = (status: OrderStatus, deliveryMethod: string) => {
  const actions = []
  
  switch (status) {
    case 'PENDING':
      actions.push(
        { id: 'confirm', label: 'Confirm Order', icon: CheckCircle, status: 'CONFIRMED' as OrderStatus, variant: 'default' },
        { id: 'cancel', label: 'Cancel', icon: XCircle, status: 'CANCELLED' as OrderStatus, variant: 'destructive' }
      )
      break
    case 'CONFIRMED':
      actions.push(
        { id: 'preparing', label: 'Start Preparing', icon: ChefHat, status: 'PREPARING' as OrderStatus, variant: 'default' },
        { id: 'ready', label: 'Mark Ready', icon: Package, status: 'READY' as OrderStatus, variant: 'default' }
      )
      break
    case 'PREPARING':
      actions.push(
        { id: 'ready', label: 'Mark Ready', icon: Package, status: 'READY' as OrderStatus, variant: 'default' }
      )
      break
    case 'READY':
      if (deliveryMethod === 'DELIVERY') {
        actions.push(
          { id: 'delivery', label: 'Out for Delivery', icon: Truck, status: 'OUT_FOR_DELIVERY' as OrderStatus, variant: 'default' }
        )
      } else {
        actions.push(
          { id: 'complete', label: 'Mark Completed', icon: CheckCircle, status: 'COMPLETED' as OrderStatus, variant: 'default' }
        )
      }
      break
    case 'OUT_FOR_DELIVERY':
      actions.push(
        { id: 'delivered', label: 'Mark Delivered', icon: CheckCircle, status: 'DELIVERED' as OrderStatus, variant: 'default' }
      )
      break
  }
  
  return actions
}

export function OrderRowActions({ order, onViewDetails, onOrderUpdate }: OrderRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const { toast } = useToast()
  const utils = api.useUtils()

  const updateStatus = api.order.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Order Updated",
        description: "Order status updated successfully",
      })
      utils.order.list.invalidate()
      onOrderUpdate?.()
    },
    onError: (error) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Failed to update order status",
        variant: "destructive",
      })
    },
  })

  const quickActions = getQuickActions(order.status as OrderStatus, order.deliveryMethod)

  const handleStatusUpdate = async (status: OrderStatus) => {
    setIsOpen(false)
    
    if (status === 'CANCELLED') {
      setShowCancelDialog(true)
      return
    }
    
    await updateStatus.mutateAsync({
      id: order.id,
      status,
    })
  }

  const handleCancel = async () => {
    setShowCancelDialog(false)
    await updateStatus.mutateAsync({
      id: order.id,
      status: 'CANCELLED' as OrderStatus,
      notes: cancelReason,
    })
    setCancelReason("")
  }

  const handlePrint = () => {
    setIsOpen(false)
    window.open(`/dashboard/orders/print?orderIds=${order.id}`, '_blank')
  }

  const handleContactCustomer = () => {
    setIsOpen(false)
    if (order.customerPhone) {
      const message = `Hi ${order.customerName || 'there'}, this is regarding your order #${order.orderNumber}.`
      const whatsappUrl = `https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    } else {
      toast({
        title: "No Phone Number",
        description: "Customer phone number not available",
        variant: "destructive",
      })
    }
  }

  const handleCopyOrderNumber = async () => {
    setIsOpen(false)
    await navigator.clipboard.writeText(order.orderNumber)
    toast({
      title: "Copied",
      description: "Order number copied to clipboard",
    })
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
          <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* View Details */}
          <DropdownMenuItem onClick={onViewDetails} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link href={`/dashboard/orders/${order.id}`} className="flex items-center">
              <Eye className="h-4 w-4 mr-4" />
              View Order Details
            </Link>
          </DropdownMenuItem>

          {/* Print Order */}
          <DropdownMenuItem onClick={handlePrint} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Printer className="h-4 w-4 mr-2" />
            Print Order
          </DropdownMenuItem>

          {/* Contact Customer */}
          {order.customerPhone && (
            <DropdownMenuItem onClick={handleContactCustomer} className="cursor-pointer hover:bg-muted/50 transition-colors">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Customer
            </DropdownMenuItem>
          )}

          {/* Copy Order Number */}
          <DropdownMenuItem onClick={handleCopyOrderNumber} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Copy className="h-4 w-4 mr-2" />
            Copy Order Number
          </DropdownMenuItem>

          {/* Quick Status Updates */}
          {quickActions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              {quickActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleStatusUpdate(action.status)}
                  disabled={updateStatus.isPending}
                  className={cn(
                    "cursor-pointer transition-colors",
                    action.variant === 'destructive' 
                      ? "destructive text-red-600 focus:text-red-600 hover:text-red-600 hover:bg-red-50" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order #{order.orderNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="e.g., Out of stock, Customer requested, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setCancelReason("")
              }}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Cancelling..." : "Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}