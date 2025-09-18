'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
  Input, Button, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider,
  useToast,
} from "@kitchencloud/ui"
import { Loader2, Save, Truck, ShoppingBag, Clock } from "lucide-react"
import { api } from "../../lib/trpc/client"
import { storeSettingsSchema } from "@kitchencloud/api/utils"

type StoreSettingsData = z.input<typeof storeSettingsSchema>

interface StoreSettingsFormProps {
  data: StoreSettingsData
  onSuccess?: () => void
}

export function StoreSettingsForm({ data, onSuccess }: StoreSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<StoreSettingsData>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: data,
  })

  const updateSettings = api.settings.updateStoreSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your store settings have been updated successfully.",
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      })
    },
  })

  const onSubmit = async (values: StoreSettingsData) => {
    setIsLoading(true)
    try {
      await updateSettings.mutateAsync(values)
    } finally {
      setIsLoading(false)
    }
  }

  const preparationTime = form.watch("preparationTime")
  const deliveryRadius = form.watch("deliveryRadius")
  const deliveryEnabled = form.watch("deliveryEnabled")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Delivery & Pickup */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery & Pickup Options</CardTitle>
            <CardDescription>
              Configure how customers can receive their orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delivery Toggle */}
            <FormField
              control={form.control}
              name="deliveryEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 flex-1">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Delivery
                    </FormLabel>
                    <FormDescription>
                      Allow customers to order for delivery
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Pickup Toggle */}
            <FormField
              control={form.control}
              name="pickupEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 flex-1">
                    <FormLabel className="text-base flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Pickup
                    </FormLabel>
                    <FormDescription>
                      Allow customers to pickup orders
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Delivery Settings - Only show if delivery is enabled */}
            {deliveryEnabled && (
              <div className="space-y-4 ml-4 border-l-2 border-orange-200 pl-4">
                <h4 className="font-medium text-orange-700">Delivery Settings</h4>
                
                <FormField
                  control={form.control}
                  name="deliveryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.50"
                          min="0"
                          max="50"
                          placeholder="5.00"
                          {...field}
                          onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Standard delivery fee for all orders
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimumOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="1000"
                          placeholder="20.00"
                          {...field}
                          onChange={(e: any) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum order value for delivery
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryRadius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Radius ({deliveryRadius} km)</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={20}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value: any) => field.onChange(value[0])}
                          className="py-4"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum delivery distance from your location
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Management */}
        <Card>
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
            <CardDescription>
              Configure how orders are processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preparation Time */}
            <FormField
              control={form.control}
              name="preparationTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Default Preparation Time ({preparationTime} minutes)
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={5}
                      max={180}
                      step={5}
                      value={[field.value]}
                      onValueChange={(value: any) => field.onChange(value[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormDescription>
                    How long it typically takes to prepare an order
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto Accept Orders */}
            <FormField
              control={form.control}
              name="autoAcceptOrders"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto-accept Orders</FormLabel>
                    <FormDescription>
                      Automatically accept new orders without manual approval
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Order Prefix */}
            <FormField
              control={form.control}
              name="orderPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Number Prefix</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ORD"
                      maxLength={10}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Prefix for order numbers (e.g., ORD-001, ORD-002)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Order Number Format */}
            <FormField
              control={form.control}
              name="orderNumberFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Number Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SEQUENTIAL">Sequential (001, 002, 003)</SelectItem>
                      <SelectItem value="RANDOM">Random (A7X, B2K, C9M)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How order numbers should be generated
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  )
}