'use client'

import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ProductCatalog } from "@/components/product/product-catalog"
import { ProductCatalogSkeleton } from "@/components/product/product-catalog-skeleton"
import { api } from "@/lib/trpc/client"
import { Spinner } from "@kitchencloud/ui"
import { Clock } from "lucide-react"

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
  // Fetch merchant data
  const { data: merchant, isLoading, error } = api.public.getMerchant.useQuery({ 
    slug 
  })

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // Handle error or not found
  if (error || !merchant) {
    notFound()
  }

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
                {merchant.minimumOrder && (
                  <span className="text-muted-foreground">
                    Min order: ${Number(merchant.minimumOrder).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog */}
      <Suspense fallback={<ProductCatalogSkeleton />}>
        <ProductCatalog
          merchantId={merchant.id}
          merchantSlug={merchant.slug}
          categories={merchant.categories}
          searchParams={searchParams}
        />
      </Suspense>
    </div>
  )
}