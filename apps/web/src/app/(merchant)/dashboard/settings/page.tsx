'use client'

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kitchencloud/ui"
import { 
  User, 
  Store, 
  CreditCard, 
  Bell, 
  Shield,
  Loader2 
} from "lucide-react"
import { api } from "@/lib/trpc/client"
import { 
  BusinessProfileForm,
  StoreSettingsForm,
  PaymentSettingsForm,
  NotificationSettingsForm,
  SecuritySettingsForm,
} from "@/components/settings"
import { Alert, AlertDescription } from "@kitchencloud/ui"
import { cn } from "@kitchencloud/ui"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("business")
  
  // Fetch settings data
  const { 
    data: settings, 
    isLoading, 
    error,
    refetch 
  } = api.settings.getSettings.useQuery()

  if (isLoading) {
    return <SettingsLoadingSkeleton />
  }

  if (error || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Failed to load settings. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your business profile, preferences, and account settings
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="settings-tabslist grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger 
            value="business" 
            className={cn(
              "settings-tabtrigger gap-2",
              activeTab === "business" && "settings-tabtrigger-active"
            )}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger 
            value="store" 
            className={cn(
              "settings-tabtrigger gap-2",
              activeTab === "store" && "settings-tabtrigger-active"
            )}
          >
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store</span>
          </TabsTrigger>
          <TabsTrigger 
            value="payments" 
            className={cn(
              "settings-tabtrigger gap-2",
              activeTab === "payments" && "settings-tabtrigger-active"
            )}
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className={cn(
              "settings-tabtrigger gap-2",
              activeTab === "notifications" && "settings-tabtrigger-active"
            )}
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className={cn(
              "settings-tabtrigger gap-2",
              activeTab === "security" && "settings-tabtrigger-active"
            )}
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Profile Tab */}
        <TabsContent value="business" className="space-y-4">
          <BusinessProfileForm 
            data={settings.businessProfile} 
            onSuccess={() => refetch()}
          />
        </TabsContent>

        {/* Store Settings Tab */}
        <TabsContent value="store" className="space-y-4">
          <StoreSettingsForm 
            data={settings.storeSettings}
            onSuccess={() => refetch()}
          />
        </TabsContent>

        {/* Payment Settings Tab */}
        <TabsContent value="payments" className="space-y-4">
          <PaymentSettingsForm 
            data={settings.paymentSettings}
            onSuccess={() => refetch()}
          />
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettingsForm 
            data={settings.notificationSettings}
            onSuccess={() => refetch()}
          />
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-4">
          <SecuritySettingsForm 
            data={settings.securitySettings}
            onSuccess={() => refetch()}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Loading skeleton component
function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Loading your settings...
        </p>
      </div>

      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}