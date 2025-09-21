'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '../../../lib/trpc/client'

type AuthMode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const signUpMutation = api.auth.merchantSignUp.useMutation({
    onSuccess: () => {
      setSubmittedEmail(email)
      setSignupSuccess(true)
    },
    onError: (error: any) => {
      if (error.message?.includes('already registered')) {
        setError('This email is already registered. Please sign in.')
      } else if (error.message?.includes('Too many signup')) {
        setError('Too many signup attempts. Please try again later.')
      } else {
        setError(error.message || 'Failed to create account')
      }
    }
  })

  const signInMutation = api.auth.merchantSignIn.useMutation({
    onSuccess: (data) => {
      console.log('====== CLIENT AUTH DEBUG ======')
      console.log('✅ Login successful')
      console.log('📦 Full response data:', data)
      console.log('👤 User data:', data.user)
      console.log('🏪 Merchant data:', data.merchant)
      console.log('🔑 isAdmin value:', data.isAdmin)
      console.log('🔍 Type of isAdmin:', typeof data.isAdmin)
      console.log('===============================')
      
      // Check if admin and redirect accordingly
      if (data.isAdmin === true) {  // Be explicit with the check
        console.log('👨‍💼 Admin user detected, redirecting to admin dashboard')
        // Add a small delay to see the console logs
        setTimeout(() => {
          window.location.href = '/admin/dashboard'
        }, 1000)
      } else {
        console.log('🏪 Merchant user, redirecting to merchant dashboard')
        console.log('❓ Why not admin? isAdmin =', data.isAdmin)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    },
    onError: (error) => {
      console.error('❌ Login error:', error)
      setError(error.message)
    }
  })

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    signInMutation.mutate({ email, password })
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!email || !password || !businessName || !phone) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const formattedPhone = phone.startsWith('+65') ? phone : `+65${phone}`

    signUpMutation.mutate({ 
      email, 
      password, 
      businessName,
      phone: formattedPhone
    })
  }

  // Show success message after signup
  if (signupSuccess) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        <div className="p-8 bg-green-50 rounded-lg border border-green-200">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted!
          </h2>
          
          <p className="text-gray-600 mb-4">
            Thank you for applying to join KitchenCloud.
          </p>
          
          <div className="bg-white p-4 rounded-lg text-left space-y-2">
            <h3 className="font-semibold text-gray-900">What happens next?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Our team will review your application within 24-48 hours</li>
              <li>• We'll verify your business details</li>
              <li>• You'll receive an email at <span className="font-medium">{submittedEmail}</span></li>
              <li>• Once approved, you can start accepting orders!</li>
            </ul>
          </div>
        </div>
        
        <p className="text-sm text-gray-500">
          Have questions? Contact us at{' '}
          <a href="mailto:support@kitchencloud.sg" className="text-orange-600 hover:underline">
            support@kitchencloud.sg
          </a>
        </p>
        
        <Link href="/" className="inline-block text-sm text-gray-600 hover:text-gray-900">
          ← Back to home
        </Link>
      </div>
    )
  }

  const isLoading = signUpMutation.isPending || signInMutation.isPending

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Merchant Portal
        </h2>
        <p className="mt-2 text-gray-600">
          Manage your home-based food business
        </p>
      </div>

      {/* Customer CTA - redirect to browse */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900 text-center">
          Looking to order food?{' '}
          <Link href="/browse" className="font-medium hover:underline">
            Browse restaurants →
          </Link>
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${
            mode === 'signin'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sign In
        </button>
        
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${
            mode === 'signup'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Sign In Form */}
      {mode === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          <p className="text-center text-sm text-gray-600">
            <Link href="/forgot-password" className="text-orange-600 hover:underline">
              Forgot your password?
            </Link>
          </p>
        </form>
      )}

      {/* Sign Up Form */}
      {mode === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Aunty Mary's Kitchen"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Business Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                +65
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="9123 4567"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="At least 8 characters"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters long
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating account...
              </span>
            ) : (
              'Create Merchant Account'
            )}
          </button>

          <p className="text-xs text-center text-gray-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-orange-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-orange-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </form>
      )}

      {/* Trust badges */}
      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure platform
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Zero commission
          </span>
        </div>
      </div>
    </div>
  )
}