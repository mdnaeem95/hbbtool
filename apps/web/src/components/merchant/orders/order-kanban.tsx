"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from "@dnd-kit/core"
import { ScrollArea } from "@kitchencloud/ui"
import { Package, Clock, ChefHat, Truck, CheckCircle } from "lucide-react"
import { OrderStatus } from "@kitchencloud/database"
import { RouterOutputs } from "@/lib/trpc/types"
import { api } from "@/lib/trpc/client"
import { useOrderStore } from "@/stores/order-store"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard } from "./kanban-card"

type Order = RouterOutputs["order"]["list"]["items"][0]

interface OrderKanbanProps {
  orders: Order[]
  isLoading: boolean
}

// Define column configuration
const KANBAN_COLUMNS: {
  id: OrderStatus
  title: string
  icon: any
  color: string
  acceptsFrom: OrderStatus[]
}[] = [
  {
    id: "PENDING",
    title: "Pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    acceptsFrom: [],
  },
  {
    id: "CONFIRMED",
    title: "Confirmed",
    icon: CheckCircle,
    color: "bg-blue-100 text-blue-800 border-blue-300",
    acceptsFrom: ["PENDING"],
  },
  {
    id: "PREPARING",
    title: "Preparing",
    icon: ChefHat,
    color: "bg-purple-100 text-purple-800 border-purple-300",
    acceptsFrom: ["CONFIRMED"],
  },
  {
    id: "READY",
    title: "Ready",
    icon: Package,
    color: "bg-green-100 text-green-800 border-green-300",
    acceptsFrom: ["CONFIRMED", "PREPARING"],
  },
  {
    id: "OUT_FOR_DELIVERY",
    title: "Out for Delivery",
    icon: Truck,
    color: "bg-orange-100 text-orange-800 border-orange-300",
    acceptsFrom: ["READY"],
  },
  {
    id: "COMPLETED",
    title: "Completed",
    icon: CheckCircle,
    color: "bg-gray-100 text-gray-800 border-gray-300",
    acceptsFrom: ["READY", "OUT_FOR_DELIVERY", "DELIVERED"],
  },
]

export function OrderKanban({ orders, isLoading }: OrderKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { addOptimisticUpdate, removeOptimisticUpdate } = useOrderStore()
  const utils = api.useUtils()

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped = KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = []
      return acc
    }, {} as Record<OrderStatus, Order[]>)

    orders.forEach((order) => {
      const status = order.status as OrderStatus
      if (grouped[status]) {
        grouped[status].push(order)
      }
    })

    return grouped
  }, [orders])

  // Update order status mutation
  const updateStatus = api.order.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      // Optimistic update
      addOptimisticUpdate(id, { status })
      
      // Cancel outgoing refetches
      await utils.order.list.cancel()
      
      // Snapshot previous values
      const previousData = utils.order.list.getData()
      
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
      
      return { previousData }
    },
    onError: (err, variables, context) => {
      // Revert optimistic update
      removeOptimisticUpdate(variables.id)
      if (context?.previousData) {
        const currentListInput = utils.order.list.getData() as any
        if (currentListInput) {
          utils.order.list.setData(currentListInput, context.previousData)
        }
      }
      if (err) {
        console.log(err)
      }
    },
    onSettled: (_, __, variables) => {
      removeOptimisticUpdate(variables.id)
      // Refetch to ensure consistency
      utils.order.list.invalidate()
    },
  })

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Find the active order being dragged
  const activeOrder = useMemo(
    () => orders.find((order) => order.id === activeId),
    [activeId, orders]
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) {
      setActiveId(null)
      return
    }

    const orderId = active.id as string
    const newStatus = over.id as OrderStatus
    const order = orders.find(o => o.id === orderId)
    
    if (!order || order.status === newStatus) {
      setActiveId(null)
      return
    }

    // Check if the transition is allowed
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === newStatus)
    if (!targetColumn?.acceptsFrom.includes(order.status)) {
      setActiveId(null)
      return
    }

    // Update the order status
    updateStatus.mutate({
      id: orderId,
      status: newStatus,
    })

    setActiveId(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over) return
    
    const orderId = active.id as string
    const targetStatus = over.id as OrderStatus
    const order = orders.find(o => o.id === orderId)
    
    if (!order) return
    
    // Check if the transition is allowed
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === targetStatus)
    if (!targetColumn?.acceptsFrom.includes(order.status)) {
      // Show visual feedback that this is not allowed
      return
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Loading orders...</div>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      <ScrollArea className="h-[calc(100vh-16rem)] w-full">
        <div className="flex gap-4 p-1 min-w-max">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              orders={ordersByStatus[column.id] || []}
              isLoading={isLoading}
              isDragging={!!activeId}
              activeOrder={activeOrder}
            />
          ))}
        </div>
      </ScrollArea>

      <DragOverlay>
        {activeOrder ? (
          <div className="rotate-3 cursor-grabbing">
            <KanbanCard order={activeOrder} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}