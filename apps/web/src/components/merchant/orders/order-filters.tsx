"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
} from "@kitchencloud/ui"
import { Search, X, Calendar, Download } from "lucide-react"
import { OrderStatus } from "@kitchencloud/database/types"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@kitchencloud/ui"

interface OrderFiltersProps {
  filters: {
    status: OrderStatus | null
    search: string
    dateFrom?: Date
    dateTo?: Date
  }
  onFiltersChange: (filters: any) => void
  orderCount?: number
  isLoading: boolean
}

const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
  { value: OrderStatus.PENDING, label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: OrderStatus.CONFIRMED, label: "Confirmed", color: "bg-blue-100 text-blue-800" },
  { value: OrderStatus.PREPARING, label: "Preparing", color: "bg-purple-100 text-purple-800" },
  { value: OrderStatus.READY, label: "Ready", color: "bg-green-100 text-green-800" },
  { value: OrderStatus.OUT_FOR_DELIVERY, label: "Out for Delivery", color: "bg-orange-100 text-orange-800" },
  { value: OrderStatus.DELIVERED, label: "Delivered", color: "bg-teal-100 text-teal-800" },
  { value: OrderStatus.COMPLETED, label: "Completed", color: "bg-gray-100 text-gray-800" },
  { value: OrderStatus.CANCELLED, label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: OrderStatus.REFUNDED, label: "Refunded", color: "bg-pink-100 text-pink-800" },
]

export function OrderFilters({
  filters,
  onFiltersChange,
  orderCount,
  isLoading,
}: OrderFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = useState(filters.search)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setSearchValue(value)
    // In production, add debounce here
    onFiltersChange({ ...filters, search: value })
  }

  // Handle status change
  const handleStatusChange = (value: string) => {
    const newStatus = value === "all" ? null : value as OrderStatus
    onFiltersChange({ ...filters, status: newStatus })
    
    // Update URL
    const params = new URLSearchParams()
    if (newStatus) params.set("status", newStatus)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Handle date range
  const handleDateChange = (type: "from" | "to", date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateFrom: type === "from" ? date : filters.dateFrom,
      dateTo: type === "to" ? date : filters.dateTo,
    })
  }

  // Quick date filters
  const setQuickDateFilter = (preset: string) => {
    const now = new Date()
    let dateFrom: Date | undefined
    let dateTo: Date | undefined

    switch (preset) {
      case "today":
        dateFrom = new Date(now.setHours(0, 0, 0, 0))
        dateTo = new Date(now.setHours(23, 59, 59, 999))
        break
      case "yesterday":
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        dateFrom = new Date(yesterday.setHours(0, 0, 0, 0))
        dateTo = new Date(yesterday.setHours(23, 59, 59, 999))
        break
      case "thisWeek":
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        dateFrom = startOfWeek
        dateTo = new Date()
        break
      case "thisMonth":
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
        dateTo = new Date()
        break
    }

    onFiltersChange({ ...filters, dateFrom, dateTo })
    setShowDatePicker(false)
  }

  // Count active filters
  const activeFilterCount = [
    filters.status,
    filters.search,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search and Status */}
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${option.color.split(" ")[0]}`} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Filter and Export */}
        <div className="flex gap-2">
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {filters.dateFrom || filters.dateTo ? (
                  <span className="text-xs">
                    {filters.dateFrom && format(filters.dateFrom, "MMM d")}
                    {filters.dateFrom && filters.dateTo && " - "}
                    {filters.dateTo && format(filters.dateTo, "MMM d")}
                  </span>
                ) : (
                  "Date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("today")}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("yesterday")}
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("thisWeek")}
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("thisMonth")}
                  >
                    This Month
                  </Button>
                </div>
                <div className="grid gap-2">
                  <div>
                    <label className="text-sm font-medium">From</label>
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => handleDateChange("from", date)}
                      initialFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To</label>
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => handleDateChange("to", date)}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              {statusOptions.find(s => s.value === filters.status)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusChange("all")}
              />
            </Badge>
          )}
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleSearch("")}
              />
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              {filters.dateFrom && format(filters.dateFrom, "MMM d")}
              {filters.dateFrom && filters.dateTo && " - "}
              {filters.dateTo && format(filters.dateTo, "MMM d")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ status: null, search: "", dateFrom: undefined, dateTo: undefined })}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      {!isLoading && orderCount !== undefined && (
        <p className="text-sm text-muted-foreground">
          {orderCount} {orderCount === 1 ? "order" : "orders"} found
        </p>
      )}
    </div>
  )
}