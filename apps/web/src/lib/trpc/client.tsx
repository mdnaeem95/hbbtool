'use client'

import React from 'react'
import superjson from 'superjson'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import type { AppRouter } from '@kitchencloud/api'

const AUTH_STORAGE_KEYS = {
  CUSTOMER_TOKEN: 'kc_customer_token',
  PENDING_OTP: 'kc_pending_otp',
} as const

export const api = createTRPCReact<AppRouter>()

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }))
  
  const [trpcClient] = React.useState(() =>
    api.createClient({
      links: [
        loggerLink({ 
          enabled: () => process.env.NODE_ENV === 'development' 
        }),
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          headers() {
            const headers: Record<string, string> = {}
            
            // Include customer auth token if present
            if (typeof window !== 'undefined') {
              const customerToken = localStorage.getItem(AUTH_STORAGE_KEYS.CUSTOMER_TOKEN)
              if (customerToken) {
                headers['Authorization'] = `Bearer ${customerToken}`
              }
            }
            
            return headers
          },
          // CRITICAL: This ensures Supabase auth cookies are sent with every request
          // Without credentials: 'include', the server won't receive the auth cookies
          // and ctx.session will be null, causing UNAUTHORIZED errors
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include', // This is the critical fix!
            })
          },
        }),
      ],
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  )
}