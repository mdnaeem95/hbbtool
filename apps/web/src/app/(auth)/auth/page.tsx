'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, Label } from '@kitchencloud/ui'
import { Loader2, Store, User } from 'lucide-react'
import { useAuth } from '@kitchencloud/auth/client'
import { validatePassword, validatePhoneNumber } from '@/lib/utils/validation'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  
  const { 
    signIn, 
    signUp, 
    verifyOtp, 
    isLoading, 
    error: authError,
    isAuthenticated 
  } = useAuth()
  
  const [error, setError] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'customer' | 'merchant'>('customer')
  const [merchantTab, setMerchantTab] = useState<'signin' | 'signup'>('signin')
  const [showOtp, setShowOtp] = useState(false)
  const [customerPhone, setCustomerPhone] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirect)
    }
  }, [isAuthenticated, redirect, router])

  // Handle auth errors
  useEffect(() => {
    if (authError) {
      setError(authError.message)
    }
  }, [authError])

  async function handleCustomerAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    if (!showOtp) {
      // Step 1: Send OTP
      const phone = formData.get('phone') as string
      const name = formData.get('name') as string

      if (!validatePhoneNumber(phone)) {
        setError('Please enter a valid Singapore phone number')
        return
      }

      const cleanPhone = phone.replace(/[\s-]/g, '')
      setCustomerPhone(phone)
      
      try {
        await signIn({ 
          type: 'customer',
          phone: cleanPhone,
          name: name || undefined 
        })
        setShowOtp(true)
      } catch (err) {
        // Error handled by provider
      }
    } else {
      // Step 2: Verify OTP
      const otp = formData.get('otp') as string
      
      try {
        await verifyOtp(otp)
        router.push(redirect)
      } catch (err) {
        // Error handled by provider
      }
    }
  }

  async function handleMerchantSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await signIn({ 
        type: 'merchant',
        email, 
        password 
      })
      router.push('/dashboard')
    } catch (err) {
      // Error handled by provider
    }
  }

  async function handleMerchantSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const businessName = formData.get('businessName') as string
    const phone = formData.get('phone') as string

    // Validate
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '))
      return
    }

    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Singapore phone number')
      return
    }

    try {
      await signUp({ 
        type: 'merchant',
        email, 
        password, 
        businessName,
        phone: phone.replace(/[\s-]/g, '')
      })
      router.push('/dashboard')
    } catch (err) {
      // Error handled by provider
    }
  }

  return (
    <div className="w-full">
      {/* Account Type Selector */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => {
            setAccountType('customer')
            setError(null)
            setShowOtp(false)
          }}
          className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
            accountType === 'customer' 
              ? 'border-primary bg-primary/5 text-primary' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <User className="h-6 w-6 mx-auto mb-2" />
          <div className="font-medium">Customer</div>
          <div className="text-sm text-muted-foreground">Order delicious food</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setAccountType('merchant')
            setError(null)
          }}
          className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
            accountType === 'merchant' 
              ? 'border-primary bg-primary/5 text-primary' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Store className="h-6 w-6 mx-auto mb-2" />
          <div className="font-medium">Merchant</div>
          <div className="text-sm text-muted-foreground">Sell your food</div>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Customer Auth Form */}
      {accountType === 'customer' && (
        <form onSubmit={handleCustomerAuth} className="space-y-4">
          {!showOtp ? (
            <>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+65 9123 4567"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to
                </p>
                <p className="font-medium">{customerPhone}</p>
              </div>
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  required
                  disabled={isLoading}
                  autoComplete="one-time-code"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowOtp(false)
                  setError(null)
                }}
                disabled={isLoading}
              >
                Use a different number
              </Button>
            </>
          )}
        </form>
      )}

      {/* Merchant Auth Forms */}
      {accountType === 'merchant' && (
        <>
          {/* Tab Selector */}
          <div className="flex border-b mb-6">
            <button
              type="button"
              onClick={() => setMerchantTab('signin')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                merchantTab === 'signin'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMerchantTab('signup')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                merchantTab === 'signup'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {merchantTab === 'signin' && (
            <form onSubmit={handleMerchantSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          )}

          {/* Sign Up Form */}
          {merchantTab === 'signup' && (
            <form onSubmit={handleMerchantSignUp} className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  type="text"
                  placeholder="Ah Ma's Kitchen"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+65 9123 4567"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  At least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  )
}