'use client'

import React from 'react'
import superjson from 'superjson'
import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink, loggerLink } from '@trpc/client'
import type { AppRouter } from '@homejiak/api'

export const api = createTRPCReact<AppRouter>()

// OPTIMIZATION: Prefetch helper for merchant data
export const prefetchMerchant = async (
  queryClient: QueryClient, 
  trpcClient: ReturnType<typeof api.createClient>,
  slug: string
) => {
  return queryClient.prefetchQuery({
    queryKey: [
      ['public', 'getMerchant'],
      { input: { slug }, type: 'query' }
    ],
    queryFn: () => trpcClient.public.getMerchant.query({ slug }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
        retryDelay: (attemptIndex: any) => Math.min(1000 * 2 ** attemptIndex, 30000),
        placeholderData: keepPreviousData,
        networkMode: 'offlineFirst'
      },
      mutations: {
        retry: 1
      }
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
          maxURLLength: 2083,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include', // This is the critical fix!
              headers: {
                ...options?.headers,
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
              }
            })
          },
        }),
      ],
    })
  )
  
    // OPTIMIZATION: Prefetch common routes on mount
  React.useEffect(() => {
    // Prefetch categories and common data that doesn't change often
    if (typeof window !== 'undefined') {
      // You could prefetch common merchant data here if needed
    }
  }, [queryClient, trpcClient])

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  )
}