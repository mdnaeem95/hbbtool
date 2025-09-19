'use client'

import React from 'react'
import superjson from 'superjson'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import type { AppRouter } from '@kitchencloud/api'

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