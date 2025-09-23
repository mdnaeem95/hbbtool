'use client'

import { notFound } from "next/navigation"
import { Suspense, useEffect } from "react"
import { ProductCatalog } from "../../../../../components/product/product-catalog"
import { ProductCatalogSkeleton } from "../../../../../components/product/product-catalog-skeleton"
import { api } from "../../../../../lib/trpc/client"
import { Spinner } from "@homejiak/ui"
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
  searchParams,
}: ProductsPageClientProps) {
  const { setMerchant } = useMerchant()
  const setCartMerchantInfo = useCartStore(state => state.setMerchantInfo)
  
  // Fetch merchant data
  const { data: merchant, isLoading, error } = api.public.getMerchant.useQuery({ 
    slug 
  })

  // Update merchant context and cart store when merchant data is loaded
  useEffect(() => {
    if (merchant) {
      // Update merchant context for the drawer to use
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

      // Also update cart store so it knows the merchant info
      setCartMerchantInfo(merchant.id, merchant.businessName)
    }
  }, [merchant, setMerchant, setCartMerchantInfo])

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-10 w-10 text-orange-500 mx-auto" />
          <p className="mt-4 text-lg font-medium">Loading {slug.replace(/-/g, ' ')}</p>
          <p className="text-sm text-gray-500">Preparing menu...</p>
        </div>
      </div>
    )
  }

  // Handle error or not found
  if (error || !merchant) {
    notFound()
  }

  // Transform categories to match expected format
  const categoriesForCatalog = merchant.categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    productCount: undefined, // This could be populated from a _count if available
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Merchant Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="flex items-start gap-6">
            {merchant.logoUrl && (
              <img
                src={merchant.logoUrl}
                alt={merchant.businessName}
                className="h-20 w-20 rounded-lg object-cover"
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
                    <span>Est. {merchant.preparationTime}</span>
                  </div>
                )}
                {merchant.minimumOrder && Number(merchant.minimumOrder) > 0 && (
                  <span className="text-muted-foreground">
                    Min order: ${Number(merchant.minimumOrder).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog - Using correct props based on the actual component */}
      <Suspense fallback={<ProductCatalogSkeleton />}>
        <ProductCatalog
          merchantSlug={merchant.slug}
          categories={categoriesForCatalog}
          initialSearchParams={searchParams}
        />
      </Suspense>
    </div>
  )
}