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
            // For merchants, we have enough info from Supabase
            // The merchant data will be fetched by the dashboard when needed
            const user: AuthUser = {
              id: supabaseSession.user.id,
              email: supabaseSession.user.email!,
              userType: 'merchant',
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
              onAuthChange?.(user)
            }
          }
        } else {
          // Check for customer session
          const customerToken = localStorage.getItem(AUTH_STORAGE_KEYS.CUSTOMER_TOKEN)
          if (customerToken) {
            // For now, we'll trust the token exists
            // The actual validation will happen when making API calls
            // This avoids the redirect loop
            setState({
              user: { id: 'temp', phone: '', userType: 'customer' }, // Placeholder
              session: { user: { id: 'temp', phone: '', userType: 'customer' }, token: customerToken },
              isLoading: false,
              isAuthenticated: true,
              isMerchant: false,
              isCustomer: true,
              error: null,
            })
          } else {
            // No auth
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
          }
        }

        // Check for pending OTP
        const pendingOtpData = localStorage.getItem(AUTH_STORAGE_KEYS.PENDING_OTP)
        if (pendingOtpData) {
          const pending = JSON.parse(pendingOtpData) as PendingOtp
          if (pending.expiresAt > Date.now()) {
            setPendingOtp(pending)
          } else {
            localStorage.removeItem(AUTH_STORAGE_KEYS.PENDING_OTP)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
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
      }
    }

    initializeAuth()

    // Subscribe to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state change:', event, session?.user?.email)
      
      if (event === 'SIGNED_OUT' || !session) {
        setState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
          isMerchant: false,
          isCustomer: false,
          error: null,
        })
        onAuthChange?.(null)
      } else if (event === 'SIGNED_IN' && session) {
        const userType = session.user.user_metadata?.userType as 'merchant' | 'customer'
        
        if (userType === 'merchant') {
          const user: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            userType: 'merchant',
          }
          
          setState({
            user,
            session: { user },
            isLoading: false,
            isAuthenticated: true,
            isMerchant: true,
            isCustomer: false,
            error: null,
          })
          onAuthChange?.(user)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, onAuthChange])

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
        setState(prev => ({ ...prev, isLoading: false }))
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
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Failed to send OTP')
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
          
          setState(prev => ({ ...prev, isLoading: false }))
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
      // First create the account via tRPC (which creates both Supabase user and merchant record)
      const response = await fetch('/api/trpc/auth.merchantSignUp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to sign up')
      }

      // After successful signup, sign in with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      })

      if (error) throw error

      // Auth state will be updated by the auth state change listener
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
      throw error
    }
  }, [supabase])

  const verifyOtp = useCallback(async (otp: string) => {
    if (!pendingOtp) {
      throw new Error('No pending OTP verification')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Verify OTP
      const response = await fetch('/api/trpc/auth.verifyOtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: pendingOtp.customerId,
          otp,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Invalid OTP')
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
        
        onAuthChange?.(user)
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
      throw error
    }
  }, [pendingOtp, onAuthChange])

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Clear local storage
      localStorage.removeItem(AUTH_STORAGE_KEYS.CUSTOMER_TOKEN)
      localStorage.removeItem(AUTH_STORAGE_KEYS.PENDING_OTP)
      
      // Sign out from Supabase (for merchants)
      if (state.isMerchant) {
        await supabase.auth.signOut()
      }

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
      
      onAuthChange?.(null)
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error,
      }))
    }
  }, [supabase, state.isMerchant, onAuthChange])

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    if (state.isMerchant) {
      const { data } = await supabase.auth.refreshSession()
      if (data.session) {
        // Auth state will be updated by the listener
      }
    }
    
    setState(prev => ({ ...prev, isLoading: false }))
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