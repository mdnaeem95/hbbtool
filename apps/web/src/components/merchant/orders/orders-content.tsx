"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { api } from "../../../lib/trpc/client"
import { Alert, AlertDescription, AlertTitle, Tabs, TabsContent, TabsList, TabsTrigger, Badge, cn } from "@homejiak/ui"
import { AlertCircle, Truck, Package, Calendar, Navigation } from "lucide-react"
import { OrderStatus } from "@homejiak/types"
import { OrderFilters } from "./order-filters"
import { OrderList } from "./order-list"
import { OrderNotification } from "./order-notification"
import { DeliveryRoute } from "./route-planner"
import { format } from "date-fns"

export function OrdersContent() {
  const searchParams = useSearchParams()
  
  // Parse filters from URL
  const initialStatus = searchParams.get("status") as OrderStatus | null
  const initialTab = searchParams.get("tab") || "all"
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filters, setFilters] = useState({
    status: initialStatus,
    search: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  })
  
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch all orders
  const { data: allOrdersData, isLoading: allOrdersLoading, error: allOrdersError } = api.order.list.useQuery({
    page,
    limit,
    status: filters.status || undefined,
    search: filters.search || undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: "createdAt",
    sortOrder: "desc",
  })

  // Fetch delivery orders count for badge
  const { data: deliveryStats } = api.delivery.getDeliveryOrders.useQuery({
    date: selectedDate,
    status: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY]
  })

  const deliveryCount = deliveryStats?.orders?.length || 0

  if (allOrdersError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading orders</AlertTitle>
          <AlertDescription>
            {allOrdersError.message || "Something went wrong. Please try refreshing the page."}
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
            Manage orders and plan delivery routes
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          {deliveryCount > 0 && (
            <Badge 
              variant="outline" 
              className="px-3 py-1 bg-orange-50 text-orange-700 border-orange-200"
            >
              <Truck className="w-4 h-4 mr-1" />
              {deliveryCount} ready for delivery
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs for All Orders vs Delivery Planning */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="all" 
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              "hover:bg-gray-50",
              "data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
            )}
          >
            <Package className="w-4 h-4" />
            All Orders
          </TabsTrigger>
          <TabsTrigger 
            value="delivery" 
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all relative",
              "hover:bg-gray-50",
              "data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
            )}
          >
            <Navigation className="w-4 h-4" />
            Delivery Routes
            {deliveryCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-medium text-white">
                {deliveryCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Orders Tab */}
        <TabsContent value="all" className="flex-1 flex flex-col mt-6">
          {/* Filters */}
          <OrderFilters
            filters={filters}
            onFiltersChange={setFilters}
            orderCount={allOrdersData?.pagination.total}
            isLoading={allOrdersLoading}
          />

          {/* Orders Table */}
          <div className="mt-6">
            <OrderList
              orders={allOrdersData?.items || []}
              isLoading={allOrdersLoading}
              page={page}
              totalPages={allOrdersData?.pagination.totalPages || 1}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>

        {/* Delivery Planning Tab */}
        <TabsContent value="delivery" className="flex-1 mt-6">
          {/* Date Selector */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-medium">Planning deliveries for:</span>
            </div>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className={cn(
                "px-3 py-1.5 border rounded-md text-sm",
                "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              )}
            />
            {selectedDate.toDateString() === new Date().toDateString() && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                Today
              </Badge>
            )}
          </div>

          {/* Delivery Route Planner Component */}
          <DeliveryRoute date={selectedDate} />
        </TabsContent>
      </Tabs>

      {/* Order Notifications */}
      <OrderNotification />
    </div>
  )
}