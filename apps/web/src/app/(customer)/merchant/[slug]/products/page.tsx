import { Metadata } from "next"
import { db } from "@kitchencloud/database"
import { ProductsPageClient } from "./products-client"

interface ProductsPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    category?: string
    sort?: string
    min?: string
    max?: string
    search?: string
    page?: string
  }>
}

// Server-side metadata generation
export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const { slug } = await params
  
  // Direct database query for metadata only
  const merchant = await db.merchant.findFirst({
    where: { 
      slug: slug, 
      status: 'ACTIVE', 
      deletedAt: null 
    },
    select: {
      businessName: true,
      description: true,
      logoUrl: true,
    }
  })

  if (!merchant) {
    return {
      title: "Merchant Not Found",
    }
  }

  return {
    title: `${merchant.businessName} - Menu | KitchenCloud`,
    description: merchant.description || `Order delicious food from ${merchant.businessName}`,
    openGraph: {
      title: `${merchant.businessName} - Menu`,
      description: merchant.description || `Order delicious food from ${merchant.businessName}`,
      images: merchant.logoUrl ? [merchant.logoUrl] : [],
    },
  }
}

// Minimal server component that just passes props
export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  
  return (
    <ProductsPageClient 
      slug={slug} 
      searchParams={resolvedSearchParams} 
    />
  )
}