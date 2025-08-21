'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AUTH_STORAGE_KEYS } from './types'
import type { 
  AuthContextValue, 
  AuthState, 
  AuthUser, 
  SignInParams, 
  SignUpParams
} from './types'

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: React.ReactNode
  onAuthChange?: (user: AuthUser | null) => void
}

interface PendingOtp {
  customerId: string
  phone: string
  expiresAt: number
}

export function AuthProvider({ children, onAuthChange }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isMerchant: false,
    isCustomer: false,
    error: null,
  })

  const [pendingOtp, setPendingOtp] = useState<PendingOtp | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Check Supabase session (merchants)
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        
        if (supabaseSession?.user) {
          const userType = supabaseSession.user.user_metadata?.userType as 'merchant' | 'customer'
          
          if (userType === 'merchant') {
            // Fetch merchant data
            const response = await fetch('/api/trpc/auth.getSession', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.result?.data?.merchant) {
                const user: AuthUser = {
                  id: supabaseSession.user.id,
                  email: supabaseSession.user.email!,
                  userType: 'merchant',
                  merchant: data.result.data.merchant,
                }
                
                if (mounted) {
                  setState({
                    user,
                    session: { user },
                    isLoading: false,
                    isAuthenticated: true,
                    isMerchant: true,
                    isCustomer: false,
                    error: null,
                  })
                }
                return
              }
            }
          }
        }

        // Check customer token
        const customerToken = localStorage.getItem(AUTH_STORAGE_KEYS.CUSTOMER_TOKEN)
        if (customerToken) {
          const response = await fetch('/api/trpc/auth.getSession', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${customerToken}`,
            },
            body: JSON.stringify({}),
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.result?.data?.customer) {
              const user: AuthUser = {
                id: data.result.data.customer.id,
                phone: data.result.data.customer.phone,
                userType: 'customer',
                customer: data.result.data.customer,
              }
              
              if (mounted) {
                setState({
                  user,
                  session: { user, token: customerToken },
                  isLoading: false,
                  isAuthenticated: true,
                  isMerchant: false,
                  isCustomer: true,
                  error: null,
                })
              }
              return
            }
          }
        }

        // No valid session
        if (mounted) {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isMerchant: false,
            isCustomer: false,
            error: null,
          })
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: error as Error,
          }))
        }
      }
    }

    initializeAuth()

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Re-initialize to fetch latest data
          initializeAuth()
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isMerchant: false,
            isCustomer: false,
            error: null,
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // Notify parent of auth changes
  useEffect(() => {
    onAuthChange?.(state.user)
  }, [state.user, onAuthChange])

  const signIn = useCallback(async (params: SignInParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      if (params.type === 'merchant') {
        // Merchant sign in via Supabase
        const { error } = await supabase.auth.signInWithPassword({
          email: params.email,
          password: params.password,
        })

        if (error) throw error

        // Auth state will be updated by the auth state change listener
      } else {
        // Customer sign in - request OTP
        const response = await fetch('/api/trpc/auth.customerSignIn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: params.phone,
            name: params.name,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to send OTP')
        }

        const data = await response.json()
        if (data.result?.data) {
          // Store pending OTP info
          const pending = {
            customerId: data.result.data.customerId,
            phone: params.phone,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          }
          setPendingOtp(pending)
          localStorage.setItem(AUTH_STORAGE_KEYS.PENDING_OTP, JSON.stringify(pending))
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
      throw error
    }
  }, [supabase])

  const signUp = useCallback(async (params: SignUpParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/trpc/auth.merchantSignUp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to sign up')
      }

      // Auth state will be updated by the auth state change listener
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
      throw error
    }
  }, [])

  const verifyOtp = useCallback(async (otp: string) => {
    if (!pendingOtp) {
      throw new Error('No pending OTP verification')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/trpc/auth.verifyOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: pendingOtp.customerId,
          otp,
        }),
      })

      if (!response.ok) {
        throw new Error('Invalid OTP')
      }

      const data = await response.json()
      if (data.result?.data) {
        const { customer, sessionToken } = data.result.data
        
        // Store customer token
        localStorage.setItem(AUTH_STORAGE_KEYS.CUSTOMER_TOKEN, sessionToken)
        localStorage.removeItem(AUTH_STORAGE_KEYS.PENDING_OTP)
        setPendingOtp(null)

        // Update auth state
        const user: AuthUser = {
          id: customer.id,
          phone: customer.phone,
          userType: 'customer',
          customer,
        }

        setState({
          user,
          session: { user, token: sessionToken },
          isLoading: false,
          isAuthenticated: true,
          isMerchant: false,
          isCustomer: true,
          error: null,
        })
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
      throw error
    }
  }, [pendingOtp])

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Clear local storage
      localStorage.removeItem(AUTH_STORAGE_KEYS.CUSTOMER_TOKEN)
      localStorage.removeItem(AUTH_STORAGE_KEYS.PENDING_OTP)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Call signOut API
      await fetch('/api/trpc/auth.signOut', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state.session?.token && {
            'Authorization': `Bearer ${state.session.token}`,
          }),
        },
        body: JSON.stringify({}),
      })

      // Clear state
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        isMerchant: false,
        isCustomer: false,
        error: null,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
    }
  }, [supabase, state.session?.token])

  const refresh = useCallback(async () => {
    // Re-run initialization
    setState(prev => ({ ...prev, isLoading: true }))
    
    if (state.isMerchant) {
      const { data } = await supabase.auth.refreshSession()
      if (data.session) {
        // Auth state will be updated by the listener
      }
    } else {
      // For customers, re-validate token
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.CUSTOMER_TOKEN)
      if (token) {
        // Re-fetch session data
        window.location.reload() // Simple approach for now
      }
    }
  }, [supabase, state.isMerchant])

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    verifyOtp,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}