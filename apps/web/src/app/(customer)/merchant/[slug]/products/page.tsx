import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { api } from "@/lib/trpc/server"
import { ProductCatalog } from "@/components/product-catalog"
import { ProductCatalogSkeleton } from "@/components/product-catalog-skeleton"

interface ProductsPageProps {
  params: {
    slug: string
  }
  searchParams: {
    category?: string
    sort?: string
    min?: string
    max?: string
    search?: string
    page?: string
  }
}

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const merchant = await api.merchant.getBySlug.query({ slug: params.slug })

  if (!merchant) {
    return {
      title: "Merchant Not Found",
    }
  }

  return {
    title: `${merchant.name} - Menu | KitchenCloud`,
    description: merchant.description || `Order delicious food from ${merchant.name}`,
    openGraph: {
      title: `${merchant.name} - Menu`,
      description: merchant.description || `Order delicious food from ${merchant.name}`,
      images: merchant.coverImage ? [merchant.coverImage] : [],
    },
  }
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const merchant = await api.merchant.getBySlug.query({ slug: params.slug })

  if (!merchant) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Merchant Header */}
      <div className="border-b bg-card">
        <div className="container py-8">
          <div className="flex items-start gap-6">
            {merchant.logo && (
              <img
                src={merchant.logo}
                alt={merchant.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{merchant.name}</h1>
              {merchant.description && (
                <p className="mt-2 text-muted-foreground">
                  {merchant.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {merchant.rating && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{merchant.rating}</span>
                    <span className="text-muted-foreground">
                      ({merchant.reviewCount} reviews)
                    </span>
                  </div>
                )}
                {merchant.preparationTime && (
                  <span className="text-muted-foreground">
                    {merchant.preparationTime}
                  </span>
                )}
                {merchant.minimumOrder && (
                  <span className="text-muted-foreground">
                    Min order: ${merchant.minimumOrder}
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