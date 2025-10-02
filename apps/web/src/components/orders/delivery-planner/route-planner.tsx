"use client"

import { useState } from "react"
import { api } from "../../../lib/trpc/client"
import { Card, Button, Checkbox, Badge, Alert, AlertDescription } from "@homejiak/ui"
import { Navigation, MapPin, Phone, Clock, ExternalLink, Check, Package } from "lucide-react"
import { cn } from "../../../lib/utils"
import { OrderStatus } from "@homejiak/types"

export function DeliveryRoute({ date }: { date: Date }) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null)
  
  const { data: orders } = api.delivery.getDeliveryOrders.useQuery({
    date,
    status: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY]
  })
  
  const optimizeRoute = api.delivery.optimizeRoute.useMutation({
    onSuccess: (data) => setOptimizedRoute(data)
  })
  
  const markDelivered = api.delivery.markDelivered.useMutation()

  const handleOptimize = async () => {
    if (selectedOrders.length === 0) return
    await optimizeRoute.mutateAsync({
      orderIds: selectedOrders
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Today's Deliveries</h2>
            <p className="text-sm text-gray-600 mt-1">
              {orders?.orders.length || 0} orders ready for delivery
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setSelectedOrders(orders?.orders.map(o => o.id) || [])}
            >
              Select All
            </Button>
            <Button 
              onClick={handleOptimize}
              disabled={selectedOrders.length === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Plan Route ({selectedOrders.length})
            </Button>
          </div>
        </div>

        {/* Order Selection */}
        <div className="space-y-2">
          {orders?.orders.map((order) => (
            <div 
              key={order.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all",
                selectedOrders.includes(order.id) 
                  ? "border-orange-500 bg-orange-50" 
                  : "border-gray-200"
              )}
            >
              <Checkbox 
                checked={selectedOrders.includes(order.id)}
                onCheckedChange={() => toggleOrder(order.id)}
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">#{order.orderId}</span>
                  <Badge variant="outline" className="text-xs">
                    {order.customer.postalCode}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{order.customer.name}</p>
                <p className="text-xs text-gray-500">{order.customer.address}</p>
                {order.customer.unitNumber && (
                  <p className="text-xs text-gray-500">Unit: {order.customer.unitNumber}</p>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(`tel:${order.customer.phone}`, '_blank')}
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
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Optimized Route */}
      {optimizedRoute && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Optimized Route</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Navigation className="w-4 h-4" />
                <span>~{optimizedRoute.totalDistance} km</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>~{optimizedRoute.estimatedDuration} mins</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {optimizedRoute.optimizedOrder.map((stop: any) => (
              <div key={stop.orderId} className="flex items-center gap-3">
                <Badge className="w-6 h-6 p-0 flex items-center justify-center">
                  {stop.sequence}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Order #{stop.orderNumber}</p>
                  <p className="text-xs text-gray-600">{stop.address}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markDelivered.mutate({ orderId: stop.orderId })}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Alert className="mb-4">
            <Package className="w-4 h-4" />
            <AlertDescription>
              Pro tip: Open in Google Maps on your phone for turn-by-turn navigation
            </AlertDescription>
          </Alert>

          <Button 
            onClick={openInGoogleMaps}
            className="w-full"
            variant="default"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Route in Google Maps
          </Button>
        </Card>
      )}
    </div>
  )
}