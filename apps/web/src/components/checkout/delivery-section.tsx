'use client'

import { useState, useEffect } from 'react'
import { Label, Input, Textarea, Alert, AlertDescription, cn } from '@homejiak/ui'
import { Truck, MapPin, Check, Clock, Info, Home, Mail } from 'lucide-react'
import { useCheckoutStore } from '../../stores/checkout-store'
import { api } from '../../lib/trpc/client'

interface DeliverySectionProps {
  merchantId: string
  merchantAddress?: {
    line1?: string
    line2?: string
    postalCode?: string
  }
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
  
  // Calculate fee when postal code is 6 digits
  const postalCode = deliveryAddress.postalCode ?? ""
  
  const { data: feeData, isFetching: calculatingFee } = 
    api.checkout.calculateDeliveryFee.useQuery(
      { merchantId, postalCode },
      { 
        enabled: postalCode.length === 6 && deliveryMethod === 'DELIVERY',
        staleTime: 60_000 
      }
    )

  const deliveryFee = feeData?.fee ?? 5.00 // Default to $5 if not calculated

  useEffect(() => {
    setEstimatedTime(feeData?.estimatedTime ?? 30)
  }, [feeData])

  const handlePostalCodeChange = (pc: string) => {
    // Only allow numbers and limit to 6 digits
    const cleaned = pc.replace(/\D/g, '').slice(0, 6)
    setDeliveryAddress({ postalCode: cleaned })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Choose Delivery Method
      </h2>
      <p className="text-slate-500 mb-6">
        Select how you'd like to receive your order
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Delivery Option */}
        <button
          type="button"
          onClick={() => setDeliveryMethod('DELIVERY')}
          className={cn(
            "relative rounded-xl border-2 p-6 transition-all text-left",
            deliveryMethod === 'DELIVERY' 
              ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/10" 
              : "border-slate-200 hover:border-slate-300 bg-white"
          )}
        >
          {deliveryMethod === 'DELIVERY' && (
            <div className="absolute top-4 right-4">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
              deliveryMethod === 'DELIVERY' 
                ? "bg-orange-500 text-white" 
                : "bg-slate-100 text-slate-600"
            )}>
              <Truck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">Delivery</h3>
              <p className="text-sm text-slate-500 mb-3">
                Get it delivered to your doorstep
              </p>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-900">${deliveryFee.toFixed(2)}</span>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{estimatedTime || 30}-{(estimatedTime || 30) + 15} min</span>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Self Pickup Option */}
        <button
          type="button"
          onClick={() => setDeliveryMethod('PICKUP')}
          className={cn(
            "relative rounded-xl border-2 p-6 transition-all text-left",
            deliveryMethod === 'PICKUP' 
              ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/10" 
              : "border-slate-200 hover:border-slate-300 bg-white"
          )}
        >
          {deliveryMethod === 'PICKUP' && (
            <div className="absolute top-4 right-4">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
              deliveryMethod === 'PICKUP' 
                ? "bg-orange-500 text-white" 
                : "bg-slate-100 text-slate-600"
            )}>
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">Self Pickup</h3>
              <p className="text-sm text-slate-500 mb-3">
                Pick up from merchant location
              </p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-xs font-medium text-green-700">
                  FREE
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>15-20 min</span>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Delivery Address Form */}
      {deliveryMethod === 'DELIVERY' && (
        <div className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              Delivery Address
            </h3>
            
            <div className="space-y-4">
              {/* Address Line 1 */}
              <div>
                <Label htmlFor="line1">
                  Address Line 1 <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="line1"
                    placeholder="Block/Street name"
                    value={deliveryAddress.line1 || ''}
                    onChange={(e: any) => setDeliveryAddress({ line1: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              {/* Address Line 2 */}
              <div>
                <Label htmlFor="line2">
                  Address Line 2 <span className="text-slate-400 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="line2"
                  placeholder="Unit number, building name, floor"
                  value={deliveryAddress.line2 || ''}
                  onChange={(e: any) => setDeliveryAddress({ line2: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              
              {/* Postal Code and Delivery Fee */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode">
                    Postal Code <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="postalCode"
                      placeholder="123456"
                      value={deliveryAddress.postalCode || ''}
                      onChange={(e: any) => handlePostalCodeChange(e.target.value)}
                      maxLength={6}
                      pattern="[0-9]{6}"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                {/* Delivery Fee Display */}
                {postalCode.length === 6 && (
                  <div>
                    <Label>Delivery Fee</Label>
                    <div className="mt-1.5 bg-white px-4 py-2.5 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        {calculatingFee ? (
                          <span className="text-sm text-muted-foreground">
                            Calculating...
                          </span>
                        ) : (
                          <>
                            <span className="font-semibold text-green-700">
                              ${deliveryFee.toFixed(2)}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>{estimatedTime || 30}-{(estimatedTime || 30) + 15} min</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Instructions */}
              <div>
                <Label htmlFor="instructions">
                  Delivery Instructions <span className="text-slate-400 text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="instructions"
                  rows={3}
                  placeholder="Any special instructions for the delivery person? (e.g., Ring doorbell, Leave at door)"
                  value={deliveryAddress.notes || ''}
                  onChange={(e: any) => setDeliveryAddress({ notes: e.target.value })}
                  className="mt-1.5 resize-none"
                />
              </div>

              {/* Delivery Zone Notice */}
              <Alert className="bg-blue-50 border-blue-200 flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-1" />
                <AlertDescription className="text-blue-700">
                  <span className="font-medium text-blue-900">Delivery Coverage:</span> We currently deliver within 5km of our location. Delivery fees may vary based on distance.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Location Info */}
      {deliveryMethod === 'PICKUP' && merchantAddress && (
        <div className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
          <Alert className="bg-blue-50 border-blue-200 flex items-start space-x-3 p-4">
            <Info className="h-5 w-5 text-blue-600 mt-1" />

            <AlertDescription className="flex-1 text-sm">
              <div className="mb-2">
                <p className="font-semibold text-blue-900">Pickup Location</p>
                <p className="text-blue-700 leading-relaxed">
                  {merchantAddress.line1}<br />
                  {merchantAddress.line2 && <>{merchantAddress.line2}<br /></>}
                  Singapore {merchantAddress.postalCode}
                </p>
              </div>

              <div className="mt-3">
                <Label htmlFor="pickupNotes" className="text-blue-900 text-sm font-medium">
                  Pickup Notes <span className="text-blue-600 text-xs font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="pickupNotes"
                  rows={2}
                  placeholder="Any special requests for pickup?"
                  value={pickupNotes || ''}
                  onChange={(e: any) => setPickupNotes(e.target.value)}
                  className="mt-1.5 bg-white/50 text-sm"
                />
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}