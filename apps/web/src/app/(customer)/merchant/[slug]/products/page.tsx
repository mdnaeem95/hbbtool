import { Metadata } from "next"
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
  
  // Note: We're removing the direct database import to avoid the import issue
  // The metadata will be generated on the client side or through the API
  
  return {
    title: `${slug.replace(/-/g, ' ')} - Menu | KitchenCloud`,
    description: `Order delicious food from ${slug.replace(/-/g, ' ')}`,
    openGraph: {
      title: `${slug.replace(/-/g, ' ')} - Menu`,
      description: `Order delicious food from ${slug.replace(/-/g, ' ')}`,
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