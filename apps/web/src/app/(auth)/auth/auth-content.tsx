'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Input, Label } from '@homejiak/ui'
import { Loader2, Store, ArrowLeft } from 'lucide-react'
import { useAuth } from '@homejiak/auth/client'
import { validatePassword, validatePhoneNumber } from '../../../lib/utils/validation'
import Link from 'next/link'

export default function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  
  const { 
    signIn, 
    signUp, 
    isLoading, 
    error: authError,
    isAuthenticated,
    isMerchant,
    user 
  } = useAuth()
  
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [isSigningIn, setIsSigningIn] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isLoading || isSigningIn) return
    
    if (isAuthenticated && isMerchant && user) {
      router.push(redirect)
    }
  }, [isAuthenticated, isMerchant, user, redirect, router, isLoading, isSigningIn])

  // Handle auth errors
  useEffect(() => {
    if (authError) {
      setError(authError.message)
      setIsSigningIn(false)
    }
  }, [authError])

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSigningIn(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await signIn(email, password)
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push(redirect)
    } catch (err) {
      setIsSigningIn(false)
      setError('Invalid email or password')
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSigningIn(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const businessName = formData.get('businessName') as string
    const phone = formData.get('phone') as string

    // Validate
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '))
      setIsSigningIn(false)
      return
    }

    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Singapore phone number')
      setIsSigningIn(false)
      return
    }

    try {
      await signUp({ 
        email, 
        password, 
        businessName,
        phone: phone.replace(/[\s-]/g, '')
      })
      router.push('/dashboard')
    } catch (err) {
      setIsSigningIn(false)
      setError('Failed to create account. Email may already be registered.')
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <Store className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold text-gray-900">Merchant Portal</h1>
        <p className="text-sm text-gray-600 mt-2">
          Manage your home-based food business
        </p>
      </div>

      {/* Customer CTA */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 text-center">
          Looking to order food?{' '}
          <Link href="/browse" className="font-semibold hover:underline">
            Browse restaurants →
          </Link>
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setError(null)
          }}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${
            mode === 'signin'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          disabled={isLoading || isSigningIn}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setError(null)
          }}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${
            mode === 'signup'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          disabled={isLoading || isSigningIn}
        >
          Create Account
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Sign In Form */}
      {mode === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              disabled={isLoading || isSigningIn}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading || isSigningIn}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || isSigningIn}
          >
            {isSigningIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          
          <div className="text-center">
            <Link 
              href="/forgot-password" 
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      )}

      {/* Sign Up Form */}
      {mode === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="Ah Ma's Kitchen"
              required
              disabled={isLoading || isSigningIn}
              autoFocus
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
              disabled={isLoading || isSigningIn}
            />
          </div>
          <div>
            <Label htmlFor="phone">Business Phone</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                +65
              </span>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="9123 4567"
                className="pl-12"
                required
                disabled={isLoading || isSigningIn}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              disabled={isLoading || isSigningIn}
            />
            <p className="text-xs text-muted-foreground mt-1">
              At least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || isSigningIn}
          >
            {isSigningIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Merchant Account'
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>
          </p>
        </form>
      )}

      {/* Back to Home */}
      <div className="mt-8 text-center">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}