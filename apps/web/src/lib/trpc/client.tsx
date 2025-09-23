'use client'

import React from 'react'
import superjson from 'superjson'
import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import { httpBatchLink, loggerLink, TRPCLink } from '@trpc/client'
import type { AppRouter } from '@homejiak/api'
import { apiMonitor } from '../../hooks/use-api-performance'
import { observable } from '@trpc/server/observable'

export const api = createTRPCReact<AppRouter>()

// Custom link to track performance
const performanceLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    // Track the start time
    const startTime = performance.now()
    const path = op.path
    
    return observable((observer) => {
      let hasResult = false
      
      const subscription = next(op).subscribe({
        next(value) {
          hasResult = true
          const duration = performance.now() - startTime
          
          // Record successful API call
          apiMonitor.recordApiCall({
            endpoint: path,
            duration,
            timestamp: Date.now(),
            status: 'success',
          })
          
          // Log in development
          if (process.env.NODE_ENV === 'development') {
            const colorCode = duration < 200 ? '\x1b[32m' : duration < 500 ? '\x1b[33m' : '\x1b[31m'
            console.log(
              `${colorCode}[tRPC]`,
              `${path} completed in ${duration.toFixed(2)}ms`,
              '\x1b[0m'
            )
          }
          
          observer.next(value)
        },
        error(err) {
          hasResult = true
          const duration = performance.now() - startTime
          
          // Record failed API call
          apiMonitor.recordApiCall({
            endpoint: path,
            duration,
            timestamp: Date.now(),
            status: 'error',
          })
          
          // Log error in development
          if (process.env.NODE_ENV === 'development') {
            console.error(
              '\x1b[31m[tRPC Error]\x1b[0m',
              `${path} failed after ${duration.toFixed(2)}ms:`,
              err
            )
          }
          
          observer.error(err)
        },
        complete() {
          // If no result was received, still track it
          if (!hasResult) {
            const duration = performance.now() - startTime
            apiMonitor.recordApiCall({
              endpoint: path,
              duration,
              timestamp: Date.now(),
              status: 'success',
            })
          }
          observer.complete()
        },
      })
      
      return subscription
    })
  }
}

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
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        placeholderData: keepPreviousData,
        networkMode: 'offlineFirst'
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          // Track mutation errors
          if (process.env.NODE_ENV === 'development') {
            console.error('Mutation error:', error)
          }
        }
      }
    },
  }))
  
  const [trpcClient] = React.useState(() =>
    api.createClient({
      links: [
        // Performance tracking link (must be first to track the full request)
        performanceLink,
        
        // Logger link for development (optional, can be removed if using performanceLink)
        loggerLink({ 
          enabled: () => process.env.NODE_ENV === 'development',
          console: {
            // Disable default logging since we're handling it in performanceLink
            log: () => {},
            error: () => {},
          }
        }),
        
        // HTTP Batch Link with enhanced fetch
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          maxURLLength: 2083,
          
          // Enhanced fetch with size tracking
          async fetch(url, options) {
            const startTime = performance.now()
            
            try {
              const response = await fetch(url, {
                ...options,
                credentials: 'include',
                headers: {
                  ...options?.headers,
                  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
                },
                // Add timeout
                signal: AbortSignal.timeout(30000), // 30 second timeout
              })
              
              // Track response size
              const contentLength = response.headers.get('content-length')
              const responseTime = response.headers.get('x-response-time')
              
              if (process.env.NODE_ENV === 'development') {
                const duration = performance.now() - startTime
                const size = contentLength ? parseInt(contentLength) : 0
                
                console.log(
                  `[HTTP] ${response.ok ? '✓' : '✗'} ${response.status}`,
                  `${duration.toFixed(0)}ms`,
                  size > 0 ? `${(size / 1024).toFixed(1)}KB` : '',
                  responseTime ? `(server: ${responseTime})` : ''
                )
              }
              
              return response
            } catch (error) {
              const duration = performance.now() - startTime
              
              if (process.env.NODE_ENV === 'development') {
                console.error(`[HTTP Error] Request failed after ${duration.toFixed(0)}ms:`, error)
              }
              
              throw error
            }
          },
        }),
      ],
    })
  )
  
  // OPTIMIZATION: Prefetch common routes on mount
  React.useEffect(() => {
    // Only prefetch in production and if we're on a fast connection
    if (typeof window !== 'undefined' && 
        process.env.NODE_ENV === 'production' &&
        'connection' in navigator) {
      
      const connection = (navigator as any).connection
      
      // Only prefetch on fast connections
      if (connection?.effectiveType === '4g' && !connection?.saveData) {
        // You could prefetch common data here
        // Example: prefetch popular merchants or categories
      }
    }
  }, [queryClient, trpcClient])

  // Add global error boundary for API errors
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('tRPC')) {
        console.error('Unhandled tRPC error:', event.reason)
        // You could send this to your error tracking service
      }
    }
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  )
}

// Export utility to get current performance stats
export function getApiPerformanceStats() {
  return apiMonitor.getStats()
}

// Export utility to clear performance data
export function clearApiPerformanceData() {
  apiMonitor.clear()
}