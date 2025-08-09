'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Label } from '@kitchencloud/ui'
import { Loader2 } from 'lucide-react'

export function PhoneLogin() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtp, setShowOtp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function sendOtp() {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms',
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      setShowOtp(true)
    } catch (err) {
      setError('Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyOtp() {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })

      if (error) {
        setError(error.message)
        return
      }

      // Success - redirect or refresh
      window.location.href = '/'
    } catch (err) {
      setError('Failed to verify OTP')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!showOtp ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9123 4567"
              required
            />
          </div>

          <Button 
            onClick={sendOtp} 
            className="w-full" 
            disabled={isLoading || !phone}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send OTP
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to {phone}
            </p>
          </div>

          <Button 
            onClick={verifyOtp} 
            className="w-full" 
            disabled={isLoading || !otp}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify OTP
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setShowOtp(false)
              setOtp('')
            }}
            className="w-full"
          >
            Use different number
          </Button>
        </>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}