"use client"

import { useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Card, ScrollArea, Badge, cn } from "@kitchencloud/ui"
import { OrderStatus } from "@kitchencloud/database"
import { RouterOutputs } from "@/lib/trpc/types"
import { KanbanCard } from "./kanban-card"


type Order = RouterOutputs["order"]["list"]["items"][0]

interface KanbanColumnProps {
  column: {
    id: OrderStatus
    title: string
    icon: any
    color: string
    acceptsFrom: OrderStatus[]
  }
  orders: Order[]
  isLoading: boolean
  isDragging?: boolean
  activeOrder?: Order | null
}

export function KanbanColumn({ column, orders, isLoading, isDragging = false, activeOrder }: KanbanColumnProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: column.id,
  })

  const orderIds = useMemo(() => orders.map(order => order.id), [orders])

  // Calculate total value
  const totalValue = useMemo(() => {
    return orders.reduce((sum, order) => {
      const value = typeof order.total === 'number' 
        ? order.total 
        : order.total?.toNumber?.() || 0
      return sum + value
    }, 0)
  }, [orders])

  // Check if this column can accept the dragging order
  const canAcceptDrop = useMemo(() => {
    if (!activeOrder) return false
    return column.acceptsFrom.includes(activeOrder.status)
  }, [activeOrder, column.acceptsFrom])

  const isValidDropTarget = isDragging && canAcceptDrop
  const isInvalidDropTarget = isDragging && !canAcceptDrop && active

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "flex h-full w-80 flex-col transition-all",
        isOver && canAcceptDrop && "ring-2 ring-primary ring-offset-2 bg-primary/5",
        isInvalidDropTarget && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "border-b p-4 transition-all",
        column.color,
        "border-0 rounded-t-lg",
        isValidDropTarget && !isOver && "opacity-75"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <column.icon className="h-5 w-5" />
            <h3 className="font-semibold">{column.title}</h3>
          </div>
          <Badge variant="secondary" className="ml-2">
            {orders.length}
          </Badge>
        </div>
        {orders.length > 0 && (
          <p className="mt-1 text-sm opacity-90">
            ${totalValue.toFixed(2)} total
          </p>
        )}
      </div>

      {/* Column Content */}
      <ScrollArea className={cn(
        "flex-1 p-2 transition-all",
        isValidDropTarget && "bg-primary/5"
      )}>
        <SortableContext
          items={orderIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orders.length === 0 ? (
              <div className={cn(
                "flex h-32 items-center justify-center rounded-lg border-2 border-dashed transition-all",
                isValidDropTarget ? "border-primary bg-primary/10" : "border-transparent",
                isInvalidDropTarget && "opacity-30"
              )}>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : isValidDropTarget ? "Drop here" : "No orders"}
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <KanbanCard key={order.id} order={order} />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </Card>
  )
}