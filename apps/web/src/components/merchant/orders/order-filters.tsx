"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Input, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Popover, PopoverContent, PopoverTrigger, Badge } from "@kitchencloud/ui"
import { Search, X, Calendar, Download } from "lucide-react"
import { OrderStatus } from "@kitchencloud/database/types"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@kitchencloud/ui"
import "./order-filters.css"

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
    if (!date) {
      // If clearing a date
      onFiltersChange({
        ...filters,
        dateFrom: type === "from" ? undefined : filters.dateFrom,
        dateTo: type === "to" ? undefined : filters.dateTo,
      })
      return
    }

    if (type === "from") {
      // If setting from date, ensure it's not after the to date
      if (filters.dateTo && date > filters.dateTo) {
        // Auto-adjust the to date to be the same as from date
        onFiltersChange({
          ...filters,
          dateFrom: date,
          dateTo: date,
        })
      } else {
        onFiltersChange({
          ...filters,
          dateFrom: date,
        })
      }
    } else {
      // If setting to date, ensure it's not before the from date
      if (filters.dateFrom && date < filters.dateFrom) {
        // Auto-adjust the from date to be the same as to date
        onFiltersChange({
          ...filters,
          dateFrom: date,
          dateTo: date,
        })
      } else {
        onFiltersChange({
          ...filters,
          dateTo: date,
        })
      }
    }
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
              onChange={(e: any) => handleSearch(e.target.value)}
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
              <Button variant="outline" size="sm" className="gap-2 hover:bg-muted hover:border-gray-300 transition-all">
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
            <PopoverContent className="w-auto p-4 bg-white shadow-lg border" align="end">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("today")}
                    className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("yesterday")}
                    className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("thisWeek")}
                    className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateFilter("thisMonth")}
                    className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  >
                    This Month
                  </Button>
                </div>
                <div className="grid gap-4">
                  <div className="bg-white rounded-lg">
                    <label className="text-sm font-medium mb-2 block">From</label>
                    <div className="bg-white rounded-md border p-3">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date: any) => handleDateChange("from", date)}
                        disabled={(date: any) => {
                          // disabled future
                          if (date > new Date()) return true
                          // if there's a to date, disable dates after it
                          if (filters.dateTo && date > filters.dateTo) return true
                          return false
                        }}
                        modifiers={{
                          selected: filters.dateFrom,
                          range_start: filters.dateFrom,
                          range_end: filters.dateTo,
                          range_middle: filters.dateFrom && filters.dateTo ? {
                            after: filters.dateFrom,
                            before: filters.dateTo,
                          } : undefined,
                        }}
                        modifiersStyles={{
                          range_start: {
                            backgroundColor: '#FF6B35',
                            color: 'white',
                            borderRadius: '6px 0 0 6px',
                          },
                          range_end: {
                            backgroundColor: '#FF6B35',
                            color: 'white',
                            borderRadius: '0 6px 6px 0',
                          },
                          range_middle: {
                            backgroundColor: '#FFF5F1',
                          },
                          selected: {
                            backgroundColor: filters.dateTo ? 'transparent' : '#FF6B35',
                            color: filters.dateTo ? 'inherit' : 'white',
                            borderRadius: filters.dateTo ? '0' : '6px',
                          },
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg">
                    <label className="text-sm font-medium mb-2 block">To</label>
                    <div className="bg-white rounded-md border p-3">
                      <CalendarComponent
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date: any) => handleDateChange("to", date)}
                        disabled={(date: any) => {
                          // Disable future dates
                          if (date > new Date()) return true
                          // If there's a from date, disable dates before it
                          if (filters.dateFrom && date < filters.dateFrom) return true
                          return false
                        }}
                        modifiers={{
                          selected: filters.dateTo,
                          range_start: filters.dateFrom,
                          range_end: filters.dateTo,
                          range_middle: filters.dateFrom && filters.dateTo ? {
                            after: filters.dateFrom,
                            before: filters.dateTo,
                          } : undefined,
                        }}
                        modifiersStyles={{
                          range_start: {
                            backgroundColor: '#FF6B35',
                            color: 'white',
                            borderRadius: '6px 0 0 6px',
                          },
                          range_end: {
                            backgroundColor: '#FF6B35',
                            color: 'white',
                            borderRadius: '0 6px 6px 0',
                          },
                          range_middle: {
                            backgroundColor: '#FFF5F1',
                          },
                          selected: {
                            backgroundColor: filters.dateFrom ? 'transparent' : '#FF6B35',
                            color: filters.dateFrom ? 'inherit' : 'white',
                            borderRadius: filters.dateFrom ? '0' : '6px',
                          },
                        }}
                      />
                      </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" className="gap-2 hover:bg-muted hover:border-gray-300 transition-all">
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
                className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
                onClick={() => handleStatusChange("all")}
              />
            </Badge>
          )}
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
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
                className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors"
                onClick={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ status: null, search: "", dateFrom: undefined, dateTo: undefined })}
            className="hover:bg-red-50 hover:text-red-600"
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