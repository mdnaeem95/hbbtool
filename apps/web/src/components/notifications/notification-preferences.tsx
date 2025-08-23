'use client'

import { useState } from 'react'
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Label, Switch, Input, useToast
} from '@kitchencloud/ui'
import { api } from "@/lib/trpc/client"

export function NotificationPreferences() {
  const { data: preferences, refetch } = api.notification.getPreferences.useQuery()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  
  const updateMutation = api.notification.updatePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Preferences updated successfully',
      })
      refetch()
      setIsLoading(false)
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  })

  const handleUpdate = (updates: Record<string, any>) => {
    setIsLoading(true)
    updateMutation.mutate(updates)
  }

  if (!preferences) return <div>Loading...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Manage how and when you receive notifications
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Channel Preferences */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Channels</h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => 
                handleUpdate({ emailNotifications: checked })
              }
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>WhatsApp Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via WhatsApp
              </p>
            </div>
            <Switch
              checked={preferences.whatsappNotifications}
              onCheckedChange={(checked) => 
                handleUpdate({ whatsappNotifications: checked })
              }
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Contact Information */}
        {'orderNotificationEmail' in preferences && (
          <div className="space-y-4">
            <h4 className="font-medium">Contact Information</h4>
            
            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input
                id="notification-email"
                type="email"
                placeholder="your-email@example.com"
                value={(preferences.orderNotificationEmail as string) || ''}
                onChange={(e) => 
                  handleUpdate({ orderNotificationEmail: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
            
            {/* Only show phone field if it exists (merchant only) */}
            {'orderNotificationPhone' in preferences && (
              <div className="space-y-2">
                <Label htmlFor="notification-phone">Notification Phone</Label>
                <Input
                  id="notification-phone"
                  type="tel"
                  placeholder="+65 9123 4567"
                  value={(preferences.orderNotificationPhone as string) || ''}
                  onChange={(e) => 
                    handleUpdate({ orderNotificationPhone: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* Language & Timezone */}
        <div className="space-y-4">
          <h4 className="font-medium">Preferences</h4>
          
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={preferences.language}
              onValueChange={(value) => handleUpdate({ language: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ms">Bahasa Malaysia</SelectItem>
                <SelectItem value="ta">தமிழ்</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}