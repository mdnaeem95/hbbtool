"use client"

import { useState } from "react"
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
  cn,
  Alert,
  AlertDescription,
} from "@kitchencloud/ui"
import {
  X,
  Download,
  Printer,
  TruckIcon,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { OrderStatus } from "@kitchencloud/database/types"
import { api } from "@/lib/trpc/client"

interface OrderBulkActionsProps {
  selectedCount: number
  selectedOrders: string[]
  onComplete: () => void
}

const BULK_STATUS_OPTIONS = [
  { value: OrderStatus.CONFIRMED, label: "Confirm Orders", icon: CheckCircle },
  { value: OrderStatus.PREPARING, label: "Start Preparing", icon: TruckIcon },
  { value: OrderStatus.READY, label: "Mark as Ready", icon: CheckCircle },
  { value: OrderStatus.CANCELLED, label: "Cancel Orders", icon: AlertTriangle },
] as const

export function OrderBulkActions({
  selectedCount,
  selectedOrders,
  onComplete,
}: OrderBulkActionsProps) {
  const { toast } = useToast()
  const utils = api.useUtils()
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "">("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Bulk status update mutation
  const bulkUpdateStatus = api.order.bulkUpdateStatus.useMutation({
    onSuccess: (result: any) => {
      toast({
        title: "Orders Updated",
        description: `Successfully updated ${result.successCount} of ${result.totalCount} orders`,
      })
      utils.order.list.invalidate()
      onComplete()
      setShowStatusDialog(false)
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update orders",
        variant: "destructive",
      })
    },
  })

  // Export orders mutation
  const exportOrders = api.order.export.useMutation({
    onSuccess: (data: any) => {
      // Create and download CSV
      const blob = new Blob([data.csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `orders-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Export Complete",
        description: `Exported ${data.count} orders`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export orders",
        variant: "destructive",
      })
    },
  })

  const handleBulkStatusUpdate = async () => {
    if (!selectedStatus) return
    
    setIsProcessing(true)
    await bulkUpdateStatus.mutateAsync({
      orderIds: selectedOrders,
      status: selectedStatus,
    })
    setIsProcessing(false)
  }

  const handleExport = async () => {
    setExportLoading(true)
    await exportOrders.mutateAsync({
      orderIds: selectedOrders,
    })
    setExportLoading(false)
  }

  const handlePrint = () => {
    // Open print view in new window
    const printWindow = window.open(
      `/dashboard/orders/print?ids=${selectedOrders.join(",")}`,
      "_blank",
      "width=800,height=600"
    )
    
    if (printWindow) {
      toast({
        title: "Print Preview",
        description: "Opening print preview...",
      })
    }
  }

  return (
    <>
      <Card className="flex items-center justify-between p-4 mb-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "order" : "orders"} selected
          </span>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusDialog(true)}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Update Status
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportLoading}
              className="gap-2"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Orders
            </Button>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onComplete}
          className="hover:bg-primary/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </Card>

      {/* Bulk Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of {selectedCount} selected{" "}
              {selectedCount === 1 ? "order" : "orders"}. Only orders with valid
              status transitions will be updated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {BULK_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon
                        className={cn(
                          "h-4 w-4",
                          option.value === OrderStatus.CANCELLED
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedStatus === OrderStatus.CANCELLED && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Cancelled orders cannot be reversed. Make sure you want to
                  cancel these orders.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkStatusUpdate}
              disabled={!selectedStatus || isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update {selectedCount} {selectedCount === 1 ? "Order" : "Orders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}