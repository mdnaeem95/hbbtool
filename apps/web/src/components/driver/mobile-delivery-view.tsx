import { Alert, AlertDescription, Badge, Button, Sheet, SheetContent } from "@homejiak/ui"
import { api } from "../../lib/trpc/client"
import { useState } from "react"
import { AlertCircle, Check, Navigation, Phone } from "lucide-react"

export function MobileDeliveryView() {
  const [currentStop, setCurrentStop] = useState(0)
  const { data: route } = api.delivery.getAssignedRoute.useQuery()
  const updateStatus = api.delivery.updateDeliveryStatus.useMutation()
  
  const stop = route?.stops[currentStop]
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold">Stop {currentStop + 1} of {route?.stops.length}</h1>
          <Badge>{stop?.estimatedArrival}</Badge>
        </div>
      </div>
      
      {/* Map */}
      <div className="flex-1 relative">
        <NavigationMap
          destination={stop?.coordinates}
          onArrival={() => updateStatus.mutate({ 
            orderId: stop.orderId, 
            status: "arrived" 
          })}
        />
        
        {/* Bottom Sheet */}
        <Sheet>
          <SheetContent side="bottom" className="h-[40vh]">
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-orange-50 rounded-lg p-3">
                <h3 className="font-semibold">{stop?.customer.name}</h3>
                <p className="text-sm text-gray-600">{stop?.customer.address}</p>
                {stop?.customer.unitNumber && (
                  <p className="text-sm font-medium">Unit: {stop.customer.unitNumber}</p>
                )}
                {stop?.customer.deliveryNotes && (
                  <Alert className="mt-2">
                    <AlertDescription className="text-sm">
                      {stop.customer.deliveryNotes}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = `tel:${stop?.customer.phone}`}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Customer
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => openInWaze(stop?.coordinates)}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Open in Waze
                </Button>
              </div>
              
              {/* Order Items */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Order Items</h4>
                {stop?.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-medium">x{item.quantity}</span>
                  </div>
                ))}
              </div>
              
              {/* Delivery Actions */}
              <div className="space-y-2">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => completeDelivery()}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Delivered
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => reportIssue()}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}