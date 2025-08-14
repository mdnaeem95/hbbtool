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
import { api } from '../providers/trpc-provider'


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
                deliveryMethod === 'DELIVERY' ? "border-primary ring-2 ring-primary" : "border-gray-200"
              )}
            >
              <RadioGroupItem value="DELIVERY" id="delivery" className="sr-only" />
              <div className="flex flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    <span className="block text-sm font-medium text-gray-900">
                      Delivery
                    </span>
                  </div>
                  <span className="mt-1 flex items-center text-sm text-gray-500">
                    Get it delivered to your doorstep
                  </span>
                  {deliveryFee !== null && (
                    <span className="mt-2 text-sm font-medium text-primary">
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
                deliveryMethod === 'PICKUP' ? "border-primary ring-2 ring-primary" : "border-gray-200"
              )}
            >
              <RadioGroupItem value="PICKUP" id="pickup" className="sr-only" />
              <div className="flex flex-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="block text-sm font-medium text-gray-900">
                      Self Pickup
                    </span>
                  </div>
                  <span className="mt-1 flex items-center text-sm text-gray-500">
                    Collect from merchant location
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
        <div className="space-y-4 pt-4">
          <h3 className="font-medium">Delivery Address</h3>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="address1">Address Line 1 *</Label>
              <Input
                id="address1"
                placeholder="Block/Street name"
                value={deliveryAddress?.line1 || ''}
                onChange={(e) => setDeliveryAddress({ 
                  ...deliveryAddress, 
                  line1: e.target.value 
                })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                placeholder="Unit number (optional)"
                value={deliveryAddress?.line2 || ''}
                onChange={(e) => setDeliveryAddress({ 
                  ...deliveryAddress, 
                  line2: e.target.value 
                })}
              />
            </div>
            
            <div>
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                placeholder="123456"
                maxLength={6}
                value={deliveryAddress?.postalCode || ''}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                required
              />
              {calculatingFee && (
                <p className="text-sm text-muted-foreground mt-1">
                  Calculating delivery fee...
                </p>
              )}
              {estimatedTime && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Estimated delivery time: {estimatedTime} minutes
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="deliveryNotes">Delivery Instructions</Label>
              <Textarea
                id="deliveryNotes"
                placeholder="Any special instructions for delivery"
                rows={3}
                value={deliveryAddress?.notes || ''}
                onChange={(e: any) => setDeliveryAddress({ 
                  ...deliveryAddress, 
                  notes: e.target.value 
                })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pickup Information */}
      {deliveryMethod === 'PICKUP' && merchantAddress && (
        <div className="space-y-4 pt-4">
          <h3 className="font-medium">Pickup Location</h3>
          
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Pickup Address:</p>
              <p className="mt-1">{merchantAddress}</p>
            </AlertDescription>
          </Alert>
          
          <div>
            <Label htmlFor="pickupNotes">Pickup Notes</Label>
            <Textarea
              id="pickupNotes"
              placeholder="Any special requests for pickup"
              rows={3}
              value={pickupNotes || ''}
              onChange={(e: any) => setPickupNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}