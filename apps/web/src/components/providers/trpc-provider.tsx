'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useState } from 'react'
import type { AppRouter } from '@kitchencloud/api'
import superjson from 'superjson'
import { getUrl } from '@/lib/trpc/utils'

export const api = createTRPCReact<AppRouter>()

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    })
  )

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: getUrl(),
          transformer: superjson,
          // You can add headers here if needed
          headers() {
            return {
              'x-trpc-source': 'react',
            }
          },
        }),
      ],
    })
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  )
}