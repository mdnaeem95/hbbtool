'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
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
  useToast,
  Alert,
  AlertDescription,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@kitchencloud/ui"
import { 
  Loader2, 
  Save, 
  Shield,
  Smartphone,
  Monitor,
  LogOut,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { api } from "../../lib/trpc/client"
import { securitySettingsSchema } from "@kitchencloud/api/utils"
import { QRCodeSVG } from "qrcode.react"

type SecuritySettingsData = z.infer<typeof securitySettingsSchema>

interface SecuritySettingsFormProps {
  data: {
    email: string
    emailVerified: boolean
    phoneVerified: boolean
    twoFactorEnabled: boolean
    lastLoginAt?: Date | null
  }
  onSuccess?: () => void
}

export function SecuritySettingsForm({ data, onSuccess }: SecuritySettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [twoFactorData, setTwoFactorData] = useState<{
    secret?: string
    qrCode?: string
  }>({})
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<SecuritySettingsData>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      twoFactorEnabled: data.twoFactorEnabled,
    },
  })

  // Fetch active sessions
  const { data: sessions, refetch: refetchSessions } = api.settings.getActiveSessions.useQuery()

  const updateSettings = api.settings.updateSecuritySettings.useMutation({
    onSuccess: (result) => {
      if (result.twoFactorSecret && result.qrCode) {
        setTwoFactorData({
          secret: result.twoFactorSecret,
          qrCode: result.qrCode,
        })
        setShow2FADialog(true)
      } else {
        toast({
          title: "Security settings updated",
          description: "Your security settings have been saved successfully.",
        })
        form.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        onSuccess?.()
      }
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update security settings.",
        variant: "destructive",
      })
    },
  })

  const revokeSession = api.settings.revokeSession.useMutation({
    onSuccess: () => {
      toast({
        title: "Session revoked",
        description: "The session has been terminated successfully.",
      })
      refetchSessions()
      setSessionToRevoke(null)
    },
    onError: (error) => {
      toast({
        title: "Revocation failed",
        description: error.message || "Failed to revoke session.",
        variant: "destructive",
      })
    },
  })

  const onSubmit = async (values: SecuritySettingsData) => {
    setIsLoading(true)
    try {
      await updateSettings.mutateAsync(values)
    } finally {
      setIsLoading(false)
    }
  }

  const getDeviceIcon = (userAgent?: string | null) => {
    if (!userAgent) return Monitor
    if (userAgent.includes("Mobile")) return Smartphone
    return Monitor
  }

  const getDeviceName = (userAgent?: string | null) => {
    if (!userAgent) return "Unknown Device"
    // Simple parsing - in production, use a proper user agent parser
    if (userAgent.includes("Chrome")) return "Chrome"
    if (userAgent.includes("Safari")) return "Safari"
    if (userAgent.includes("Firefox")) return "Firefox"
    return "Unknown Browser"
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Account Security */}
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Verification Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">{data.email}</p>
                </div>
                <Badge variant={data.emailVerified ? "default" : "secondary"}>
                  {data.emailVerified ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-1 h-3 w-3" />
                      Unverified
                    </>
                  )}
                </Badge>
              </div>

              {/* Last Login */}
              {data.lastLoginAt && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Last Login</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(data.lastLoginAt), "PPpp")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters with uppercase, lowercase, number and special character
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-password"
                  checked={showPassword}
                  onChange={(e: any) => setShowPassword(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label
                  htmlFor="show-password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show password
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="twoFactorEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Enable Two-Factor Authentication
                      </FormLabel>
                      <FormDescription>
                        Require a verification code in addition to your password
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

              {data.twoFactorEnabled && (
                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is currently enabled on your account
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage devices where you're currently logged in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions && sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const DeviceIcon = getDeviceIcon(session.userAgent)
                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {getDeviceName(session.userAgent)}
                              {session.isCurrent && (
                                <Badge variant="secondary" className="ml-2">
                                  Current
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {session.ipAddress || "Unknown IP"} • 
                              Last active {session.lastActivityAt ? format(new Date(session.lastActivityAt), "PP") : "Unknown"}
                            </p>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSessionToRevoke(session.id)}
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active sessions found</p>
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

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            {twoFactorData.qrCode && (
              <QRCodeSVG value={twoFactorData.qrCode} size={200} />
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Or enter this code manually:
              </p>
              <code className="bg-muted px-3 py-1 rounded text-sm">
                {twoFactorData.secret}
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShow2FADialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Session Confirmation */}
      <AlertDialog open={!!sessionToRevoke} onOpenChange={() => setSessionToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this session? The device will be logged out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToRevoke && revokeSession.mutate({ sessionId: sessionToRevoke })}
            >
              Revoke Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}