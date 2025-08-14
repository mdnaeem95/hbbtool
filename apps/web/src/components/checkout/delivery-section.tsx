import { useEffect, useMemo, useState } from 'react'
import { 
  RadioGroup, 
  RadioGroupItem, 
  Label, 
  Input,
  Textarea,
  Alert,
  AlertDescription, 
  cn
} from '@kitchencloud/ui'
import { Truck, Package, MapPin, Clock } from 'lucide-react'
import { useCheckoutStore } from '@/stores/checkout-store'
import { api } from '@/app/api/trpc/client'

interface DeliverySectionProps {
  merchantId: string
  merchantAddress?: string
}

export function DeliverySection({ merchantId, merchantAddress }: DeliverySectionProps) {
  const { 
    deliveryMethod, 
    setDeliveryMethod, 
    deliveryAddress, 
    setDeliveryAddress,
    pickupNotes,
    setPickupNotes
  } = useCheckoutStore()
  
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  
  // keep a simple derived value for enabling query
  const postalCode = deliveryAddress.postalCode ?? ""

  // run fee calc automatically when postal code is 6 digits
  const { data: feeData, isFetching: calculatingFee } = 
    api.checkout.calculateDeliveryFee.useQuery(
        { merchantId, postalCode },
        { enabled: postalCode.length === 6, staleTime: 60_000 }
    )

  const deliveryFee = useMemo(
    () => (feeData?.fee ?? null),
    [feeData]
  )

  useEffect(() => {
    setEstimatedTime(feeData?.estimatedTime ?? null)
  }, [feeData])

  // Calculate delivery fee when postal code changes
  const handlePostalCodeChange = async (pc: string) => {
    setDeliveryAddress({ postalCode: pc })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Delivery Method</h2>
        
        <RadioGroup
          value={deliveryMethod || ''}
          onValueChange={(value) => setDeliveryMethod(value as 'DELIVERY' | 'PICKUP')}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Delivery Option */}
            <label
              htmlFor="delivery"
              className={cn(
                "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none",
                deliveryMethod === 'DELIVERY' 
                  ? "border-primary ring-2 ring-primary" 
                  : "border-gray-300"
              )}
            >
              <RadioGroupItem value="DELIVERY" id="delivery" className="sr-only" />
              <div className="flex flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <span className="block text-sm font-medium">
                      Delivery
                    </span>
                  </div>
                  <span className="mt-1 flex items-center text-sm text-muted-foreground">
                    Get it delivered to your doorstep
                  </span>
                  {deliveryFee !== null && deliveryMethod === 'DELIVERY' && (
                    <span className="mt-2 text-sm font-medium">
                      Fee: ${deliveryFee.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </label>

            {/* Pickup Option */}
            <label
              htmlFor="pickup"
              className={cn(
                "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none",
                deliveryMethod === 'PICKUP' 
                  ? "border-primary ring-2 ring-primary" 
                  : "border-gray-300"
              )}
            >
              <RadioGroupItem value="PICKUP" id="pickup" className="sr-only" />
              <div className="flex flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="block text-sm font-medium">
                      Self Pickup
                    </span>
                  </div>
                  <span className="mt-1 flex items-center text-sm text-muted-foreground">
                    Pick up from merchant location
                  </span>
                  <span className="mt-2 text-sm font-medium text-green-600">
                    Free
                  </span>
                </div>
              </div>
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Delivery Address Form */}
      {deliveryMethod === 'DELIVERY' && (
        <div className="space-y-4">
          <h3 className="font-medium">Delivery Address</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="line1">Address Line 1</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="line1"
                  placeholder="Block/Street name"
                  value={deliveryAddress.line1 || ''}
                  onChange={(e) => setDeliveryAddress({ line1: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="line2">Address Line 2 (Optional)</Label>
              <Input
                id="line2"
                placeholder="Unit number, building name"
                value={deliveryAddress.line2 || ''}
                onChange={(e) => setDeliveryAddress({ line2: e.target.value })}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="123456"
                  value={deliveryAddress.postalCode || ''}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              
              {calculatingFee && postalCode.length === 6 && (
                <div className="flex items-end">
                  <p className="text-sm text-muted-foreground">
                    Calculating delivery fee...
                  </p>
                </div>
              )}
              
              {deliveryFee !== null && postalCode.length === 6 && (
                <div className="flex items-end">
                  <div className="text-sm">
                    <p className="font-medium">Delivery Fee: ${deliveryFee.toFixed(2)}</p>
                    {estimatedTime && (
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Est. {estimatedTime} mins
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Delivery Instructions (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="E.g., Leave at door, call upon arrival"
                value={deliveryAddress.notes || ''}
                onChange={(e) => setDeliveryAddress({ notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pickup Information */}
      {deliveryMethod === 'PICKUP' && merchantAddress && (
        <div className="space-y-4">
          <h3 className="font-medium">Pickup Location</h3>
          
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Pickup Address:</p>
              <p>{merchantAddress}</p>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="pickupNotes">Pickup Notes (Optional)</Label>
            <Textarea
              id="pickupNotes"
              placeholder="E.g., Preferred pickup time, special requests"
              value={pickupNotes || ''}
              onChange={(e) => setPickupNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  )
}