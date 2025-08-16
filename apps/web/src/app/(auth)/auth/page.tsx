'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, Label } from '@kitchencloud/ui'
import { Loader2, Store, User } from 'lucide-react'
import { api } from '@/lib/trpc/client'
import { validatePassword, validatePhoneNumber } from '@/lib/utils/validation'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'customer' | 'merchant'>('customer')
  const [merchantTab, setMerchantTab] = useState<'signin' | 'signup'>('signin')

  // Customer auth mutations
  const customerSignIn = api.auth.customerSignIn.useMutation({
    onSuccess: (data) => {
      // customerSignIn returns { customerId, otp, message }
      // We don't store anything here, just move to OTP step
      setCustomerId(data.customerId)
      setShowOtp(true)
      setIsLoading(false)
      setError(null)
      // Show the OTP in dev mode (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Dev OTP:', data.otp)
      }
    },
    onError: (error) => {
      setError(error.message)
      setIsLoading(false)
    }
  })

  const verifyOtp = api.auth.verifyOtp.useMutation({
    onSuccess: (data) => {
      // verifyOtp returns { customer, sessionToken }
      localStorage.setItem('customerToken', data.sessionToken)
      router.push(redirect)
      router.refresh()
    },
    onError: (error) => {
      setError(error.message)
      setIsLoading(false)
    }
  })

  // Merchant auth mutations  
  const merchantSignIn = api.auth.merchantSignIn.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
    onError: (error) => {
      setError(error.message)
      setIsLoading(false)
    }
  })

  const merchantSignUp = api.auth.merchantSignUp.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
    onError: (error) => {
      setError(error.message)
      setIsLoading(false)
    }
  })

  // Customer phone auth state
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [showOtp, setShowOtp] = useState(false)

  async function handleCustomerAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    if (!showOtp) {
      // Step 1: Send OTP
      const phone = formData.get('phone') as string
      const name = formData.get('name') as string

      if (!validatePhoneNumber(phone)) {
        setError('Please enter a valid Singapore phone number')
        setIsLoading(false)
        return
      }

      const cleanPhone = phone.replace(/[\s-]/g, '')
      setCustomerPhone(phone) // Store the display version
      
      customerSignIn.mutate({ 
        phone: cleanPhone,
        name: name || undefined 
      })
    } else {
      // Step 2: Verify OTP
      const otp = formData.get('otp') as string
      
      if (!customerId) {
        setError('Session expired. Please try again.')
        setShowOtp(false)
        setIsLoading(false)
        return
      }
      
      verifyOtp.mutate({ customerId, otp })
    }
  }

  async function handleMerchantSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    merchantSignIn.mutate({ email, password })
  }

  async function handleMerchantSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
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
      setIsLoading(false)
      return
    }

    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Singapore phone number')
      setIsLoading(false)
      return
    }

    merchantSignUp.mutate({ 
      email, 
      password, 
      businessName,
      phone: phone.replace(/[\s-]/g, '')
    })
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
            setCustomerId(null)
          }}
          className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
            accountType === 'customer' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <User className="h-6 w-6 mx-auto mb-2 text-primary" />
          <div className="text-sm font-medium">Customer</div>
          <div className="text-xs text-muted-foreground">Order food</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setAccountType('merchant')
            setError(null)
            setShowOtp(false)
            setCustomerId(null)
          }}
          className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
            accountType === 'merchant' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <Store className="h-6 w-6 mx-auto mb-2 text-primary" />
          <div className="text-sm font-medium">Merchant</div>
          <div className="text-xs text-muted-foreground">Sell food</div>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Customer Auth */}
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
                  placeholder="9123 4567"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Singapore mobile number without country code
                </p>
              </div>
              <div>
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to
                </p>
                <p className="font-medium">{customerPhone}</p>
              </div>
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                  autoFocus
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Sign In
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowOtp(false)
                  setCustomerId(null)
                  setError(null)
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                Use a different number
              </button>
            </>
          )}
        </form>
      )}

      {/* Merchant Auth */}
      {accountType === 'merchant' && (
        <div className="w-full space-y-6">
          {/* Custom Tab Navigation */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMerchantTab('signin')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                merchantTab === 'signin'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMerchantTab('signup')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                merchantTab === 'signup'
                  ? 'bg-background text-foreground shadow-sm'
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
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMerchantTab('signup')}
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </button>
              </p>
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
                />
              </div>
              <div>
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Business Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="9123 4567"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Min 8 chars with uppercase, lowercase & numbers
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMerchantTab('signin')}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  )
}