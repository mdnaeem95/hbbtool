"use client"

import { useState } from "react"
import { Button, Card, Dialog, DialogTrigger, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast, cn, Alert, AlertDescription } from "@homejiak/ui"
import { X, Download, Printer, TruckIcon, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import { OrderStatus } from "@homejiak/types"
import { api } from "../../../lib/trpc/client"

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
        description: `Exported ${data.count} orders to CSV`,
      })
      setExportLoading(false)
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export orders",
        variant: "destructive",
      })
      setExportLoading(false)
    },
  })

  const handleExport = async () => {
    setExportLoading(true)
    await exportOrders.mutateAsync({
      orderIds: selectedOrders,
    })
  }

  const handlePrint = () => {
    const orderIds = selectedOrders.join(",")
    window.open(`/dashboard/orders/print?ids=${orderIds}`, "_blank")
  }

  const handleBulkStatusUpdate = async () => {
    if (!selectedStatus) return
    
    setIsProcessing(true)
    await bulkUpdateStatus.mutateAsync({
      orderIds: selectedOrders,
      status: selectedStatus as OrderStatus,
    })
    setIsProcessing(false)
  }

  return (
    <>
      <Card className="mb-6 border-orange-200 bg-orange-50/50 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-medium text-orange-700">
                {selectedCount}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {selectedCount} {selectedCount === 1 ? "order" : "orders"} selected
              </span>
            </div>
            
            {/* Action Buttons with Enhanced Hover Effects */}
            <div className="flex gap-2">
              {/* Update Status with DialogTrigger */}
              <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className={cn(
                      "gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm",
                      "transform transition-all duration-200 ease-in-out",
                      "hover:scale-105 hover:shadow-md",
                      "focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                      "active:scale-95"
                    )}
                  >
                    <CheckCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Update Status
                  </Button>
                </DialogTrigger>
                
                <DialogContent 
                  className="sm:max-w-md"
                >
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                      Update Order Status
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 leading-relaxed">
                      Change the status of <span className="font-medium text-gray-900">{selectedCount} selected{" "}
                      {selectedCount === 1 ? "order" : "orders"}</span>. Only orders with valid
                      status transitions will be updated.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-900">
                        New Status
                      </label>
                      <Select
                        value={selectedStatus}
                        onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
                      >
                        <SelectTrigger className="w-full h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                          <SelectValue 
                            placeholder="Select new status"
                            className="text-gray-500"
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white border shadow-lg z-[10000]">
                          {BULK_STATUS_OPTIONS.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value}
                              className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <option.icon
                                  className={cn(
                                    "h-4 w-4",
                                    option.value === OrderStatus.CANCELLED
                                      ? "text-red-500"
                                      : "text-gray-400"
                                  )}
                                />
                                <span className="font-medium">
                                  {option.label}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedStatus === OrderStatus.CANCELLED && (
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 text-sm leading-relaxed">
                          <strong>Warning:</strong> Cancelled orders cannot be reversed. Make sure you want to
                          cancel these orders before proceeding.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <DialogFooter className="gap-3 pt-6 border-t border-gray-100">
                    <Button
                      variant="outline"
                      onClick={() => setShowStatusDialog(false)}
                      disabled={isProcessing}
                      className="px-6 py-2 h-10 border-gray-300 hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkStatusUpdate}
                      disabled={!selectedStatus || isProcessing}
                      className="px-6 py-2 h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm"
                    >
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update {selectedCount} {selectedCount === 1 ? "Order" : "Orders"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exportLoading}
                className={cn(
                  "gap-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
                  "transform transition-all duration-200 ease-in-out",
                  "hover:scale-105 hover:shadow-sm hover:border-gray-400",
                  "focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                  "active:scale-95",
                  "disabled:hover:scale-100 disabled:hover:shadow-none"
                )}
              >
                {exportLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:-translate-y-0.5" />
                )}
                Export CSV
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className={cn(
                  "gap-2 border-gray-300 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700",
                  "transform transition-all duration-200 ease-in-out",
                  "hover:scale-105 hover:shadow-sm hover:border-blue-300",
                  "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "active:scale-95"
                )}
              >
                <Printer className="h-4 w-4 transition-all duration-200 group-hover:scale-110 group-hover:text-blue-600" />
                Print Orders
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onComplete}
            className={cn(
              "h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600",
              "transform transition-all duration-200 ease-in-out",
              "hover:scale-110 hover:rotate-90",
              "focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
              "active:scale-95"
            )}
          >
            <X className="h-4 w-4 transition-transform duration-200" />
          </Button>
        </div>
      </Card>
    </>
  )
}