import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import type { Product } from "@kitchencloud/database"

interface ProductWithMerchant extends Product {
  merchant: {
    id: string
    name: string
    slug: string
    logo?: string | null
  }
}

interface ProductFilters {
  categories: string[]
  minPrice?: number
  maxPrice?: number
  search?: string
  status?: "ACTIVE" | "SOLD_OUT" | "UNAVAILABLE"
  featured?: boolean
  available?: boolean
  tags?: string[]
  preparationTime?: string
}

interface CatalogState {
  // Products cache
  products: Map<string, ProductWithMerchant>
  
  // View state
  filters: ProductFilters
  sortBy: "featured" | "price-asc" | "price-desc" | "newest" | "popular" | "name"
  viewMode: "grid" | "list"
  
  // Recently viewed
  recentlyViewed: string[]
  
  // Favorites
  favorites: Set<string>
  
  // Loading states
  isLoading: boolean
  isLoadingMore: boolean
  
  // Pagination
  hasMore: boolean
  cursor?: string
}

interface CatalogActions {
  // Product management
  setProducts: (products: ProductWithMerchant[]) => void
  addProducts: (products: ProductWithMerchant[]) => void
  updateProduct: (productId: string, updates: Partial<ProductWithMerchant>) => void
  removeProduct: (productId: string) => void
  
  // Filtering
  setFilters: (filters: Partial<ProductFilters>) => void
  clearFilters: () => void
  
  // Sorting
  setSortBy: (sortBy: CatalogState["sortBy"]) => void
  
  // View preferences
  setViewMode: (mode: "grid" | "list") => void
  
  // Recently viewed
  addRecentlyViewed: (productId: string) => void
  clearRecentlyViewed: () => void
  
  // Favorites
  toggleFavorite: (productId: string) => void
  isFavorite: (productId: string) => boolean
  
  // Loading states
  setIsLoading: (loading: boolean) => void
  setIsLoadingMore: (loading: boolean) => void
  
  // Pagination
  setHasMore: (hasMore: boolean) => void
  setCursor: (cursor?: string) => void
  
  // Utilities
  getProduct: (productId: string) => ProductWithMerchant | undefined
  getFilteredProducts: () => ProductWithMerchant[]
  getSortedProducts: (products: ProductWithMerchant[]) => ProductWithMerchant[]
}

export const useCatalogStore = create<CatalogState & CatalogActions>()(
  persist(
    immer((set, get) => ({
      // Initial state
      products: new Map(),
      filters: {
        categories: [],
      },
      sortBy: "featured",
      viewMode: "grid",
      recentlyViewed: [],
      favorites: new Set(),
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,

      // Actions
      setProducts: (products) =>
        set((state) => {
          state.products.clear()
          products.forEach((product) => {
            state.products.set(product.id, product)
          })
        }),

      addProducts: (products) =>
        set((state) => {
          products.forEach((product) => {
            state.products.set(product.id, product)
          })
        }),

      updateProduct: (productId, updates) =>
        set((state) => {
          const product = state.products.get(productId)
          if (product) {
            state.products.set(productId, { ...product, ...updates })
          }
        }),

      removeProduct: (productId) =>
        set((state) => {
          state.products.delete(productId)
        }),

      setFilters: (filters) =>
        set((state) => {
          state.filters = { ...state.filters, ...filters }
        }),

      clearFilters: () =>
        set((state) => {
          state.filters = { categories: [] }
        }),

      setSortBy: (sortBy) =>
        set((state) => {
          state.sortBy = sortBy
        }),

      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode
        }),

      addRecentlyViewed: (productId) =>
        set((state) => {
          // Remove if already exists
          state.recentlyViewed = state.recentlyViewed.filter((id) => id !== productId)
          // Add to beginning
          state.recentlyViewed.unshift(productId)
          // Keep only last 10
          state.recentlyViewed = state.recentlyViewed.slice(0, 10)
        }),

      clearRecentlyViewed: () =>
        set((state) => {
          state.recentlyViewed = []
        }),

      toggleFavorite: (productId) =>
        set((state) => {
          if (state.favorites.has(productId)) {
            state.favorites.delete(productId)
          } else {
            state.favorites.add(productId)
          }
        }),

      isFavorite: (productId) => {
        return get().favorites.has(productId)
      },

      setIsLoading: (loading) =>
        set((state) => {
          state.isLoading = loading
        }),

      setIsLoadingMore: (loading) =>
        set((state) => {
          state.isLoadingMore = loading
        }),

      setHasMore: (hasMore) =>
        set((state) => {
          state.hasMore = hasMore
        }),

      setCursor: (cursor) =>
        set((state) => {
          state.cursor = cursor
        }),

      getProduct: (productId) => {
        return get().products.get(productId)
      },

      getFilteredProducts: () => {
        const state = get()
        const products = Array.from(state.products.values())
        const { filters } = state

        return products.filter((product) => {
          // Category filter
          if (filters.categories.length > 0) {
            if (!filters.categories.includes(product.categoryId)) {
              return false
            }
          }

          // Price filter
          if (filters.minPrice !== undefined) {
            if (product.price.toNumber() < filters.minPrice) {
              return false
            }
          }
          if (filters.maxPrice !== undefined) {
            if (product.price.toNumber() > filters.maxPrice) {
              return false
            }
          }

          // Search filter
          if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            const nameMatch = product.name.toLowerCase().includes(searchLower)
            const descMatch = product.description?.toLowerCase().includes(searchLower)
            const tagMatch = product.tags?.some((tag) =>
              tag.toLowerCase().includes(searchLower)
            )
            if (!nameMatch && !descMatch && !tagMatch) {
              return false
            }
          }

          // Status filter
          if (filters.status) {
            if (product.status !== filters.status) {
              return false
            }
          }

          // Featured filter
          if (filters.featured !== undefined) {
            if (product.featured !== filters.featured) {
              return false
            }
          }

          // Available filter
          if (filters.available) {
            if (product.status !== "ACTIVE" || product.inventory === 0) {
              return false
            }
          }

          // Tags filter
          if (filters.tags && filters.tags.length > 0) {
            const hasMatchingTag = filters.tags.some((tag) =>
              product.tags?.includes(tag)
            )
            if (!hasMatchingTag) {
              return false
            }
          }

          // Preparation time filter
          if (filters.preparationTime) {
            if (product.preparationTime !== filters.preparationTime) {
              return false
            }
          }

          return true
        })
      },

      getSortedProducts: (products) => {
        const { sortBy } = get()

        return [...products].sort((a, b) => {
          switch (sortBy) {
            case "featured":
              // Featured first, then by creation date
              if (a.featured && !b.featured) return -1
              if (!a.featured && b.featured) return 1
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

            case "price-asc":
              return a.price.toNumber() - b.price.toNumber()

            case "price-desc":
              return b.price.toNumber() - a.price.toNumber()

            case "newest":
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

            case "popular":
              // This would require order count data
              // For now, use featured as a proxy
              if (a.featured && !b.featured) return -1
              if (!a.featured && b.featured) return 1
              return 0

            case "name":
              return a.name.localeCompare(b.name)

            default:
              return 0
          }
        })
      },
    })),
    {
      name: "catalog-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        viewMode: state.viewMode,
        recentlyViewed: state.recentlyViewed,
        favorites: state.favorites,
      }),
    }
  )
)

// Selectors
export const selectFilteredAndSortedProducts = () => {
  const store = useCatalogStore.getState()
  const filtered = store.getFilteredProducts()
  return store.getSortedProducts(filtered)
}

export const selectRecentlyViewedProducts = () => {
  const store = useCatalogStore.getState()
  return store.recentlyViewed
    .map((id) => store.getProduct(id))
    .filter(Boolean) as ProductWithMerchant[]
}

export const selectFavoriteProducts = () => {
  const store = useCatalogStore.getState()
  return Array.from(store.favorites)
    .map((id) => store.getProduct(id))
    .filter(Boolean) as ProductWithMerchant[]
}