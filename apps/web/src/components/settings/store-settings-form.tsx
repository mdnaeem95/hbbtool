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
import { api } from "@/lib/trpc/client"
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
                  <div className="space-y-0.5">
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
                  <div className="space-y-0.5">
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

            {/* Delivery Settings */}
            {form.watch("deliveryEnabled") && (
              <div className="space-y-4 ml-4">
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
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                          onValueChange={(value) => field.onChange(value[0])}
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
                      onValueChange={(value) => field.onChange(value[0])}
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
                      <SelectItem value="SEQUENTIAL">
                        Sequential (001, 002, 003...)
                      </SelectItem>
                      <SelectItem value="RANDOM">
                        Random (A3B2, X9Y7...)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How order numbers are generated
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Advance Order Days */}
            <FormField
              control={form.control}
              name="maxAdvanceOrderDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Advance Order Days</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    How many days in advance customers can place orders
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Control what information is shown to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Show Sold Out Items */}
            <FormField
              control={form.control}
              name="showSoldOutItems"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Show Sold Out Items</FormLabel>
                    <FormDescription>
                      Display items that are out of stock with a "Sold Out" label
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

            {/* Show Preparation Time */}
            <FormField
              control={form.control}
              name="showPreparationTime"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Show Preparation Time</FormLabel>
                    <FormDescription>
                      Display estimated preparation time on menu items
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

            {/* Show Calories */}
            <FormField
              control={form.control}
              name="showCalories"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Show Calories</FormLabel>
                    <FormDescription>
                      Display calorie information on menu items
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
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading || !form.formState.isDirty}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}