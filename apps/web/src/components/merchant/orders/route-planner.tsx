"use client"

import { useState, useMemo } from "react"
import { api } from "../../../lib/trpc/client"
import { Card, Button, Checkbox, Badge, Alert, AlertDescription, cn, useToast } from "@homejiak/ui"
import { 
  Navigation, MapPin, Phone, Clock, ExternalLink, Check, Package, 
  Truck, Users, DollarSign, AlertCircle, ChevronDown, ChevronUp,
  Copy, CheckCircle, Route
} from "lucide-react"
import { OrderStatus } from "@homejiak/types"
import { formatCurrency } from "../../../lib/utils"

interface DeliveryStop {
  sequence: number
  orderId: string
  orderNumber: string
  address: string
  postalCode: string
  unitNumber?: string
  customerName: string
  customerPhone: string
  items: Array<{ name: string; quantity: number }>
  total: number
  deliveryNotes?: string
  estimatedTime: number
  status: OrderStatus
  completed?: boolean
}

export function DeliveryRoute({ date }: { date: Date }) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null)
  const [expandedStops, setExpandedStops] = useState<Set<string>>(new Set())
  const [completedDeliveries, setCompletedDeliveries] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  
  // Fetch delivery orders
  const { data: ordersData, isLoading, refetch } = api.delivery.getDeliveryOrders.useQuery({
    date,
    status: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY]
  })

  // Mutations
  const optimizeRoute = api.delivery.optimizeRoute.useMutation({
    onSuccess: (data) => {
      setOptimizedRoute(data)
      toast({
        title: "Route Optimized!",
        description: `${data.optimizedOrder.length} stops planned. Estimated duration: ${data.estimatedDuration} mins`,
      })
    },
    onError: () => {
      toast({
        title: "Optimization Failed",
        description: "Could not optimize route. Please try again.",
        variant: "destructive"
      })
    }
  })
  
  const markDelivered = api.delivery.markDelivered.useMutation({
    onSuccess: (data) => {
      setCompletedDeliveries(prev => new Set([...prev, data.id]))
      refetch()
      toast({
        title: "Delivery Completed",
        description: `Order #${data.orderNumber} marked as delivered`,
      })
    }
  })

  // Calculate stats
  const stats = useMemo(() => {
    if (!ordersData?.orders) return { total: 0, customers: 0, revenue: 0, items: 0 }
    
    const orders = ordersData.orders
    return {
      total: orders.length,
      customers: new Set(orders.map(o => o.customer.phone)).size,
      revenue: orders.reduce((sum, o) => sum + o.total, 0),
      items: orders.reduce((sum, o) => sum + o.items.reduce((i, item) => i + item.quantity, 0), 0)
    }
  }, [ordersData])

  const handleOptimize = async () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select at least one order to plan a route",
        variant: "destructive"
      })
      return
    }
    
    await optimizeRoute.mutateAsync({
      orderIds: selectedOrders,
      // You can add merchant's base location here if available
      // startLocation: { lat: 1.3521, lng: 103.8198 } // Singapore center as default
    })
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }

  const openInGoogleMaps = () => {
    if (optimizedRoute?.googleMapsUrl) {
      window.open(optimizedRoute.googleMapsUrl, '_blank')
    }
  }

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const toggleStopExpansion = (orderId: string) => {
    setExpandedStops(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (!ordersData?.orders) return
    setSelectedOrders(ordersData.orders.map(o => o.id))
  }

  const deselectAll = () => {
    setSelectedOrders([])
  }

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-center space-y-3">
            <Truck className="w-12 h-12 mx-auto text-gray-400 animate-pulse" />
            <p className="text-gray-600">Loading delivery orders...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (!ordersData?.orders || ordersData.orders.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-center space-y-3">
            <Package className="w-12 h-12 mx-auto text-gray-400" />
            <h3 className="text-lg font-medium">No Deliveries Ready</h3>
            <p className="text-sm text-gray-600">
              No orders are ready for delivery on this date
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.customers}</p>
              <p className="text-sm text-gray-600">Unique Customers</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.items}</p>
              <p className="text-sm text-gray-600">Total Items</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Order Selection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Select Orders for Route</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose orders to include in your delivery route
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={selectedOrders.length === ordersData.orders.length ? deselectAll : selectAll}
            >
              {selectedOrders.length === ordersData.orders.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button 
              onClick={handleOptimize}
              disabled={selectedOrders.length === 0 || optimizeRoute.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Route className="w-4 h-4 mr-2" />
              Plan Route ({selectedOrders.length})
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {ordersData.orders.map((order) => {
            const isSelected = selectedOrders.includes(order.id)
            const isExpanded = expandedStops.has(order.id)
            
            return (
              <div 
                key={order.id}
                className={cn(
                  "border rounded-lg transition-all",
                  isSelected 
                    ? "border-orange-500 bg-orange-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {/* Main Row */}
                <div className="flex items-start gap-3 p-3">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleOrder(order.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">#{order.orderId}</span>
                      <Badge variant="outline" className="text-xs">
                        {order.customer.postalCode}
                      </Badge>
                      {order.status === OrderStatus.OUT_FOR_DELIVERY && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          Out for Delivery
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                    <p className="text-sm text-gray-600 truncate">{order.customer.address}</p>
                    {order.customer.unitNumber && (
                      <p className="text-sm text-gray-500">Unit: {order.customer.unitNumber}</p>
                    )}
                    
                    {order.customer.deliveryNotes && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        {order.customer.deliveryNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(`tel:${order.customer.phone}`, '_blank')}
                      title="Call customer"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const address = `${order.customer.address}, Singapore ${order.customer.postalCode}`
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
                      }}
                      title="View on map"
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleStopExpansion(order.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-3 space-y-3 border-t">
                    <div className="pt-3">
                      <h4 className="text-sm font-medium mb-2">Order Items:</h4>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{item.quantity}x {item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold">{formatCurrency(order.total)}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(order.customer.phone, "Phone number")}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Phone
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => copyToClipboard(
                          `${order.customer.address}, ${order.customer.unitNumber || ''}, Singapore ${order.customer.postalCode}`,
                          "Address"
                        )}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Address
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Optimized Route Display */}
      {optimizedRoute && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold">Optimized Delivery Route</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Navigation className="w-4 h-4" />
                  <span>~{optimizedRoute.totalDistance} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>~{optimizedRoute.estimatedDuration} mins</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{completedDeliveries.size}/{optimizedRoute.optimizedOrder.length} completed</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={openInGoogleMaps}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Maps
            </Button>
          </div>

          {/* Route Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Route Progress</span>
              <span>{Math.round((completedDeliveries.size / optimizedRoute.optimizedOrder.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(completedDeliveries.size / optimizedRoute.optimizedOrder.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Route Stops */}
          <div className="space-y-3">
            {optimizedRoute.optimizedOrder.map((stop: DeliveryStop) => {
              const isCompleted = completedDeliveries.has(stop.orderId)
              
              return (
                <div 
                  key={stop.orderId} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isCompleted 
                      ? "bg-green-50 border-green-200" 
                      : "hover:bg-gray-50 border-gray-200"
                  )}
                >
                  <Badge 
                    className={cn(
                      "w-8 h-8 p-0 flex items-center justify-center",
                      isCompleted ? "bg-green-500" : "bg-orange-500"
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : stop.sequence}
                  </Badge>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Order #{stop.orderNumber}
                      {isCompleted && <span className="text-green-600 ml-2">✓ Delivered</span>}
                    </p>
                    <p className="text-xs text-gray-600">{stop.address}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      ETA: ~{stop.estimatedTime} mins from start
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const address = `${stop.address}, Singapore ${stop.postalCode}`
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
                      }}
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                    
                    {!isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markDelivered.mutate({ orderId: stop.orderId })}
                        disabled={markDelivered.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Helper Alert */}
          <Alert className="mt-6 bg-blue-50 border-blue-200">
            <Truck className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Pro tip:</strong> Open the route in Google Maps on your phone for turn-by-turn navigation. 
              Mark each delivery as completed to track your progress.
            </AlertDescription>
          </Alert>
        </Card>
      )}
    </div>
  )
}