'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle,
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button,
  Alert, AlertDescription, Switch, Separator, useToast, Badge } from '@kitchencloud/ui'
import { Truck, MapPin, DollarSign, Info, Clock, Zap, Map, Package } from 'lucide-react'
import { api } from '../../lib/trpc/client'

const formSchema = z.object({
  pricingModel: z.enum(['FLAT', 'DISTANCE', 'ZONE', 'FREE']),
  flatRate: z.number().min(0).max(50).optional(),
  zoneRates: z.object({
    sameZone: z.number().min(0).max(50),
    adjacentZone: z.number().min(0).max(50),
    crossZone: z.number().min(0).max(50),
    specialArea: z.number().min(0).max(100)
  }).optional(),
  distanceRates: z.object({
    baseRate: z.number().min(0).max(50),
    perKmRate: z.number().min(0).max(10),
    tiers: z.array(z.object({
      minKm: z.number().min(0),
      maxKm: z.number().max(50),
      additionalFee: z.number().min(0).max(100)
    }))
  }).optional(),
  freeDeliveryMinimum: z.number().min(0).max(500).optional(),
  specialAreaSurcharge: z.number().min(0).max(50).optional(),
  deliveryRadius: z.number().min(1).max(50),
  preparationTime: z.number().min(5).max(180),
})

type FormData = z.infer<typeof formSchema>

export function DeliveryPricingForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const { data: settings, isLoading: loadingSettings } = api.settings.getDeliverySettings.useQuery()
  const updateSettings = api.settings.updateDeliverySettings.useMutation()
  const toggleOptions = api.settings.toggleDeliveryOptions.useMutation()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pricingModel: 'FLAT',
      flatRate: 5,
      deliveryRadius: 10,
      preparationTime: 30,
      freeDeliveryMinimum: 0,
      specialAreaSurcharge: 5,
      zoneRates: {
        sameZone: 5,
        adjacentZone: 7,
        crossZone: 10,
        specialArea: 15
      },
      distanceRates: {
        baseRate: 5,
        perKmRate: 0,
        tiers: [
          { minKm: 0, maxKm: 3, additionalFee: 0 },
          { minKm: 3, maxKm: 5, additionalFee: 2 },
          { minKm: 5, maxKm: 10, additionalFee: 4 },
          { minKm: 10, maxKm: 15, additionalFee: 6 }
        ]
      }
    }
  })

  const pricingModel = form.watch('pricingModel')

  useEffect(() => {
    if (settings) {
      form.reset(settings)
    }
  }, [settings, form])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      await updateSettings.mutateAsync(data)
      toast({
        title: 'Settings updated',
        description: 'Your delivery pricing has been updated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Delivery Options Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Options
          </CardTitle>
          <CardDescription>
            Choose which delivery methods to offer customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Delivery</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Deliver orders to customer locations
              </p>
            </div>
            <Switch
              checked={settings?.deliveryEnabled}
              onCheckedChange={(checked) => {
                if (!checked && !settings?.pickupEnabled) {
                  toast({
                    title: 'Cannot disable',
                    description: 'At least one delivery option must be enabled',
                    variant: 'destructive',
                  })
                  return
                }
                toggleOptions.mutate({
                  deliveryEnabled: checked,
                  pickupEnabled: settings?.pickupEnabled || true
                })
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Self Pickup</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Customers pick up from your location
              </p>
            </div>
            <Switch
              checked={settings?.pickupEnabled}
              onCheckedChange={(checked) => {
                if (!checked && !settings?.deliveryEnabled) {
                  toast({
                    title: 'Cannot disable',
                    description: 'At least one delivery option must be enabled',
                    variant: 'destructive',
                  })
                  return
                }
                toggleOptions.mutate({
                  deliveryEnabled: settings?.deliveryEnabled || true,
                  pickupEnabled: checked
                })
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Pricing Settings */}
      {settings?.deliveryEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Delivery Pricing
            </CardTitle>
            <CardDescription>
              Configure how you charge for delivery services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Pricing Model Selection */}
                <FormField
                  control={form.control}
                  name="pricingModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Model</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FLAT">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Flat Rate</div>
                                <div className="text-xs text-muted-foreground">
                                  Same fee for all deliveries
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="ZONE">
                            <div className="flex items-center gap-2">
                              <Map className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Zone-Based</div>
                                <div className="text-xs text-muted-foreground">
                                  Different rates for different zones
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="DISTANCE">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Distance-Based</div>
                                <div className="text-xs text-muted-foreground">
                                  Fee based on delivery distance
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="FREE">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Free Delivery</div>
                                <div className="text-xs text-muted-foreground">
                                  No delivery charges
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Model-specific settings */}
                {pricingModel === 'FLAT' && (
                  <FormField
                    control={form.control}
                    name="flatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flat Delivery Fee ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.50"
                            min="0"
                            max="50"
                            {...field}
                            onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Fixed fee charged for all deliveries
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {pricingModel === 'ZONE' && (
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Singapore is divided into 5 zones: Central, East, West, North, and Northeast.
                        Set different delivery rates based on zone relationships.
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="zoneRates.sameZone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Same Zone ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.50"
                                min="0"
                                {...field}
                                onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Delivery within the same zone
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zoneRates.adjacentZone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adjacent Zone ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.50"
                                min="0"
                                {...field}
                                onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Delivery to neighboring zones
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zoneRates.crossZone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cross Zone ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.50"
                                min="0"
                                {...field}
                                onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Delivery across multiple zones
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zoneRates.specialArea"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Areas ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.50"
                                min="0"
                                {...field}
                                onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Sentosa, Jurong Island, etc.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {pricingModel === 'DISTANCE' && (
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Set a base rate and additional fees for different distance ranges.
                      </AlertDescription>
                    </Alert>

                    <FormField
                      control={form.control}
                      name="distanceRates.baseRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Rate ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.50"
                              min="0"
                              {...field}
                              onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Starting delivery fee for all orders
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Distance Tiers</FormLabel>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">0-3km</Badge>
                          <span>Base rate only</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">3-5km</Badge>
                          <span>Base rate + $2</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">5-10km</Badge>
                          <span>Base rate + $4</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">10-15km</Badge>
                          <span>Base rate + $6</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Common settings */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="deliveryRadius"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Delivery Radius (km)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            {...field}
                            onChange={(e: any) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum distance you're willing to deliver
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preparationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Preparation Time (minutes)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="5"
                            max="180"
                            {...field}
                            onChange={(e: any) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Average time to prepare orders
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="freeDeliveryMinimum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Free Delivery Minimum ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="0 for no free delivery"
                            {...field}
                            onChange={(e: any) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Orders above this amount get free delivery (0 to disable)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {pricingModel !== 'FREE' && (
                    <FormField
                      control={form.control}
                      name="specialAreaSurcharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Area Surcharge ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...field}
                              onChange={(e: any) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional fee for Sentosa, Jurong Island, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Delivery Settings'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}