import { Alert, AlertDescription, Badge, Button } from "@homejiak/ui"
import { AlertCircle, Clock, Navigation, Package, Users } from "lucide-react"
import { useState } from "react"

export function RouteCard({ route, index, isSelected, onClick, onAssignDriver }) {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            getRouteColor(index)
          }`}>
            {index}
          </div>
          <h4 className="font-semibold">Route {index}</h4>
          {route.driver && (
            <Badge variant="outline" className="ml-2">
              <Users className="w-3 h-3 mr-1" />
              {route.driver.name}
            </Badge>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            setShowDetails(!showDetails)
          }}
        >
          {showDetails ? "Hide" : "Show"} Details
        </Button>
      </div>
      
      {/* Route Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded">
          <Package className="w-4 h-4 mx-auto text-gray-600 mb-1" />
          <p className="text-lg font-semibold">{route.stops.length}</p>
          <p className="text-xs text-gray-500">Stops</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <Clock className="w-4 h-4 mx-auto text-gray-600 mb-1" />
          <p className="text-lg font-semibold">{formatDuration(route.estimatedDuration)}</p>
          <p className="text-xs text-gray-500">Duration</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <Navigation className="w-4 h-4 mx-auto text-gray-600 mb-1" />
          <p className="text-lg font-semibold">{route.totalDistance.toFixed(1)}km</p>
          <p className="text-xs text-gray-500">Distance</p>
        </div>
      </div>
      
      {/* Time Windows Alert */}
      {route.hasTimeConstraints && (
        <Alert className="mb-3 p-2">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            {route.timeConstraintCount} orders with specific time windows
          </AlertDescription>
        </Alert>
      )}
      
      {/* Driver Assignment */}
      <DriverSelector 
        currentDriver={route.driver}
        availableDrivers={availableDrivers}
        onAssign={onAssignDriver}
        estimatedCost={route.estimatedDeliveryCost}
      />
      
      {/* Detailed Stops List */}
      {showDetails && (
        <div className="mt-4 space-y-2 border-t pt-3">
          {route.stops.map((stop, idx) => (
            <StopCard 
              key={stop.id} 
              stop={stop} 
              index={idx + 1}
              estimatedArrival={stop.estimatedArrival}
              onReorder={(newIndex) => reorderStop(route.id, idx, newIndex)}
            />
          ))}
        </div>
      )}
      
      {/* Route Actions */}
      <div className="flex gap-2 mt-4">
        <Button 
          size="sm" 
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation()
            startNavigation(route.id)
          }}
        >
          Start Route
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            exportRoute(route.id)
          }}
        >
          Export
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            shareRoute(route.id)
          }}
        >
          Share
        </Button>
      </div>
    </div>
  )
}