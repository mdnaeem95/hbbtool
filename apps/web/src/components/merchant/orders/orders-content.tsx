"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "@/lib/trpc/client"
import { Alert, AlertDescription, AlertTitle } from "@kitchencloud/ui"
import { AlertCircle } from "lucide-react"
import { OrderStatus } from "@kitchencloud/database"
import { OrderFilters } from "./order-filters"
import { OrderList } from "./order-list"
import { useOrderStore } from "@/stores/order-store"
import { ViewModeToggle } from "./view-mode-toggle"
import { OrderKanban } from "./order-kanban"
import { OrderNotification } from "./order-notification"

export function OrdersContent() {
  const searchParams = useSearchParams()
  const { viewMode } = useOrderStore()
  
  // Parse filters from URL
  const initialStatus = searchParams.get("status") as OrderStatus | null
  const [filters, setFilters] = useState({
    status: initialStatus,
    search: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  })
  
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch orders with filters
  const { data, isLoading, error } = api.order.list.useQuery({
    page,
    limit,
    status: filters.status || undefined,
    search: filters.search || undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading orders</AlertTitle>
          <AlertDescription>
            {error.message || "Something went wrong. Please try refreshing the page."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all your orders in one place
          </p>
        </div>
        <ViewModeToggle />
      </div>

      {/* Filters */}
      <OrderFilters
        filters={filters}
        onFiltersChange={setFilters}
        orderCount={data?.pagination.total}
        isLoading={isLoading}
      />

      {/* Orders View */}
      {viewMode === "list" ? (
        <OrderList
          orders={data?.items || []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.pagination.totalPages || 1}
          onPageChange={setPage}
        />
      ) : (
        <OrderKanban
          orders={data?.items || []}
          isLoading={isLoading}
        />
      )}

      <OrderNotification />
    </div>
  )
}