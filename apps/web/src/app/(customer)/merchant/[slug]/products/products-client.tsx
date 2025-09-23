'use client'

import { notFound } from "next/navigation"
import { Suspense, useEffect } from "react"
import { ProductCatalog } from "../../../../../components/product/product-catalog"
import { ProductCatalogSkeleton } from "../../../../../components/product/product-catalog-skeleton"
import { api } from "../../../../../lib/trpc/client"
import { Clock } from "lucide-react"
import { useMerchant } from "../../../../../contexts/merchant-context"
import { useCartStore } from "../../../../../stores/cart-store"

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
  
  // OPTIMIZATION: Fetch merchant data with aggressive caching
  const { data: merchant, isLoading: merchantLoading, error } = api.public.getMerchant.useQuery(
    { slug },
    {
      // Cache merchant data for 5 minutes (rarely changes)
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      // Don't refetch on mount if we have cached data
      refetchOnMount: false,
    }
  )

  // Note: ProductCatalog handles its own data fetching with proper caching
  // We just need to pass the merchant info and let it handle the products

  // Update merchant context when data is available
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
        preparationTime: merchant.preparationTime.toString() || undefined,
        logoUrl: merchant.logoUrl || undefined,
        description: merchant.description || undefined,
      })

      setCartMerchantInfo(merchant.id, merchant.businessName)
    }
  }, [merchant, setMerchant, setCartMerchantInfo])

  // Show loading skeleton (not blocking spinner)
  if (merchantLoading) {   
    return (
      <div className="min-h-screen bg-background">
        {/* Show merchant header skeleton */}
        <div className="border-b bg-card animate-pulse">
          <div className="container py-8">
            <div className="flex items-start gap-6">
              <div className="h-20 w-20 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-8 w-64 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-96 bg-gray-200 rounded mb-4" />
                <div className="flex gap-4">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Show product catalog skeleton */}
        <div className="container py-6">
          <ProductCatalogSkeleton />
        </div>
      </div>
    )
  }

  // Handle error or not found
  if (error || !merchant) {
    notFound()
  }

  // Transform categories
  const categoriesForCatalog = merchant.categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    productCount: cat._count?.products,
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Merchant Header - Always visible */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="flex items-start gap-6">
            {merchant.logoUrl && (
              <img
                src={merchant.logoUrl}
                alt={merchant.businessName}
                className="h-20 w-20 rounded-lg object-cover"
                loading="eager" // Load logo immediately
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{merchant.businessName}</h1>
              {merchant.description && (
                <p className="mt-2 text-muted-foreground">
                  {merchant.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {merchant.preparationTime && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Est. {merchant.preparationTime} mins</span>
                  </div>
                )}
                {Number(merchant.minimumOrder) > 0 && (
                  <div className="text-muted-foreground">
                    Min. order: ${Number(merchant.minimumOrder).toFixed(2)}
                  </div>
                )}
                {merchant.deliveryFee !== undefined && (
                  <div className="text-muted-foreground">
                    Delivery: ${merchant.deliveryFee.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog - Has its own optimized data fetching */}
      <div className="container py-6">
        <Suspense fallback={<ProductCatalogSkeleton />}>
          <ProductCatalog
            merchantSlug={merchant.slug}
            categories={categoriesForCatalog}
          />
        </Suspense>
      </div>
    </div>
  )
}