'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createBrowserSupabaseClient } from './client'
import type { AuthUser, AuthState, SignUpParams, AuthSession } from '@homejiak/types'
import type { AuthContextValue } from './types'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ 
  children,
  onAuthChange,
}: {
  children: React.ReactNode
  onAuthChange?: (user: AuthUser | null) => void
}) {
  const supabase = createBrowserSupabaseClient()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isMerchant: false,
    error: null,
  })

  useEffect(() => {
    // Only check for merchant sessions
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && session.user.user_metadata?.userType === 'merchant') {
          const user: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            userType: 'merchant'
          }

          const authSession: AuthSession = {
            user,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
          }
          
          setState({
            user,
            session: authSession,
            isLoading: false,
            isAuthenticated: true,
            isMerchant: true,
            error: null,
          })
        } else {
          setState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isMerchant: false,
            error: null,
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
          isMerchant: false,
          error: null,
        })
        onAuthChange?.(null)
      } else if (event === 'SIGNED_IN' && session) {
        if (session.user.user_metadata?.userType === 'merchant') {
          const user: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            userType: 'merchant'
          }

          const authSession: AuthSession = {
            user,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
          }
          
          setState({
            user,
            session: authSession,
            isLoading: false,
            isAuthenticated: true,
            isMerchant: true,
            error: null,
          })
          onAuthChange?.(user)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, onAuthChange])

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
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

  const signUp = useCallback(async (params: SignUpParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Create merchant account via API
      const response = await fetch('/api/trpc/auth.merchantSignUp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to sign up')
      }

      // Sign in after signup
      const { error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      })

      if (error) throw error
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

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      await supabase.auth.signOut()
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        isMerchant: false,
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
  }, [supabase, onAuthChange])

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    const { data } = await supabase.auth.refreshSession()
    if (data.session) {
      // Auth state will be updated by the listener
    }
    setState(prev => ({ ...prev, isLoading: false }))
  }, [supabase])

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
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