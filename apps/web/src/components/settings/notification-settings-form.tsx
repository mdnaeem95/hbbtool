'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
  Input, Textarea, Button, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  useToast,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@kitchencloud/ui"
import { Loader2, Save, Mail, MessageSquare, Phone, Globe, Clock } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { notificationSettingsSchema } from "@kitchencloud/api/utils"

type NotificationSettingsData = z.input<typeof notificationSettingsSchema>

interface NotificationSettingsFormProps {
  data: {
    emailNotifications: boolean
    smsNotifications: boolean
    whatsappNotifications: boolean
    language: string
    timezone: string
    orderNotificationEmail?: string
    orderNotificationPhone?: string
    orderConfirmationMessage?: string
    orderReadyMessage?: string
    orderDeliveredMessage?: string
  }
  onSuccess?: () => void
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese (中文)" },
  { value: "ms", label: "Malay (Bahasa Melayu)" },
  { value: "ta", label: "Tamil (தமிழ்)" },
]

const NOTIFICATION_TEMPLATES = {
  orderConfirmation: {
    title: "Order Confirmation",
    description: "Sent when a new order is placed",
    defaultTemplate: "Thank you for your order! We've received your order #{orderNumber} and will start preparing it soon. Estimated ready time: {readyTime}",
    variables: ["orderNumber", "readyTime", "customerName", "orderTotal"],
  },
  orderReady: {
    title: "Order Ready",
    description: "Sent when order is ready for pickup/delivery",
    defaultTemplate: "Hi {customerName}, your order #{orderNumber} is ready! Please collect it at your earliest convenience.",
    variables: ["orderNumber", "customerName"],
  },
  orderDelivered: {
    title: "Order Delivered",
    description: "Sent when order has been delivered",
    defaultTemplate: "Your order #{orderNumber} has been delivered. Thank you for choosing us! We hope you enjoy your meal.",
    variables: ["orderNumber", "customerName"],
  },
}

export function NotificationSettingsForm({ data, onSuccess }: NotificationSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<NotificationSettingsData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: data.emailNotifications,
      smsNotifications: data.smsNotifications,
      whatsappNotifications: data.whatsappNotifications,
      language: (data.language || "en") as "en" | "zh" | "ms" | "ta",
      timezone: data.timezone || "Asia/Singapore",
      orderNotificationEmail: data.orderNotificationEmail || "",
      orderNotificationPhone: data.orderNotificationPhone || "",
      orderConfirmationMessage: data.orderConfirmationMessage || "",
      orderReadyMessage: data.orderReadyMessage || "",
      orderDeliveredMessage: data.orderDeliveredMessage || "",
    },
  })

  const updateSettings = api.settings.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update notification settings.",
        variant: "destructive",
      })
    },
  })

  const onSubmit = async (values: NotificationSettingsData) => {
    setIsLoading(true)
    try {
      await updateSettings.mutateAsync(values)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Choose how you want to receive order notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email Notifications */}
            <FormField
              control={form.control}
              name="emailNotifications"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Notifications
                    </FormLabel>
                    <FormDescription>
                      Receive order updates via email
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

            {/* SMS Notifications */}
            <FormField
              control={form.control}
              name="smsNotifications"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS Notifications
                    </FormLabel>
                    <FormDescription>
                      Receive order updates via SMS
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

            {/* WhatsApp Notifications */}
            <FormField
              control={form.control}
              name="whatsappNotifications"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      WhatsApp Notifications
                    </FormLabel>
                    <FormDescription>
                      Receive order updates via WhatsApp
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

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Contact Details</CardTitle>
            <CardDescription>
              Where should we send order notifications?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch("emailNotifications") && (
              <FormField
                control={form.control}
                name="orderNotificationEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="orders@yourbusiness.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Email address for receiving order notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(form.watch("smsNotifications") || form.watch("whatsappNotifications")) && (
              <FormField
                control={form.control}
                name="orderNotificationPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+65 9123 4567"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Phone number for SMS/WhatsApp notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Language & Timezone */}
        <Card>
          <CardHeader>
            <CardTitle>Language & Regional Settings</CardTitle>
            <CardDescription>
              Customize your language and timezone preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Language
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Language for system notifications and interface
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timezone
                  </FormLabel>
                  <FormControl>
                    <Input
                      value={field.value}
                      disabled
                      className="bg-muted"
                    />
                  </FormControl>
                  <FormDescription>
                    All times are shown in this timezone
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Message Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Templates</CardTitle>
            <CardDescription>
              Customize messages sent to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orderConfirmation" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="orderConfirmation">Confirmation</TabsTrigger>
                <TabsTrigger value="orderReady">Ready</TabsTrigger>
                <TabsTrigger value="orderDelivered">Delivered</TabsTrigger>
              </TabsList>

              <TabsContent value="orderConfirmation" className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    {NOTIFICATION_TEMPLATES.orderConfirmation.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {NOTIFICATION_TEMPLATES.orderConfirmation.description}
                  </p>
                  <FormField
                    control={form.control}
                    name="orderConfirmationMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={NOTIFICATION_TEMPLATES.orderConfirmation.defaultTemplate}
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Available variables: {NOTIFICATION_TEMPLATES.orderConfirmation.variables.map(v => `{${v}}`).join(", ")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="orderReady" className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    {NOTIFICATION_TEMPLATES.orderReady.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {NOTIFICATION_TEMPLATES.orderReady.description}
                  </p>
                  <FormField
                    control={form.control}
                    name="orderReadyMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={NOTIFICATION_TEMPLATES.orderReady.defaultTemplate}
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Available variables: {NOTIFICATION_TEMPLATES.orderReady.variables.map(v => `{${v}}`).join(", ")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="orderDelivered" className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    {NOTIFICATION_TEMPLATES.orderDelivered.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {NOTIFICATION_TEMPLATES.orderDelivered.description}
                  </p>
                  <FormField
                    control={form.control}
                    name="orderDeliveredMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={NOTIFICATION_TEMPLATES.orderDelivered.defaultTemplate}
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Available variables: {NOTIFICATION_TEMPLATES.orderDelivered.variables.map(v => `{${v}}`).join(", ")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
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