"use client"

import { useOrderStore } from "@/stores/order-store"
import { ToggleGroup, ToggleGroupItem } from "@kitchencloud/ui"
import { List, LayoutGrid } from "lucide-react"

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useOrderStore()

  return (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(value: any) => value && setViewMode(value as 'list' | 'kanban')}
      className="border rounded-md"
    >
      <ToggleGroupItem value="list" aria-label="List view">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="kanban" aria-label="Kanban view">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}