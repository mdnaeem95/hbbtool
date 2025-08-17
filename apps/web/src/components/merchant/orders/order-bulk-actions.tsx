"use client"

import { Button, Card } from "@kitchencloud/ui"
import { X } from "lucide-react"

interface OrderBulkActionsProps {
  selectedCount: number
  selectedOrders: string[]
  onComplete: () => void
}

export function OrderBulkActions({
  selectedCount,
  onComplete,
}: OrderBulkActionsProps) {
  return (
    <Card className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? 'order' : 'orders'} selected
        </span>
        <Button variant="outline" size="sm">
          Update Status
        </Button>
        <Button variant="outline" size="sm">
          Export
        </Button>
        <Button variant="outline" size="sm">
          Print Labels
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onComplete}
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  )
}