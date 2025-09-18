'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Switch,
  Checkbox,
  useToast,
  Alert,
  AlertDescription,
} from "@kitchencloud/ui"
import { 
  Loader2, 
  Save, 
  Smartphone,
  QrCode,
  AlertCircle,
  DollarSign,
} from "lucide-react"
import { api } from "../../lib/trpc/client"
import { paymentSettingsSchema } from "@kitchencloud/api/utils"
import { PaymentMethod } from "@kitchencloud/database/types"

type PaymentSettingsData = z.infer<typeof paymentSettingsSchema>

interface PaymentSettingsFormProps {
  data: PaymentSettingsData
  onSuccess?: () => void
}

// Only including PAYNOW and CASH as per Singapore market requirements
const PAYMENT_METHODS = [
  {
    value: PaymentMethod.PAYNOW,
    label: "PayNow",
    description: "Accept instant payments via PayNow",
    icon: Smartphone,
  },
  {
    value: PaymentMethod.CASH,
    label: "Cash on Delivery",
    description: "Accept cash payments upon delivery",
    icon: DollarSign,
  },
]

export function PaymentSettingsForm({ data, onSuccess }: PaymentSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<PaymentSettingsData>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: data,
  })

  const updateSettings = api.settings.updatePaymentSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Payment settings updated",
        description: "Your payment settings have been saved successfully.",
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update payment settings.",
        variant: "destructive",
      })
    },
  })

  const generateQR = api.settings.generatePaynowQR.useMutation({
    onSuccess: (data) => {
      form.setValue("paynowQrCode", data.qrCodeUrl)
      toast({
        title: "QR Code generated",
        description: "Your PayNow QR code has been generated successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate QR code.",
        variant: "destructive",
      })
    },
  })

  const onSubmit = async (values: PaymentSettingsData) => {
    setIsLoading(true)
    try {
      await updateSettings.mutateAsync(values)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedMethods = form.watch("paymentMethods")
  const hasPayNow = selectedMethods.includes(PaymentMethod.PAYNOW)
  const isGstRegistered = form.watch("gstRegistered")
  const paynowNumber = form.watch("paynowNumber")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Choose how customers can pay for their orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="paymentMethods"
              render={() => (
                <FormItem>
                  <div className="space-y-4">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon
                      return (
                        <FormField
                          key={method.value}
                          control={form.control}
                          name="paymentMethods"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={method.value}
                                className="flex items-start space-x-3 rounded-lg border p-4"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(method.value) || false}
                                    onCheckedChange={(checked: any) => {
                                      const currentValue = field.value || []
                                      if (checked) {
                                        field.onChange([...currentValue, method.value])
                                      } else {
                                        field.onChange(
                                          currentValue.filter(
                                            (value: any) => value !== method.value
                                          )
                                        )
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="flex-1 space-y-1">
                                  <FormLabel className="font-normal flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {method.label}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {method.description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )
                          }}
                        />
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMethods.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You must select at least one payment method
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* PayNow Settings */}
        {hasPayNow && (
          <Card>
            <CardHeader>
              <CardTitle>PayNow Settings</CardTitle>
              <CardDescription>
                Configure your PayNow payment details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="paynowNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PayNow UEN/Mobile Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="UEN or mobile number"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your registered PayNow UEN or mobile number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {paynowNumber && (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateQR.mutate({ paynowNumber })}
                    disabled={generateQR.isPending}
                  >
                    {generateQR.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="mr-2 h-4 w-4" />
                        Generate QR Code
                      </>
                    )}
                  </Button>

                  {form.watch("paynowQrCode") && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">PayNow QR Code</p>
                      <img
                        src={form.watch("paynowQrCode")}
                        alt="PayNow QR Code"
                        className="w-48 h-48 border rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* GST Settings */}
        <Card>
          <CardHeader>
            <CardTitle>GST Settings</CardTitle>
            <CardDescription>
              Goods and Services Tax registration details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="gstRegistered"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">GST Registered</FormLabel>
                    <FormDescription>
                      Are you registered for GST?
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

            {isGstRegistered && (
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Registration Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., M2-1234567-8"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your GST registration number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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