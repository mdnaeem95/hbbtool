'use client'

import { notFound } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { ProductCatalog } from "../../../../../components/product/product-catalog"
import { ProductCatalogSkeleton } from "../../../../../components/product/product-catalog-skeleton"
import { api } from "../../../../../lib/trpc/client"
import { Clock, Star, ShoppingBag } from "lucide-react"
import { useMerchant } from "../../../../../contexts/merchant-context"
import { useCartStore } from "../../../../../stores/cart-store"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface ProductsPageClientProps {
  slug: string
  searchParams: {
    category?: string
    sort?: string
    min?: string
    max?: string
    search?: string
    page?: string
  }
}

export function ProductsPageClient({
  slug,
}: ProductsPageClientProps) {
  const { setMerchant } = useMerchant()
  const setCartMerchantInfo = useCartStore(state => state.setMerchantInfo)
  const [, setHasInteracted] = useState(false)
  
  // OPTIMIZATION: Parallel data fetching with aggressive caching
  const { 
    data: merchant, 
    isLoading: merchantLoading, 
    error,
    isLoadingError 
  } = api.public.getMerchant.useQuery(
    { slug },
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // Retry quickly on failure
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    }
  )

  // Track user interaction for optimistic UI
  useEffect(() => {
    const handleInteraction = () => setHasInteracted(true)
    window.addEventListener('click', handleInteraction, { once: true })
    window.addEventListener('touchstart', handleInteraction, { once: true })
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  // Update merchant context when data arrives
  useEffect(() => {
    if (merchant) {
      setMerchant({
        id: merchant.id,
        businessName: merchant.businessName,
        slug: merchant.slug,
        minimumOrder: Number(merchant.minimumOrder || 0),
        deliveryEnabled: merchant.deliveryEnabled || false,
        pickupEnabled: merchant.pickupEnabled || false,
        deliveryFee: Number(merchant.deliveryFee || 0),
        preparationTime: merchant.preparationTime?.toString() || undefined,
        logoUrl: merchant.logoUrl || undefined,
        description: merchant.description || undefined,
      })

      setCartMerchantInfo(merchant.id, merchant.businessName)
    }
  }, [merchant, setMerchant, setCartMerchantInfo])

  // Handle error states gracefully
  if (error || isLoadingError) {
    if (error?.data?.code === 'NOT_FOUND') {
      notFound()
    }
    
    // Show error state instead of blocking
    return (
      <div className="min-h-screen bg-background">
        <MerchantHeaderSkeleton />
        <div className="container py-12 text-center">
          <div className="text-red-500 mb-4">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Unable to load merchant</p>
            <p className="text-sm text-gray-600 mt-2">Please try refreshing the page</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // CRITICAL FIX: Progressive rendering instead of blocking
  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {merchantLoading ? (
          // Show skeleton that matches final layout exactly
          <motion.div
            key="skeleton"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MerchantHeaderSkeleton />
            <div className="container py-6">
              <ProductCatalogSkeleton />
            </div>
          </motion.div>
        ) : merchant ? (
          // Fade in real content smoothly
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <MerchantHeader merchant={merchant} />
            <div className="container py-6">
              <Suspense fallback={<ProductCatalogSkeleton />}>
                <ProductCatalog
                  merchantSlug={merchant.slug}
                  categories={merchant.categories.map((cat: any) => ({
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug,
                    productCount: cat._count?.products,
                  }))}
                />
              </Suspense>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// Optimized Merchant Header Component
function MerchantHeader({ merchant }: { merchant: any }) {
  return (
    <div className="border-b bg-card">
      <div className="container py-6 md:py-8">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Logo with optimized loading */}
          {merchant.logoUrl && (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
              <Image
                src={merchant.logoUrl}
                alt={merchant.businessName}
                fill
                className="rounded-lg object-cover"
                priority // Load immediately
                sizes="(max-width: 640px) 64px, 80px"
              />
            </div>
          )}
          
          <div className="flex-1">
            {/* Title and Rating */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{merchant.businessName}</h1>
                {merchant.description && (
                  <p className="mt-2 text-sm sm:text-base text-muted-foreground line-clamp-2">
                    {merchant.description}
                  </p>
                )}
              </div>
              
              {/* Rating Badge */}
              {merchant.averageRating && (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-lg">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-sm">{Number(merchant.averageRating).toFixed(1)}</span>
                  {merchant.totalReviews > 0 && (
                    <span className="text-xs text-gray-600">({merchant.totalReviews})</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Info Pills */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {merchant.preparationTime && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full">
                  <Clock className="h-3.5 w-3.5 text-gray-600" />
                  <span className="text-gray-700">{merchant.preparationTime} mins</span>
                </div>
              )}
              
              {Number(merchant.minimumOrder) > 0 && (
                <div className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                  Min order: ${Number(merchant.minimumOrder).toFixed(2)}
                </div>
              )}
              
              {merchant.deliveryFee !== undefined && (
                <div className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                  Delivery: ${Number(merchant.deliveryFee).toFixed(2)}
                </div>
              )}
              
              {/* Cuisine Types */}
              {merchant.cuisineType?.map((cuisine: string) => (
                <div key={cuisine} className="px-3 py-1 bg-orange-100 rounded-full text-orange-700">
                  {cuisine}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton that exactly matches the real header layout
function MerchantHeaderSkeleton() {
  return (
    <div className="border-b bg-card animate-pulse">
      <div className="container py-6 md:py-8">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Logo skeleton */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-200" />
          
          <div className="flex-1 w-full">
            {/* Title skeleton */}
            <div className="h-8 w-48 sm:w-64 bg-gray-200 rounded mb-2" />
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-full max-w-md bg-gray-200 rounded" />
              <div className="h-4 w-3/4 max-w-sm bg-gray-200 rounded" />
            </div>
            
            {/* Info pills skeleton */}
            <div className="mt-4 flex gap-3">
              <div className="h-7 w-20 bg-gray-200 rounded-full" />
              <div className="h-7 w-24 bg-gray-200 rounded-full" />
              <div className="h-7 w-20 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}