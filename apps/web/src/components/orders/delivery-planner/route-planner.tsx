"use client"

import { useState } from "react"
import { DndContext } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { api } from "../../../lib/trpc/client"
import { Card, Button } from "@homejiak/ui"
import { Navigation } from "lucide-react"
import { DeliveryMap } from "./delivery-map"
import { RouteCard } from "./route-card"

export function DeliveryRoutePlanner({ date }: { date: Date }) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  const [optimizationMode, setOptimizationMode] = useState<"time" | "distance" | "fuel">("time")
  
  // Fetch delivery orders for the date
  const { data: deliveryOrders } = api.delivery.getDeliveryOrders.useQuery({
    date,
    status: ["CONFIRMED", "PREPARING", "READY"]
  })
  
  // Generate optimized routes
  const { data: routes, mutate: optimizeRoutes } = api.delivery.optimizeRoutes.useMutation()
  
  const handleOptimizeRoutes = async () => {
    const result = await optimizeRoutes({
      orders: deliveryOrders,
      mode: optimizationMode,
      constraints: {
        maxStopsPerRoute: 15,
        maxDurationPerRoute: 480, // 8 hours
        startLocation: merchantLocation,
        endLocation: merchantLocation, // Return to base
        breakDuration: 30, // 30 min break
        averageStopDuration: 10,
        trafficMultiplier: getTrafficMultiplier(date), // Peak hour consideration
      }
    })
    
    setSelectedRoute(result.routes[0]?.id)
  }
  
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Left Panel - Routes List */}
      <div className="xl:col-span-1 space-y-4 overflow-y-auto">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Delivery Routes</h3>
            <Button 
              onClick={handleOptimizeRoutes}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Optimize Routes
            </Button>
          </div>
          
          {/* Optimization Settings */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700">Optimize for:</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["time", "distance", "fuel"].map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={optimizationMode === mode ? "default" : "outline"}
                  onClick={() => setOptimizationMode(mode as any)}
                  className="capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Routes */}
          <DndContext onDragEnd={handleDragEnd}>
            <SortableContext 
              items={routes?.routes || []}
              strategy={verticalListSortingStrategy}
            >
              {routes?.routes.map((route, index) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  index={index + 1}
                  isSelected={selectedRoute === route.id}
                  onClick={() => setSelectedRoute(route.id)}
                  onAssignDriver={(driverId) => assignDriver(route.id, driverId)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Card>
        
        {/* Unassigned Orders */}
        {deliveryOrders?.unassigned?.length > 0 && (
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-red-600">
              Unassigned Orders ({deliveryOrders.unassigned.length})
            </h4>
            <div className="space-y-2">
              {deliveryOrders.unassigned.map((order) => (
                <UnassignedOrderCard 
                  key={order.id} 
                  order={order}
                  onAssign={(routeId) => assignToRoute(order.id, routeId)}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
      
      {/* Right Panel - Map */}
      <div className="xl:col-span-2">
        <Card className="h-full p-0 overflow-hidden">
          <DeliveryMap
            routes={routes?.routes || []}
            selectedRoute={selectedRoute}
            onMarkerClick={(orderId) => showOrderDetails(orderId)}
            trafficLayer={true}
            heatmapLayer={optimizationMode === "time"}
          />
        </Card>
      </div>
    </div>
  )
}