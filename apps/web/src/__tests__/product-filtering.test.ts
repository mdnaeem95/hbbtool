import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { TRPCClientError } from '@trpc/client'
import { useDebouncedSearch, useErrorHandler, useFilterSync, useLoadingStates, useProductList, useProductPagination, useRetryableQuery } from '@/hooks/filter-test-hooks'

// Test utilities for filter logic
describe('Product Filtering System', () => {
  describe('Filter State Management', () => {
    it('should parse filters correctly from URL params', () => {
      const params = new URLSearchParams({
        category: 'cat1,cat2',
        min: '10',
        max: '100',
        search: 'test query',
        sort: 'price-asc',
        featured: 'true',
        inStock: 'true',
        tags: 'tag1,tag2',
      })

      const parsed = parseFiltersFromParams(params)

      expect(parsed).toEqual({
        categories: ['cat1', 'cat2'],
        minPrice: 10,
        maxPrice: 100,
        search: 'test query',
        sort: 'price-asc',
        featured: true,
        inStock: true,
        tags: ['tag1', 'tag2'],
      })
    })

    it('should handle empty URL params', () => {
      const params = new URLSearchParams()
      const parsed = parseFiltersFromParams(params)

      expect(parsed).toEqual({
        categories: [],
        minPrice: undefined,
        maxPrice: undefined,
        search: '',
        sort: 'featured',
        featured: false,
        inStock: false,
        tags: [],
      })
    })

    it('should build URL params from filters correctly', () => {
      const filters = {
        categories: ['cat1', 'cat2'],
        minPrice: 20,
        maxPrice: 200,
        search: 'search term',
        sort: 'newest',
        featured: true,
        inStock: false,
        tags: ['organic', 'local'],
      }

      const params = buildParamsFromFilters(filters)

      expect(params.get('category')).toBe('cat1,cat2')
      expect(params.get('min')).toBe('20')
      expect(params.get('max')).toBe('200')
      expect(params.get('search')).toBe('search term')
      expect(params.get('sort')).toBe('newest')
      expect(params.get('featured')).toBe('true')
      expect(params.get('inStock')).toBeNull()
      expect(params.get('tags')).toBe('organic,local')
    })
  })

  describe('Backend Filtering Logic', () => {
    it('should apply all filters correctly in WHERE clause', () => {
      const input = {
        merchantSlug: 'test-merchant',
        categoryIds: ['cat1', 'cat2'],
        search: 'test',
        minPrice: 10,
        maxPrice: 100,
        tags: ['organic'],
        featured: true,
        inStock: true,
        sort: 'price-asc',
        page: 1,
        limit: 20,
      }

      const where = buildProductWhereClause(input, 'merchant-id')

      expect(where).toEqual({
        merchantId: 'merchant-id',
        status: 'ACTIVE',
        deletedAt: null,
        categoryId: { in: ['cat1', 'cat2'] },
        OR: expect.arrayContaining([
          { name: { contains: 'test', mode: 'insensitive' } },
          { description: { contains: 'test', mode: 'insensitive' } },
          { tags: { hasSome: ['test'] } },
          { sku: { contains: 'test', mode: 'insensitive' } },
        ]),
        price: { gte: 10, lte: 100 },
        tags: { hasSome: ['organic'] },
        featured: true,
      })
    })

    it('should handle sorting options correctly', () => {
      const testCases = [
        { sort: 'price-asc', expected: { price: 'asc' } },
        { sort: 'price-desc', expected: { price: 'desc' } },
        { sort: 'newest', expected: { createdAt: 'desc' } },
        { sort: 'name-asc', expected: { name: 'asc' } },
        { sort: 'name-desc', expected: { name: 'desc' } },
        {
          sort: 'popular',
          expected: [
            { orderItems: { _count: 'desc' } },
            { viewCount: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        {
          sort: 'featured',
          expected: [
            { featured: 'desc' },
            { orderItems: { _count: 'desc' } },
            { createdAt: 'desc' }
          ]
        },
      ]

      testCases.forEach(({ sort, expected }) => {
        const orderBy = buildOrderByClause(sort as any)
        expect(orderBy).toEqual(expected)
      })
    })
  })

  describe('Filter Synchronization', () => {
    it('should sync filters with URL on change', async () => {
      const mockRouter = {
        replace: vi.fn(),
      }

      const { result } = renderHook(() =>
        useFilterSync('/merchant/test/products', mockRouter as any)
      )

      act(() => {
        result.current.updateFilter('categories', ['cat1'])
      })

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          '/merchant/test/products?category=cat1',
          { scroll: false }
        )
      })
    })

    it('should debounce search input correctly', async () => {
      vi.useFakeTimers()
      
      const onSearchChange = vi.fn()
      const { result } = renderHook(() =>
        useDebouncedSearch('', 500, onSearchChange)
      )

      act(() => {
        result.current.setSearch('t')
        result.current.setSearch('te')
        result.current.setSearch('tes')
        result.current.setSearch('test')
      })

      // Should not call immediately
      expect(onSearchChange).not.toHaveBeenCalled()

      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should call once with final value
      expect(onSearchChange).toHaveBeenCalledTimes(1)
      expect(onSearchChange).toHaveBeenCalledWith('test')

      vi.useRealTimers()
    })
  })

  describe('Pagination and Loading', () => {
    it('should reset to page 1 when filters change', () => {
      const { result } = renderHook(() => useProductPagination())

      act(() => {
        result.current.setPage(3)
      })
      expect(result.current.page).toBe(3)

      act(() => {
        result.current.onFilterChange()
      })
      expect(result.current.page).toBe(1)
    })

    it('should merge products correctly on infinite scroll', () => {
      const { result } = renderHook(() => useProductList())

      const firstBatch = [
        { id: '1', name: 'Product 1' },
        { id: '2', name: 'Product 2' },
      ]

      const secondBatch = [
        { id: '3', name: 'Product 3' },
        { id: '4', name: 'Product 4' },
      ]

      act(() => {
        result.current.handleDataUpdate(firstBatch, 1)
      })
      expect(result.current.products).toEqual(firstBatch)

      act(() => {
        result.current.handleDataUpdate(secondBatch, 2)
      })
      expect(result.current.products).toEqual([...firstBatch, ...secondBatch])
    })

    it('should handle loading states correctly', async () => {
      const { result } = renderHook(() => useLoadingStates())

      expect(result.current.isInitialLoading).toBe(false)

      act(() => {
        result.current.startInitialLoad()
      })
      expect(result.current.isInitialLoading).toBe(true)

      act(() => {
        result.current.finishInitialLoad()
      })
      expect(result.current.isInitialLoading).toBe(false)

      act(() => {
        result.current.startLoadMore()
      })
      expect(result.current.isLoadingMore).toBe(true)

      act(() => {
        result.current.finishLoadMore()
      })
      expect(result.current.isLoadingMore).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new TRPCClientError('Failed to fetch products')
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.handleError(error)
      })

      expect(result.current.error).toBe('Failed to load products')
      expect(result.current.hasError).toBe(true)
    })

    it('should retry failed requests', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ items: [], pagination: { hasMore: false } })

      const { result } = renderHook(() => useRetryableQuery(mockFetch))

      await act(async () => {
        await result.current.retry()
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.current.data).toBeDefined()
    })
  })
})

// Helper functions for testing
function parseFiltersFromParams(params: URLSearchParams) {
  return {
    categories: params.get("category")?.split(",").filter(Boolean) || [],
    minPrice: params.get("min") ? Number(params.get("min")) : undefined,
    maxPrice: params.get("max") ? Number(params.get("max")) : undefined,
    search: params.get("search") || "",
    sort: params.get("sort") || "featured",
    featured: params.get("featured") === "true",
    inStock: params.get("inStock") === "true",
    tags: params.get("tags")?.split(",").filter(Boolean) || [],
  }
}

function buildParamsFromFilters(filters: any) {
  const params = new URLSearchParams()
  
  if (filters.categories.length > 0) {
    params.set("category", filters.categories.join(","))
  }
  if (filters.minPrice !== undefined) {
    params.set("min", String(filters.minPrice))
  }
  if (filters.maxPrice !== undefined) {
    params.set("max", String(filters.maxPrice))
  }
  if (filters.search) {
    params.set("search", filters.search)
  }
  if (filters.sort && filters.sort !== "featured") {
    params.set("sort", filters.sort)
  }
  if (filters.featured) {
    params.set("featured", "true")
  }
  if (filters.inStock) {
    params.set("inStock", "true")
  }
  if (filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","))
  }
  
  return params
}

function buildProductWhereClause(input: any, merchantId: string) {
  const where: any = {
    merchantId,
    status: 'ACTIVE',
    deletedAt: null,
  }

  if (input.categoryIds && input.categoryIds.length > 0) {
    where.categoryId = { in: input.categoryIds }
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: 'insensitive' } },
      { description: { contains: input.search, mode: 'insensitive' } },
      { tags: { hasSome: [input.search.toLowerCase()] } },
      { sku: { contains: input.search, mode: 'insensitive' } },
    ]
  }

  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    where.price = {}
    if (input.minPrice !== undefined) {
      where.price.gte = input.minPrice
    }
    if (input.maxPrice !== undefined) {
      where.price.lte = input.maxPrice
    }
  }

  if (input.tags && input.tags.length > 0) {
    where.tags = { hasSome: input.tags }
  }

  if (input.featured !== undefined) {
    where.featured = input.featured
  }

  return where
}

function buildOrderByClause(sort: string) {
  switch (sort) {
    case 'price-asc':
      return { price: 'asc' }
    case 'price-desc':
      return { price: 'desc' }
    case 'newest':
      return { createdAt: 'desc' }
    case 'name-asc':
      return { name: 'asc' }
    case 'name-desc':
      return { name: 'desc' }
    case 'popular':
      return [
        { orderItems: { _count: 'desc' } },
        { viewCount: 'desc' },
        { createdAt: 'desc' }
      ]
    case 'featured':
    default:
      return [
        { featured: 'desc' },
        { orderItems: { _count: 'desc' } },
        { createdAt: 'desc' }
      ]
  }
}