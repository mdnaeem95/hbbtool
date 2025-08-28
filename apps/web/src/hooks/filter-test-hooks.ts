// apps/web/src/hooks/filter-test-hooks.ts
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Hook for filter synchronization with URL
export function useFilterSync(pathname: string, router: ReturnType<typeof useRouter>) {
  const [filters, setFilters] = useState<Record<string, any>>({})

  const updateFilter = useCallback((key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    if (newFilters.categories?.length > 0) {
      params.set('category', newFilters.categories.join(','))
    }
    
    const url = params.toString() ? `${pathname}?${params}` : pathname
    router.replace(url, { scroll: false })
  }, [filters, pathname, router])

  return { filters, updateFilter }
}

// Hook for debounced search
export function useDebouncedSearch(
  initialValue: string, 
  delay: number, 
  onSearchChange: (value: string) => void
) {
  const [search, setSearch] = useState(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onSearchChange(search)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [search, delay])

  return { search, setSearch }
}

// Hook for pagination management
export function useProductPagination() {
  const [page, setPage] = useState(1)
  
  const onFilterChange = useCallback(() => {
    setPage(1)
  }, [])

  return { page, setPage, onFilterChange }
}

// Hook for product list management
export function useProductList() {
  const [products, setProducts] = useState<any[]>([])

  const handleDataUpdate = useCallback((newProducts: any[], currentPage: number) => {
    if (currentPage === 1) {
      setProducts(newProducts)
    } else {
      setProducts(prev => [...prev, ...newProducts])
    }
  }, [])

  return { products, handleDataUpdate }
}

// Hook for loading states
export function useLoadingStates() {
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const startInitialLoad = useCallback(() => {
    setIsInitialLoading(true)
  }, [])

  const finishInitialLoad = useCallback(() => {
    setIsInitialLoading(false)
  }, [])

  const startLoadMore = useCallback(() => {
    setIsLoadingMore(true)
  }, [])

  const finishLoadMore = useCallback(() => {
    setIsLoadingMore(false)
  }, [])

  return {
    isInitialLoading,
    isLoadingMore,
    startInitialLoad,
    finishInitialLoad,
    startLoadMore,
    finishLoadMore,
  }
}

// Hook for error handling
export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)

  const handleError = useCallback((err: Error) => {
    setError(`Failed to load products: ${err}`,)
    setHasError(true)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setHasError(false)
  }, [])

  return { error, hasError, handleError, clearError }
}

// Hook for retryable queries
export function useRetryableQuery(fetchFn: () => Promise<any>) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(async () => {
    try {
      const result = await fetchFn()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err as Error)
      setRetryCount(prev => prev + 1)
      
      // Retry once more if first attempt failed
      if (retryCount === 0) {
        setTimeout(() => retry(), 1000)
      }
    }
  }, [fetchFn, retryCount])

  return { data, error, retry, retryCount }
}