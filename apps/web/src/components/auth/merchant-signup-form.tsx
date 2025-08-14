'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@kitchencloud/ui'
import { Loader2 } from 'lucide-react'
import { validatePassword, validatePhoneNumber } from '@/lib/utils/validation'
import { api } from '@/app/api/trpc/client'

export function MerchantSignupForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'business' | 'account'>('business')
  
  // Form data
  const [businessData, setBusinessData] = useState({
    businessName: '',
    phone: '',
  })
  const [accountData,] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const merchantSignUp = api.auth.merchantSignUp.useMutation({
    onSuccess: () => {
      // Redirect to dashboard after successful signup
      router.push('/dashboard')
      router.refresh()
    },
    onError: (error: any) => {
      setError(error.message)
      setIsLoading(false)
    },
  })

  async function handleBusinessSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const businessName = formData.get('businessName') as string
    const phone = formData.get('phone') as string

    // Validate business name
    if (businessName.length < 2) {
      setError('Business name must be at least 2 characters')
      return
    }

    // Validate phone (Singapore format)
    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Singapore phone number')
      return
    }

    const cleanPhone = phone.replace(/[\s-]/g, '')
    
    setBusinessData({ businessName, phone: cleanPhone })
    setStep('account')
  }

  async function handleAccountSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '))
      setIsLoading(false)
      return
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Submit to API
    merchantSignUp.mutate({
      email,
      password,
      businessName: businessData.businessName,
      phone: businessData.phone,
    })
  }

  if (step === 'business') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Business Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBusinessSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                type="text"
                placeholder="Ah Ma's Kitchen"
                defaultValue={businessData.businessName}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed to customers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Business Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="9123 4567"
                defaultValue={businessData.phone}
                required
              />
              <p className="text-xs text-muted-foreground">
                Customers will contact you on this number
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Create Your Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              defaultValue={accountData.email}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You'll use this to log in to your dashboard
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('business')}
              disabled={isLoading}
              className="w-full"
            >
              Back
            </Button>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}